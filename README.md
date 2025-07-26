# @flexsurfer/reflex-devtools

Developer tool for applications built with the `reflex` library (React and React Native).  
Provides a real-time debugging and event inspection system via WebSocket (with HTTP fallback).  
Built as a **single package** with three main components:

---

## 📦 Package Contents

```
src/
├── client/       # SDK imported into user apps (web or React Native)
├── server/       # Devtools server: HTTP + WebSocket backend
├── ui/           # Browser-based dashboard (React via Vite)
├── cli.ts        # CLI entry point: `npx reflex-devtools`
```

---

## ⚙️ Usage in Target App

The user adds this to their app (web or React Native):

```ts
import { initDevtools, logEvent } from '@flexsurfer/reflex-devtools';

initDevtools({ serverUrl: 'http://localhost:4000' });
```

- `initDevtools` opens a WebSocket connection to the devtools server.
- If WebSocket fails, it falls back to HTTP POST (`/event`).
- Data is forwarded to the browser dashboard in real time.

---

## 🔧 Devtools Server

Started via:

```bash
npx reflex-devtools --port 4000
```

- Hosts a WebSocket server (`/sdk`) for receiving events from the app.
- Exposes an HTTP endpoint (`POST /event`) as fallback transport.
- Serves the React-based UI dashboard (`/`).
- Broadcasts events to connected dashboard clients via WebSocket (`/ui`).

---

## 🌐 WebSocket Protocol

- `client → server`: JSON event objects
- `server → dashboard`: same objects forwarded as-is
- No binary protocol, no custom framing
- Fallback transport: `fetch('/event', POST)`

---

## 📋 Event Payload Example

```json
{
  "type": "state-update",
  "component": "UserList",
  "payload": {
    "users": [1, 2, 3]
  },
  "timestamp": 1722535152
}
```

---

## 🧠 Key AI-Relevant Concepts

- `@flexsurfer/reflex-devtools` is a **monolithic devtool package**.
- It includes:
  - `client`: **SDK** used inside user apps (web/RN)
  - `server`: **HTTP + WebSocket backend**
  - `ui`: **React dashboard (Vite)**
  - `cli.ts`: **entry point**, runs server + UI
- **Transport:** primary = WebSocket, fallback = HTTP POST
- **Goal:** visualize runtime data in devtools UI from any connected app
- **Must work in:** browsers **and** React Native 

---
