/**
 * HTTP client for querying DevTools server REST API
 */

export interface DevToolsAPIConfig {
  serverUrl: string;
}

export class DevToolsAPIClient {
  private baseUrl: string;

  constructor(config: DevToolsAPIConfig) {
    this.baseUrl = `http://${config.serverUrl}`;
  }

  async getTraces(params: {
    limit?: number;
    eventFilter?: string;
    minDuration?: number;
    opType?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.eventFilter) queryParams.append('eventFilter', params.eventFilter);
    if (params.minDuration) queryParams.append('minDuration', params.minDuration.toString());
    if (params.opType) queryParams.append('opType', params.opType);

    const response = await fetch(`${this.baseUrl}/api/traces?${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getAppState(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/state`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getSubscriptions(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/subscriptions`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getHandlers(type?: string): Promise<any> {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${this.baseUrl}/api/handlers${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async dispatchEvent(eventName: string, params: any[] = []): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventName, params }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

