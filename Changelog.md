# OBS-tiles Changelog

## Feature History

### 2026-04-07

**fix(RtspStreamTile): replace img src data URL with canvas to fix memory leak**

- Each video frame was stored as a base64 data URL in React state and assigned to an `<img src>`, causing Chromium to retain a decoded bitmap per URL and growing private bytes rapidly
- Replaced `StreamImage` (`<img>`) with `StreamCanvas` (`<canvas>`) in `RtspStreamTile`
- `useRtspStream` no longer holds `frameDataUrl` state; instead it exposes `canvasRef` and `hasFrame`
- Each incoming frame is decoded via `createImageBitmap()` (browser-native, no `Buffer`) drawn onto the canvas, then immediately freed with `bitmap.close()`
- A `generation` counter discards any in-flight decodes that are superseded by a newer frame
- `hasFrame: boolean` replaces `frameDataUrl` as the visible/spinner guard

**feat(RtspStreamTile): real-time audio level meter overlay**

- Main process computes PCM RMS dBFS levels from the raw `s16le` audio data received on the named pipe socket in `RtspManager`
- Samples are accumulated over ~100 ms windows (9600 int16 samples @ 48 kHz stereo) before computing the level, keeping IPC traffic to ~10 msgs/sec per stream
- Level is computed regardless of mute state so the meter remains active while muted
- `rtsp-audio-level` IPC event (`{ streamId, level }`) is sent from main → renderer via `webContents.send`
- Preload bridge exposes `onRtspAudioLevel` / `offRtspAudioLevel` with listener-map wrapper (same pattern as existing RTSP events)
- `global.d.ts` Window interface extended with the new method pair
- `useRtspStream` hook gains `audioLevel: number | null` state; handler registered in the main lifecycle effect; reset to `null` on stream stop and reconnect
- `RtspStreamTile` renders a 5 px wide `AudioLevelMeterWrapper` strip on the right edge of the image (z-index 8, below mute button), filled from bottom by `AudioLevelBar` whose height drives from 0 % (−60 dBFS) to 100 % (0 dBFS); green→yellow→red gradient; 80 ms CSS ease-out transition

**feat(RtspStreamTile): play/stop button to toggle stream on and off**

- Added `active` state and `toggleActive` callback to `useRtspStream` hook
- When stopped (`active=false`), the existing lifecycle effect cleanup fires `rtspStop`; the new effect run resets `frameDataUrl`, `connecting`, and `error` to idle state
- When restarted (`active=true`), the effect re-runs, TCP-probes, and spawns ffmpeg as normal
- `PlayButtonWrapper` styled component positions the button in the bottom-left corner, mirroring `MuteButtonWrapper` (bottom-right)
- Button shows `Stop` icon while stream is active, `PlayArrow` icon while stopped; uses the same `StyledMuteButton` style

**refactor: Split JpegFrameParser and RtspManager into own files; move Window declarations to global.d.ts**

- `src/main/JpegFrameParser.ts` — extracted `JpegFrameParser` class from `main/index.ts`
- `src/main/RtspManager.ts` — extracted `RtspManager` class and `RtspStartOptions` interface from `main/index.ts`; imports `JpegFrameParser` locally
- `src/renderer/global.d.ts` — new file containing the `declare global { interface Window { ipcRenderer: ... } }` block previously in `SettingsProvider.tsx`
- `src/main/index.ts` — now imports `RtspManager` and `RtspStartOptions` from `./RtspManager`; unused Node imports (`spawn`, `ChildProcess`, `net`) removed
- `src/renderer/components/Settings/SettingsProvider.tsx` — removed `declare global` block (moved to `global.d.ts`)

### 2026-04-06

**feat(Tiles): RTSP Stream tile with live video and audio playback**

- New tile type `rtspStream` — displays a live RTSP video feed inside a standard tile, sizing matches `tileSize * 16 × 9`
- Stream URL defaults to `rtsp://<connection-host>/live` when not configured; configurable per-tile via `streamUrl`
- Single `ffmpeg` subprocess per tile: video → stdout (JPEG `image2pipe`), audio → Windows named pipe (`\\.\pipe\rtsp-audio-<id>`)
- Low-latency ffmpeg flags: `-rtsp_transport tcp -fflags nobuffer -flags low_delay -analyzeduration 0 -probesize 32 -max_delay 0 -reorder_queue_size 0`
- Hardware acceleration: `-hwaccel d3d11va`
- Audio playback via `speaker` npm package (native PCM output, `samplesPerFrame: 512` ≈ 12 ms)
- Mute/unmute is instantaneous — PCM bytes are discarded/forwarded in Node without restarting the ffmpeg process
- Tile starts muted by default (`startMuted: true`); a `VolumeOff`/`VolumeUp` icon button in the lower-right corner toggles audio
- Optional `fps` config — when unset, the `-vf fps` filter is omitted and the native stream frame rate is used
- Optional `audioSyncOffsetMs` for A/V sync adjustment
- `ffmpegPath` setting in Settings → FFmpeg binary folder (Electron-only, defaults to system PATH)
- `RtspManager` singleton in Electron main process manages all stream instances with IPC channels: `rtsp-start`, `rtsp-stop`, `rtsp-set-muted` (invoke) and `rtsp-frame`, `rtsp-error` (push)
- Graceful fallback in browser mode: tile shows "not supported" error overlay
- `RtspStreamTileConfig` added to shared tile type system (`Tiles.tsx`, `TilePropertiesDialog.tsx`, `EditableTiles.tsx`)
- Added `speaker` to `dependencies` and `@electron/rebuild` to `devDependencies`; added `yarn rebuild` script
- `ffmpegPath` field added to `ConfigFileFormat` and `DEFAULT_SETTINGS`

### 2026-04-05

**feat(Tiles): configurable active/inactive refresh times for scene and scene item tiles**

- Added `activeRefreshTime` and `inactiveRefreshTime` to `BaseTileConfig` and `ConfigItem`; both follow the same group/root inheritance pattern as `tileSize`/`fontSize`
- `SceneButton` and `SceneItemButton` now read these props and use them in `useSceneImage` (defaults: 400 ms active, 1000 ms inactive)
- `Tiles.tsx` propagates both fields through `inheritableProps` like other base config fields
- `Content.tsx` passes root-level values into the `Tiles` tree
- Added `RefreshTimeFields` helper component (styled, no inline styles) to `TilePropertiesDialog.tsx`, shown in Group, Scene, and Scene Item property forms
- `EditableTiles.tsx` plumbs `inheritedActiveRefreshTime` / `inheritedInactiveRefreshTime` through all levels (leaf, group, EditableGroup, root synthetic tile, and root `onSave`)

**feat(Settings/Electron): add auto backup config on app close**

- Added new settings fields: `autoBackupConfigOnClose` and `autoBackupConfigFolder`
- Added an Electron-only checkbox (`Auto backup config on close`) and `Backup folder` text input in `SettingsDialog.tsx`
- Added a `Browse` button next to the backup folder field that opens the native folder picker via Electron IPC (`select-folder`)
- Disabled the folder input until the checkbox is enabled
- Added close-time backup logic in `src/main/index.ts` to write/copy `config.json` into the configured folder when the app closes
- If `data/config.json` is missing, backup falls back to writing the currently selected config from settings as `config.json`

### 2026-03-27

**Version 5 release**

- Update version number in package.json

### 2026-03-22

**feat(EditMode): add Font Size slider to tile context menu**

- Added a `Font Size` slider directly below `Tile Size` in the inline edit-mode tile menu
- Wired slider changes for both root config and individual tiles in `EditableTiles.tsx`
- Uses inheritance-aware fallback (`fontSize` → `tileSize`) so existing tiles remain stable until explicitly adjusted

**feat(Tiles): split text sizing into independent fontSize setting**

- Added optional `fontSize` to shared tile config (`ConfigItem`) and default root config (`fontSize: 10`)
- Updated tile inheritance/runtime rendering to propagate `fontSize` alongside `tileSize`, with backward-compatible fallback to `tileSize` when `fontSize` is unset
- Applied `fontSize` in text/label rendering paths (`TileWrapper`, `CheckboxTile`, `SceneButton`, `SceneItemButton`, `AudioInputTile`, `Button`, and `Text`)
- Updated edit-mode tile previews and group inheritance to resolve and pass effective `fontSize`
- Added `Font Size` inputs next to `Tile Size` in tile properties dialogs wherever tile size is configurable (group, scene, scene item, button, text, and audio input forms)

**fix(TileWrapper): scale label font size with tile size**

- Updated `Label` in `TileWrapper.tsx` to compute `font-size` from both theme base size and tile `$size`
- Uses `calc(theme.fontSize.large * $size / 10)` so size `10` matches existing appearance while larger/smaller tiles scale proportionally
- Updated `Label` height to scale with tile size too: `calc(25px * $size / 10)`

**refactor(Text): use typed stats/video hooks and v5 stats field names**

- Replaced `obs.useDataProvider('stats')` and `obs.useDataProvider('videoInfo')` with `useStats(obs)` and `useVideoInfo(obs)` in `Text.tsx`
- Updated stats access to v5-normalized field names: `activeFps` and `availableDiskSpace`
- Updated FPS percentage math to use v5 video settings (`fpsNumerator / fpsDenominator`) instead of a non-existent `videoInfo.fps` field
- Confirmed v4 adapter `getStats()` maps v4 fields (`fps`, `free-disk-space`, etc.) to v5 abstraction fields (`activeFps`, `availableDiskSpace`, etc.)

### 2026-03-21

**fix(Electron): add renderer CSP and allow OBS websocket connections**

- Added a `Content-Security-Policy` meta tag in `src/renderer/index.html`
- Policy avoids `unsafe-eval` and keeps script execution to `script-src 'self'`
- Added `connect-src 'self' ws: wss: http: https:` so OBS WebSocket connections (e.g. `ws://localhost:4455`) and dev connections remain allowed
- Added `img-src data: blob:` and `style-src 'unsafe-inline'` to support scene image data URLs and styled-components runtime styles
- Removed `frame-ancestors` from the meta CSP because that directive is ignored when delivered via `<meta>` and triggers a browser warning

**fix(sceneImage): handle null scene case in fetchScreenshot function**

- Add handling of the case where scene hasn't been set yet when the app is first connecting

**fix(TileWrapper): constrain SelectionIndicator to tile wrapper bounds**

- Moved `SelectionIndicator` to render inside `Wrapper` instead of as a sibling fragment element
- Added explicit `top: 0` and `left: 0` to the absolute-positioned indicator
- Prevents indicator height from stretching to match taller sibling tiles in grouped rows

**fix(SceneButton): keep Program/Preview ScenePicker selections dynamic**

- Added shared scene placeholder tokens in `scenePlaceholders.ts` (`__OBS_PROGRAM_SCENE__`, `__OBS_PREVIEW_SCENE__`)
- `ScenePicker` now stores placeholder values for Program/Preview options instead of snapshotting the current scene names
- `SceneButton` now resolves placeholders against live scene data at render/click time via `resolveScenePlaceholder`
- Scene tile label and image now follow the latest Program/Preview scenes instead of staying bound to names from edit time
- Show stable Program/Preview labels for placeholder scenes

**fix(EditableTiles): Move "Paste into group" location**

- Move "Paste into group" into the section with the other cut and paste operations

### 2026-03-16

**fix(SettingsDialog): NamePromptDialog opening twice when creating new config**

- Root cause 1: dialog was conditionally mounted with `{namePrompt && <NamePromptDialog open />}` — abrupt unmount while `open=true` prevented MUI from restoring focus correctly, allowing focus to return to the `+` button and potentially triggering a second open via focus events. Changed to `open={namePrompt !== null}` so MUI manages the close animation and focus restoration properly.
- Root cause 2: `handleNewConfig`'s `onConfirm` called `setSelected` and `setJsonValue` as side effects inside `setLocalConfigs`'s updater function, and used a second `setLocalConfigs` call with another side effect. Replaced with a `pendingSelectLastRef` + `useEffect` pattern that selects the newly added config after `localConfigs` updates.

**fix(SettingsDialog): replace window.prompt/confirm with MUI dialogs**

- `window.prompt` (new config name, rename config) and `window.confirm` (delete config) are not supported in Electron
- Added `NamePromptDialog` component (inline in `SettingsDialog.tsx`) — MUI dialog with a text field, auto-focus, Enter key support, and disabled OK button when input is empty
- `handleNewConfig` and `handleRename` now open `NamePromptDialog` via `namePrompt` state instead of calling `window.prompt`
- `handleDelete` now opens the existing `ConfirmDialog` via `deleteConfirm` state; actual deletion moved to `confirmDelete` callback
- `handleSave` JSON parse error no longer calls `alert()` — replaced with `jsonError` state rendered as an inline error Dialog
- Added `DialogTitle` to MUI imports; added `ConfirmDialog` import
- Added permanent rule to `electron.instructions.md`: never use `window.prompt`, `window.confirm`, or `window.alert` in renderer code

### 2026-03-15

**feat(Tiles): background colour property for tile groups**

- Added optional `backgroundColor?: string` field to `GroupTileConfig` interface
- `TilesGroupWrapper` styled component now accepts `$backgroundColor` prop; falls back to `theme.groupBackground` when not set
- Updated `isGroupTileConfig` allowed-props list to include `backgroundColor` (suppresses spurious unknown-prop warnings)
- `GroupForm` in `TilePropertiesDialog` now has a native `<input type="color">` swatch alongside a text field; clearing the field removes the override and restores the theme default

**feat(Layout): HTTPS warning banner**

- Added `HttpsWarningBanner` component shown at the top of the page when the app is loaded over HTTPS in web mode
- OBS WebSocket uses an unencrypted `ws://` connection which browsers block as mixed content when the page is HTTPS
- Banner is dismissible and only renders in web mode (not Electron) when `window.location.protocol === 'https:'`

**feat(Settings): confirmation dialogs for streaming and recording**

- Added 4 optional boolean settings to `ConfigFileFormat` and `DEFAULT_SETTINGS`: `confirmBeforeStartStreaming`, `confirmBeforeStopStreaming`, `confirmBeforeStartRecording`, `confirmBeforeStopRecording` (all default `false`)
- Added 4 corresponding checkboxes to the Settings panel in `SettingsDialog`
- Created reusable `ConfirmDialog` component (`components/ConfirmDialog.tsx`) with title, message, Confirm and Cancel actions
- `Button.tsx` `toggleStreaming` and `toggleRecording` components now read the confirm flags from settings and show `ConfirmDialog` before executing the action when enabled

**refactor(SettingsContext): expose single settings field**

- Replaced `title`, `selectConfigAtLaunch`, `configs`, and `currentConfigIndex` context fields with a single `settings: ConfigFileFormat` object
- `SettingsProvider` passes `settings` state directly; `currentConfig` kept as convenience derived field
- Updated all consumers: `SettingsDialog`, `Footer`, `ConfigSelectorDialog` use `settings.*`
- Removed unused `selectConfig` from `Footer` (handled inside `ConfigSelectorDialog`) and unused `React` import from `ConfigSelectorDialog`

**refactor(SettingsProvider): remove unused config-mutation callbacks**

- Removed `addConfig`, `deleteConfig`, `renameConfig`, and `saveAllConfigs` from provider and context — all config editing goes through `saveFullSettings` (called by `SettingsDialog` on Save)

**refactor(SettingsProvider): consolidate to single ConfigFileFormat state**

- Replaced four separate `title` / `configs` / `currentConfigIndex` / `selectConfigAtLaunch` states with a single `settings: ConfigFileFormat` state
- All mutation callbacks now use the `setSettings(prev => ...)` functional-update pattern — no more stale closure risk, no `buildBlob` helper needed
- Removed `setSelectConfigAtLaunch` from context and provider (settings are saved atomically via `saveFullSettings`)
- `ConfigItem` import retained for `addConfig`; `autoOpenSelector` kept as a separate one-time UI flag

**feat(Settings): select config at launch**

- Added `selectConfigAtLaunch` boolean to `ConfigFileFormat` and `DEFAULT_SETTINGS` (default `false`)
- `SettingsProvider` sets an `autoOpenSelector` flag at load time when the option is enabled and more than one config exists
- `Layout` renders `<ConfigSelectorDialog>` driven by `autoOpenSelector` / `closeAutoOpenSelector` from context
- `SettingsDialog` settings panel now includes a "Select config at launch" checkbox; saved with the rest of the settings on Save

**refactor(Footer): extract ConfigSelectorDialog to its own file**

- Moved the config selector `Dialog` into `Footer/ConfigSelectorDialog.tsx` as a controlled component (`open` / `onClose` props)
- Footer now imports and renders `<ConfigSelectorDialog>`; logic is unchanged
- Prepares for a future "auto-open at launch" setting that can control the dialog from outside the Footer

**feat(Footer): config switcher button**

- Replaced the config name text + icon button with a single MUI `variant="contained"` `Button` labelled `"Selected Config: <name>"`, matching the tile button style
- Button is disabled when only one config exists; clicking opens a modal `Dialog` with a list of configs to switch to

**refactor(settings): terminology, IPC, and dialog overhaul**

- Renamed `DEFAULT_CONFIG` → `DEFAULT_SETTINGS` in `src/shared/defaults.ts`; added top-level `title: 'obs-tiles'` field
- Added `title?: string` to `ConfigFileFormat` interface in `src/shared/types.ts`
- **Electron main** (`src/main/index.ts`): removed `settings.json` next to exe; hard-coded `dataDir = path.join(basePath, 'data')`; renamed `loadConfig`/`saveConfig` → `loadSettings`/`saveSettings` (file: `data/settings.json`); removed `get-config` IPC handler; renamed `save-config` → `save-settings`; window title now sourced from the stored blob's `title` field
- **Preload** (`src/preload/index.ts`): removed `getConfig()` bridge; renamed `saveConfig` → `saveSettings`
- **SettingsProvider** (`src/renderer/components/Settings/SettingsProvider.tsx`): updated `Window` type declaration; load/save now via `getSettings()`/`saveSettings()`; localStorage key `'settingsCurrent'` → `'settings'`; `DEFAULT_CONFIG` → `DEFAULT_SETTINGS`; added `title` state; added `saveFullSettings(settings: ConfigFileFormat)` method; `buildBlob` helper includes `title` in every persisted blob; context value exposes `title`, `currentConfig` (was `settings`), and `saveFullSettings`
- **SettingsContext** (`src/renderer/components/Settings/SettingsContext.ts`): renamed `settings: ConfigItem` → `currentConfig: ConfigItem`; added `title: string` and `saveFullSettings` to context type
- **Callers** updated: `Content.tsx`, `obs-websocket.tsx`, `EditableTiles.tsx` all use `currentConfig` instead of `settings`
- **ConfigVisualEditor** stripped to connections-only: removed all tile node types (`root-settings`, `tiles-group`, `tile-group`, `tile-scene`, `tile-sceneItem`, `tile-button`, `tile-text`, `tile-audioInput`); added inline Add/Delete connection buttons; tree now shows only `connections-group` and `connection` nodes
- **SettingsDialog** rewritten with tree + tabbed layout: left panel tree has a "Settings" node (global title field) and a "Configs" group with per-config children; right panel for a config shows a Connections tab (using stripped ConfigVisualEditor) and a JSON text editor tab; per-config header has Rename/Delete icon buttons; Save/Cancel footer unchanged; local state pattern preserved (edits held until Save)
- Removed `normalizeSettings()` and the `wasOldFormat` migration block — legacy config formats are no longer supported
- `load()` now directly uses `rawSettings ?? { ...DEFAULT_SETTINGS }` with no conversion path

### 2026-03-14

**fix(Button, Text): tiles visible when OBS is not connected**

- `toggleStreaming` and `toggleRecording` buttons now render in a disabled state when disconnected instead of disappearing (removed early `return null` guard)
- Fixed crash: `useIsStreaming`/`useIsRecording` return `undefined` before OBS connects; added `?? {}` to destructuring sites so defaults apply without throwing "Cannot read properties of undefined"
- Corrected return types on `useIsStreaming` and `useIsRecording` to `StreamingState | undefined` / `RecordingState | undefined`
- Stats text tile renders dash placeholders (`FPS: —`, `CPU: —`, etc.) when disconnected, preserving layout footprint
- `customText` in stats tiles is shown even when disconnected
- Fixed property access order: `stats.fps` etc. now only accessed after the `!stats` guard

**fix(CheckboxTile): unchecked checkbox visible on black background**

- MUI v4 default unchecked checkbox color (`rgba(0,0,0,0.54)`) was invisible against the black tile background
- Replaced bare `Checkbox` with a `StyledCheckbox` wrapper that applies `theme.sceneBorder` (#909090) as the unchecked color

**fix: Electron-only debugger pause on page unload**

- The `beforeunload` debugger breakpoint (used to prevent runaway Vite HMR reloads) now only triggers in Electron, not in the web build

**refactor(instructions): split copilot instructions into scoped files**

- Created `.github/instructions/obs-api.instructions.md` — adapter architecture, event name table, camelCase rules, provider/action patterns (`applyTo: src/renderer/api/obs/**`)
- Created `.github/instructions/tiles.instructions.md` — tile type system, adding new tiles, TileWrapper, viewType, click hooks (`applyTo: src/renderer/components/tiles/**,src/shared/**`)
- Created `.github/instructions/electron.instructions.md` — IPC channels, portable mode paths, Electron vs web detection, window state (`applyTo: src/main/**,src/preload/**`)
- Trimmed `copilot-instructions.md` to a lean project overview; detailed rules now live in scoped files
- Fixed stale `docs/changelog.md` path reference → `Changelog.md`

---

### 2026-03-10

**feat(TextTile): statsLines and customText display properties**

- Added `statsLines` property to select which OBS stats lines are shown in a Text tile
- Added `customText` property for displaying arbitrary static or dynamic text

**feat(SceneButton): scene list integration for overlay suppression**

- Scene buttons now consult the full scene list to correctly suppress overlay/nested scene indicators

---

### 2026-03-09

**feat: checkbox `viewType` for tiles**

- Tiles can now be displayed as a checkbox toggle via a new `viewType` option

**feat(editable-tiles): context menu and properties dialog for the root tile**

- Right-clicking the root tile in edit mode opens a context menu with tile management actions
- A properties dialog allows editing tile settings inline

**feat(editable-tiles): directional tile movement controls**

- Tiles in edit mode can be repositioned using directional move buttons (up/down/left/right)
- Fixed prop forwarding issue that prevented changes from reaching child tiles

**feat: visual configuration editor in settings**

- A new visual (form-based) editor for the config is available alongside the raw JSON editor
- Users can toggle between text and visual modes within the settings dialog

**feat(mute): mute actions and isMuted provider**

- Added `setMute` and `toggleMute` OBS actions
- Added `isMuted` provider to track per-source mute state and expose it to tiles

---

### 2026-02-08

**fix(workflow): GitHub Actions release workflow reliability improvements**

- Fixed release artifact file-pattern matching
- Added missing `GH_TOKEN` environment variable in the build step
- Improved error handling when checking for pre-existing releases

---

### 2026-02-07

**feat(settings): multi-config support with structured config object**

- Settings now store a `configs` array with a `currentConfigIndex` pointer instead of a single flat config
- Enables switching between multiple named OBS configurations without editing JSON manually

---

### 2026-01-31

**feat(settings): validation error feedback for invalid JSON**

- The settings dialog now shows an inline error alert when the JSON config cannot be parsed, instead of failing silently

---

### 2026-01-27

**feat(audio): audio input tile with volume and mute controls**

- New audio input tile type that displays a volume fader and mute toggle
- Reads live volume levels from OBS and supports direct mute toggling

---

### 2026-01-26

**feat(obs): scene item management and ID handling**

- Implemented scene item reordering, visibility, and lock functions on the adapter
- Added a console warning when a referenced scene item cannot be found
- Updated scene item ID handling to use the correct numeric ID format required by v5

**feat(tiles): tile configuration type refactor**

- Refactored tile configuration interfaces with proper discriminated unions
- Added type guards for safer tile-type validation at runtime

---

### 2026-01-25

**feat(obs): OBS WebSocket v5 adapter**

- Implemented a full v5 adapter using OpCode-based messaging (Hello/Identify/Request/Event)
- Auto-detection selects v4 or v5 based on the first message received from the server
- Added debug logging for WebSocket connection lifecycle and raw message handling in both adapters
- Refactored all OBS action functions to use the `ConnectionPublic` type for improved type safety

**feat(settings): multiple configuration profiles UI**

- Settings dialog now supports creating, selecting, and deleting multiple named configurations
- Active configuration is persisted across sessions

---

### 2026-01-18 – 2026-01-19

**feat: Electron portable mode and window management**

- Added full portable mode: all data (`settings.json`, `data/` folder) lives next to the executable
- Window size and position are persisted across sessions via `windowState.json`
- Replaced `window.prompt()` for WebSocket password entry with a React dialog (required for Electron compatibility)
- Auto-hide menu bar enabled by default in the main window
- Removed legacy `configUrl` config loading mechanism
- Fixed window title being overridden by the HTML `<title>` tag

---

### 2026-01-17

**feat: Electron packaging and UI polish**

- Added application icon to the packaged installer
- Fixed installer growing on repeated builds by cleaning `dist/` before packaging
- Added app version number to the bottom bar in the UI
- Updated GitHub Actions workflows for automated releases

---

### 2026-01-06 – 2026-01-09

**feat: Electron app wrapper and TypeScript migration**

- Wrapped the React web app in an Electron shell for desktop deployment
- Migrated the entire codebase from JavaScript to TypeScript (strict mode)
- Fixed all remaining TypeScript type errors

---

### 2025-12-27 – 2025-12-29

**feat: Vite migration and custom WebSocket client**

- Replaced Parcel bundler with Vite for significantly faster dev builds and HMR
- Replaced the `obs-websocket-js` library with a custom `OBSWebSocketClient` that handles SHA256 authentication natively
- Normalised all OBS API response keys to camelCase across providers and components
- Fixed authentication handshake to correctly follow the OBS WebSocket 4.9.1 flow
- Fixed `currentScene` provider `scene-name` property and `useDataProvider` naming collision

---

### 2021-10-21 – 2021-10-22

**feat(SceneItemButton): moveToTop mode improvements**

- `moveToTop` mode no longer incorrectly highlights an invisible first item as selected
- Fixed scene item list API call to pass the correct scene name parameter
- Updated Parcel to v2; general dependency upgrades

---

### 2021-07-17 – 2021-07-28

**feat: scene item buttons, statistics, streaming controls, and PWA support**

- Added SceneItem source buttons with screenshot previews
- Added an OBS statistics panel (CPU, render time, FPS) with a linear progress indicator for FPS
- Added Start/Stop streaming and toggle recording buttons
- Dark mode theme and customisable tile size
- Added service worker for PWA / offline support
- Deployed web build to GitHub Pages via GitHub Actions
- WebSocket password prompt with localStorage persistence
- Graceful disconnection handling and reconnect state display

---

### 2021-06-26 – 2021-06-28

**feat: initial OBS control tiles**

- Scene switching buttons with active-scene highlight
- Tile subgroup (nested layout) support
- Refactored providers and actions into separate files
- Switched screenshot format from PNG to JPG for lower server CPU and faster frame rates

---

### 2021-05-28

**Initial scaffolding and project setup**
