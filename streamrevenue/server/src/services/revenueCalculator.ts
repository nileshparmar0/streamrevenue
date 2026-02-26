import { SubscriberBreakdown, TwitchBitsLeader } from './twitchApi';

// ============================================
// Revenue Constants
// Twitch takes ~50% cut, creator gets ~50%
// These are approximate values
// ============================================

export const REVENUE_RATES = {
  // Subscription revenue (creator's share)
  TIER_1: 2.50,   // $4.99 × 50%
  TIER_2: 5.00,   // $9.99 × 50%
  TIER_3: 12.50,  // $24.99 × 50%
  PRIME: 2.50,    // Same as Tier 1

  // Bits revenue
  BITS_PER_100: 1.00  // Creator gets $1 per 100 bits
};

// ============================================
// Revenue Calculation Types
// ============================================

export interface SubscriptionRevenue {
  tier1: number;
  tier2: number;
  tier3: number;
  total: number;
}

export interface BitsRevenue {
  total: number;
  totalBits: number;
}

export interface RevenueEstimate {
  subscriptions: SubscriptionRevenue;
  bits: BitsRevenue;
  totalRevenue: number;
  breakdown: {
    subscriptionCount: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    giftedCount: number;
    topCheerer?: {
      username: string;
      bits: number;
      usdValue: number;
    };
  };
}

// ============================================
// Revenue Calculation Functions
// ============================================

/**
 * Calculate subscription revenue from subscriber breakdown
 */
export function calculateSubscriptionRevenue(breakdown: SubscriberBreakdown): SubscriptionRevenue {
  const tier1Revenue = breakdown.tier1 * REVENUE_RATES.TIER_1;
  const tier2Revenue = breakdown.tier2 * REVENUE_RATES.TIER_2;
  const tier3Revenue = breakdown.tier3 * REVENUE_RATES.TIER_3;

  return {
    tier1: Math.round(tier1Revenue * 100) / 100,
    tier2: Math.round(tier2Revenue * 100) / 100,
    tier3: Math.round(tier3Revenue * 100) / 100,
    total: Math.round((tier1Revenue + tier2Revenue + tier3Revenue) * 100) / 100
  };
}

/**
 * Calculate bits revenue from total bits
 */
export function calculateBitsRevenue(totalBits: number): BitsRevenue {
  const revenue = (totalBits / 100) * REVENUE_RATES.BITS_PER_100;

  return {
    total: Math.round(revenue * 100) / 100,
    totalBits
  };
}

/**
 * Calculate bits revenue from leaderboard
 */
export function calculateBitsRevenueFromLeaderboard(leaders: TwitchBitsLeader[]): BitsRevenue {
  const totalBits = leaders.reduce((sum, leader) => sum + leader.score, 0);
  return calculateBitsRevenue(totalBits);
}

/**
 * Get complete revenue estimate
 */
export function getRevenueEstimate(
  subscriberBreakdown: SubscriberBreakdown,
  bitsLeaders: TwitchBitsLeader[]
): RevenueEstimate {
  const subscriptionRevenue = calculateSubscriptionRevenue(subscriberBreakdown);
  const bitsRevenue = calculateBitsRevenueFromLeaderboard(bitsLeaders);
  const totalRevenue = subscriptionRevenue.total + bitsRevenue.total;

  const topCheerer = bitsLeaders.length > 0 ? {
    username: bitsLeaders[0].user_name,
    bits: bitsLeaders[0].score,
    usdValue: Math.round((bitsLeaders[0].score / 100) * 100) / 100
  } : undefined;

  return {
    subscriptions: subscriptionRevenue,
    bits: bitsRevenue,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    breakdown: {
      subscriptionCount: subscriberBreakdown.total,
      tier1Count: subscriberBreakdown.tier1,
      tier2Count: subscriberBreakdown.tier2,
      tier3Count: subscriberBreakdown.tier3,
      giftedCount: subscriberBreakdown.gifted,
      topCheerer
    }
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format large numbers
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Calculate projected monthly revenue based on current data
 */
export function calculateMonthlyProjection(
  currentRevenue: number,
  daysInPeriod: number
): number {
  const dailyAverage = currentRevenue / daysInPeriod;
  const monthlyProjection = dailyAverage * 30;
  return Math.round(monthlyProjection * 100) / 100;
}
