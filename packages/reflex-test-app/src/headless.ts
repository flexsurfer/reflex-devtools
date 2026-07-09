/**
 * Headless runtime entry — the full Reflex state layer with no React mount.
 *
 * Imports the exact same db/events/subs modules as main.tsx; only the
 * side-effect adapters differ (effects.headless / coeffects.headless are
 * Node-safe: memory-backed or no-op). The devtools SDK connects over
 * WebSocket exactly as in the browser, so every MCP tool — app_status,
 * get_app_state, dispatch_event, get_traces — works against this process.
 *
 * Run it (devtools server first, then this; needs Node >= 22 for the
 * global WebSocket the SDK connects through):
 *   npx reflex-devtools --mcp     # terminal 1
 *   pnpm dev:headless             # terminal 2 — vite-node --watch restarts on edit
 *
 * This app runs under vite-node so the vite aliases resolve @flexsurfer/*
 * to the local lib sources; a scaffolded project installing from npm can
 * run the same file under tsx instead.
 */
import { enableTracing, enableMapSet } from '@flexsurfer/reflex';
import { enableDevtools } from '@flexsurfer/reflex-devtools';
import './db';
import './events';
import './subs';
import { effectModes } from './effects.headless';
import { coeffectModes } from './coeffects.headless';

enableTracing();
enableDevtools({
  // runtime: 'headless' is auto-detected (no window); declare the
  // side-effect policy so app_status can report what really executes.
  effectMode: 'safe',
  effects: {
    ...effectModes,
    ...coeffectModes,
    'fake-effect': 'real'
  }
});
enableMapSet();

console.log('[headless] reflex-test-app state runtime started — no browser, no React');
console.log('[headless] dispatch and inspect via the devtools MCP tools; Ctrl+C to stop');

// With the devtools server unreachable nothing would be left on the event
// loop and the process would exit; idle instead so a watcher keeps us alive
// and an agent can start the server and reconnect by saving any file.
setInterval(() => {}, 60_000);
