# obs-tiles GitHub Copilot Instructions

## Project Overview

**obs-tiles** is a React 17 + TypeScript + Vite web application for controlling OBS Studio via the obs-websocket 4.9.1 plugin. It provides a web-based UI for remote control of scenes, sources, recording, and streaming.

- **Language**: TypeScript (strict mode)
- **Framework**: React 17 + styled-components
- **Build Tool**: Vite with HTTPS on port 3000 (@vitejs/plugin-basic-ssl)
- **Protocol**: OBS WebSocket 4.9.1
- **Auth**: SHA256-based WebSocket authentication

## CRITICAL: Two-Level Property Naming Convention

**API Protocol Level**: kebab-case (`scene-name`, `item-id`, `source-name`, `message-id`)
**JavaScript Level**: camelCase (`sceneName`, `itemId`, `sourceName`, `messageId`)

**Conversion**: Happens automatically at the provider layer using `camelCaseKeys()` utility (`src/api/obs/util/camelCaseKeys.js`). All providers normalize kebab-case API responses to camelCase before passing to React components.

**Golden Rule**: 
- Use kebab-case ONLY in raw WebSocket requests (check OBS docs for exact format)
- Use camelCase EVERYWHERE in React components and normalized data

## Key Files and Purposes

### Core
- **websocket-client.ts**: Native WebSocket implementation with SHA256 auth, message handling, Proxy wrapper for undefined property warnings
- **camelCaseKeys.ts**: Utility function for recursive kebab-case → camelCase conversion (exported as CamelCaseObject type for type safety)
- **createProvider.ts**: Provider factory wrapper with TypeScript generic types

### Data Providers (`src/api/obs/providers/`)
All providers normalize API data to camelCase and subscribe to WebSocket events:
- currentScene.ts, sceneList.ts, sceneItemList.ts, sceneItemProperties.ts
- transition.ts, stats.ts, videoInfo.ts, sceneImage.ts
- isRecording.ts, isStreaming.ts

### Components (`src/components/`)
- SceneButton, SceneItemButton, Text, Button, Tiles
- Access normalized camelCase data from providers
- Settings panel for configuration

### API Actions (`src/api/obs/actions/`)
- setCurrentScene.ts, recording.ts, streaming.ts
- Wrappers around `obs.send()` with kebab-case parameters where needed

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
yarn dev     # Start dev server on HTTPS port 3000
yarn build   # Production build to dist/
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
├── api/obs/
│   ├── websocket-client.ts
│   ├── auth.ts
│   ├── createProvider.ts
│   ├── util/camelCaseKeys.ts
│   ├── actions/              (scene, recording, streaming control)
│   └── providers/             (data providers)
├── components/
│   ├── tiles/                 (UI components)
│   ├── Settings/
│   ├── Header/
│   └── Layout.tsx
├── theme/
├── index.html
├── index.tsx
├── vite-env.d.ts            (Vite type definitions)
└── tsconfig.json
```

## Summary

1. **Always**: Use kebab-case in raw WebSocket requests, camelCase everywhere else
2. **Always**: Providers call `camelCaseKeys(data)` on all API responses
3. **Check**: OBS docs for exact parameter names (they're inconsistent)
4. **Debug**: Enable console to see Proxy warnings about undefined properties
5. **Reference**: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md

