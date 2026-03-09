import WebSocket from 'ws';

interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
    subscription_type?: string;
  };
  payload: any;
}

type EventCallback = (event: any, type: string) => void;

class EventSubService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private accessToken: string | null = null;
  private eventCallbacks: EventCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Subscribe to events for a user
  async connect(userId: string, accessToken: string): Promise<string | null> {
    this.userId = userId;
    this.accessToken = accessToken;

    return new Promise((resolve, reject) => {
      try {
        // Connect to Twitch EventSub WebSocket
        this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

        this.ws.on('open', () => {
          console.log('✅ EventSub WebSocket connected');
        });

        this.ws.on('message', async (data: Buffer) => {
          const message: EventSubMessage = JSON.parse(data.toString());
          await this.handleMessage(message, resolve);
        });

        this.ws.on('close', () => {
          console.log('⚠️ EventSub WebSocket closed');
          this.handleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('❌ EventSub WebSocket error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Failed to connect to EventSub:', error);
        reject(error);
      }
    });
  }

  private async handleMessage(message: EventSubMessage, resolveConnect?: (value: string | null) => void) {
    const { metadata, payload } = message;

    switch (metadata.message_type) {
      case 'session_welcome':
        // Save session ID and subscribe to events
        this.sessionId = payload.session.id;
        console.log('✅ EventSub session established:', this.sessionId);
        
        // Subscribe to events
        await this.subscribeToEvents();
        
        if (resolveConnect) {
          resolveConnect(this.sessionId);
        }
        break;

      case 'session_keepalive':
        // Connection is alive, nothing to do
        break;

      case 'notification':
        // Handle event notification
        this.handleNotification(metadata.subscription_type || '', payload);
        break;

      case 'session_reconnect':
        // Twitch wants us to reconnect
        console.log('🔄 EventSub requesting reconnect...');
        const reconnectUrl = payload.session.reconnect_url;
        this.reconnect(reconnectUrl);
        break;

      case 'revocation':
        console.log('⚠️ Subscription revoked:', payload.subscription.type);
        break;
    }
  }

  private async subscribeToEvents() {
    if (!this.sessionId || !this.userId || !this.accessToken) {
      console.error('❌ Cannot subscribe: missing session, user, or token');
      return;
    }

    const subscriptions = [
      {
        type: 'channel.subscribe',
        version: '1',
        condition: { broadcaster_user_id: this.userId }
      },
      {
        type: 'channel.subscription.gift',
        version: '1',
        condition: { broadcaster_user_id: this.userId }
      },
      {
        type: 'channel.cheer',
        version: '1',
        condition: { broadcaster_user_id: this.userId }
      },
      {
        type: 'channel.follow',
        version: '2',
        condition: { 
          broadcaster_user_id: this.userId,
          moderator_user_id: this.userId
        }
      }
    ];

    for (const sub of subscriptions) {
      try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: sub.type,
            version: sub.version,
            condition: sub.condition,
            transport: {
              method: 'websocket',
              session_id: this.sessionId
            }
          })
        });

        if (response.ok) {
          console.log(`✅ Subscribed to ${sub.type}`);
        } else {
          const error = await response.json();
          console.log(`⚠️ Failed to subscribe to ${sub.type}:`, (error as Error).message || response.status);
        }
      } catch (error) {
        console.error(`❌ Error subscribing to ${sub.type}:`, error);
      }
    }
  }

  private handleNotification(type: string, payload: any) {
    const event = payload.event;
    
    console.log(`🔔 Event received: ${type}`, event);

    // Notify all callbacks
    this.eventCallbacks.forEach(callback => {
      callback(event, type);
    });
  }

  private reconnect(url?: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting (attempt ${this.reconnectAttempts})...`);

    if (this.ws) {
      this.ws.close();
    }

    setTimeout(() => {
      if (this.userId && this.accessToken) {
        this.connect(this.userId, this.accessToken);
      }
    }, 1000 * this.reconnectAttempts);
  }

  private handleReconnect() {
    if (this.userId && this.accessToken) {
      setTimeout(() => {
        this.reconnect();
      }, 5000);
    }
  }

  // Register callback for events
  onEvent(callback: EventCallback) {
    this.eventCallbacks.push(callback);
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.eventCallbacks = [];
    console.log('✅ EventSub disconnected');
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Export singleton instance
export const eventSubService = new EventSubService();
export default eventSubService;