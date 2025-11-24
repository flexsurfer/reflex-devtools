/**
 * MCP Tool: dispatch_event
 * Dispatch events to the client application
 */

import { DevToolsAPIClient } from '../httpClient.js';

export interface DispatchEventParams {
  eventName: string;
  params?: any[];
}

export function dispatchEventTool(apiClient: DevToolsAPIClient) {
  return {
    name: 'dispatch_event',
    description: 'Dispatch an event to the Reflex application. This triggers event handlers in the app, allowing you to test functionality or modify state.',
    inputSchema: {
      type: 'object',
      properties: {
        eventName: {
          type: 'string',
          description: 'The event ID/name to dispatch (e.g., "set-user", "fetch-data")'
        },
        params: {
          type: 'array',
          description: 'Optional array of parameters to pass to the event handler',
          items: {
            type: ['string', 'number', 'boolean', 'object', 'array', 'null']
          }
        }
      },
      required: ['eventName']
    },
    handler: async (params: DispatchEventParams) => {
      try {
        const eventParams = params.params || [];
        const response = await apiClient.dispatchEvent(params.eventName, eventParams);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: response.success,
                message: `Event "${params.eventName}" dispatched successfully`,
                event: params.eventName,
                params: eventParams
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
                error: 'Failed to dispatch event',
                message: error instanceof Error ? error.message : 'Unknown error',
                event: params.eventName,
                hint: 'Make sure the DevTools server and app are running'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  };
}

