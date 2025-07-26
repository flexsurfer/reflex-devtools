import { enableTracing, registerTraceCb, disableTracing } from "@flexsurfer/reflex";
class DevtoolsClient {
    constructor(config) {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connectedUIs = 0;
        this.isTracingEnabled = false;
        this.config = {
            enabled: true,
            ...config
        };
    }
    async init() {
        if (!this.config.enabled)
            return;
        try {
            await this.connectWebSocket();
        }
        catch (error) {
            console.warn('[Reflex Devtools] WebSocket connection failed, using HTTP fallback');
        }
    }
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const wsUrl = this.config.serverUrl.replace(/^http/, 'ws') + '/sdk';
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
                }
                catch (error) {
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
    attemptReconnect() {
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
    handleServerMessage(message) {
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
    startTracing() {
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
            });
        }
    }
    stopTracing() {
        if (this.isTracingEnabled) {
            console.log('[Reflex Devtools] Stopping tracing - no UI connected');
            this.isTracingEnabled = false;
            disableTracing();
        }
    }
    async sendEvent(event) {
        if (!this.config.enabled)
            return;
        const eventWithTimestamp = {
            ...event,
            timestamp: event.timestamp || Date.now()
        };
        // Try WebSocket first
        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(eventWithTimestamp));
                return;
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('[Reflex Devtools] Failed to send event:', error);
        }
    }
}
let client = null;
export function logEvent(event) {
    if (client) {
        client.sendEvent(event);
    }
    else {
        console.warn('[Reflex Devtools] Client not initialized. Call initDevtools() first.');
    }
}
export function initDevtools(config) {
    client = new DevtoolsClient(config);
    client.init();
}
