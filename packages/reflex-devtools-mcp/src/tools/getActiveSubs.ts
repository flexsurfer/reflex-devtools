/**
 * MCP Tool: get_active_subs
 * View currently active subscription reactions
 */

import { DevToolsAPIClient } from '../httpClient.js';
import { serverUnavailableResult } from './errorResponse.js';

export interface GetActiveSubsParams {
  filter?: string;
}

export function getActiveSubsTool(apiClient: DevToolsAPIClient) {
  return {
    name: 'get_active_subs',
    description: 'Get currently active calculated subscriptions in the Reflex application. For root subscriptions use get_app_state instead.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter to match subscription keys (case-insensitive substring match)'
        }
      }
    },
    handler: async (params: GetActiveSubsParams) => {
      try {
        const response = await apiClient.getSubscriptions();
        const activeSubs = response.subscriptions || {};
        
        let filtered = Object.entries(activeSubs);

        // Apply filter if provided
        if (params.filter) {
          const filterLower = params.filter.toLowerCase();
          filtered = filtered.filter(([key]) => 
            key.toLowerCase().includes(filterLower)
          );
        }

        // Format subscriptions
        const subscriptions = filtered.map(([key, value]) => ({
          key,
          value
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: {
                  total: Object.keys(activeSubs).length,
                  filtered: subscriptions.length
                },
                subscriptions
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        const unavailable = serverUnavailableResult(error, 'get_active_subs');
        if (unavailable) return unavailable;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch active subscriptions',
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
