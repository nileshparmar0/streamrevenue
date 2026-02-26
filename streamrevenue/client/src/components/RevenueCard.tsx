import React from 'react';

interface RevenueCardProps {
  title: string;
  amount: number;
  icon: string;
  subtitle?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange';
  large?: boolean;
}

const RevenueCard: React.FC<RevenueCardProps> = ({
  title,
  amount,
  icon,
  subtitle,
  color = 'purple',
  large = false
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className={`revenue-card ${color} ${large ? 'large' : ''}`}>
      <div className="revenue-card-header">
        <span className="revenue-icon">{icon}</span>
        <h3 className="revenue-title">{title}</h3>
      </div>
      <div className="revenue-amount">
        {formatCurrency(amount)}
      </div>
      {subtitle && (
        <div className="revenue-subtitle">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default RevenueCard;
