import './predictions.css';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend
} from 'recharts';

interface PredictionData {
  predictedRevenue: number;
  predictedSubscribers: number;
  predictedBits: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  forecast: Array<{
    date: string;
    predicted: number;
    lower: number;
    upper: number;
  }>;
  insights: string[];
}

const RevenuePredictions: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchPredictions();
  }, [days]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/revenue/predictions?days=${days}`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setPredictions(result.data);
      } else {
        setError(result.error || 'Failed to load predictions');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '📊';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (loading) {
    return (
      <div className="predictions-card loading">
        <div className="loading-spinner"></div>
        <p>Generating predictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="predictions-card error">
        <p>⚠️ {error}</p>
        <button onClick={fetchPredictions} className="btn btn-sm">Retry</button>
      </div>
    );
  }

  if (!predictions) return null;

  // Prepare chart data (show every 5th day for cleaner display)
  const chartData = predictions.forecast
    .filter((_, index) => index % 3 === 0 || index === predictions.forecast.length - 1)
    .map(item => ({
      ...item,
      dateLabel: formatDate(item.date)
    }));

  return (
    <div className="predictions-section">
      <div className="predictions-header">
        <h3>🔮 AI Revenue Predictions</h3>
        <div className="predictions-controls">
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            className="days-select"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="predictions-summary">
        <div className="prediction-card main">
          <div className="prediction-icon">💰</div>
          <div className="prediction-content">
            <span className="prediction-label">Predicted Revenue ({days} days)</span>
            <span className="prediction-value">{formatCurrency(predictions.predictedRevenue)}</span>
          </div>
        </div>

        <div className="prediction-card">
          <div className="prediction-icon">{getTrendIcon(predictions.trend)}</div>
          <div className="prediction-content">
            <span className="prediction-label">Trend</span>
            <span 
              className="prediction-value trend"
              style={{ color: getTrendColor(predictions.trend) }}
            >
              {predictions.trend === 'up' ? '+' : predictions.trend === 'down' ? '' : ''}
              {predictions.trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="prediction-card">
          <div className="prediction-icon">🎯</div>
          <div className="prediction-content">
            <span className="prediction-label">Confidence</span>
            <span className="prediction-value">{predictions.confidence}%</span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill"
                style={{ width: `${predictions.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="predictions-chart">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="dateLabel" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  predicted: 'Predicted',
                  upper: 'Upper Bound',
                  lower: 'Lower Bound'
                };
                return [formatCurrency(value), labels[name] || name];
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="transparent"
              fill="url(#confidenceGradient)"
              name="Confidence Range"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="transparent"
              fill="#1f2937"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#a78bfa' }}
              name="Predicted Revenue"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="predictions-insights">
        <h4>💡 Insights</h4>
        <ul>
          {predictions.insights.map((insight, index) => (
            <li key={index}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Predicted Breakdown */}
      <div className="predictions-breakdown">
        <div className="breakdown-item">
          <span className="breakdown-icon">⭐</span>
          <span className="breakdown-label">Est. Subscribers</span>
          <span className="breakdown-value">{predictions.predictedSubscribers}</span>
        </div>
        <div className="breakdown-item">
          <span className="breakdown-icon">💎</span>
          <span className="breakdown-label">Est. Bits</span>
          <span className="breakdown-value">{predictions.predictedBits.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default RevenuePredictions;