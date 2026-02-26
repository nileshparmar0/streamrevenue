import React, { useEffect, useState, useCallback } from 'react';

interface AlertEvent {
  id: string;
  type: string;
  event: any;
  timestamp: string;
}

const LiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAlert = useCallback((alert: AlertEvent) => {
    setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        // Connect to Server-Sent Events
        eventSource = new EventSource('http://localhost:3001/api/events/stream', {
          withCredentials: true
        });

        eventSource.onopen = () => {
          console.log('✅ SSE Connected');
          setConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 Event received:', data);

            if (data.type === 'connected') {
              // Initial connection message
              return;
            }

            // Add unique ID
            const alertEvent: AlertEvent = {
              id: `${Date.now()}-${Math.random()}`,
              type: data.type,
              event: data.event,
              timestamp: data.timestamp || new Date().toISOString()
            };

            addAlert(alertEvent);
          } catch (err) {
            console.error('Failed to parse event:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('❌ SSE Error:', err);
          setConnected(false);
          setError('Connection lost. Reconnecting...');
          
          // Reconnect after 5 seconds
          setTimeout(() => {
            if (eventSource) {
              eventSource.close();
            }
            connectSSE();
          }, 5000);
        };

      } catch (err: any) {
        console.error('Failed to connect SSE:', err);
        setError(err.message);
      }
    };

    // Start EventSub subscription
    const startEventSub = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/events/subscribe', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          console.log('✅ EventSub started');
          connectSSE();
        } else {
          console.error('Failed to start EventSub');
        }
      } catch (err) {
        console.error('EventSub error:', err);
        // Still try SSE for test events
        connectSSE();
      }
    };

    startEventSub();

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [addAlert]);

  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'channel.subscribe':
        return '⭐';
      case 'channel.subscription.gift':
        return '🎁';
      case 'channel.cheer':
        return '💎';
      case 'channel.follow':
        return '💜';
      case 'test':
        return '🧪';
      default:
        return '🔔';
    }
  };

  const getAlertTitle = (type: string): string => {
    switch (type) {
      case 'channel.subscribe':
        return 'New Subscriber!';
      case 'channel.subscription.gift':
        return 'Gift Sub!';
      case 'channel.cheer':
        return 'Bits Cheer!';
      case 'channel.follow':
        return 'New Follower!';
      case 'test':
        return 'Test Alert';
      default:
        return 'New Event';
    }
  };

  const getAlertMessage = (type: string, event: any): string => {
    switch (type) {
      case 'channel.subscribe':
        return `${event.user_name} subscribed!`;
      case 'channel.subscription.gift':
        return `${event.user_name} gifted ${event.total} subs!`;
      case 'channel.cheer':
        return `${event.user_name} cheered ${event.bits} bits!`;
      case 'channel.follow':
        return `${event.user_name} followed!`;
      case 'test':
        return event.message || 'Test notification';
      default:
        return JSON.stringify(event);
    }
  };

  const sendTestAlert = async () => {
    try {
      await fetch('http://localhost:3001/api/events/test', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to send test:', err);
    }
  };

  return (
    <div className="live-alerts-container">
      <div className="live-alerts-header">
        <h3>🔔 Live Alerts</h3>
        <div className="alerts-status">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          <button onClick={sendTestAlert} className="btn btn-sm btn-outline">
            Test
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error">{error}</div>
      )}

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <p>No alerts yet</p>
            <span>Events will appear here in real-time</span>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`alert-item alert-${alert.type.replace('.', '-')}`}>
              <span className="alert-icon">{getAlertIcon(alert.type)}</span>
              <div className="alert-content">
                <strong>{getAlertTitle(alert.type)}</strong>
                <p>{getAlertMessage(alert.type, alert.event)}</p>
              </div>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveAlerts;