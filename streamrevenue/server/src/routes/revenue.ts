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

const router = Router();

// All revenue routes require authentication
router.use(requireAuth);

/**
 * GET /api/revenue/summary
 * Get complete revenue summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

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
      // User might not be affiliate/partner - that's okay
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

    // Save revenue snapshot to database
    try {
      await saveRevenueSnapshot({
        userId,
        subscriberCount: subscriberBreakdown.total,
        tier1Count: subscriberBreakdown.tier1,
        tier2Count: subscriberBreakdown.tier2,
        tier3Count: subscriberBreakdown.tier3,
        giftedCount: subscriberBreakdown.gifted,
        subRevenue: revenueEstimate.subscriptions.total,
        bitsTotal: totalBits,
        bitsRevenue: revenueEstimate.bits.total,
        totalRevenue: revenueEstimate.totalRevenue,
        followerCount
      });
      console.log('✅ Revenue snapshot saved for user:', userId);
    } catch (dbError) {
      console.error('⚠️ Failed to save revenue snapshot:', dbError);
      // Continue anyway - don't break the API response
    }

    res.json({
      success: true,
      data: {
        revenue: revenueEstimate,
        subscribers: subscriberBreakdown,
        bitsLeaders,
        followers: followerCount,
        stream: {
          isLive,
          viewerCount
        },
        user: req.session.user
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

    const history = await getRevenueHistory(userId, days);

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

    const trends = await getRevenueTrends(userId, days);

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
 * Get detailed subscriber information
 */
router.get('/subscribers', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { subscriptions, total, points } = await getSubscriptions(accessToken, userId);
    const breakdown = calculateSubscriberBreakdown(subscriptions);
    const revenue = calculateSubscriptionRevenue(breakdown);

    res.json({
      success: true,
      data: {
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
      }
    });

  } catch (err: any) {
    // Handle case where user is not affiliate/partner
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
 * Get bits leaderboard and revenue
 */
router.get('/bits', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);
    const period = (req.query.period as string) || 'all';

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validPeriods = ['day', 'week', 'month', 'year', 'all'];
    const selectedPeriod = validPeriods.includes(period) ? period as any : 'all';

    const { leaders, total } = await getBitsLeaderboard(accessToken, userId, 100, selectedPeriod);
    const revenue = calculateBitsRevenueFromLeaderboard(leaders);

    res.json({
      success: true,
      data: {
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
      }
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
 * Get channel information
 */
router.get('/channel', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [channelInfo, followerCount, streamInfo] = await Promise.all([
      getChannelInfo(accessToken, userId),
      getFollowerCount(accessToken, userId),
      getStreamInfo(accessToken, userId)
    ]);

    res.json({
      success: true,
      data: {
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
      }
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