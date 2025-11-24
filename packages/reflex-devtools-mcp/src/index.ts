/**
 * Reflex DevTools MCP Server
 * 
 * Model Context Protocol server that connects to Reflex DevTools
 * and provides AI assistants with tools to inspect traces and dispatch events.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DevToolsAPIClient } from './httpClient.js';
import { getTracesTool } from './tools/getTraces.js';
import { getAppStateTool } from './tools/getAppState.js';
import { dispatchEventTool } from './tools/dispatchEvent.js';
import { getHandlersTool } from './tools/getHandlers.js';
import { getActiveSubsTool } from './tools/getActiveSubs.js';

export interface MCPServerConfig {
  devtoolsServerUrl: string;
}

export class ReflexDevToolsMCPServer {
  private server: Server;
  private apiClient: DevToolsAPIClient;
  private tools: Map<string, any>;

  constructor(config: MCPServerConfig) {
    this.server = new Server(
      {
        name: 'reflex-devtools',
        version: '0.1.10',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize HTTP API client
    this.apiClient = new DevToolsAPIClient({
      serverUrl: config.devtoolsServerUrl
    });

    // Initialize tools
    this.tools = new Map();
    this.registerTools();

    // Setup request handlers
    this.setupHandlers();
  }

  private registerTools(): void {
    const tools = [
      getTracesTool(this.apiClient),
      getAppStateTool(this.apiClient),
      dispatchEventTool(this.apiClient),
      getHandlersTool(this.apiClient),
      getActiveSubsTool(this.apiClient)
    ];

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      try {
        return await tool.handler(request.params.arguments || {});
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Tool execution failed',
                tool: toolName,
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    // Check if DevTools server is available
    try {
      const isHealthy = await this.apiClient.checkHealth();
      if (isHealthy) {
        console.error('[MCP] Connected to DevTools server');
      } else {
        console.error('[MCP] Warning: DevTools server health check failed');
      }
    } catch (error) {
      console.error('[MCP] Warning: Could not connect to DevTools server:', 
        error instanceof Error ? error.message : 'Unknown error');
      console.error('[MCP] Make sure DevTools server is running on the configured host/port');
    }

    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[MCP] Reflex DevTools MCP server started');
    console.error('[MCP] Available tools:', Array.from(this.tools.keys()).join(', '));
  }

  async stop(): Promise<void> {
    await this.server.close();
    console.error('[MCP] Server stopped');
  }
}

export async function createMCPServer(config: MCPServerConfig): Promise<ReflexDevToolsMCPServer> {
  const server = new ReflexDevToolsMCPServer(config);
  await server.start();
  return server;
}

