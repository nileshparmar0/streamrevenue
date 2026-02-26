import { useState, useEffect, useCallback } from 'react';
import { authApi, revenueApi, User, RevenueSummary } from '../services/api';

// Hook for authentication state
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const { authenticated, user } = await authApi.getMe();
      setUser(authenticated ? user : null);
      setError(null);
    } catch (err: any) {
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
    refreshAuth: checkAuth
  };
}

// Hook for revenue data
export function useRevenue() {
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await revenueApi.getSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}

// Hook for bits data with period selection
export function useBits(initialPeriod: string = 'all') {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bitsData = await revenueApi.getBits(period);
      setData(bitsData);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Bits data requires Affiliate/Partner status');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    period,
    setPeriod,
    refresh: fetchData
  };
}

// Hook for subscriber data
export function useSubscribers() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const subsData = await revenueApi.getSubscribers();
      setData(subsData);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Subscription data requires Affiliate/Partner status');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}
