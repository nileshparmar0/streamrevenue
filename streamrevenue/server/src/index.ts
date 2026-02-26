import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import revenueRoutes from './routes/revenue';
import eventsRoutes from './routes/events';
import { initializeDatabase } from './services/database';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Extend session type for TypeScript
declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    user?: {
      id: string;
      login: string;
      display_name: string;
      profile_image_url: string;
      email?: string;
    };
  }
}

// Routes
app.use('/auth', authRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/events', eventsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'StreamRevenue API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      revenue: '/api/revenue'
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`
  🎮 StreamRevenue Server Running!
  ================================
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}
  
  Endpoints:
  - GET  /health          - Health check
  - GET  /auth/login      - Start Twitch OAuth
  - GET  /auth/callback   - OAuth callback
  - GET  /auth/me         - Get current user
  - GET  /auth/logout     - Logout
  - GET  /api/revenue/*   - Revenue endpoints
  `);

  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
});

export default app;
