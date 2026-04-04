# obs-tiles GitHub Copilot Instructions

## Project Overview

**obs-tiles** is a React 17 + TypeScript application for controlling OBS Studio via the obs-websocket plugin. It provides a tile-based UI for remote control of scenes, sources, recording, and streaming. The app supports both **Electron desktop** and **web browser** deployment.

- **Language**: TypeScript (strict mode)
- **Framework**: React 17 + styled-components + Material-UI
- **Build Tool**: electron-vite (Electron) / Vite (Web)
- **Desktop**: Electron with IPC-based configuration
- **Protocol**: OBS WebSocket v4.9.1 and v5.x (auto-detected or configured)
- **Auth**: SHA256-based WebSocket authentication with React dialog prompt

---

## Changelog Maintenance

**After every code change, update `Changelog.md`.**

- Add an entry under the current date (ISO format `YYYY-MM-DD`) at the top of the _Feature History_ section.
- Follow the existing format: `**feat/fix/refactor: Short description**` followed by bullet points for the details.
- If a new architectural pattern is introduced, add a summary under the relevant sub-section (or create a new sub-section).
- Do not skip this step. Keeping the changelog current is as important as the code change itself.

---

## TODO Maintenance

**After every code change, review `TODO.md`.**

- If the change completed or invalidated any item in `TODO.md`, remove that item.
- If the change introduces or mentions a planned future improvement (e.g. "future setting", "future feature", "will be added later"), add a concise entry to `TODO.md`.
- Do not skip this step. `TODO.md` is the single source of truth for planned work.

---

## Self-Improving Instructions

When a follow-up message contains phrases like:
- "you forgot to …"
- "always do …" / "always use …"
- "never do …" / "never use …"
- "remember to …"
- "make sure you …"

…treat it as a lesson that should be captured permanently. After applying the correction:
1. Identify which `.github/instructions/*.instructions.md` file is most relevant to the topic.
2. Add a concise rule or note to that file so the same mistake is not repeated.
3. If no existing scoped file fits, add the rule to this file under a new section.

**Keep instructions files lean.** Reference actual source files rather than duplicating code samples — code blocks in instructions files go stale and take up context. For example:
> See `path/to/file.ts` for an example of the `MyFunction()` pattern.

is better than pasting a full code block.

---

## Styling Conventions

- In renderer component code, do not introduce new inline `style={{ ... }}` blocks for layout/styling.
- Create or extend local `styled-components` in the file instead.

---


## Deployment Modes

| Mode | Command | Description |
|------|---------|-------------|
| Electron Dev | `yarn dev` | Runs Electron app with hot reload (renderer on port 5173) |
| Web Dev | `yarn web` | Runs standalone web app on port 5173 |
| Build | `yarn build` | Builds Electron app to `dist/` |
| Package | `yarn package` | Creates Windows installer (NSIS) and ZIP |

## OBS WebSocket API Version Support

The app supports both OBS WebSocket v4.9.1 and v5.x through an **adapter abstraction layer**. The `apiVersion` field per connection in `config.json` accepts `"auto"` (default), `"v4"`, or `"v5"`.

> Detailed adapter architecture, event name mapping, naming conventions, and protocol rules are in `.github/instructions/obs-api.instructions.md`.

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

### OBS API Layer (`src/renderer/api/obs/`)
- `abstraction/` — `OBSAdapter` interface and unified types (v5-style camelCase)
- `adapters/` — v4 and v5 implementations + auto-detecting factory
- `providers/` — subscribe to adapter events, expose data via typed hooks
- `actions/` — fire-and-forget OBS requests (one file per domain)
- See `.github/instructions/obs-api.instructions.md` for full conventions.

### Components (`src/renderer/components/`)
- `tiles/` — tile UI components (SceneButton, SceneItemButton, AudioInputTile, etc.)
- `Settings/` — settings dialog, visual config editor, SettingsProvider
- `EditMode/` — edit mode overlay, tile movement, properties dialog
- See `.github/instructions/tiles.instructions.md` for tile authoring conventions.

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

## OBS Protocol References

- v4 docs: https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md
- v5 docs: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

Parameter naming is inconsistent — always verify in the docs. See `.github/instructions/obs-api.instructions.md` for the v4/v5 differences table.

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

## Summary

1. **OBS API layer**: See `.github/instructions/obs-api.instructions.md` — adapter methods, provider/action patterns, camelCase rules, event names.
2. **Tiles**: See `.github/instructions/tiles.instructions.md` — adding tile types, TileWrapper, viewType, click hooks.
3. **Electron**: See `.github/instructions/electron.instructions.md` — IPC channels, portable paths, `window.ipcRenderer` detection.
4. **Changelog**: Update `Changelog.md` after every code change.

