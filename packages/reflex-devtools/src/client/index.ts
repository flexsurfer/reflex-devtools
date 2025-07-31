import { enableTracing, registerTraceCb, disableTracing, getAppDb } from "@flexsurfer/reflex";

export interface DevtoolsConfig {
  serverUrl: string;
  enabled?: boolean;
}

export interface EventPayload {
  type: string;
  component?: string;
  payload: any;
  timestamp?: number;
}

class DevtoolsClient {
  private config: DevtoolsConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectedUIs = 0;
  private isTracingEnabled = false;

  constructor(config: DevtoolsConfig) {
    this.config = {
      enabled: true,
      ...config,
      serverUrl: config.serverUrl || 'localhost:4000'
    };
  }

  async init(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await this.connectWebSocket();
    } catch (error) {
      console.warn('[Reflex Devtools] WebSocket connection failed, using HTTP fallback');
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = 'ws://' + this.config.serverUrl + '/sdk';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[Reflex Devtools] Connected via WebSocket');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('[Reflex Devtools] Error parsing server message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Reflex Devtools] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.attemptReconnect();
      };

      // Set a timeout for connection
      setTimeout(() => {
        if (!this.isConnected) {
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`[Reflex Devtools] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket().catch(() => {
          // Silently fail and try again
        });
      }, 2000 * this.reconnectAttempts);
    }
  }

  private handleServerMessage(message: any): void {
    if (message.type === 'ui-connection-status') {
      const newUICount = message.payload.connectedUIs;
      const previousUICount = this.connectedUIs;
      this.connectedUIs = newUICount;
      
      console.log(`[Reflex Devtools] UI connections changed: ${previousUICount} -> ${newUICount}`);
      
      // Start tracing when first UI connects
      if (previousUICount === 0 && newUICount > 0) {
        this.startTracing();
      }
      // Stop tracing when last UI disconnects
      else if (previousUICount > 0 && newUICount === 0) {
        this.stopTracing();
      }
    }
  }

  private startTracing(): void {
    if (!this.isTracingEnabled) {
      console.log('[Reflex Devtools] Starting tracing - UI connected');
      this.isTracingEnabled = true;
      enableTracing();

      registerTraceCb('reflex-devtool', (traces) => {
        this.sendEvent({
          type: 'reflex-traces',
          component: 'Reflex',
          payload: traces
        });
        // TODO: we send patches, so we could have immer object in the UI and just patch it
        this.sendEvent({
          type: 'reflex-app-db',
          component: 'Reflex',
          payload: getAppDb()
        });
      });

      this.sendEvent({
        type: 'reflex-app-db',
        component: 'Reflex',
        payload: getAppDb()
      });
    }
  }

  private stopTracing(): void {
    if (this.isTracingEnabled) {
      console.log('[Reflex Devtools] Stopping tracing - no UI connected');
      this.isTracingEnabled = false;
      disableTracing();
    }
  }

  async sendEvent(event: EventPayload): Promise<void> {
    if (!this.config.enabled) return;

    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    // Try WebSocket first
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(eventWithTimestamp));
        return;
      } catch (error) {
        console.warn('[Reflex Devtools] WebSocket send failed, falling back to HTTP');
      }
    }

    // Fallback to HTTP
    try {
      await fetch(`${this.config.serverUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventWithTimestamp),
      });
    } catch (error) {
      console.error('[Reflex Devtools] Failed to send event:', error);
    }
  }
}

let client: DevtoolsClient | null = null;

export function logEvent(event: EventPayload): void {
  if (client) {
    client.sendEvent(event);
  } else {
    console.warn('[Reflex Devtools] Client not initialized. Call initDevtools() first.');
  }
} 

export function enableDevtools(config: DevtoolsConfig = { serverUrl: 'localhost:4000' }): void {
  client = new DevtoolsClient(config);
  client.init();
}
