import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.accessToken || !req.session.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login with Twitch to access this resource'
    });
  }
  next();
}

/**
 * Middleware to check if user is a Twitch Partner/Affiliate
 * (Required for subscription data access)
 */
export function requireBroadcaster(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login with Twitch'
    });
  }

  // Note: We could check broadcaster_type here, but we'll let the API
  // handle this and return appropriate errors
  next();
}

/**
 * Get user ID from session
 */
export function getUserId(req: Request): string | null {
  return req.session.user?.id || null;
}

/**
 * Get access token from session
 */
export function getAccessToken(req: Request): string | null {
  return req.session.accessToken || null;
}
