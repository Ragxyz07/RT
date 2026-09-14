import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { apiRouter, setBroadcaster } from './src/server/api.ts';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Body parsing and security middleware
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Static uploads directory for photos, photobooth, memories
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AKRA Full-Stack Server',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  // ==========================================
  // Real-Time WebSocket Server
  // ==========================================
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of client sockets: coupleId -> Set<{ ws, userId }>
  const coupleSockets = new Map<string, Set<{ ws: WebSocket; userId?: string }>>();

  wss.on('connection', (ws: WebSocket, req) => {
    let currentCoupleId = 'couple_akra_1';
    let currentUserId: string | undefined;

    // Default registration to couple_akra_1
    if (!coupleSockets.has(currentCoupleId)) {
      coupleSockets.set(currentCoupleId, new Set());
    }
    const clientEntry = { ws, userId: currentUserId };
    coupleSockets.get(currentCoupleId)!.add(clientEntry);

    // Initial greeting / ping
    ws.send(JSON.stringify({ type: 'connected', time: Date.now() }));

    ws.on('message', (data: string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'auth') {
          clientEntry.userId = payload.userId;
          if (payload.coupleId) {
            coupleSockets.get(currentCoupleId)?.delete(clientEntry);
            currentCoupleId = payload.coupleId;
            if (!coupleSockets.has(currentCoupleId)) {
              coupleSockets.set(currentCoupleId, new Set());
            }
            coupleSockets.get(currentCoupleId)!.add(clientEntry);
          }
          // Broadcast presence update
          broadcastToCouple(currentCoupleId, 'partner_presence', {
            userId: payload.userId,
            isOnline: true,
          });
          return;
        }

        // Typing indicators
        if (payload.type === 'typing') {
          broadcastToCouple(currentCoupleId, 'typing', {
            userId: payload.userId,
            isTyping: !!payload.isTyping,
          });
          return;
        }

        // Live Movie Sync (play/pause/seek)
        if (payload.type === 'movie_sync') {
          broadcastToCouple(currentCoupleId, 'movie_sync', payload.data);
          return;
        }

        // Live location update
        if (payload.type === 'location_update') {
          broadcastToCouple(currentCoupleId, 'live_location', payload.location);
          return;
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      coupleSockets.get(currentCoupleId)?.delete(clientEntry);
      if (clientEntry.userId) {
        broadcastToCouple(currentCoupleId, 'partner_presence', {
          userId: clientEntry.userId,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err);
    });
  });

  // Broadcast helper function
  function broadcastToCouple(coupleId: string, event: string, payload: any) {
    const clients = coupleSockets.get(coupleId);
    if (!clients) return;

    const messageString = JSON.stringify({ type: event, data: payload, timestamp: Date.now() });

    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageString);
      }
    }
  }

  // Inject broadcaster into API router
  setBroadcaster(broadcastToCouple);

  // ==========================================
  // Vite Middleware / Static Frontend
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`AKRA Backend Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
