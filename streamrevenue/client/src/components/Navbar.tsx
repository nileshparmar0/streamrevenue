import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useTwitchData';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo">
          <span className="logo-icon">💰</span>
          <span className="logo-text">StreamRevenue</span>
        </Link>
      </div>

      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <div className="user-menu">
              {user?.profile_image_url && (
                <img 
                  src={user.profile_image_url} 
                  alt={user.display_name}
                  className="user-avatar"
                />
              )}
              <span className="user-name">{user?.display_name}</span>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login with Twitch
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
