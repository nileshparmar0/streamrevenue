import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SubscriberChartProps {
  tier1: number;
  tier2: number;
  tier3: number;
  gifted: number;
}

const COLORS = {
  tier1: '#9147ff',   // Twitch purple
  tier2: '#00b5ad',   // Teal
  tier3: '#f39c12',   // Gold
  gifted: '#e74c3c'   // Red
};

const SubscriberChart: React.FC<SubscriberChartProps> = ({
  tier1,
  tier2,
  tier3,
  gifted
}) => {
  const data = [
    { name: 'Tier 1', value: tier1, color: COLORS.tier1 },
    { name: 'Tier 2', value: tier2, color: COLORS.tier2 },
    { name: 'Tier 3', value: tier3, color: COLORS.tier3 },
  ].filter(item => item.value > 0);

  const total = tier1 + tier2 + tier3;

  if (total === 0) {
    return (
      <div className="no-data">
        <p>No subscriber data available</p>
        <span className="no-data-hint">
          Become a Twitch Affiliate or Partner to track subscribers
        </span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="chart-tooltip">
          <p className="tooltip-name">{data.name}</p>
          <p className="tooltip-value">{data.value} subs ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="subscriber-chart">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-center">
        <span className="total-count">{total}</span>
        <span className="total-label">Total</span>
      </div>
    </div>
  );
};

export default SubscriberChart;
