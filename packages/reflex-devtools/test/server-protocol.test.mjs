import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

import { DevtoolsServer } from '../dist/server/index.js';
import { reflexReplacer } from '../dist/serialization.js';

const activeServers = new Set();
const activeSockets = new Set();

afterEach(async () => {
  for (const socket of activeSockets) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.terminate();
    }
  }
  activeSockets.clear();

  for (const server of activeServers) {
    await server.stop();
  }
  activeServers.clear();
});

async function startServer(config = {}) {
  const server = new DevtoolsServer({
    port: 0,
    host: '127.0.0.1',
    enableMCP: true,
    ...config,
  });
  await server.start();
  activeServers.add(server);

  const address = server.server.address();
  assert(address && typeof address === 'object');

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    wsUrl: `ws://127.0.0.1:${address.port}`,
  };
}

async function connectSdk(wsUrl, onDispatch) {
  const socket = new WebSocket(`${wsUrl}/sdk`);
  activeSockets.add(socket);

  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  socket.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'dispatch-to-client') {
      onDispatch(message, socket);
    }
  });

  return socket;
}

function sendSdkEvent(socket, event) {
  socket.send(JSON.stringify(event, reflexReplacer));
}

function postDispatch(baseUrl, eventName, params = []) {
  return fetch(`${baseUrl}/api/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, params }),
  });
}

test('/api/dispatch requires MCP mode', async () => {
  const { baseUrl } = await startServer({ enableMCP: false });

  const response = await postDispatch(baseUrl, 'increment-counter');
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.match(body.error, /MCP dispatch is disabled/);
});

test('/api/dispatch reports when no SDK app is connected', async () => {
  const { baseUrl } = await startServer();

  const response = await postDispatch(baseUrl, 'increment-counter');
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.match(body.error, /No app connected/);
});

test('/api/dispatch rejects malformed params before broadcasting', async () => {
  const { baseUrl } = await startServer();

  const response = await fetch(`${baseUrl}/api/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName: 'increment-counter', params: { amount: 1 } }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /params must be an array/);
});

test('/api/dispatch resolves with the observed successful trace', async () => {
  const { baseUrl, wsUrl } = await startServer();
  const trace = {
    id: 101,
    opType: 'event',
    operation: 'increment-counter',
    start: Date.now(),
    duration: 2.5,
    tags: {
      event: ['increment-counter', 3],
      patches: [
        { op: 'replace', path: ['counter'], value: new Map([['value', 3]]) },
      ],
      effects: [['log-counter', new Set(['counter'])]],
      reversePatches: [
        { op: 'replace', path: ['counter'], value: 2 },
      ],
    },
  };

  await connectSdk(wsUrl, (message, socket) => {
    assert.equal(message.payload.eventName, 'increment-counter');
    assert.deepEqual(message.payload.params, [3]);

    sendSdkEvent(socket, { type: 'reflex-traces', payload: [trace] });
    sendSdkEvent(socket, {
      type: 'reflex-dispatch-result',
      payload: { dispatchId: message.payload.dispatchId, trace },
    });
  });

  const response = await postDispatch(baseUrl, 'increment-counter', [3]);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.outcome, 'succeeded');
  assert.equal(body.traceId, 101);
  assert.equal(body.event[0], 'increment-counter');
  assert.deepEqual(body.patches[0].value, {
    type: 'map',
    entries: [['value', 3]],
  });
  assert.deepEqual(body.effects[0][1], {
    type: 'set',
    values: ['counter'],
  });

  const traceResponse = await fetch(`${baseUrl}/api/traces/101`);
  const traceBody = await traceResponse.json();

  assert.equal(traceResponse.status, 200);
  assert.equal(traceBody.trace.id, 101);
  assert.deepEqual(traceBody.trace.tags.patches[0].value, {
    type: 'map',
    entries: [['value', 3]],
  });
});

test('/api/dispatch derives failed and effects-failed outcomes from trace tags', async () => {
  const { baseUrl, wsUrl } = await startServer();
  const traces = [
    {
      id: 201,
      opType: 'event',
      operation: 'missing-handler',
      start: Date.now(),
      duration: 1,
      tags: {
        event: ['missing-handler'],
        error: { phase: 'missing-handler', message: 'No handler registered' },
      },
    },
    {
      id: 202,
      opType: 'event',
      operation: 'effect-fails',
      start: Date.now(),
      duration: 3,
      tags: {
        event: ['effect-fails'],
        patches: [{ op: 'replace', path: ['saved'], value: true }],
        effects: [['persist']],
        effectErrors: [{ effect: 'persist', message: 'disk full' }],
      },
    },
  ];

  await connectSdk(wsUrl, (message, socket) => {
    const trace = traces.shift();
    assert(trace);

    sendSdkEvent(socket, { type: 'reflex-traces', payload: [trace] });
    sendSdkEvent(socket, {
      type: 'reflex-dispatch-result',
      payload: { dispatchId: message.payload.dispatchId, trace },
    });
  });

  const failedResponse = await postDispatch(baseUrl, 'missing-handler');
  const failedBody = await failedResponse.json();

  assert.equal(failedResponse.status, 200);
  assert.equal(failedBody.outcome, 'failed');
  assert.equal(failedBody.traceId, 201);
  assert.equal(failedBody.error.phase, 'missing-handler');

  const effectsResponse = await postDispatch(baseUrl, 'effect-fails');
  const effectsBody = await effectsResponse.json();

  assert.equal(effectsResponse.status, 200);
  assert.equal(effectsBody.outcome, 'effects-failed');
  assert.equal(effectsBody.traceId, 202);
  assert.deepEqual(effectsBody.patches, [
    { op: 'replace', path: ['saved'], value: true },
  ]);
  assert.deepEqual(effectsBody.effectErrors, [
    { effect: 'persist', message: 'disk full' },
  ]);
});

test('/api/dispatch reports unknown when the SDK disconnects before the outcome', async () => {
  const { baseUrl, wsUrl } = await startServer();

  await connectSdk(wsUrl, (_message, socket) => {
    socket.close();
  });

  const response = await postDispatch(baseUrl, 'slow-event');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.outcome, 'unknown');
  assert.match(body.message, /disconnected/);
});

test('/api/traces/:id rejects malformed trace ids', async () => {
  const { baseUrl } = await startServer();

  const response = await fetch(`${baseUrl}/api/traces/12abc`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /Trace id must be a number/);
});
