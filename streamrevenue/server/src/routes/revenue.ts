import { Router, Request, Response } from 'express';
import { requireAuth, getAccessToken, getUserId } from '../middleware/authMiddleware';
import {
  getSubscriptions,
  calculateSubscriberBreakdown,
  getBitsLeaderboard,
  getFollowerCount,
  getStreamInfo,
  getChannelInfo
} from '../services/twitchApi';
import {
  getRevenueEstimate,
  calculateSubscriptionRevenue,
  calculateBitsRevenueFromLeaderboard,
  formatCurrency,
  REVENUE_RATES
} from '../services/revenueCalculator';
import { saveRevenueSnapshot, getRevenueHistory, getRevenueTrends } from '../services/database';
import { cacheWrapper, CACHE_TTL, deleteCache, incrementMetric } from '../services/redis';
import { generatePredictions } from '../services/predictions';

const router = Router();

// All revenue routes require authentication
router.use(requireAuth);

/**
 * GET /api/revenue/summary
 * Get complete revenue summary (with Redis caching)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Track API call metric
    await incrementMetric('api_calls:revenue_summary');

    // Use cache wrapper for expensive API calls
    const cacheKey = `revenue:summary:${userId}`;
    
    const summaryData = await cacheWrapper(cacheKey, CACHE_TTL.REVENUE_SUMMARY, async () => {
      // Fetch subscription data
      let subscriberBreakdown = {
        total: 0,
        tier1: 0,
        tier2: 0,
        tier3: 0,
        gifted: 0,
        points: 0
      };

      try {
        const { subscriptions } = await getSubscriptions(accessToken, userId);
        subscriberBreakdown = calculateSubscriberBreakdown(subscriptions);
      } catch (err: any) {
        console.log('Subscription data not available:', err.response?.status);
      }

      // Fetch bits leaderboard
      let bitsLeaders: any[] = [];
      let totalBits = 0;
      try {
        const bitsData = await getBitsLeaderboard(accessToken, userId, 10, 'all');
        bitsLeaders = bitsData.leaders;
        totalBits = bitsLeaders.reduce((sum, leader) => sum + leader.score, 0);
      } catch (err: any) {
        console.log('Bits data not available:', err.response?.status);
      }

      // Fetch follower count
      let followerCount = 0;
      try {
        followerCount = await getFollowerCount(accessToken, userId);
      } catch (err: any) {
        console.log('Follower count not available:', err.response?.status);
      }

      // Check if currently streaming
      let isLive = false;
      let viewerCount = 0;
      try {
        const streamInfo = await getStreamInfo(accessToken, userId);
        if (streamInfo) {
          isLive = true;
          viewerCount = streamInfo.viewer_count;
        }
      } catch (err) {
        // Not critical
      }

      // Calculate revenue estimate
      const revenueEstimate = getRevenueEstimate(subscriberBreakdown, bitsLeaders);

      return {
        revenue: revenueEstimate,
        subscribers: subscriberBreakdown,
        bitsLeaders,
        followers: followerCount,
        totalBits,
        stream: {
          isLive,
          viewerCount
        }
      };
    });

    // Save revenue snapshot to database (outside cache)
    try {
      await saveRevenueSnapshot({
        userId,
        subscriberCount: summaryData.subscribers.total,
        tier1Count: summaryData.subscribers.tier1,
        tier2Count: summaryData.subscribers.tier2,
        tier3Count: summaryData.subscribers.tier3,
        giftedCount: summaryData.subscribers.gifted,
        subRevenue: summaryData.revenue.subscriptions.total,
        bitsTotal: summaryData.totalBits,
        bitsRevenue: summaryData.revenue.bits.total,
        totalRevenue: summaryData.revenue.totalRevenue,
        followerCount: summaryData.followers
      });
    } catch (dbError) {
      console.error('⚠️ Failed to save revenue snapshot:', dbError);
    }

    res.json({
      success: true,
      data: {
        ...summaryData,
        user: req.session.user,
        cached: true
      }
    });

  } catch (err: any) {
    console.error('Revenue summary error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch revenue data',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/history
 * Get revenue history for the user
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:revenue_history');

    const cacheKey = `revenue:history:${userId}:${days}`;
    
    const history = await cacheWrapper(cacheKey, CACHE_TTL.REVENUE_SUMMARY, async () => {
      return await getRevenueHistory(userId, days);
    });

    res.json({
      success: true,
      data: {
        history,
        days
      }
    });

  } catch (err: any) {
    console.error('Revenue history error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch revenue history',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/trends
 * Get revenue trends for charts
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:revenue_trends');

    const cacheKey = `revenue:trends:${userId}:${days}`;
    
    const trends = await cacheWrapper(cacheKey, CACHE_TTL.REVENUE_SUMMARY, async () => {
      return await getRevenueTrends(userId, days);
    });

    res.json({
      success: true,
      data: {
        trends,
        days
      }
    });

  } catch (err: any) {
    console.error('Revenue trends error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch revenue trends',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/subscribers
 * Get detailed subscriber information (with caching)
 */
router.get('/subscribers', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:subscribers');

    const cacheKey = `revenue:subscribers:${userId}`;
    
    const subscriberData = await cacheWrapper(cacheKey, CACHE_TTL.SUBSCRIBERS, async () => {
      const { subscriptions, total, points } = await getSubscriptions(accessToken, userId);
      const breakdown = calculateSubscriberBreakdown(subscriptions);
      const revenue = calculateSubscriptionRevenue(breakdown);

      return {
        total,
        points,
        breakdown,
        revenue,
        recentSubscribers: subscriptions.slice(0, 20).map(sub => ({
          username: sub.user_name,
          tier: sub.tier,
          isGift: sub.is_gift,
          gifterName: sub.gifter_name
        }))
      };
    });

    res.json({
      success: true,
      data: subscriberData
    });

  } catch (err: any) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      return res.status(403).json({
        error: 'Subscription data not available',
        message: 'You need to be a Twitch Affiliate or Partner to access subscription data'
      });
    }

    console.error('Subscribers error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch subscriber data',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/bits
 * Get bits leaderboard and revenue (with caching)
 */
router.get('/bits', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);
    const period = (req.query.period as string) || 'all';

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:bits');

    const validPeriods = ['day', 'week', 'month', 'year', 'all'];
    const selectedPeriod = validPeriods.includes(period) ? period as any : 'all';

    const cacheKey = `revenue:bits:${userId}:${selectedPeriod}`;
    
    const bitsData = await cacheWrapper(cacheKey, CACHE_TTL.BITS_LEADERBOARD, async () => {
      const { leaders, total } = await getBitsLeaderboard(accessToken, userId, 100, selectedPeriod);
      const revenue = calculateBitsRevenueFromLeaderboard(leaders);

      return {
        period: selectedPeriod,
        totalBits: revenue.totalBits,
        totalRevenue: revenue.total,
        formattedRevenue: formatCurrency(revenue.total),
        leaderboard: leaders.map(leader => ({
          rank: leader.rank,
          username: leader.user_name,
          bits: leader.score,
          usdValue: Math.round((leader.score / 100) * 100) / 100
        }))
      };
    });

    res.json({
      success: true,
      data: bitsData
    });

  } catch (err: any) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      return res.status(403).json({
        error: 'Bits data not available',
        message: 'You need to be a Twitch Affiliate or Partner to access bits data'
      });
    }

    console.error('Bits error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch bits data',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/channel
 * Get channel information (with caching)
 */
router.get('/channel', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:channel');

    const cacheKey = `revenue:channel:${userId}`;
    
    const channelData = await cacheWrapper(cacheKey, CACHE_TTL.USER_PROFILE, async () => {
      const [channelInfo, followerCount, streamInfo] = await Promise.all([
        getChannelInfo(accessToken, userId),
        getFollowerCount(accessToken, userId),
        getStreamInfo(accessToken, userId)
      ]);

      return {
        channel: channelInfo,
        followers: followerCount,
        stream: streamInfo ? {
          isLive: true,
          title: streamInfo.title,
          gameName: streamInfo.game_name,
          viewerCount: streamInfo.viewer_count,
          startedAt: streamInfo.started_at
        } : {
          isLive: false
        }
      };
    });

    res.json({
      success: true,
      data: channelData
    });

  } catch (err: any) {
    console.error('Channel error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch channel data',
      message: err.message
    });
  }
});

/**
 * POST /api/revenue/cache/clear
 * Clear cache for current user (useful after updates)
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Clear all cache keys for this user
    await deleteCache(`revenue:summary:${userId}`);
    await deleteCache(`revenue:subscribers:${userId}`);
    await deleteCache(`revenue:channel:${userId}`);

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (err: any) {
    console.error('Cache clear error:', err.message);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/predictions
 * Get ML-powered revenue predictions
 */
router.get('/predictions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await incrementMetric('api_calls:predictions');

    const cacheKey = `revenue:predictions:${userId}:${days}`;
    
    const predictions = await cacheWrapper(cacheKey, CACHE_TTL.PREDICTIONS, async () => {
      return await generatePredictions(userId, days);
    });

    res.json({
      success: true,
      data: predictions
    });

  } catch (err: any) {
    console.error('Predictions error:', err.message);
    res.status(500).json({
      error: 'Failed to generate predictions',
      message: err.message
    });
  }
});

/**
 * GET /api/revenue/rates
 * Get current revenue rates (for reference)
 */
router.get('/rates', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      description: 'Approximate creator revenue shares (actual rates may vary)',
      subscriptions: {
        tier1: `$${REVENUE_RATES.TIER_1} per sub`,
        tier2: `$${REVENUE_RATES.TIER_2} per sub`,
        tier3: `$${REVENUE_RATES.TIER_3} per sub`,
        prime: `$${REVENUE_RATES.PRIME} per sub`
      },
      bits: {
        rate: `$${REVENUE_RATES.BITS_PER_100} per 100 bits`,
        note: 'Creator receives 1 cent per bit'
      },
      disclaimer: 'Revenue calculations are estimates. Actual payouts may differ based on your Twitch contract and regional factors.'
    }
  });
});

export default router;