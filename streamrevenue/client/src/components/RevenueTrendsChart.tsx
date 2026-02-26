import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { revenueApi, RevenueTrend } from '../services/api';

interface ChartData {
  date: string;
  revenue: number;
  subs: number;
  bits: number;
  followers: number;
}

const RevenueTrendsChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await revenueApi.getTrends(days);
      
      // Transform data for chart
      const chartData: ChartData[] = response.trends.map((trend: RevenueTrend) => ({
        date: new Date(trend.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        revenue: Number(trend.total_revenue) || 0,
        subs: Number(trend.sub_revenue) || 0,
        bits: Number(trend.bits_revenue) || 0,
        followers: trend.follower_count || 0
      }));
      
      setData(chartData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Followers' ? entry.value : `$${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="chart-card">
        <h3>📈 Revenue Trends</h3>
        <div className="chart-loading">Loading trends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-card">
        <h3>📈 Revenue Trends</h3>
        <div className="chart-error">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="chart-card">
        <h3>📈 Revenue Trends</h3>
        <div className="no-data">
          <p>No historical data yet</p>
          <span className="no-data-hint">
            Data will appear as you use the dashboard over time
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card trends-chart">
      <div className="chart-header">
        <h3>📈 Revenue Trends</h3>
        <div className="period-selector">
          <button 
            className={days === 7 ? 'active' : ''} 
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button 
            className={days === 30 ? 'active' : ''} 
            onClick={() => setDays(30)}
          >
            30D
          </button>
          <button 
            className={days === 90 ? 'active' : ''} 
            onClick={() => setDays(90)}
          >
            90D
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3d3d44" />
            <XAxis 
              dataKey="date" 
              stroke="#848494"
              tick={{ fill: '#848494', fontSize: 12 }}
            />
            <YAxis 
              stroke="#848494"
              tick={{ fill: '#848494', fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              name="Total Revenue"
              stroke="#00c853" 
              strokeWidth={2}
              dot={{ fill: '#00c853', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="subs" 
              name="Sub Revenue"
              stroke="#9147ff" 
              strokeWidth={2}
              dot={{ fill: '#9147ff', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="bits" 
              name="Bits Revenue"
              stroke="#00b5ad" 
              strokeWidth={2}
              dot={{ fill: '#00b5ad', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueTrendsChart;