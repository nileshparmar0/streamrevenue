import { Router, Request, Response } from 'express';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getCurrentUser,
  revokeToken
} from '../services/twitchApi';
import { saveUser } from '../services/database';

const router = Router();

/**
 * GET /auth/login
 * Redirect to Twitch OAuth authorization page
 */
router.get('/login', (req: Request, res: Response) => {
  const authUrl = getAuthorizationUrl();
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Handle OAuth callback from Twitch
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(error as string)}`
    );
  }

  // Ensure we have an authorization code
  if (!code || typeof code !== 'string') {
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=missing_code`
    );
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get user information
    const user = await getCurrentUser(tokenData.access_token);

    // Save user to database
    try {
      await saveUser({
        id: user.id,
        login: user.login,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url,
        email: user.email
      });
      console.log('✅ User saved to database:', user.login);
    } catch (dbError) {
      console.error('⚠️ Failed to save user to database:', dbError);
      // Continue anyway - don't block login
    }

    // Store in session
    req.session.accessToken = tokenData.access_token;
    req.session.refreshToken = tokenData.refresh_token;
    req.session.user = {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
      email: user.email
    };

    // Save session and redirect to dashboard
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=session_error`);
      }
      res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    });

  } catch (err: any) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.redirect(
      `${process.env.CLIENT_URL}/login?error=auth_failed`
    );
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({
      authenticated: false,
      user: null
    });
  }

  res.json({
    authenticated: true,
    user: req.session.user
  });
});

/**
 * GET /auth/logout
 * Logout user and clear session
 */
router.get('/logout', async (req: Request, res: Response) => {
  try {
    // Revoke Twitch token if we have one
    if (req.session.accessToken) {
      try {
        await revokeToken(req.session.accessToken);
      } catch (err) {
        // Token revocation failure shouldn't block logout
        console.warn('Token revocation failed:', err);
      }
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });

  } catch (err: any) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /auth/status
 * Quick check if user is authenticated
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    authenticated: !!req.session.user,
    userId: req.session.user?.id || null
  });
});

export default router;