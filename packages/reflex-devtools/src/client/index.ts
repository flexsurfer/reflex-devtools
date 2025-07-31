import { registerTraceCb, getAppDb } from "@flexsurfer/reflex";

export interface DevtoolsConfig {
  serverUrl?: string;
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
  private connectedUIs = 0;
  private isTracingEnabled = false;
  private serverAvailable = false;

  constructor(config: DevtoolsConfig) {
    this.config = {
      enabled: true,
      serverUrl: 'localhost:4000',
      ...config,
    };
  }

  async init(): Promise<void> {

    if (!this.config.enabled) return;

    this.startTracing();

    this.serverAvailable = await this.checkServerAvailability();
    if (!this.serverAvailable) {
      console.warn('[Reflex Devtools] Server not available, disabling devtools');
      this.stopTracing();
      return;
    }

    try {
      await this.connectWebSocket();
    } catch (error) {
    }
  }

  private async checkServerAvailability(): Promise<boolean> {
    try {
      // Use a simple HEAD request to check if server is running
      const response = await fetch(`http://${this.config.serverUrl}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = 'ws://' + this.config.serverUrl + '/sdk';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
        }
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
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

  private handleServerMessage(message: any): void {
    if (message.type === 'ui-connection-status') {
      const newUICount = message.payload.connectedUIs;
      const previousUICount = this.connectedUIs;
      this.connectedUIs = newUICount;

      // Start tracing when first UI connects
      if (previousUICount === 0 && newUICount > 0) {
        this.startTracing();
      }
      // Stop tracing when last UI disconnects
      else if (newUICount === 0) {
        this.stopTracing();
      }
    }
  }

  private startTracing(): void {
    if (!this.isTracingEnabled) {

      this.isTracingEnabled = true;

      registerTraceCb('reflex-devtool', (traces) => {
        this.sendEvent({
          type: 'reflex-traces',
          component: 'Reflex',
          payload: traces
        });
        // TODO: we already send patches with events, so we could have immer object in the UI and just patch it,
        // so we don't need to send entire app db here each time
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
      this.isTracingEnabled = false;
    }
  }

  async sendEvent(event: EventPayload): Promise<void> {
    if (!this.config.enabled || !this.serverAvailable) return;

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
      }
    }

    // Fallback to HTTP
    try {
      await fetch(`http://${this.config.serverUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventWithTimestamp),
      });
    } catch (error) {
      console.warn('[Reflex Devtools] Server not available, disabling devtools');
      this.serverAvailable = false;
      this.stopTracing();
    }
  }
}

let client: DevtoolsClient | null = null;

export function logEvent(event: EventPayload): void {
  if (client) {
    client.sendEvent(event);
  } else {
  }
}

export function enableDevtools(config: DevtoolsConfig = {}): void {
  client = new DevtoolsClient(config);
  client.init();
}
