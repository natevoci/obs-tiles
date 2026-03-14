---
applyTo: "src/renderer/api/obs/**"
---

# OBS API Layer Instructions

## Architecture Overview

```
src/renderer/api/obs/
├── abstraction/
│   ├── adapter.ts     (OBSAdapter interface — the version-agnostic contract)
│   ├── types.ts       (unified data types, all v5-style camelCase)
│   └── index.ts
├── adapters/
│   ├── v4-adapter.ts  (implements OBSAdapter for v4.9.1, translates kebab-case)
│   ├── v5-adapter.ts  (implements OBSAdapter for v5.x, OpCode messaging)
│   ├── factory.ts     (createAdapter — auto-detects version or forces v4/v5)
│   └── index.ts
├── providers/         (subscribe to adapter events, expose data via createProvider)
├── actions/           (send adapter requests — one file per domain)
├── util/
│   └── camelCaseKeys.ts
├── websocket-client.ts
├── auth.ts
└── createProvider.ts
```

## Two-Level Naming Convention — CRITICAL

| Level | Format | Where |
|-------|--------|-------|
| OBS v4 protocol wire | kebab-case (`scene-name`, `source-name`) | Inside `v4-adapter.ts` only |
| OBS v5 protocol wire | camelCase (`sceneName`, `sourceName`) | Inside `v5-adapter.ts` only |
| Everywhere else | camelCase | Adapters' public return values, providers, components, actions |

**Conversion rule**: `camelCaseKeys()` (`src/renderer/api/obs/util/camelCaseKeys.ts`) must be called on all raw v4 API responses inside the v4 adapter before returning data. v5 responses are already camelCase — do NOT call `camelCaseKeys()` on v5 responses.

## Adding a New Provider

1. Create `src/renderer/api/obs/providers/<name>.ts`.
2. Call `createProvider({ init, attach })` from `src/renderer/api/obs/createProvider.ts`.
3. Use `adapter.on(unifiedEventName, ...)` inside `attach` — **never outside a provider**.
4. Call `camelCaseKeys(data)` on v4 raw responses; v5 data is already normalised.
5. Export a typed hook (e.g. `useMyData(obs)`) that calls `useDataProvider`.
6. Register the provider in `src/renderer/api/obs/providers/index.ts`.

## Adding a New Action

1. Create `src/renderer/api/obs/actions/<domain>.ts` (or add to an existing domain file).
2. Accept `obs: ConnectionPublic` as the first parameter.
3. Call `obs.adapter?.<method>(...)` — always via the adapter, never raw WebSocket.
4. Export from `src/renderer/api/obs/actions/index.ts`.

## Event Subscriptions Belong ONLY in Providers

- **Providers**: call `adapter.on(event, handler)` inside their `attach` function.
- **Components**: call typed hooks (`useCurrentScene(obs)`, `useSceneList(obs)`) — never `adapter.on` directly.
- **Actions**: fire-and-forget calls to `adapter.*` — no event subscriptions.

## Unified Event Names (v5-style)

The v4 adapter maps its legacy event names to these before emitting:

| v4 Event | Unified Event |
|----------|--------------|
| `SwitchScenes` | `CurrentProgramSceneChanged` |
| `RecordingStarted`, `RecordingStopped` | `RecordStateChanged` |
| `StreamStarted`, `StreamStopped` | `StreamStateChanged` |
| `TransitionBegin` | `SceneTransitionStarted` |
| `TransitionEnd` | `SceneTransitionEnded` |
| `SceneItemAdded` | `SceneItemCreated` |
| `SceneItemVisibilityChanged` | `SceneItemEnableStateChanged` |
| `SceneItemLockChanged` | `SceneItemLockStateChanged` |
| `SourceOrderChanged` | `SceneItemListReindexed` |

## Key Adapter Methods

```typescript
// Navigation
obs.adapter?.setCurrentProgramScene(sceneName)

// Scene items
obs.adapter?.setSceneItemEnabled(sceneName, sceneItemId, true)
obs.adapter?.setSceneItemIndex(sceneName, sceneItemId, newIndex)

// Queries
obs.adapter?.getSceneList()           // → { scenes, currentProgramSceneName }
obs.adapter?.getSceneItemList(scene)  // → SceneItem[]
```

Always prefer adapter methods — they handle v4/v5 differences automatically.

## v4 vs v5 Protocol Quick Reference

| Feature | v4.9.1 | v5.x |
|---------|--------|------|
| Default port | 4444 | 4455 |
| Property naming | kebab-case | camelCase |
| Message format | `request-type`, `message-id` | OpCode (0=Hello, 1=Identify, 6=Req, 7=Resp, 5=Event) |
| Auth | `GetAuthRequired` + `Authenticate` | Challenge in Hello message |
| Scene item IDs | String `item` names | Numeric `sceneItemId` |
| Event subscription | All events by default | Bitmask in Identify message |

**Always check OBS docs for exact parameter names** — they are inconsistently named between versions and even between requests within the same version.

- v4 docs: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md
- v5 docs: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

## Debug Logging

The `websocket-client.ts` Proxy wrapper logs a warning whenever code accesses an undefined property on a message object:

```
[obs-websocket] Undefined property access in "SwitchScenes event"
  Property: scneeName    ← typo
  Available: sceneName, sources
```

Enable the browser/Electron DevTools console to see these. They surface typos, wrong property names, and v4/v5 naming mismatches immediately.
