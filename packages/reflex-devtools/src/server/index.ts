import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TraceStorage } from './storage.js';

export interface ServerConfig {
  port: number;
  host?: string;
  maxTraces?: number;
  enableMCP?: boolean;
}

export class DevtoolsServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private config: ServerConfig;
  private uiClients: Set<WebSocket> = new Set();
  private sdkClients: Set<WebSocket> = new Set();
  private storage: TraceStorage | null = null;
  private uiPath: string;

  constructor(config: ServerConfig) {
    this.config = {
      host: 'localhost',
      maxTraces: 1000,
      enableMCP: false,
      ...config
    };

    // Initialize storage only if MCP is enabled
    if (this.config.enableMCP) {
      this.storage = new TraceStorage(this.config.maxTraces!);
      console.log('[Reflex Devtools] MCP enabled - trace storage active');
    }

    // Get the directory of the current module and resolve UI path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.uiPath = path.join(__dirname, '../ui');

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
    this.app.use(express.static(this.uiPath));
  }

  private setupRoutes(): void {
    // HTTP fallback endpoint for receiving events from client SDK
    this.app.post('/event', (req: Request, res: Response) => {
      const event = req.body;
      
      // Process and store the event
      this.processEvent(event);
      
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

    // MCP API: Get traces
    this.app.get('/api/traces', (req: Request, res: Response) => {
      if (!this.storage) {
        res.status(503).json({ 
          success: false, 
          error: 'MCP not enabled. Start server with --mcp flag to enable trace storage.' 
        });
        return;
      }

      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const eventFilter = req.query.eventFilter as string | undefined;
        const minDuration = req.query.minDuration ? parseFloat(req.query.minDuration as string) : undefined;
        const opType = req.query.opType as string | undefined;

        const traces = this.storage.getTraces({
          limit,
          eventFilter,
          minDuration,
          opType
        });

        res.json({ success: true, traces });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MCP API: Get app state
    this.app.get('/api/state', (_req: Request, res: Response) => {
      if (!this.storage) {
        res.status(503).json({ 
          success: false, 
          error: 'MCP not enabled. Start server with --mcp flag to enable trace storage.' 
        });
        return;
      }

      try {
        const state = this.storage.getAppState();
        res.json({ success: true, state });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MCP API: Get active subscriptions
    this.app.get('/api/subscriptions', (_req: Request, res: Response) => {
      if (!this.storage) {
        res.status(503).json({ 
          success: false, 
          error: 'MCP not enabled. Start server with --mcp flag to enable trace storage.' 
        });
        return;
      }

      try {
        const subs = this.storage.getActiveSubs();
        res.json({ success: true, subscriptions: subs });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MCP API: Get handlers
    this.app.get('/api/handlers', (_req: Request, res: Response) => {
      if (!this.storage) {
        res.status(503).json({ 
          success: false, 
          error: 'MCP not enabled. Start server with --mcp flag to enable trace storage.' 
        });
        return;
      }

      try {
        const handlerKeys = this.storage.getHandlerKeys();

        res.json({
          success: true,
          handlerKeys
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MCP API: Get storage stats
    this.app.get('/api/stats', (_req: Request, res: Response) => {
      if (!this.storage) {
        res.status(503).json({ 
          success: false, 
          error: 'MCP not enabled. Start server with --mcp flag to enable trace storage.' 
        });
        return;
      }

      try {
        const stats = this.storage.getStats();
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MCP API: Dispatch event to client
    this.app.post('/api/dispatch', (req: Request, res: Response) => {
      try {
        const { eventName, params } = req.body;
        
        if (!eventName) {
          res.status(400).json({ success: false, error: 'eventName is required' });
          return;
        }

        const message = {
          type: 'dispatch-to-client',
          payload: { eventName, params: params || [] },
          timestamp: Date.now()
        };

        this.broadcastToSDK(message);
        res.json({ success: true, message: 'Event dispatched' });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Serve UI dashboard for all other routes
    this.app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(this.uiPath, 'index.html'));
    });
  }

  private processEvent(event: any): void {
    // Store events in the trace storage (only if MCP is enabled)
    if (!this.storage) return;
    
    try {
      switch (event.type) {
        case 'reflex-traces':
          if (event.payload && Array.isArray(event.payload)) {
            this.storage.addTraces(event.payload);
          }
          break;

        case 'reflex-app-db':
          if (event.payload) {
            this.storage.updateAppState(event.payload);
          }
          break;

        case 'reflex-active-subs':
          if (event.payload) {
            this.storage.updateActiveSubs(event.payload);
          }
          break;

        case 'reflex-handler-keys':
          if (event.payload) {
            this.storage.updateHandlerKeys(event.payload);
          }
          break;
      }
    } catch (error) {
      console.error('[Reflex Devtools] Error processing event:', error);
    }
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const url = req.url;
      
      if (url === '/sdk') {
        // Connection from client SDK
        console.log('[Reflex Devtools] SDK client connected');

        // Clear storage on client reconnect (new session)
        if (this.storage) {
          this.storage.clear();
          console.log('[Reflex Devtools] Storage cleared - new client session');
        }

        this.sdkClients.add(ws);

        // Send connection status to newly connected SDK client
        // If MCP is enabled, treat it as if there's always a UI connected to trigger state sending
        const connectedUIs = this.config.enableMCP ? 1 : this.uiClients.size;
        ws.send(JSON.stringify({
          type: 'ui-connection-status',
          payload: { connectedUIs },
          timestamp: Date.now()
        }));
        
        ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());
            
            // Process and store the event
            this.processEvent(event);
            
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

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            // Handle messages from UI (e.g., dispatch-to-client)
            if (message.type === 'dispatch-to-client') {
              // Forward the dispatch request to all SDK clients
              this.broadcastToSDK(message);
            }
          } catch (error) {
            console.error('[Reflex Devtools] Error parsing UI message:', error);
          }
        });

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

  private broadcastToSDK(message: any): void {
    const messageStr = JSON.stringify(message);

    this.sdkClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('[Reflex Devtools] Error sending to SDK client:', error);
          this.sdkClients.delete(client);
        }
      } else {
        this.sdkClients.delete(client);
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