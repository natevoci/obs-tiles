# obs-tiles GitHub Copilot Instructions

## Project Overview

**obs-tiles** is a React 17 + TypeScript application for controlling OBS Studio via the obs-websocket plugin. It provides a tile-based UI for remote control of scenes, sources, recording, and streaming. The app supports both **Electron desktop** and **web browser** deployment.

- **Language**: TypeScript (strict mode)
- **Framework**: React 17 + styled-components + Material-UI
- **Build Tool**: electron-vite (Electron) / Vite (Web)
- **Desktop**: Electron with IPC-based configuration
- **Protocol**: OBS WebSocket v4.9.1 and v5.x (auto-detected or configured)
- **Auth**: SHA256-based WebSocket authentication with React dialog prompt

## Deployment Modes

| Mode | Command | Description |
|------|---------|-------------|
| Electron Dev | `yarn dev` | Runs Electron app with hot reload (renderer on port 5173) |
| Web Dev | `yarn web` | Runs standalone web app on port 5173 |
| Build | `yarn build` | Builds Electron app to `dist/` |
| Package | `yarn package` | Creates Windows installer (NSIS) and ZIP |

## OBS WebSocket API Version Support

The app supports both OBS WebSocket v4.9.1 and v5.x through an **adapter abstraction layer**.

### API Version Configuration

In `config.json`, each connection can specify an `apiVersion`:

```json
{
  "connections": {
    "main": {
      "address": "localhost:4455",
      "apiVersion": "auto"  // "auto" | "v4" | "v5"
    }
  }
}
```

- `"auto"` (default): Auto-detects version on connect (v5 sends Hello immediately, v4 waits)
- `"v4"`: Force v4.9.1 protocol (port 4444 default)
- `"v5"`: Force v5.x protocol (port 4455 default)

### Adapter Architecture

```
src/renderer/api/obs/
├── abstraction/
│   ├── types.ts      (unified data types - v5-style camelCase)
│   ├── adapter.ts    (OBSAdapter interface)
│   └── index.ts
├── adapters/
│   ├── v4-adapter.ts (translates v4 kebab-case → unified interface)
│   ├── v5-adapter.ts (native v5 implementation)
│   ├── factory.ts    (createAdapter with auto-detection)
│   └── index.ts
```

### Unified Event Names

Providers and components use unified v5-style event names. The v4 adapter maps legacy events:

| v4 Event                               | Unified Event                 |
|----------------------------------------|-------------------------------|
| `SwitchScenes`                         | `CurrentProgramSceneChanged`  |
| `RecordingStarted`, `RecordingStopped` | `RecordStateChanged`          |
| `StreamStarted`, `StreamStopped`       | `StreamStateChanged`          |
| `TransitionBegin`                      | `SceneTransitionStarted`      |
| `TransitionEnd`                        | `SceneTransitionEnded`        |
| `SceneItemAdded`                       | `SceneItemCreated`            |
| `SceneItemVisibilityChanged`           | `SceneItemEnableStateChanged` |
| `SceneItemLockChanged`                 | `SceneItemLockStateChanged`   |
| `SourceOrderChanged`                   | `SceneItemListReindexed`      |

### Using the Adapter

**Always use adapter methods for OBS requests:**

```typescript
// Scene switching
obs.adapter?.setCurrentProgramScene(sceneName)

// Scene item visibility
obs.adapter?.setSceneItemEnabled(sceneName, sceneItemId, true)

// Scene item reordering
obs.adapter?.setSceneItemIndex(sceneName, sceneItemId, newIndex)
```

**Event subscriptions should only be used in providers (not components):**

Providers subscribe to events and expose type-safe data to components via typed hooks.

```typescript
// INSIDE PROVIDERS ONLY - use adapter.on for event subscriptions:
adapter.on('CurrentProgramSceneChanged', (data) => { ... })
adapter.on('SceneItemEnableStateChanged', (data) => { ... })

// COMPONENTS use typed hooks instead:
const currentScene = useCurrentScene(obs)  // Type: CurrentSceneData | undefined
const sceneList = useSceneList(obs)        // Type: SceneListData | undefined
```

## CRITICAL: Two-Level Property Naming Convention

**API Protocol Level**: kebab-case (`scene-name`, `item-id`, `source-name`, `message-id`)
**JavaScript Level**: camelCase (`sceneName`, `itemId`, `sourceName`, `messageId`)

**Conversion**: Happens automatically at the provider layer using `camelCaseKeys()` utility (`src/renderer/api/obs/util/camelCaseKeys.ts`). All providers normalize kebab-case API responses to camelCase before passing to React components.

**Golden Rule**: 
- Use kebab-case ONLY in adapter implementations for v4 (internal to adapters)
- Use camelCase EVERYWHERE in React components and normalized data
- **Always use adapter methods** - they handle version differences automatically

## Key Files and Purposes

### Electron Main Process (`src/main/`)
- **index.ts**: Electron main process - window management, IPC handlers, settings/config loading, portable mode support, window state persistence

### Electron Preload (`src/preload/`)
- **index.ts**: Context bridge exposing IPC methods (`getSettings`, `getConfig`, `saveConfig`) to renderer

### Shared (`src/shared/`)
- **defaults.ts**: Default configuration template (connections, tiles layout)

### Renderer Core (`src/renderer/`)
- **websocket-client.ts**: Native WebSocket implementation with SHA256 auth, message handling, Proxy wrapper for undefined property warnings
- **api/obs/util/camelCaseKeys.ts**: Utility function for recursive kebab-case → camelCase conversion
- **createProvider.ts**: Provider factory wrapper with TypeScript generic types
- **version.ts**: Auto-generated version file (from package.json)

### Abstraction Layer (`src/renderer/api/obs/abstraction/`)
- **types.ts**: Unified data types (Scene, SceneItem, Stats, etc.) using v5-style camelCase
- **adapter.ts**: OBSAdapter interface defining the version-agnostic API contract

### Version Adapters (`src/renderer/api/obs/adapters/`)
- **v4-adapter.ts**: Implements OBSAdapter for v4.9.1 protocol, translates kebab-case to camelCase
- **v5-adapter.ts**: Implements OBSAdapter for v5.x protocol with OpCode-based messaging
- **factory.ts**: Creates appropriate adapter with optional auto-detection

### Data Providers (`src/renderer/api/obs/providers/`)
All providers use adapter methods and unified event names:
- currentScene.ts, sceneList.ts, sceneItemList.ts, sceneItemProperties.ts
- transition.ts, stats.ts, videoInfo.ts, sceneImage.ts
- isRecording.ts, isStreaming.ts

### Components (`src/renderer/components/`)
- SceneButton, SceneItemButton, Text, Button, Tiles
- Access normalized camelCase data from providers
- Settings panel for configuration (dialog-based)
- Password prompt dialog for WebSocket auth (replaces browser prompt for Electron compatibility)

### API Actions (`src/renderer/api/obs/actions/`)
- setCurrentScene.ts, recording.ts, streaming.ts
- Use adapter methods (e.g., `obs.adapter?.setCurrentProgramScene()`)

## Configuration System

### settings.json (App Root)
Application-level settings stored next to the executable:
```json
{
  "title": "obs-tiles",
  "dataDir": "data"
}
```
- `title`: Window title
- `dataDir`: Path to data directory (relative or absolute)

### config.json (Data Directory)
User configuration stored in `%dataDir%/config.json`:
```json
{
  "connections": {
    "main": { 
      "address": "localhost:4455",
      "apiVersion": "auto"
    }
  },
  "connection": "main",
  "tileSize": 10,
  "direction": "column",
  "tiles": [...]
}
```

### Storage Behavior by Mode
| Mode     | Settings Storage           | Config Storage           |
|----------|----------------------------|--------------------------|
| Electron | `settings.json` file → IPC | `config.json` file → IPC |
| Web      | N/A                        | localStorage             |

The `SettingsProvider` auto-detects mode via `window.ipcRenderer` availability.

## OBS WebSocket 4.9.1 Protocol Reference

**Docs**: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md

### Request Parameter Examples

| Request | Parameters | Notes |
|---------|-----------|-------|
| GetSceneList | (none) | Returns: `current-scene`, `scenes` |
| GetSceneItemList | `sceneName` | camelCase parameter (v4.9+) |
| TakeSourceScreenshot | `sourceName`, `embedPictureFormat` | camelCase parameters |
| SetCurrentScene | `'scene-name'` | kebab-case parameter |
| SetSceneItemProperties | `'scene-name'`, `'item'` | kebab-case parameters |
| ReorderSceneItems | `scene`, `items` | plain property names |

Always check the OBS docs for exact parameter format—they vary inconsistently.

## OBS WebSocket 5.x Protocol Reference

**Docs**: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

### Key Differences from v4

| Feature            | v4.9.1                             | v5.x                                                               |
|--------------------|------------------------------------|--------------------------------------------------------------------|
| Default Port       | 4444                               | 4455                                                               |
| Property Naming    | kebab-case                         | camelCase                                                          |
| Message Format     | `request-type`, `message-id`       | OpCode-based (0=Hello, 1=Identify, 6=Request, 7=Response, 5=Event) |
| Authentication     | `GetAuthRequired` + `Authenticate` | Hello message contains auth challenge                              |
| Event Subscription | All events by default              | Bitmask subscription in Identify message                           |
| Scene Item IDs     | String `item` names                | Numeric `sceneItemId`                                              |

## Build & Development

```bash
yarn dev       # Electron app with hot reload (renderer on port 5173)
yarn web       # Standalone web app on port 5173
yarn build     # Production build to dist/
yarn package   # Create Windows installer (NSIS) and ZIP
yarn clean     # Remove dist folder
```

> **Note (Windows)**: `yarn package` must be run from an elevated (Administrator) prompt, or with Developer Mode enabled. This is required because Windows does not support symbolic links without elevated privileges.

### Build Outputs
- `dist/main/` - Electron main process
- `dist/preload/` - Electron preload scripts
- `dist/renderer/` - React app (web assets)

### Version Management
Version is auto-generated from `package.json` into `src/renderer/version.ts` during build:
```bash
yarn generate-version  # Runs automatically with dev/build
```

### Debug Logging
The Proxy wrapper logs warnings to console when code accesses undefined properties:
```
[obs-websocket] Undefined property access in "SwitchScenes event"
  Property: scneeName    // Typo!
  Available: sceneName, sources
```

This catches typos, property naming mismatches, and API version issues.

## Testing WebSocket Connection

Ensure OBS Studio is running with WebSocket plugin v4.9.1+ on `localhost:4444` or v5.x on `localhost:4455`.

```typescript
import { createAdapter } from '~/api/obs/adapters/factory';

// Create adapter with auto-detection
const adapter = await createAdapter({ address: 'localhost:4455', apiVersion: 'auto' });
await adapter.connect('localhost:4455', 'your-password');

// Version-agnostic requests
const scenes = await adapter.getSceneList();
console.log(scenes.currentProgramSceneName);

// Event subscriptions (used by providers, not components directly)
adapter.on('CurrentProgramSceneChanged', (data) => {
  console.log(data.sceneName);
});

// Scene item control
await adapter.setSceneItemEnabled('MyScene', 1, true);
await adapter.setSceneItemIndex('MyScene', 1, 0); // Move to back
```

## Project Structure

```
src/
├── main/
│   └── index.ts               (Electron main process)
├── preload/
│   └── index.ts               (IPC context bridge)
├── shared/
│   └── defaults.ts            (default configuration)
├── renderer/
│   ├── api/obs/
│   │   ├── websocket-client.ts
│   │   ├── auth.ts
│   │   ├── obs-websocket.tsx  (provider + password dialog)
│   │   ├── createProvider.ts
│   │   ├── util/camelCaseKeys.ts
│   │   ├── actions/           (scene, recording, streaming control)
│   │   ├── providers/         (data providers)
│   │   ├── abstraction/
│   │   │   ├── types.ts       (unified data types)
│   │   │   ├── adapter.ts     (OBSAdapter interface)
│   │   │   └── index.ts
│   │   └── adapters/
│   │       ├── v4-adapter.ts  (v4.9.1 implementation)
│   │       ├── v5-adapter.ts  (v5.x implementation)
│   │       ├── factory.ts     (adapter creation + auto-detection)
│   │       └── index.ts
│   ├── components/
│   │   ├── tiles/             (UI components)
│   │   ├── Settings/
│   │   ├── Header/
│   │   └── Layout.tsx
│   ├── theme/
│   ├── index.html
│   ├── index.tsx
│   ├── version.ts             (auto-generated)
│   ├── vite.config.ts         (web-only Vite config)
│   └── vite-env.d.ts
├── electron.vite.config.ts    (Electron + renderer Vite config)
├── settings.json              (app-level settings)
├── data/
│   └── config.json            (user configuration)
└── build/
    └── installer.nsh          (NSIS installer customization)
```

## Packaging & Installation

### Windows Installer (NSIS)
The package script creates both an NSIS installer and ZIP:
```bash
yarn package   # Creates installer in dist/
```

Features:
- Preserves user data (`settings.json`, `data/` folder) during reinstall/upgrade
- Custom installation directory support
- Desktop and Start Menu shortcuts

### Portable Mode
The app always runs in portable mode - all data is stored relative to the executable:
- `settings.json` - Application settings (title, data directory)
- `data/` folder - User configuration, window state, Electron cache

## Summary

1. **Always**: Use adapter methods for all OBS WebSocket communication
2. **Always**: Event subscriptions (`adapter.on`) belong in providers only - components use typed hooks
3. **Always**: Providers call `camelCaseKeys(data)` on all API responses (v4 only)
4. **Check**: OBS docs for exact parameter names (they're inconsistent between v4/v5)
5. **Debug**: Enable console to see Proxy warnings about undefined properties
6. **Electron vs Web**: Use `window.ipcRenderer` to detect mode; config via IPC (Electron) or localStorage (Web)
6. **v4 Reference**: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md
7. **v5 Reference**: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

