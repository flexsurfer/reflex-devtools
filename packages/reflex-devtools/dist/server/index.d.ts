export interface ServerConfig {
    port: number;
    host?: string;
}
export declare class DevtoolsServer {
    private app;
    private server;
    private wss;
    private config;
    private uiClients;
    private sdkClients;
    constructor(config: ServerConfig);
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    private notifySDKClientsUIStatus;
    private broadcastToUI;
    start(): Promise<void>;
    stop(): Promise<void>;
}
