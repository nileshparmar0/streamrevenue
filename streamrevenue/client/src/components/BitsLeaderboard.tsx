import React from 'react';

interface BitsLeader {
  user_name: string;
  score: number;
  rank: number;
}

interface BitsLeaderboardProps {
  leaders: BitsLeader[];
}

const BitsLeaderboard: React.FC<BitsLeaderboardProps> = ({ leaders }) => {
  if (!leaders || leaders.length === 0) {
    return (
      <div className="no-data">
        <p>No bits data available</p>
        <span className="no-data-hint">
          Become a Twitch Affiliate or Partner to track bits
        </span>
      </div>
    );
  }

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatBits = (bits: number): string => {
    if (bits >= 1000000) {
      return (bits / 1000000).toFixed(1) + 'M';
    }
    if (bits >= 1000) {
      return (bits / 1000).toFixed(1) + 'K';
    }
    return bits.toLocaleString();
  };

  const calculateUSD = (bits: number): string => {
    return (bits / 100).toFixed(2);
  };

  return (
    <div className="bits-leaderboard">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Bits</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {leaders.slice(0, 10).map((leader, index) => (
            <tr key={leader.user_name} className={index < 3 ? 'top-three' : ''}>
              <td className="rank-cell">
                {getRankEmoji(leader.rank || index + 1)}
              </td>
              <td className="user-cell">
                <span className="username">{leader.user_name}</span>
              </td>
              <td className="bits-cell">
                <span className="bits-icon">💜</span>
                {formatBits(leader.score)}
              </td>
              <td className="value-cell">
                ${calculateUSD(leader.score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {leaders.length > 10 && (
        <div className="leaderboard-footer">
          <span>+ {leaders.length - 10} more supporters</span>
        </div>
      )}
    </div>
  );
};

export default BitsLeaderboard;
