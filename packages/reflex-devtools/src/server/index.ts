import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';

export interface ServerConfig {
  port: number;
  host?: string;
}

export class DevtoolsServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private config: ServerConfig;
  private uiClients: Set<WebSocket> = new Set();
  private sdkClients: Set<WebSocket> = new Set();

  constructor(config: ServerConfig) {
    this.config = {
      host: 'localhost',
      ...config
    };

    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(process.cwd(), '../reflex-devtool-ui/dist')));
  }

  private setupRoutes(): void {
    // HTTP fallback endpoint for receiving events from client SDK
    this.app.post('/event', (req: Request, res: Response) => {
      const event = req.body;
      console.log('[Reflex Devtools] Received HTTP event:', event);
      
      // Forward event to all connected UI clients
      this.broadcastToUI(event);
      
      res.json({ success: true });
    });

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        connectedClients: this.uiClients.size,
        timestamp: Date.now()
      });
    });

    // Serve UI dashboard for all other routes
    this.app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), '../reflex-devtool-ui/dist/index.html'));
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const url = req.url;
      
      if (url === '/sdk') {
        // Connection from client SDK
        console.log('[Reflex Devtools] SDK client connected');
        this.sdkClients.add(ws);
        
        // Send current UI connection count to newly connected SDK client
        ws.send(JSON.stringify({
          type: 'ui-connection-status',
          payload: { connectedUIs: this.uiClients.size },
          timestamp: Date.now()
        }));
        
        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());
            
            // Forward event to all connected UI clients
            this.broadcastToUI(event);
          } catch (error) {
            console.error('[Reflex Devtools] Error parsing event:', error);
          }
        });

        ws.on('close', () => {
          console.log('[Reflex Devtools] SDK client disconnected');
          this.sdkClients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('[Reflex Devtools] SDK WebSocket error:', error);
          this.sdkClients.delete(ws);
        });

      } else if (url === '/ui') {
        // Connection from UI dashboard
        console.log('[Reflex Devtools] UI client connected');
        this.uiClients.add(ws);
        
        // Notify all SDK clients about UI connection change
        this.notifySDKClientsUIStatus();
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'devtools-connected',
          payload: { message: 'Connected to Reflex Devtools' },
          timestamp: Date.now()
        }));

        ws.on('close', () => {
          console.log('[Reflex Devtools] UI client disconnected');
          this.uiClients.delete(ws);
          
          // Notify all SDK clients about UI connection change
          this.notifySDKClientsUIStatus();
        });

        ws.on('error', (error) => {
          console.error('[Reflex Devtools] UI WebSocket error:', error);
          this.uiClients.delete(ws);
          
          // Notify all SDK clients about UI connection change
          this.notifySDKClientsUIStatus();
        });
      }
    });
  }

  private notifySDKClientsUIStatus(): void {
    const message = JSON.stringify({
      type: 'ui-connection-status',
      payload: { connectedUIs: this.uiClients.size },
      timestamp: Date.now()
    });
    
    this.sdkClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('[Reflex Devtools] Error sending UI status to SDK client:', error);
          this.sdkClients.delete(client);
        }
      } else {
        this.sdkClients.delete(client);
      }
    });
  }

  private broadcastToUI(event: any): void {
    const message = JSON.stringify(event);
    
    this.uiClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('[Reflex Devtools] Error sending to UI client:', error);
          this.uiClients.delete(client);
        }
      } else {
        this.uiClients.delete(client);
      }
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`[Reflex Devtools] Dashboard: http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all active WebSocket connections
      this.uiClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
          client.terminate();
        }
      });
      this.uiClients.clear();

      this.sdkClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
          client.terminate();
        }
      });
      this.sdkClients.clear();

      // Close WebSocket server
      this.wss.close(() => {
        // Close HTTP server
        this.server.close(() => {
          console.log('[Reflex Devtools] Server stopped');
          resolve();
        });
      });
    });
  }
} 