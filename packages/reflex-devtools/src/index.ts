// Client SDK exports only - no server dependencies for browser compatibility
export { initDevtools, logEvent } from './client/index.js';
export type { DevtoolsConfig, EventPayload } from './client/index.js'; 