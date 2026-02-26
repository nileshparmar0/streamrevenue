import axios from 'axios';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const TWITCH_AUTH_BASE = 'https://id.twitch.tv/oauth2';

// Twitch API response types
export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  email?: string;
  created_at: string;
}

export interface TwitchSubscription {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  gifter_id?: string;
  gifter_login?: string;
  gifter_name?: string;
  is_gift: boolean;
  tier: '1000' | '2000' | '3000'; // 1000 = Tier 1, 2000 = Tier 2, 3000 = Tier 3
  plan_name: string;
  user_id: string;
  user_name: string;
  user_login: string;
}

export interface TwitchBitsLeader {
  user_id: string;
  user_login: string;
  user_name: string;
  rank: number;
  score: number; // Total bits
}

export interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
}

// ============================================
// OAuth Functions
// ============================================

export function getAuthorizationUrl(): string {
  const scopes = [
    'user:read:email',
    'channel:read:subscriptions',
    'bits:read',
    'analytics:read:extensions',
    'channel:read:hype_train',
    'moderator:read:followers'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || '',
    redirect_uri: process.env.TWITCH_REDIRECT_URI || '',
    response_type: 'code',
    scope: scopes
  });

  return `${TWITCH_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<TwitchTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || '',
    client_secret: process.env.TWITCH_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TWITCH_REDIRECT_URI || ''
  });

  const response = await axios.post<TwitchTokenResponse>(
    `${TWITCH_AUTH_BASE}/token`,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TwitchTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || '',
    client_secret: process.env.TWITCH_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await axios.post<TwitchTokenResponse>(
    `${TWITCH_AUTH_BASE}/token`,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

export async function revokeToken(token: string): Promise<void> {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || '',
    token
  });

  await axios.post(
    `${TWITCH_AUTH_BASE}/revoke`,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
}

// ============================================
// API Helper
// ============================================

function getHeaders(accessToken: string) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID || ''
  };
}

// ============================================
// User Functions
// ============================================

export async function getCurrentUser(accessToken: string): Promise<TwitchUser> {
  const response = await axios.get<{ data: TwitchUser[] }>(
    `${TWITCH_API_BASE}/users`,
    { headers: getHeaders(accessToken) }
  );

  if (!response.data.data || response.data.data.length === 0) {
    throw new Error('User not found');
  }

  return response.data.data[0];
}

// ============================================
// Subscription Functions
// ============================================

export async function getSubscriptions(
  accessToken: string,
  broadcasterId: string
): Promise<{ subscriptions: TwitchSubscription[]; total: number; points: number }> {
  const subscriptions: TwitchSubscription[] = [];
  let cursor: string | undefined;
  let total = 0;
  let points = 0;

  do {
    const params = new URLSearchParams({
      broadcaster_id: broadcasterId,
      first: '100'
    });

    if (cursor) {
      params.append('after', cursor);
    }

    const response = await axios.get<{
      data: TwitchSubscription[];
      pagination: { cursor?: string };
      total: number;
      points: number;
    }>(
      `${TWITCH_API_BASE}/subscriptions?${params.toString()}`,
      { headers: getHeaders(accessToken) }
    );

    subscriptions.push(...response.data.data);
    total = response.data.total;
    points = response.data.points;
    cursor = response.data.pagination?.cursor;

  } while (cursor);

  return { subscriptions, total, points };
}

export interface SubscriberBreakdown {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  gifted: number;
  points: number;
}

export function calculateSubscriberBreakdown(subscriptions: TwitchSubscription[]): SubscriberBreakdown {
  const breakdown: SubscriberBreakdown = {
    total: subscriptions.length,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    gifted: 0,
    points: 0
  };

  for (const sub of subscriptions) {
    if (sub.is_gift) {
      breakdown.gifted++;
    }

    switch (sub.tier) {
      case '1000':
        breakdown.tier1++;
        breakdown.points += 1;
        break;
      case '2000':
        breakdown.tier2++;
        breakdown.points += 2;
        break;
      case '3000':
        breakdown.tier3++;
        breakdown.points += 6;
        break;
    }
  }

  return breakdown;
}

// ============================================
// Bits Functions
// ============================================

export async function getBitsLeaderboard(
  accessToken: string,
  broadcasterId: string,
  count: number = 10,
  period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
): Promise<{ leaders: TwitchBitsLeader[]; total: number }> {
  const params = new URLSearchParams({
    broadcaster_id: broadcasterId,
    count: count.toString(),
    period
  });

  const response = await axios.get<{
    data: TwitchBitsLeader[];
    total: number;
  }>(
    `${TWITCH_API_BASE}/bits/leaderboard?${params.toString()}`,
    { headers: getHeaders(accessToken) }
  );

  return {
    leaders: response.data.data || [],
    total: response.data.total || 0
  };
}

// ============================================
// Channel Functions
// ============================================

export async function getChannelInfo(accessToken: string, broadcasterId: string) {
  const response = await axios.get(
    `${TWITCH_API_BASE}/channels?broadcaster_id=${broadcasterId}`,
    { headers: getHeaders(accessToken) }
  );

  return response.data.data?.[0];
}

export async function getFollowerCount(accessToken: string, broadcasterId: string): Promise<number> {
  const response = await axios.get<{ total: number }>(
    `${TWITCH_API_BASE}/channels/followers?broadcaster_id=${broadcasterId}`,
    { headers: getHeaders(accessToken) }
  );

  return response.data.total || 0;
}

// ============================================
// Stream Functions  
// ============================================

export async function getStreamInfo(accessToken: string, userId: string) {
  const response = await axios.get(
    `${TWITCH_API_BASE}/streams?user_id=${userId}`,
    { headers: getHeaders(accessToken) }
  );

  return response.data.data?.[0] || null; // null if not live
}
