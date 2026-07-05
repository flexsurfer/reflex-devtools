import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DevToolsAPIClient } from '../dist/httpClient.js';
import { dispatchEventTool } from '../dist/tools/dispatchEvent.js';
import { getTraceTool } from '../dist/tools/getTrace.js';
import { getTracesTool } from '../dist/tools/getTraces.js';

function parseToolResult(result) {
  return JSON.parse(result.content[0].text);
}

test('get_traces returns compact rows without full trace tags', async () => {
  const apiClient = {
    async getTraces(params) {
      assert.deepEqual(params, {
        limit: 10,
        eventFilter: undefined,
        minDuration: undefined,
        opType: undefined,
      });

      return {
        traces: [
          {
            id: 7,
            operation: 'save-user',
            opType: 'event',
            duration: 4.25,
            start: 0,
            childOf: 'undefined',
            tags: {
              event: ['save-user', { id: 1 }],
              patches: [{ op: 'replace', path: ['user'], value: { id: 1 } }],
              effects: [['persist-user']],
              error: { phase: 'handler', message: 'boom' },
              effectErrors: [{ effect: 'persist-user', message: 'failed' }],
            },
          },
        ],
      };
    },
    async getStats() {
      return {
        stats: {
          totalTraces: 1,
          eventTraces: 1,
          renderTraces: 0,
        },
      };
    },
  };

  const result = await getTracesTool(apiClient).handler({ limit: 10 });
  const body = parseToolResult(result);
  const row = body.traces[0];

  assert.equal(body.summary.returned, 1);
  assert.equal(row.id, 7);
  assert.equal(row.duration, '4.25ms');
  assert.equal(row.error, 'handler: boom');
  assert.equal(row.effectErrors, 1);
  assert.equal('tags' in row, false);
  assert.equal('patches' in row, false);
  assert.equal('effects' in row, false);
  assert.equal('childOf' in row, false);
});

test('get_trace removes reversePatches from MCP output', async () => {
  const apiClient = {
    async getTrace(id) {
      assert.equal(id, 42);

      return {
        trace: {
          id: 42,
          tags: {
            patches: [{ op: 'replace', path: ['counter'], value: 1 }],
            reversePatches: [{ op: 'replace', path: ['counter'], value: 0 }],
          },
        },
      };
    },
  };

  const result = await getTraceTool(apiClient).handler({ id: 42 });
  const body = parseToolResult(result);

  assert.deepEqual(body.trace.tags.patches, [
    { op: 'replace', path: ['counter'], value: 1 },
  ]);
  assert.equal('reversePatches' in body.trace.tags, false);
});

test('dispatch_event formats failed outcomes with actionable hints', async () => {
  const apiClient = {
    async dispatchEvent(eventName, params) {
      assert.equal(eventName, 'missing-handler');
      assert.deepEqual(params, [{ id: 1 }]);

      return {
        outcome: 'failed',
        traceId: 9,
        error: {
          phase: 'missing-handler',
          message: 'No handler registered',
        },
      };
    },
  };

  const result = await dispatchEventTool(apiClient).handler({
    eventName: 'missing-handler',
    params: [{ id: 1 }],
  });
  const body = parseToolResult(result);

  assert.equal(body.outcome, 'failed');
  assert.equal(body.traceId, 9);
  assert.equal(body.error.phase, 'missing-handler');
  assert.match(body.hint, /get_handlers/);
});

test('DevToolsAPIClient surfaces trace lookup errors from the server body', async () => {
  const httpServer = createServer((_req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'No trace with id 99',
    }));
  });

  await new Promise((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = httpServer.address();
    assert(address && typeof address === 'object');

    const apiClient = new DevToolsAPIClient({
      serverUrl: `127.0.0.1:${address.port}`,
    });

    await assert.rejects(
      () => apiClient.getTrace(99),
      /No trace with id 99/,
    );
  } finally {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
