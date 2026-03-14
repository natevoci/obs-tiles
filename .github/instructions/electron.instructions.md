---
applyTo: "src/main/**,src/preload/**"
---

# Electron Layer Instructions

## File Responsibilities

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Electron main process: window lifecycle, IPC handlers, settings/config loading, window state persistence |
| `src/preload/index.ts` | Context bridge — exposes the `ipcRenderer` object to the renderer via `contextBridge.exposeInMainWorld` |

## IPC Channels

Three channels are defined. Names must match exactly between `src/main/index.ts` (handler) and `src/preload/index.ts` (invoke):

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-settings` | renderer→main | Returns parsed `settings.json` |
| `get-config` | renderer→main | Returns parsed `config.json` from `dataDir` |
| `save-config` | renderer→main | Writes config JSON to `config.json` in `dataDir` |

When adding a new IPC channel register the handler with `ipcMain.handle('channel-name', ...)` in `src/main/index.ts` and expose it via `ipcRenderer.invoke('channel-name', ...)` in `src/preload/index.ts`.

## Electron vs Web Detection

Use `window.ipcRenderer` to detect whether the app is running in Electron or the web:

```typescript
if (window.ipcRenderer) {
  // Electron path
} else {
  // Web / localStorage path
}
```

**Never** use `process.versions.electron`, `navigator.userAgent`, or any other mechanism — `window.ipcRenderer` is the project standard, as established in `src/renderer/api/obs/adapters/factory.ts` and `src/renderer/components/Settings/SettingsProvider.tsx`.

## Portable Mode — Path Conventions

All file I/O in the main process must resolve paths relative to `basePath` (not `__dirname` or hardcoded `%APPDATA%`):

```typescript
const basePath = isDev ? process.cwd() : path.join(process.resourcesPath, '..')
```

- `settings.json` lives at `path.join(basePath, 'settings.json')`
- `dataDir` is resolved from `settings.dataDir` — relative values are joined with `basePath`; absolute values are used as-is
- `config.json` lives at `path.join(dataDir, 'config.json')`
- `app.setPath('userData', dataDir)` redirects all Electron cache/storage into the portable data folder

Never use `app.getPath('userData')` before `app.setPath('userData', dataDir)` is called.

## settings.json vs config.json

| File | Location | Content |
|------|----------|---------|
| `settings.json` | Next to the executable (`basePath`) | App-level: `title`, `dataDir` |
| `config.json` | Inside `dataDir` | User config: connections, tiles layout, `configs` array |

`settings.json` is not exposed to the renderer — only `getSettings()` returns its parsed contents. `config.json` is loaded, returned, and saved via IPC.

## Window State Persistence

Window bounds (x, y, width, height, maximised) are persisted in `data/windowState.json`. Load bounds before `mainWindow.show()` and save them in the `close` event. Do not save bounds when the window is maximised — restore the maximised state separately.

## Adding Electron-Only Behaviour in the Renderer

If renderer code must behave differently in Electron, gate it with `window.ipcRenderer`:

```typescript
// Example: debugger guard that should not fire in web mode
window.addEventListener('beforeunload', () => {
  if (window.ipcRenderer) debugger
})
```

Do not add renderer-side `process.*` checks — `process` is not reliably available in the renderer context.
