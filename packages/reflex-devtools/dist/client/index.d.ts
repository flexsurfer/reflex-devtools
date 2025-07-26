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
export declare function logEvent(event: EventPayload): void;
export declare function initDevtools(config: DevtoolsConfig): void;
