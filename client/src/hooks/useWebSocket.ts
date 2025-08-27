import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const { toast } = useToast();
  
  // Get user data
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

  const connect = useCallback(() => {
    if (!user?.id || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?userId=${user.id}`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial ping
        ws.current?.send(JSON.stringify({ type: 'ping' }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        ws.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, timeout);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [user?.id]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', message.data);
        break;
        
      case 'checkin_update':
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/checkin/recent'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        
        // Show notification for check-in updates
        const action = message.data.action === 'check_in' ? 'Check-in' : 'Check-out';
        toast({
          title: `${action} Real-time`,
          description: `${message.data.attendee.name} - ${message.data.attendee.studentId}`,
          duration: 3000,
        });
        break;
        
      case 'stats_update':
        // Update dashboard stats
        queryClient.setQueryData(['/api/dashboard/stats'], message.data);
        break;
        
      case 'attendee_update':
        // Update attendee list for specific event
        queryClient.invalidateQueries({ 
          queryKey: [`/api/events/${message.data.eventId}/attendees`] 
        });
        break;
        
      case 'pong':
        // Server responded to ping
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [toast]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds

    // Page visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, could disconnect to save resources
      } else {
        // Page is visible, ensure connection
        if (!isConnected && user?.id) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [user?.id, connect, disconnect, sendMessage]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect
  };
}