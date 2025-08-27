import { WebSocketServer, WebSocket } from 'ws';
import { type Server } from 'http';
import { parse } from 'url';
import { storage } from './storage';

interface WSClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', async (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      
      // Parse userId from query params
      const url = parse(request.url || '', true);
      const userId = url.query.userId as string;
      
      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        ws.close(1008, 'Invalid user');
        return;
      }

      const client: WSClient = {
        ws,
        userId,
        isAlive: true
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId} (User: ${userId})`);

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          clientId,
          userId
        }
      }));

      // Handle pong messages
      ws.on('pong', () => {
        client.isAlive = true;
      });

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid message format:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });

    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'subscribe':
        // Handle subscription to specific events
        console.log(`Client ${clientId} subscribing to:`, message.data);
        break;
      default:
        console.log(`Unknown message type from ${clientId}:`, message.type);
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Broadcast check-in update to all connected clients of the same user
  broadcastCheckinUpdate(userId: string, data: any) {
    const message = JSON.stringify({
      type: 'checkin_update',
      data
    });

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Broadcast stats update to all connected clients of the same user
  broadcastStatsUpdate(userId: string, stats: any) {
    const message = JSON.stringify({
      type: 'stats_update',
      data: stats
    });

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Broadcast attendee status update
  broadcastAttendeeUpdate(userId: string, eventId: number, attendee: any) {
    const message = JSON.stringify({
      type: 'attendee_update',
      data: {
        eventId,
        attendee
      }
    });

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const wsManager = new WebSocketManager();