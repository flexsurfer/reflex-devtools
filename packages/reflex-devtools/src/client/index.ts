import { registerTraceCb, getAppDb, getReactions, dispatch, getHandlers, removeTraceCb } from "@flexsurfer/reflex";
import { reflexReplacer } from "../serialization.js";

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
  private isTracingEnabled = false;
  private serverAvailable = false;
  private reactionsCache = new Map<string, { version: number; isAlive: boolean }>();

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

  private mapReactions(resetCache = false): Record<string, any> {
    if (resetCache) {
      this.reactionsCache.clear();
    }
    const reactions = getReactions();
    if (!reactions) return {};
    const changedReactions: Record<string, any> = {};

    for (const [key, reaction] of reactions) {
      if (reaction.isRoot) continue;

      const currentVersion = reaction.getVersion();
      const currentIsAlive = reaction.isAlive;
      const cached = this.reactionsCache.get(key);

      // Send if reaction was alive but now dead
      if (cached && cached.isAlive && !currentIsAlive) {
        changedReactions[key] = "reflex-tool-sub-disposed";
        this.reactionsCache.delete(key);
      }
      // Send if this is a new reaction or version changed
      else if ((!cached || cached.version !== currentVersion) && currentIsAlive) {
        changedReactions[key] = reaction.getValue();
        // Update cache with current state
        this.reactionsCache.set(key, { version: currentVersion, isAlive: currentIsAlive });
      }
    }

    return changedReactions;
  }

  private getHandlerKeys(kindToIdToHandler: Record<string, Record<string, any>>): Record<string, string[]> {
    return {
      event: Object.keys(kindToIdToHandler.event || {}),
      fx: Object.keys(kindToIdToHandler.fx || {}).filter(key => !['dispatch', 'dispatch-later'].includes(key)),
      cofx: Object.keys(kindToIdToHandler.cofx || {}).filter(key => !['now', 'random'].includes(key)),
      sub: Object.keys(kindToIdToHandler.sub || {})
    };
  }

  private async checkServerAvailability(): Promise<boolean> {
    try {
      // Use a simple GET request to check if server is running
      const response = await fetch(`http://${this.config.serverUrl}/health`, {
        method: 'GET'
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


      // Start tracing when first UI connects
      if (newUICount > 0) {
        this.startTracing();
      }
      // Stop tracing when last UI disconnects
      else {
        this.stopTracing();
      }
    } else if (message.type === 'dispatch-to-client') {
      // Handle dispatch request from devtools UI
      const { eventName, params } = message.payload;

      // Dispatch the event in the client app with all parameters
      dispatch([eventName, ...params]);
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
        this.sendEvent({
          type: 'reflex-active-subs',
          component: 'Reflex',
          payload: this.mapReactions()
        });
      });
    }

    this.sendEvent({
      type: 'reflex-app-db',
      component: 'Reflex',
      payload: getAppDb()
    });
    this.sendEvent({
      type: 'reflex-active-subs',
      component: 'Reflex',
      payload: this.mapReactions(true)
    });
    this.sendEvent({
      type: 'reflex-handler-keys',
      component: 'Reflex',
      payload: this.getHandlerKeys(getHandlers())
    });
  }

  private stopTracing(): void {
    if (this.isTracingEnabled) {
      this.isTracingEnabled = false;
      removeTraceCb('reflex-devtool');
    }
  }

  private serializeEventData(obj: any): string {
    try {
      return JSON.stringify(obj, reflexReplacer);
    } catch (error) {
      console.error('[Reflex Devtools] Error serializing object:', error);
      if (error instanceof Error && error.message.includes("Cannot perform 'get' on a proxy that has been revoked")) {
        console.warn('[Reflex Devtools] ⚠️ Important: When passing data from draftDb to effects, always use the current() function to get the current (final) value. The draftDb object is an Immer draft proxy that will be finalized after the event completes, so passing draftDb data directly to effects will result in the empty proxy object.');
      }
      return JSON.stringify({ __reflex_type: 'SerializationError', error: 'Serialization failed' });
    }
  }

  async sendEvent(event: EventPayload): Promise<void> {
    if (!this.config.enabled || !this.serverAvailable) return;

    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    const serializedEvent = this.serializeEventData(eventWithTimestamp);

    // Try WebSocket first
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(serializedEvent);
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
        body: serializedEvent,
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
