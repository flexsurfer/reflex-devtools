# 🤖 Reflex DevTools MCP Server

**AI-powered debugging for Reflex applications via the Model Context Protocol**

This package provides a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects to Reflex DevTools via HTTP API. It enables AI assistants like Claude and Cursor to inspect application traces, query state, and dispatch events for testing and debugging.

**Note:** Trace storage is handled by the DevTools server (requires `--mcp` flag). This MCP server acts as a stateless API client.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/%40flexsurfer%2Freflex-devtools-mcp)](https://www.npmjs.com/package/@flexsurfer/reflex-devtools-mcp)

---

## ✨ What is This?

The Reflex DevTools MCP Server acts as a bridge between AI assistants and your running Reflex application. It queries the DevTools server's REST API to provide AI assistants with debugging capabilities:

```
┌─────────────────┐    WebSocket    ┌─────────────────────────┐    HTTP    ┌─────────────────┐
│   Your App      │◀───────────────▶│   DevTools Server       │◀──────────▶│   MCP Server    │
│  + Reflex SDK   │                 │   + Trace Storage       │            │                 │
└─────────────────┘                 │   + REST API            │            └─────────────────┘
                                    └─────────────────────────┘                    │
                                                                                   │ MCP (stdio)
                                                                                   ▼
                                                                           ┌─────────────────┐
                                                                           │  AI Assistant   │
                                                                           │  (Claude/Cursor)│
                                                                           └─────────────────┘
```

AI assistants can:
- 📊 **Inspect execution traces** - Compact trace lists plus per-trace detail (state patches, effects, errors)
- 🔍 **Query application state** - Examine the current app database
- 🚀 **Dispatch events and observe the outcome** - Trigger a handler and get back the state diff it committed, the effects it emitted, or the error if it failed
- 📚 **List handlers** - See all registered event handlers, effects, and subscriptions
- ⚡ **Monitor subscriptions** - View active reactive queries

---

## 🚀 Quick Start

### Prerequisites

1. **Install Reflex DevTools** in your app (if not already done):
   ```bash
   npm install --save-dev @flexsurfer/reflex-devtools
   ```

2. **Enable DevTools in your app** (`main.tsx` or `App.tsx`):
   ```typescript
   import { enableTracing } from '@flexsurfer/reflex';
   import { enableDevtools } from '@flexsurfer/reflex-devtools';

   enableTracing();
   enableDevtools();
   ```

3. **Start the DevTools server** with MCP support:
   ```bash
   npx reflex-devtools --mcp
   ```

   **Important:** The `--mcp` flag enables trace storage and REST API. Without it, MCP will return "MCP not enabled" errors.

   > **⚠️ Security note:** DevTools and its MCP API are development-only and unauthenticated — `/api/dispatch` can mutate application state. Never expose the server to the public internet; keep it on `localhost` or a trusted local network.

4. **Start your Reflex application**

### Install MCP Server

```bash
npm install -g @flexsurfer/reflex-devtools-mcp
# or
pnpm add -g @flexsurfer/reflex-devtools-mcp
```

### Configure with Claude Desktop

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "reflex-devtools": {
      "command": "npx",
      "args": ["reflex-devtools-mcp"],
      "env": {}
    }
  }
}
```

For custom DevTools server host/port:

```json
{
  "mcpServers": {
    "reflex-devtools": {
      "command": "npx",
      "args": ["reflex-devtools-mcp", "--port", "3000", "--host", "192.168.1.10"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop, and the tools will be available!

### Configure with Cursor IDE

Cursor IDE also supports MCP servers. Add to your Cursor settings:

1. **Open Cursor Settings**: `Cmd/Ctrl + Shift + P` → "Preferences: Open User Settings (JSON)"

2. **Add MCP configuration** to your `settings.json`:

```json
{
  "mcp.servers": {
    "reflex-devtools": {
      "command": "npx",
      "args": ["reflex-devtools-mcp"],
      "env": {}
    }
  }
}
```

3. **Use with Cursor Composer/Chat**: Ask the AI to inspect your app:
   - "Show me recent traces from my Reflex app"
   - "What's causing the performance issue?"
   - "Dispatch a test event to my app"

**Custom Configuration for Cursor:**

```json
{
  "mcp.servers": {
    "reflex-devtools": {
      "command": "reflex-devtools-mcp",
      "args": ["--port", "4000", "--host", "localhost"],
      "env": {},
      "description": "Reflex DevTools for debugging"
    }
  }
}
```

---

## 🛠️ Available MCP Tools

The server also advertises usage instructions to every MCP client at initialize time (the recommended retrieval order: discover handlers first, read state by path, act with `dispatch_event`, verify from its response), so agents get this workflow automatically — no extra prompt setup needed.

### 1. `get_traces`

List execution traces from your application as compact rows: id, operation, opType, duration, timestamp, and event args. Failed events carry an `error` summary; events whose effects threw carry an `effectErrors` count. Use `get_trace` with a row's id for full detail.

**Parameters:**
- `limit` (number, optional): Maximum traces to return (default: 50, max: 1000)
- `eventFilter` (string, optional): Filter by event/operation name (substring match)
- `minDuration` (number, optional): Filter traces by minimum duration in milliseconds
- `opType` (string, optional): Filter by operation type: `event`, `render`, `sub/create`, `sub/run`, `sub/dispose`

**Example prompts for Claude:**
- "Show me the last 10 event traces"
- "Find all traces with duration over 100ms"
- "Show me traces for the 'fetch-user' event"

### 2. `get_trace`

Get the full detail of a single trace by id: for events, the state patches committed, the effects emitted, and error details (message, stack, failing interceptor) if it failed.

**Parameters:**
- `id` (number, required): The trace id, as returned by `get_traces`

**Example prompts for Claude:**
- "Show me the full detail of trace 42"
- "What state changes did that failed event make before throwing?"

### 3. `get_app_state`

Retrieve the current application database state.

**Parameters:**
- `path` (string, optional): JSONPath to a specific part of state (e.g., `user.profile`, `items[0]`)

**Example prompts for Claude:**
- "What's the current app state?"
- "Show me the user profile data"
- "What's in the items array?"

### 4. `dispatch_event`

Dispatch an event to the application and observe what it did. The response reports the outcome derived from the event's trace:

- `succeeded` — with the state patches it committed and the effects it emitted
- `failed` — with the error: a missing handler (typo'd event id) or a throwing handler chain; state was not committed
- `effects-failed` — state committed, but some effect handlers threw
- `unknown` — dispatched, but no trace was observed (e.g. tracing disabled or the app disconnected)

If no app is connected, the dispatch fails outright instead of pretending to succeed.
This tool requires the DevTools server to be started with `--mcp`.

**Parameters:**
- `eventName` (string, required): The event ID to dispatch
- `params` (array, optional): Parameters to pass to the event handler

**Example prompts for Claude:**
- "Dispatch a 'set-user' event with id 123 and name 'Test User'"
- "Trigger the 'clear-cache' event and tell me what state it changed"
- "Call 'update-settings' with dark mode enabled"

### 5. `get_handlers`

List all registered handler ids, grouped by handler type.

**Parameters:**
- `type` (string, optional): Filter by handler type: `event`, `fx`, `cofx`, `sub`

**Example prompts for Claude:**
- "What event handlers are registered?"
- "List all registered effects"
- "Show me the subscription handlers"

### 6. `get_active_subs`

View currently active subscription reactions.

**Parameters:**
- `filter` (string, optional): Filter subscriptions by key name

**Example prompts for Claude:**
- "What subscriptions are currently active?"
- "Show me user-related subscriptions"

---

## 💡 Usage Examples with AI

### Debugging Performance Issues

**You:** "My app feels slow. Can you help me identify bottlenecks?"

**Claude (using MCP tools):**
```
Let me check the traces for slow operations...

*calls get_traces with minDuration: 50*

I found several events taking over 50ms:
- "fetch-user-data": 234ms (3 times)
- "process-large-list": 156ms (1 time)
- "render": 89ms (5 times)

The "fetch-user-data" event seems to be the main bottleneck.
Let me check what effects it's triggering...

*calls get_handlers with type: "fx"*

I see it's using a "fetch-api" effect. Consider:
1. Adding request caching
2. Using optimistic updates
3. Implementing pagination
```

### Testing Event Flow

**You:** "Can you test what happens when a user logs in?"

**Claude:**
```
I'll dispatch a login event with test user data...

*calls dispatch_event with eventName: "user-login", params: [{"id": 999, "name": "Test User"}]*

The event succeeded. The response shows exactly what it did:
- outcome: "succeeded"
- stateChanges: user.id → 999, user.name → "Test User",
  user.isAuthenticated → true
- effectsEmitted: [["analytics-track", "login"]]

The login flow works — no follow-up state query needed.
```

### Understanding Code Architecture

**You:** "What effects are available in this app?"

**Claude:**
```
*calls get_handlers with type: "fx"*

Your app has 5 effect handlers registered:
- fetch-api
- local-storage
- analytics-track
- navigate
- websocket-send

The "fetch-api" effect handles HTTP requests.
Would you like me to examine how it's being used in your event handlers?
```

---

## 🔧 Configuration

### DevTools Server Configuration

The DevTools server must be configured to enable MCP support:

```bash
npx reflex-devtools [options]

Options:
  -p, --port <port>         Port to run the server on (default: 4000)
  -h, --host <host>         Host to bind the server to (default: localhost)
  --mcp                     Enable MCP support with trace storage (required)
  --max-traces <number>     Maximum traces to store (default: 1000, requires --mcp)
  --help                    Show help message
```

Binding beyond `localhost` (e.g. `--host 0.0.0.0`) exposes the unauthenticated state-reading and dispatch API — only do this on trusted local networks, never on the public internet.

### MCP Server Configuration

The MCP server connects to an already-running DevTools server:

```bash
npx reflex-devtools-mcp [options]

Options:
  -p, --port <port>         DevTools server port (default: 4000)
  -h, --host <host>         DevTools server host (default: localhost)
  --help                    Show help message
```

**Note:** Trace storage and limits are configured on the DevTools server, not the MCP server.

### MCP Client Configuration

Configure your AI client (Claude Desktop, Cursor, etc.) to use the MCP server:

#### Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reflex-devtools": {
      "command": "npx",
      "args": ["reflex-devtools-mcp"],
      "env": {}
    }
  }
}
```

#### Cursor IDE
Edit `~/Library/Application Support/Cursor/settings.json`:

```json
{
  "mcp.servers": {
    "reflex-devtools": {
      "command": "npx",
      "args": ["reflex-devtools-mcp"],
      "env": {},
      "description": "Reflex DevTools MCP Server"
    }
  }
}
```

**Note:** For development, use the local built package path. For production, use `npx reflex-devtools-mcp`.

---

## 🏗️ Development

### Building from Source

```bash
# Clone the repo
git clone https://github.com/flexsurfer/reflex-devtools.git
cd reflex-devtools

# Install dependencies
pnpm install

# Build all packages (DevTools server + MCP)
pnpm build

# Or build individually:
pnpm build:devtools    # Build DevTools server
pnpm build:mcp         # Build MCP server

# Test locally
./test-mcp-local.sh    # Get Cursor config
npx reflex-devtools --mcp  # Start DevTools server
# Then configure Cursor and test
```

### Testing Locally

Test the complete MCP integration:

```bash
# Terminal 1: Start DevTools server with MCP support
npx reflex-devtools --mcp

# Terminal 2: Start your test app
cd packages/reflex-test-app && pnpm dev

# Terminal 3: Test MCP server directly
cd packages/reflex-devtools-mcp
node dist/cli.js --help

# Or use the test script
cd ../..
./test-mcp-local.sh
```

### Project Structure

```
packages/reflex-devtools-mcp/
├── src/
│   ├── index.ts           # Main MCP server implementation
│   ├── cli.ts             # CLI entry point
│   ├── httpClient.ts      # HTTP client for DevTools API
│   └── tools/             # MCP tool implementations
│       ├── getTraces.ts
│       ├── getTrace.ts
│       ├── getAppState.ts
│       ├── dispatchEvent.ts
│       ├── getHandlers.ts
│       └── getActiveSubs.ts
├── dist/                  # Compiled output
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

---

## 🔗 Related Projects

- **[@flexsurfer/reflex](https://github.com/flexsurfer/reflex)** - The reactive state management library
- **[@flexsurfer/reflex-devtools](https://github.com/flexsurfer/reflex-devtools)** - Main DevTools package with web UI
- **[Model Context Protocol](https://modelcontextprotocol.io)** - The MCP specification

---

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with ❤️ for the Reflex community. Special thanks to:
- The [MCP](https://modelcontextprotocol.io) team for creating an amazing protocol
- Anthropic for Claude and MCP support
- All contributors to the Reflex ecosystem

---

<div align="center">
  
  **Debug Smarter with AI! 🤖✨**
  
  Made by [@flexsurfer](https://github.com/flexsurfer)
  
</div>
