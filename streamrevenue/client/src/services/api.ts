import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

// Types
export interface User {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

export interface SubscriberBreakdown {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  gifted: number;
  points: number;
}

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

export interface BitsLeader {
  rank: number;
  username: string;
  bits: number;
  usdValue: number;
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

export interface RevenueSummary {
  revenue: RevenueEstimate;
  subscribers: SubscriberBreakdown;
  bitsLeaders: any[];
  followers: number;
  stream: {
    isLive: boolean;
    viewerCount: number;
  };
  user: User;
}

export interface RevenueTrend {
  date: string;
  total_revenue: number;
  sub_revenue: number;
  bits_revenue: number;
  subscriber_count: number;
  follower_count: number;
}

export interface RevenueHistoryItem {
  id: number;
  user_id: string;
  date: string;
  subscriber_count: number;
  tier1_count: number;
  tier2_count: number;
  tier3_count: number;
  gifted_count: number;
  sub_revenue: number;
  bits_total: number;
  bits_revenue: number;
  total_revenue: number;
  follower_count: number;
  created_at: string;
}

// Auth API
export const authApi = {
  getLoginUrl: () => `${API_BASE}/auth/login`,
  
  getMe: async (): Promise<{ authenticated: boolean; user: User | null }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.get('/auth/logout');
  },
  
  getStatus: async (): Promise<{ authenticated: boolean; userId: string | null }> => {
    const response = await api.get('/auth/status');
    return response.data;
  }
};

// Revenue API
export const revenueApi = {
  getSummary: async (): Promise<RevenueSummary> => {
    const response = await api.get('/api/revenue/summary');
    return response.data.data;
  },
  
  getSubscribers: async () => {
    const response = await api.get('/api/revenue/subscribers');
    return response.data.data;
  },
  
  getBits: async (period: string = 'all') => {
    const response = await api.get(`/api/revenue/bits?period=${period}`);
    return response.data.data;
  },
  
  getChannel: async () => {
    const response = await api.get('/api/revenue/channel');
    return response.data.data;
  },
  
  getRates: async () => {
    const response = await api.get('/api/revenue/rates');
    return response.data.data;
  },

  getTrends: async (days: number = 30): Promise<{ trends: RevenueTrend[]; days: number }> => {
    const response = await api.get(`/api/revenue/trends?days=${days}`);
    return response.data.data;
  },

  getHistory: async (days: number = 30): Promise<{ history: RevenueHistoryItem[]; days: number }> => {
    const response = await api.get(`/api/revenue/history?days=${days}`);
    return response.data.data;
  }
};

export default api;