import { WebSocketServer, WebSocket } from 'ws';
import { type IncomingMessage, type Server } from 'http';
import { type Socket } from 'net';
import { randomUUID } from 'crypto';

interface WSClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private authTokens: Map<string, { userId: string; expiresAt: number }> = new Map();
  private server: Server | null = null;
  private upgradeHandler: ((request: IncomingMessage, socket: Socket, head: Buffer) => void) | null = null;

  issueConnectionToken(userId: string, ttlMs: number = 60_000): string {
    const token = randomUUID();
    this.authTokens.set(token, {
      userId,
      expiresAt: Date.now() + ttlMs,
    });
    return token;
  }

  private consumeConnectionToken(token?: string): string | null {
    if (!token) return null;

    const entry = this.authTokens.get(token);
    if (!entry) return null;

    this.authTokens.delete(token);
    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.userId;
  }

  initialize(server: Server) {
    if (this.wss) {
      return;
    }

    this.server = server;
    this.wss = new WebSocketServer({ noServer: true });

    this.upgradeHandler = (request, socket, head) => {
      const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const pathname = requestUrl.pathname;
      if (pathname !== '/ws') {
        return;
      }

      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit('connection', ws, request);
      });
    };

    server.on('upgrade', this.upgradeHandler);

    this.wss.on('connection', async (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      
      // Parse one-time auth token from query params
      const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const token = requestUrl.searchParams.get('token') || undefined;
      const userId = this.consumeConnectionToken(token);
      
      if (!userId) {
        ws.close(1008, 'Invalid or expired token');
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
      const now = Date.now();
      this.authTokens.forEach((entry, token) => {
        if (now > entry.expiresAt) {
          this.authTokens.delete(token);
        }
      });

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

    if (this.server && this.upgradeHandler) {
      this.server.off('upgrade', this.upgradeHandler);
    }

    this.server = null;
    this.upgradeHandler = null;
  }
}

export const wsManager = new WebSocketManager();
