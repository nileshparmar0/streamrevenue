import React from 'react';
import { useRevenue } from '../hooks/useTwitchData';
import RevenueCard from './RevenueCard';
import SubscriberChart from './SubscriberChart';
import BitsLeaderboard from './BitsLeaderboard';
import RevenueTrendsChart from './RevenueTrendsChart';
import RevenuePredictions from './RevenuePredictions';
import LiveAlerts from './LiveAlerts';

const Dashboard: React.FC = () => {
  const { data, loading, error, refresh } = useRevenue();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your revenue data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠️ Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={refresh} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { revenue, subscribers, bitsLeaders, followers, stream, user } = data;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Welcome, {user.display_name}! 👋</h1>
          <p>Here's your revenue overview</p>
        </div>
        <div className="header-right">
          {stream.isLive ? (
            <div className="live-badge">
              <span className="live-dot"></span>
              LIVE - {stream.viewerCount.toLocaleString()} viewers
            </div>
          ) : (
            <div className="offline-badge">Offline</div>
          )}
          <button onClick={refresh} className="btn btn-outline btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card followers">
          <span className="stat-icon">👥</span>
          <div className="stat-content">
            <span className="stat-value">{followers.toLocaleString()}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
        <div className="stat-card subscribers">
          <span className="stat-icon">⭐</span>
          <div className="stat-content">
            <span className="stat-value">{subscribers.total.toLocaleString()}</span>
            <span className="stat-label">Subscribers</span>
          </div>
        </div>
        <div className="stat-card sub-points">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{subscribers.points.toLocaleString()}</span>
            <span className="stat-label">Sub Points</span>
          </div>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="revenue-grid">
        <RevenueCard
          title="Subscription Revenue"
          amount={revenue.subscriptions.total}
          icon="💎"
          subtitle={`${subscribers.total} subscribers`}
          color="purple"
        />
        <RevenueCard
          title="Bits Revenue"
          amount={revenue.bits.total}
          icon="💜"
          subtitle={`${revenue.bits.totalBits.toLocaleString()} bits`}
          color="blue"
        />
        <RevenueCard
          title="Total Estimated Revenue"
          amount={revenue.totalRevenue}
          icon="💰"
          subtitle="Combined earnings"
          color="green"
          large
        />
      </div>

      {/* AI Revenue Predictions - NEW! */}
      <RevenuePredictions />

      {/* Revenue Trends Chart */}
      <RevenueTrendsChart />

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>📊 Subscriber Breakdown</h3>
          <SubscriberChart
            tier1={subscribers.tier1}
            tier2={subscribers.tier2}
            tier3={subscribers.tier3}
            gifted={subscribers.gifted}
          />
          <div className="tier-legend">
            <div className="legend-item">
              <span className="legend-color tier1"></span>
              Tier 1: {subscribers.tier1} (${(subscribers.tier1 * 2.5).toFixed(2)})
            </div>
            <div className="legend-item">
              <span className="legend-color tier2"></span>
              Tier 2: {subscribers.tier2} (${(subscribers.tier2 * 5).toFixed(2)})
            </div>
            <div className="legend-item">
              <span className="legend-color tier3"></span>
              Tier 3: {subscribers.tier3} (${(subscribers.tier3 * 12.5).toFixed(2)})
            </div>
            <div className="legend-item">
              <span className="legend-color gifted"></span>
              Gifted: {subscribers.gifted}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>🎉 Top Supporters (Bits)</h3>
          <BitsLeaderboard leaders={bitsLeaders} />
        </div>
      </div>

      {/* Live Alerts */}
      <LiveAlerts />

      {/* Disclaimer */}
      <div className="disclaimer">
        <p>
          <strong>Note:</strong> Revenue calculations are estimates based on standard Twitch payout rates
          (50% for subscriptions, $0.01 per bit). Actual earnings may vary based on your contract terms,
          regional factors, and Twitch's current policies.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;