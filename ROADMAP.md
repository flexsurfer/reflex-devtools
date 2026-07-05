# Roadmap: Reflex DevTools + MCP

Devtools-specific improvements for [reflex-devtools](https://github.com/flexsurfer/reflex-devtools). Coordinated library-side work remains tracked in the [reflex ROADMAP.md](https://github.com/flexsurfer/reflex/blob/main/ROADMAP.md) with **(pairs with …)** notes.

---

## Reflex DevTools + MCP (tools)

### P0

- [x] **Make `dispatch_event` return its outcome.** *(done — `POST /api/dispatch` now holds the HTTP response until the app reports the event's trace: the server sends `dispatch-to-client` with a `dispatchId`, the client SDK registers a watcher before dispatching and, when the trace callback delivers the matching event trace (first FIFO match on event id), sends it back as `reflex-dispatch-result`. The server derives the outcome from the lib's error-tracing tags alone: `tags.error` → `failed`, `tags.effectErrors` → `effects-failed` (committed, but effect handlers threw), else `succeeded` — and answers with `{ outcome, traceId, duration, patches, effects, error?, effectErrors? }`, reversePatches dropped. Degraded paths are explicit, never a silent lie: no SDK client connected → 503 "not dispatched"; app disconnects mid-flight, tracing stops, or no trace within the timeout (client 4s < server 5s, so the server hears a definitive answer) → `outcome: 'unknown'` with the reason. UI dispatches carry no `dispatchId` and behave exactly as before. The MCP tool surfaces it all: success returns the state patches + emitted effects (the observed state-diff, no follow-up query), failure returns the normalized error with a did-you-check-get_handlers hint for `missing-handler`. Verified e2e against the test app: clean commit, throwing handler, missing handler, throwing effect, Map patches, no-app 503, and the legacy UI WebSocket path.)*

- [x] **Two-tier trace access.** *(done — `get_traces` now returns compact rows: id, operation, opType, duration, timestamp, event args, plus outcome flags (`error: "phase: message"` summary, `effectErrors` count) so failed events are visible in the list without the fat tags; patches/effects/stacks moved to the new `get_trace(id)` detail tool backed by `GET /api/traces/:id` (storage lookup by trace id; 404 with a "storage resets on reconnect" hint when missing). `reversePatches` never leave the MCP layer. Bonus fix in passing: `/api/traces` responses now serialize through `mapSetReflexReplacer` like `/api/state` always did, so Map/Set values inside patches no longer mangle to `{}`.)*

### P1

- [ ] **`find_state_changes(path)` tool.**
  The server already stores Immer patches per trace (`server/storage.ts`); index them by path and answer "which events wrote `todos.3.done`, in order?" server-side, returning `[{event, timestamp, patch}]`. This is *the* debugging question — answering it in one cheap call instead of having an agent scan fat traces is the biggest context-efficiency win available in the stack.

- [ ] **`sinceId` cursor on `get_traces`.**
  The dispatch→verify loop needs "everything that happened after my action." Limit-from-the-end is ambiguous under concurrent activity. Cheap to add. (Dispatch-returns-outcome has shipped, so this is no longer the fallback verify mechanism — but it's still the right primitive for observing activity *not* initiated by the agent: user clicks, timers, subscriptions firing.)
  Design caveat: trace ids restart at 1 on app reload (`resetTracing()` in the lib) and server storage clears on SDK reconnect, so a held cursor can outlive its id space. The response must carry `latestId`, and `latestId < sinceId` should be reported as an explicit "session reset — cursor invalid" instead of a silently empty list that reads as "nothing happened".

- [ ] **Expose the static manifest through MCP.** *(pairs with lib P2: static manifest generator)*
  Add `get_reflex_map`, `find_reflex_id(query)`, `get_event_contract(id)`, `get_sub_graph(id)`, and `get_handler_source_location(id)` tools backed by `.reflex/map.json` when present, with runtime `get_handlers` as the fallback. This makes the MCP server the agent's first stop for both "what exists?" and "what happened?".

- [x] **Gate HTTP dispatch behind MCP mode, or split MCP/UI mutation paths.** *(done — took the gate, not the split: `/api/dispatch` now rejects with 503 and a "start reflex-devtools with --mcp" hint before anything is broadcast when `enableMCP` is false, so starting the server without `--mcp` exposes no HTTP mutation surface. UI dispatch stays on the WebSocket `dispatch-to-client` path, unaffected. Request hardening landed with it: `eventName` must be a non-empty string and `params`, when present, an array — both rejected with 400 before broadcast. The MCP README notes the `--mcp` requirement on the dispatch tool.)*

- [x] **Add protocol/e2e tests for MCP outcome flows.** *(done — `node --test` suites in both packages; root `pnpm test` runs them all. `reflex-devtools/test/server-protocol.test.mjs` drives a real `DevtoolsServer` with a fake SDK WebSocket client: MCP gate 503, no-app 503, malformed params 400, succeeded outcome with Map/Set values surviving the patch round trip (and the same trace retrievable via `/api/traces/:id`), failed and effects-failed outcomes derived from trace tags, SDK disconnect before the outcome → `unknown`, malformed trace id → 400. `reflex-devtools-mcp/test/tools.test.mjs` locks tool formatting against a stub API client: `get_traces` rows stay compact (no tags/patches/effects), `get_trace` strips `reversePatches`, `dispatch_event` failure hints, HTTP error bodies surfaced to the agent. `stdio-integration.test.mjs` boots the real CLI over stdio via the MCP SDK client against a fake devtools HTTP server: tool listing plus succeeded/failed dispatch round trips. The trace-timeout path (client 4s / server 5s) stays manual-e2e only — not worth 5-second sleeps in CI.)*

### P2

- [ ] **Shape mode for `get_app_state`.**
  Add `depth` or `shape: true` returning keys + types + collection sizes — the runtime equivalent of reading `db.ts`, and the right first call on an unfamiliar large app. The current full dump is unusable there.

- [ ] **Source locations in `get_handlers`.** *(depends on lib P1: source capture)*
  Return file:line per handler id, so the agent goes from runtime observation to the exact source line with zero greps.

- [x] **Fix MCP README/tool-schema drift.** *(done — went with "remove the promise": `get_handlers` docs now describe sorted id lists grouped by type, the `includeUsage` parameter and usage-count example dialogue are gone, and every documented parameter list matches the actual tool input schemas (including the new `get_trace` and the dispatch outcome fields). The MCP server also stopped hardcoding its advertised version — it reads `package.json` at runtime, so that can't drift again either.)*

- [x] **Security caveat in the README.** *(done — warnings in both READMEs: the root README next to the `--host 0.0.0.0` startup example, the MCP README at the server-start step in Quick Start and under the `--host` option docs in Configuration. All three say the same thing: development-only, unauthenticated, `/api/dispatch` mutates state, never expose to the public internet, bind beyond localhost only on trusted local networks.)*
