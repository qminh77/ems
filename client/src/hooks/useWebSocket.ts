import { useEffect, useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface SharedState {
  ws: WebSocket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectPromise: Promise<void> | null;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  pingInterval: ReturnType<typeof setInterval> | null;
  userId: string | null;
  subscriberCount: number;
}

const sharedState: SharedState = {
  ws: null,
  isConnected: false,
  lastMessage: null,
  connectPromise: null,
  reconnectTimeout: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  pingInterval: null,
  userId: null,
  subscriberCount: 0,
};

const listeners = new Set<(state: { isConnected: boolean; lastMessage: WebSocketMessage | null }) => void>();

function notify() {
  const snapshot = {
    isConnected: sharedState.isConnected,
    lastMessage: sharedState.lastMessage,
  };
  listeners.forEach((listener) => listener(snapshot));
}

function handleMessage(message: WebSocketMessage) {
  sharedState.lastMessage = message;

  switch (message.type) {
    case 'checkin_update':
      queryClient.setQueryData(['/api/checkin/recent'], (current: any[] | undefined) => {
        if (!Array.isArray(current)) {
          return current;
        }

        const withoutDuplicate = current.filter((item) => item.id !== message.data?.id);
        return [message.data, ...withoutDuplicate].slice(0, current.length);
      });
      break;

    case 'stats_update':
      queryClient.setQueryData(['/api/dashboard/stats'], message.data);
      break;

    case 'attendee_update':
      queryClient.invalidateQueries({
        queryKey: ['/api/events', String(message.data.eventId), 'attendees'],
      });
      break;

    default:
      break;
  }

  notify();
}

async function getConnectionToken(): Promise<string> {
  const response = await fetch('/api/ws-token', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to get websocket token');
  }

  const payload = await response.json();
  return payload.token;
}

async function connect(userId: string) {
  if (sharedState.userId && sharedState.userId !== userId) {
    disconnectAll();
  }

  const sameUserConnection =
    sharedState.ws &&
    sharedState.userId === userId &&
    (sharedState.ws.readyState === WebSocket.OPEN || sharedState.ws.readyState === WebSocket.CONNECTING);

  if (sameUserConnection) {
    return;
  }

  if (sharedState.connectPromise) {
    return sharedState.connectPromise;
  }

  if (sharedState.reconnectTimeout) {
    clearTimeout(sharedState.reconnectTimeout);
    sharedState.reconnectTimeout = null;
  }

  sharedState.userId = userId;

  sharedState.connectPromise = (async () => {
    try {
      const token = await getConnectionToken();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      sharedState.ws = ws;

      ws.onopen = () => {
        sharedState.isConnected = true;
        sharedState.reconnectAttempts = 0;
        notify();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        sharedState.isConnected = false;
        sharedState.ws = null;
        notify();

        if (sharedState.subscriberCount === 0) {
          return;
        }

        if (sharedState.reconnectAttempts < sharedState.maxReconnectAttempts) {
          const timeout = Math.min(1000 * Math.pow(2, sharedState.reconnectAttempts), 30000);
          sharedState.reconnectTimeout = setTimeout(() => {
            sharedState.reconnectAttempts += 1;
            if (sharedState.userId) {
              connect(sharedState.userId);
            }
          }, timeout);
        }
      };

      ws.onerror = () => {
        // Keep silent in UI, onclose handles reconnection.
      };

      if (!sharedState.pingInterval) {
        sharedState.pingInterval = setInterval(() => {
          if (sharedState.ws?.readyState === WebSocket.OPEN) {
            sharedState.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 60000);
      }
    } catch {
      sharedState.isConnected = false;
      notify();
    }
  })();

  try {
    await sharedState.connectPromise;
  } finally {
    sharedState.connectPromise = null;
  }
}

function disconnectAll() {
  if (sharedState.reconnectTimeout) {
    clearTimeout(sharedState.reconnectTimeout);
    sharedState.reconnectTimeout = null;
  }

  if (sharedState.pingInterval) {
    clearInterval(sharedState.pingInterval);
    sharedState.pingInterval = null;
  }

  if (sharedState.ws) {
    sharedState.ws.close();
    sharedState.ws = null;
  }

  sharedState.userId = null;
  sharedState.connectPromise = null;
  sharedState.isConnected = false;
  sharedState.lastMessage = null;
  sharedState.reconnectAttempts = 0;
  notify();
}

export function useWebSocket() {
  const { user } = useAuth() as { user?: any };

  const [state, setState] = useState({
    isConnected: sharedState.isConnected,
    lastMessage: sharedState.lastMessage,
  });

  useEffect(() => {
    listeners.add(setState);
    sharedState.subscriberCount += 1;
    notify();

    return () => {
      listeners.delete(setState);
      sharedState.subscriberCount = Math.max(0, sharedState.subscriberCount - 1);
      if (sharedState.subscriberCount === 0) {
        disconnectAll();
      }
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect(user.id);
    }
  }, [user?.id]);

  const sendMessage = (message: any) => {
    if (sharedState.ws?.readyState === WebSocket.OPEN) {
      sharedState.ws.send(JSON.stringify(message));
    }
  };

  const disconnect = () => {
    disconnectAll();
  };

  return {
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    sendMessage,
    disconnect,
  };
}
