# How an AI agent works on a Reflex task

This is the canonical scenario both roadmaps serve: one realistic task, walked through the agent's eyes, showing exactly which tool answers which question at each moment. It exists so that API decisions are made against a real workflow instead of tool-by-tool intuition — a proposed tool that doesn't shorten a step in this document probably shouldn't be built, and a step that today costs several calls or a browser is where the next tool belongs. The eval harness scenarios and the `reflex` agent skill should both be derived from it.

Status legend used throughout:

- ✅ **today** — ships in the current MCP
- 🚧 **roadmap** — an accepted item in [devtools ROADMAP.md](../ROADMAP.md) or the [reflex lib ROADMAP.md](https://github.com/flexsurfer/reflex/blob/main/ROADMAP.md)
- ✳️ **proposed** — identified by this scenario; this document is its spec

Tool responses shown are abbreviated.

---

## The task

> *"In the expense-tracker app, add category filtering: a category picker, the expense list filtered by the selected category, and a running total for it. Persist the selection."*

A mid-size task on purpose: it touches the db shape, two events, two subscriptions, an effect, and two components — and it contains a bug class that only runtime observation can catch.

The app follows the scaffolded convention: `src/db.ts`, `src/event-ids.ts`, `src/events.ts`, `src/sub-ids.ts`, `src/subs.ts`, `src/effects.ts`, `src/components/`.

---

## Phase 0 — Orient: what exists?

The agent's first question is never "what is the state?" — the app isn't even running. It's *"what ids, handlers, and db keys already exist, and where?"*

- **Today:** read `*-ids.ts` (they are the index), exact-match `rg` for the few ids that matter. Cheap and reliable — but text-based, and says nothing about payload shapes or the sub dependency graph.
- 🚧 **Roadmap:** `get_reflex_map` / `find_reflex_id` / `get_event_contract` backed by `.reflex/map.json` (lib: static manifest generator). No running app required; replaces every orientation grep with indexed lookups.

What the agent must *not* need to do: read `events.ts` / `subs.ts` end-to-end. On a real app those files are the most expensive read in the repo.

---

## Phase 1 — Write the code (the compiler is the loop)

The agent writes, in order: the db key (`selectedCategory: null`), event ids, handlers (`expenses/set-category`, extend `expenses/add` with a category), sub ids and subs (`expenses/visible`, `expenses/category-total`), the persistence effect wiring, and the two components.

**No MCP is used in this phase, and that is by design.** The verification signal here is `tsc` against the typed payload maps (`EventPayloads` / `SubPayloads` / `AppDb`): a wrong payload, a typo'd id in `dispatch`, a mis-shaped sub result — all become compile errors, the cheapest feedback there is. Roughly 70% of the agent's total effort on this task happens in this phase, which is why the scaffolder, the typed maps, and the static manifest matter more to overall context cost than any runtime tool.

The MCP earns its keep in everything that follows.

---

## Cycle 1 — Cold start: launch → health → seed → act → verify

### 1. Launch the app

```
Bash: npx reflex-devtools --mcp     # devtools server
Bash: pnpm dev                       # vite
```

And here is the first wall: **the SDK runs inside the app, and the app runs in a browser tab.** Today the loop silently assumes a human keeps that tab open. An autonomous agent has no browser by default; everything below is unreachable until *something* executes the app.

- ✳️ **Proposed (strategic): headless runtime.** Reflex's state layer is React-free, so a scaffolded `src/headless.ts` that imports db/events/subs/effects and calls `enableDevtools()` — run via `vite-node`/`tsx` — is a live, dispatchable, fully traceable app with no browser. Views are excluded, which is acceptable: the state layer is where reflex's guarantees live, and view-file correctness is largely covered by tsc + the render-verification below. This single piece turns the whole MCP from "works during a supervised session" into "works in CI and autonomous loops".

### 2. "Is it alive?"

The first MCP call of *every* cycle — after cold start and after every reload — is a health question: did the app mount, is the SDK connected, did anything crash?

- **Today:** no direct answer. The agent infers from `get_app_state` erroring ("no state available") or from a 503 on dispatch. Render crashes and console errors are invisible without a browser-automation MCP.
- ✳️ **Proposed: `app_status`** — one small, always-cheap response:

```
app_status {}
→ { appConnected: true, sessionEpoch: 3, tracing: true,
    handlers: { event: 14, sub: 9, fx: 3 },
    clientErrors: { unread: 0 } }
```

  Would be the most-called tool in the set. `sessionEpoch` 🚧 and the error counter feed the two loops below.
- 🚧 **Roadmap: `get_client_logs(sinceId)`** — when `clientErrors.unread > 0`: render crashes, uncaught exceptions, React and reflex dev-mode warnings, without a browser. After a cold start with a white screen, this is the *only* tool that explains why.

### 3. Read the initial state

```
get_app_state { path: "selectedCategory" }   ✅
→ { path: "selectedCategory", state: null }
```

Path-scoped reads only. On an unfamiliar or large app the discovery step comes first: 🚧 `get_app_state { shape: true }` → keys, types, collection sizes — the runtime equivalent of reading `db.ts`. The full dump is the anti-pattern.

### 4. Seed test state

```
dispatch_event { eventName: "expenses/add", params: [{ title: "Coffee",  amount: 4.5,  category: "food" }] }   ✅
dispatch_event { eventName: "expenses/add", params: [{ title: "Bus",     amount: 2.0,  category: "transport" }] }
dispatch_event { eventName: "expenses/add", params: [{ title: "Groceries", amount: 38.0, category: "food" }] }
```

Each response already confirms the write (see next step), so seeding needs no follow-up reads. Note for later: this seed sequence will have to be repeated after every reload — Cycle 2 shows why that should become one call.

### 5. Act

```
dispatch_event { eventName: "expenses/set-category", params: ["food"] }   ✅
→ { outcome: "succeeded", duration: "0.6ms", traceId: 21,
    stateChanges: [{ op: "replace", path: ["selectedCategory"], value: "food" }],
    effectsEmitted: [["local-storage-set", { key: "expenses.category", value: "food" }]] }
```

**This response is the verification.** Three questions answered in one round trip, zero re-reads:

- the db write happened and is exactly the intended patch;
- the persistence effect fired with the right payload — the *effect contract* is observed, not assumed;
- failure modes are explicit: `outcome: "failed"` + normalized error for a throwing/missing handler, `"effects-failed"` when state committed but an effect threw, `"unknown"` when unobserved.

This tool is the center of gravity of the whole API; everything else exists to set it up or explain its aftermath.

### 6. Verify the derived layer

The db is right — but does `expenses/category-total` compute `42.5`?

- **Today:** `get_active_subs` ⚠️ — only works if some mounted component already subscribes, and it returns full values of *everything* mounted. The agent is forced to either write the component first and eyeball the browser, or dump all sub values and fish.
- 🚧 **Roadmap: `eval_sub`** — evaluate any registered sub against current state, mounted or not:

```
eval_sub { id: "expenses/category-total", params: ["food"] }
→ { value: 42.5 }
```

With this, the state layer of the feature is **fully verified before a single component exists** — write subs, prove them, then write views against proven data.

---

## The bug

The picker works, the list filters, but the *total* doesn't change when the category changes — it updates only when an expense is added. Classic reflex bug class:

```ts
// subs.ts — the dependency on the selected category is missing
regSub(SUB_IDS.CATEGORY_TOTAL,
  (expenses, selected) => sum(expenses, selected),
  [SUB_IDS.EXPENSES]);            // ← forgot SUB_IDS.SELECTED_CATEGORY
```

Note what makes this valuable as *the* canonical bug: the handler is pure and correct (unit tests pass), the dispatch response is perfect (state committed exactly as intended), tsc is silent. **The defect exists only in the runtime dependency graph** — precisely the thing an agent cannot see from source and patches alone.

---

## Cycle 2 — Debug → edit → hot reload → re-verify

### 7. Explain the event

The agent's question, verbatim: *"I dispatched `expenses/set-category`, state changed — why didn't the total update?"* The debugging chain is always the same three hops: **db written? → subs recomputed? → components re-rendered?**

- **Today** ⚠️: hop 1 is in the dispatch response; hops 2–3 mean paging `get_traces { opType: "sub/run" }` and `{ opType: "render" }` and correlating timestamps by hand — several calls, fat rows, and reflex-internals knowledge required.
- ✳️ **Proposed: `explain_event(traceId)`** — the causality chain as one bounded response:

```
explain_event { traceId: 21 }
→ { event: ["expenses/set-category", "food"],
    wrote: ["selectedCategory"],
    subsRecomputed: [
      { id: "selected-category",       changed: true  },
      { id: "expenses/visible",        changed: true  }
    ],
    componentsRerendered: ["CategoryPicker", "ExpenseList"] }
```

`expenses/category-total` is **absent from `subsRecomputed`** — the missing graph edge is visible in one call. The agent now greps exactly one `regSub` (🚧 source locations make even that grep a lookup) and sees the missing dep.

*Feasibility:* the lib already links traces (`childOf`), and render traces carry the component name plus the notifying reaction. The flush is async, so event→flush linkage needs either a server-side time-window correlation (workable now) or a lib-side stamp of triggering event ids on flush traces (exact; pairs-with lib item).

### 8. The history variant

If the symptom had been a *wrong value* rather than a missing update — "who set `selectedCategory` to garbage?" — the tool is 🚧 `find_state_changes { path: "selectedCategory" }` → `[{event, timestamp, patch}]`, one call instead of a trace scan. Same three-hop chain, pointed backwards.

### 9. Edit + hot reload: the session reset

The agent fixes the dep array and vite reloads the app. Consequences, all invisible today:

- the db resets to initial state — the seeded expenses are gone;
- trace ids restart at 1; server storage cleared on the SDK reconnect;
- any held cursor or remembered `traceId` now silently points at nothing.

- 🚧 **Roadmap: `sessionEpoch` in every response** — the next tool call, whatever it is, says `sessionEpoch: 4` and the agent *knows* the world restarted, instead of misreading empty lists as "nothing happened". During agentic work, reload-per-edit is the common case, not the edge case.
- 🚧 **Lib roadmap: verify/document the HMR story** — whether handler re-registration on HMR is sound determines whether a *full* reload is even necessary per edit.

### 10. Re-seed in one call

Re-dispatching the whole seed sequence after every edit is the iteration tax. The server already holds the event log from the previous session:

- ✳️ **Proposed: `replay_events`** — re-dispatch the recorded event sequence (filtered to the agent's own dispatches, or an explicit id list) through the **new** code:

```
replay_events { fromSessionEpoch: 3 }
→ { replayed: 4, outcomes: ["succeeded","succeeded","succeeded","succeeded"], sessionEpoch: 4 }
```

  Replay deliberately beats state snapshots here: a snapshot would restore stale state *shapes*, while replay re-derives state through the edited handlers — it is simultaneously the fixture **and** the regression check. (Snapshot/restore 🚧 stays useful for the orthogonal case: composing states that are tedious to reach through events.)

### 11. Re-verify, done

```
dispatch_event { eventName: "expenses/set-category", params: ["transport"] }   ✅
eval_sub { id: "expenses/category-total", params: ["transport"] }              🚧  → { value: 2.0 }
explain_event { traceId: 7 }                                                   ✳️  → subsRecomputed now includes expenses/category-total
```

Fixed, and *proven* fixed at all three hops. The agent finishes with plain unit tests for the pure handlers (no MCP — pure functions need no runtime) and hands off.

---

## What the agent never does

Anti-patterns the API must keep unnecessary — if any of these becomes the practical path, the design has regressed:

1. **Dump full app state** — path/shape-scoped reads only; every response bounded, oversized values elided with a pointer to the scoped call.
2. **Page through traces to answer a causal question** — `dispatch_event`'s response, `explain_event`, and `find_state_changes` exist precisely so trace browsing is forensics (chiefly for human-driven activity: "what did the user click"), not the front door.
3. **Re-read state to confirm its own dispatch** — the dispatch response *is* the confirmation.
4. **Drive a browser to verify state-layer behavior** — browser automation is for genuinely visual questions only.
5. **Read `events.ts`/`subs.ts` end-to-end** — orientation goes through ids files / the static map; source is read per-handler, by location.
6. **Poll** — outcomes return synchronously; activity the agent didn't initiate is fetched by cursor (`sinceId`), not by re-listing.

---

## The toolbox, by loop stage

| Stage | Question | Tool | Status |
|---|---|---|---|
| Orient | what exists, where? | `*-ids.ts` + rg → `get_reflex_map` / `get_event_contract` | ✅ / 🚧 |
| Write | is the code legal? | `tsc` + typed payload maps | ✅ (lib) |
| Launch | run the app without a browser | headless runtime entry | ✳️ |
| Health | did it mount? errors? session? | `app_status` · `get_client_logs` | ✳️ · 🚧 |
| Inspect | what is the state? | `get_app_state(path)` · `shape: true` | ✅ · 🚧 |
| Seed | put the app in a known state | `dispatch_event` · `replay_events` · snapshots | ✅ · ✳️ · 🚧 |
| Act & verify | did it do what I meant? | `dispatch_event` outcome/patches/effects | ✅ |
| Verify derived | does the sub compute right? | `eval_sub` | 🚧 |
| Explain | why did/didn't X update? | `explain_event` · `find_state_changes` | ✳️ · 🚧 |
| Forensics | what happened while I wasn't acting? | `get_traces(sinceId)` → `get_trace(id)` | ✅ (🚧 cursor) |
| Registry truth | is my handler actually registered? | `get_handlers` | ✅ |

## Design principles this scenario fixes

1. **The dispatch response is the verification.** One round trip must answer wrote-what, emitted-what, failed-how.
2. **Every response is bounded.** The agent can always afford another scoped call; it can never un-spend a dumped context window.
3. **The canonical questions get one-call answers.** "Why didn't the view update", "who wrote this path", "what does this sub return" are *the* questions; each deserves a dedicated bounded tool, not a derivation over raw traces.
4. **Reload is the common case.** Session identity (`sessionEpoch`) in every response; state re-establishment (`replay_events`) as one call.
5. **The MCP starts where the compiler stops.** Phase 0–1 belongs to the scaffold, typed maps, and static manifest; runtime tools should not compensate for missing static structure.
6. **Static before runtime, runtime before source.** Ids/map → MCP observation → the one implicated handler, by location. Never the reverse.

## Gaps, ranked by leverage in this scenario

1. **`app_status` + `get_client_logs`** — the first call of every cycle; today the agent is blind between launch and first successful state read. (small)
2. **`explain_event`** — turns the canonical three-hop debug from a multi-call trace reconstruction into one bounded answer; the scenario's bug is invisible to tsc, unit tests, and patches alike. (medium; lib pairing for exact flush linkage)
3. **`eval_sub`** — unlocks "prove the state layer before writing views", which reorders the whole authoring flow. (small–medium, 🚧 already)
4. **`replay_events`** — removes the per-edit iteration tax and doubles as regression checking. (medium)
5. **Headless runtime** — removes the browser-tab assumption entirely; the strategic unlock for CI and autonomous loops. (large, cross-repo)
