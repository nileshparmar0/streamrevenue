import { Router, Request, Response } from 'express';
import { requireAuth, getAccessToken, getUserId } from '../middleware/authMiddleware';
import { eventSubService } from '../services/eventSub';

const router = Router();

// Store for Server-Sent Events clients
const clients: Map<string, Response> = new Map();

// All event routes require authentication
router.use(requireAuth);

/**
 * GET /api/events/stream
 * Server-Sent Events endpoint for real-time updates
 */
router.get('/stream', (req: Request, res: Response) => {
  const userId = getUserId(req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  // Store client connection
  clients.set(userId, res);
  console.log(`✅ SSE client connected: ${userId}`);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(userId);
    console.log(`⚠️ SSE client disconnected: ${userId}`);
  });
});

/**
 * POST /api/events/subscribe
 * Start EventSub for the authenticated user
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = getUserId(req);

    if (!accessToken || !userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if already connected
    if (eventSubService.isConnected()) {
      return res.json({
        success: true,
        message: 'Already connected to EventSub',
        sessionId: eventSubService.getSessionId()
      });
    }

    // Register event handler to forward events to SSE clients
    eventSubService.onEvent((event, type) => {
      const clientRes = clients.get(userId);
      if (clientRes) {
        const eventData = {
          type,
          event,
          timestamp: new Date().toISOString()
        };
        clientRes.write(`data: ${JSON.stringify(eventData)}\n\n`);
      }
    });

    // Connect to EventSub
    const sessionId = await eventSubService.connect(userId, accessToken);

    res.json({
      success: true,
      message: 'Connected to EventSub',
      sessionId
    });

  } catch (err: any) {
    console.error('EventSub subscribe error:', err.message);
    res.status(500).json({
      error: 'Failed to subscribe to events',
      message: err.message
    });
  }
});

/**
 * POST /api/events/unsubscribe
 * Stop EventSub connection
 */
router.post('/unsubscribe', (req: Request, res: Response) => {
  try {
    eventSubService.disconnect();
    res.json({
      success: true,
      message: 'Disconnected from EventSub'
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to unsubscribe',
      message: err.message
    });
  }
});

/**
 * GET /api/events/status
 * Get EventSub connection status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    connected: eventSubService.isConnected(),
    sessionId: eventSubService.getSessionId(),
    clientsConnected: clients.size
  });
});

/**
 * POST /api/events/test
 * Send a test event (for development)
 */
router.post('/test', (req: Request, res: Response) => {
  const userId = getUserId(req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const clientRes = clients.get(userId);
  if (clientRes) {
    const testEvent = {
      type: 'test',
      event: {
        user_name: 'TestUser',
        message: 'This is a test notification! 🎉'
      },
      timestamp: new Date().toISOString()
    };
    clientRes.write(`data: ${JSON.stringify(testEvent)}\n\n`);
    res.json({ success: true, message: 'Test event sent' });
  } else {
    res.status(400).json({ error: 'No SSE client connected' });
  }
});

export default router;