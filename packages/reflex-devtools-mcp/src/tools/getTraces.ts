/**
 * MCP Tool: get_traces
 * Retrieve trace data with filtering options
 */

import { DevToolsAPIClient } from '../httpClient.js';

export interface GetTracesParams {
  limit?: number;
  eventFilter?: string;
  minDuration?: number;
  opType?: string;
}

export function getTracesTool(apiClient: DevToolsAPIClient) {
  return {
    name: 'get_traces',
    description: 'Retrieve execution traces from the Reflex application. Traces include events, subscription operations (create/run/dispose), and render cycles with timing information. To get the current subscription values, use get_active_subs and operation.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of traces to return (default: 50, max: 1000)',
          minimum: 1,
          maximum: 1000
        },
        eventFilter: {
          type: 'string',
          description: 'Filter traces by event/operation name (case-insensitive substring match)'
        },
        minDuration: {
          type: 'number',
          description: 'Filter traces with duration >= this value (in milliseconds)',
          minimum: 0
        },
        opType: {
          type: 'string',
          description: 'Filter by operation type',
          enum: ['event', 'render', 'sub/create', 'sub/run', 'sub/dispose']
        }
      }
    },
    handler: async (params: GetTracesParams) => {
      try {
        const limit = params.limit && params.limit > 0 && params.limit <= 1000 
          ? params.limit 
          : 50;

        const response = await apiClient.getTraces({
          limit,
          eventFilter: params.eventFilter,
          minDuration: params.minDuration,
          opType: params.opType
        });

        const traces = response.traces || [];

        // Format raw traces for better readability
        const formatted = traces.map((trace: any) => ({
          id: trace.id,
          operation: trace.operation || 'unknown',
          opType: trace.opType || 'unknown',
          duration: trace.duration !== undefined ? trace.duration.toFixed(2) + 'ms' : 'N/A',
          timestamp: new Date(trace.start || 0).toISOString(),
          tags: trace.tags,
          childOf: trace.childOf
        }));

        // Get stats from API
        const statsResponse = await apiClient.getStats();
        const stats = statsResponse.stats || {};

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: {
                  returned: formatted.length,
                  totalStored: stats.totalTraces || 0,
                  eventTraces: stats.eventTraces || 0,
                  renderTraces: stats.renderTraces || 0
                },
                traces: formatted
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch traces',
                message: error instanceof Error ? error.message : 'Unknown error',
                hint: 'Make sure the DevTools server is running'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  };
}

