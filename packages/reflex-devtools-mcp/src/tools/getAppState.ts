/**
 * MCP Tool: get_app_state
 * Retrieve current application database state
 */

import { DevToolsAPIClient } from '../httpClient.js';
import { serverUnavailableResult } from './errorResponse.js';

export interface GetAppStateParams {
  path?: string;
}

export function getAppStateTool(apiClient: DevToolsAPIClient) {
  return {
    name: 'get_app_state',
    description: 'Retrieve the current application state. This is the central state managed by Reflex, equivalent to the app-db in re-frame. This does NOT include computed subscription values - use get_active_subs for those.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Optional JSON path to retrieve a specific part of the state (e.g., "user.profile" or "items[0]"). Leave empty to get full state.'
        }
      }
    },
    handler: async (params: GetAppStateParams) => {
      try {
        const response = await apiClient.getAppState();
        const state = response.state;

        if (!state) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'No application state available. Make sure the app is connected to DevTools server.'
                }, null, 2)
              }
            ],
            isError: true
          };
        }

        let result = state;

      // Simple path traversal (supports dot notation and array indices)
      if (params.path) {
        const parts = params.path.split(/\.|\[|\]/).filter(p => p !== '');
        try {
          for (const part of parts) {
            result = result[part];
            if (result === undefined) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      error: `Path "${params.path}" not found in state. This might be a calculated subscription value. Try using get_active_subs instead.`
                    }, null, 2)
                  }
                ],
                isError: true
              };
            }
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Invalid path: ${params.path}`,
                  message: error instanceof Error ? error.message : 'Unknown error'
                }, null, 2)
              }
            ],
            isError: true
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              path: params.path || '(root)',
              state: result
            }, null, 2)
          }
        ]
      };
      } catch (error) {
        const unavailable = serverUnavailableResult(error, 'get_app_state');
        if (unavailable) return unavailable;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to fetch app state',
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
