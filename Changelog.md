# OBS-tiles Changelog

## Feature History

### 2026-03-21

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
