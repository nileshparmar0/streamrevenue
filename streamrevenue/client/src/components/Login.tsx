import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useTwitchData';
import { authApi } from '../services/api';

const Login: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = () => {
    window.location.href = authApi.getLoginUrl();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>💰 StreamRevenue</h1>
          <p>Track your Twitch earnings in one place</p>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span>
            {error === 'missing_code' && 'Authentication failed. Please try again.'}
            {error === 'auth_failed' && 'Could not connect to Twitch. Please try again.'}
            {error === 'session_error' && 'Session error. Please try again.'}
            {!['missing_code', 'auth_failed', 'session_error'].includes(error) && error}
          </div>
        )}

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">📊</span>
            <div>
              <h3>Revenue Dashboard</h3>
              <p>Track subs, bits, and total earnings</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <div>
              <h3>Subscriber Analytics</h3>
              <p>See tier breakdown and trends</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">🎉</span>
            <div>
              <h3>Bits Leaderboard</h3>
              <p>View top supporters and cheers</p>
            </div>
          </div>
        </div>

        <button onClick={handleLogin} className="btn btn-twitch">
          <svg viewBox="0 0 24 24" className="twitch-icon">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
          Login with Twitch
        </button>

        <p className="login-note">
          We only request read-only access to your channel data.
          <br />Your information is never stored or shared.
        </p>
      </div>
    </div>
  );
};

export default Login;
