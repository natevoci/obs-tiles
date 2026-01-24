# obs-tiles GitHub Copilot Instructions

## Project Overview

**obs-tiles** is a React 17 + TypeScript application for controlling OBS Studio via the obs-websocket 4.9.1 plugin. It provides a tile-based UI for remote control of scenes, sources, recording, and streaming. The app supports both **Electron desktop** and **web browser** deployment.

- **Language**: TypeScript (strict mode)
- **Framework**: React 17 + styled-components + Material-UI
- **Build Tool**: electron-vite (Electron) / Vite (Web)
- **Desktop**: Electron with IPC-based configuration
- **Protocol**: OBS WebSocket 4.9.1
- **Auth**: SHA256-based WebSocket authentication with React dialog prompt

## Deployment Modes

| Mode | Command | Description |
|------|---------|-------------|
| Electron Dev | `yarn dev` | Runs Electron app with hot reload (renderer on port 5173) |
| Web Dev | `yarn web` | Runs standalone web app on port 5173 |
| Build | `yarn build` | Builds Electron app to `dist/` |
| Package | `yarn package` | Creates Windows installer (NSIS) and ZIP |

## CRITICAL: Two-Level Property Naming Convention

**API Protocol Level**: kebab-case (`scene-name`, `item-id`, `source-name`, `message-id`)
**JavaScript Level**: camelCase (`sceneName`, `itemId`, `sourceName`, `messageId`)

**Conversion**: Happens automatically at the provider layer using `camelCaseKeys()` utility (`src/renderer/api/obs/util/camelCaseKeys.ts`). All providers normalize kebab-case API responses to camelCase before passing to React components.

**Golden Rule**: 
- Use kebab-case ONLY in raw WebSocket requests (check OBS docs for exact format)
- Use camelCase EVERYWHERE in React components and normalized data

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

### Data Providers (`src/renderer/api/obs/providers/`)
All providers normalize API data to camelCase and subscribe to WebSocket events:
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
- Wrappers around `obs.send()` with kebab-case parameters where needed

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
    "main": { "address": "localhost:4444" }
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

Ensure OBS Studio is running with WebSocket plugin v4.9.1+ on `localhost:4444`.

```javascript
import { OBSWebSocketClient } from '~/api/obs/websocket-client';

const client = new OBSWebSocketClient();
await client.connect({ address: 'localhost:4444', password: 'your-password' });

// Request example
client.send('GetSceneList', {}, (data) => {
  console.log(data);  // Shows raw kebab-case response
});

// Event example
client.on('SwitchScenes', (data) => {
  console.log(data['scene-name']);  // Raw API returns kebab-case
});
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
│   │   └── providers/         (data providers)
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

1. **Always**: Use kebab-case in raw WebSocket requests, camelCase everywhere else
2. **Always**: Providers call `camelCaseKeys(data)` on all API responses
3. **Check**: OBS docs for exact parameter names (they're inconsistent)
4. **Debug**: Enable console to see Proxy warnings about undefined properties
5. **Electron vs Web**: Use `window.ipcRenderer` to detect mode; config via IPC (Electron) or localStorage (Web)
6. **Reference**: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md

