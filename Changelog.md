# OBS-tiles Changelog

## Feature History

### 2026-05-31

**Version 5.2 release**

- Update version number in package.json

**feat(tiles): add direction to group title in inline edit mode**

- Add direction to group title in inline edit mode, with direction title case. Exclude group name if not set.
- Removed youtubelivetile prop that was producing an error.

**fix: Horizontal scrollbar**

- Fix horizontal scrollbar from appearing by selectively removing the additional right margin for TilesGroup components.

**feat(settings): reorder configs from the settings dialog**

- Added move up / move down actions to each config row in the left-hand settings tree.
- Reordering now keeps both the selected config and the active config index pointed at the same config item after the move.
- Config order is still saved as the existing `configs` array, so the new order persists without any schema change.

**fix(electron): include machine and timestamp in auto-backup filenames**

- `backupConfigOnClose()` now writes backup files named like `obs-tiles settings - <machine> - <timestamp>.json` instead of overwriting a fixed `settings.json`.
- The machine name comes from the local hostname and the timestamp uses an ISO-style date/time format with Windows-safe separators.

### 2026-05-30

**fix: Add toggle for group tile borders**

- Group tiles now support an optional `showBorder` setting that defaults to enabled.
- Inline edit mode keeps its dashed group border unchanged.
- The default config now seeds groups with border visibility enabled.

**fix(electron): stop windowState size drift at 150% DPI**

- `src/main/index.ts` now persists `width`/`height` from `BrowserWindow.getContentBounds()` instead of outer frame bounds.
- Window creation now sets `useContentSize: true`, so restored dimensions map to the same content size across fractional DPI scaling.
- When closing while maximized, the app preserves the previously saved normal bounds and only updates `isMaximized`, avoiding accidental bound churn.

**fix(rtsp): validate ffmpeg availability before stream startup**

- `RtspManager` now validates the ffmpeg binary before creating the RTSP audio pipe or starting reconnect logic.
- When no explicit ffmpeg path is configured, startup now verifies `ffmpeg` is actually available on system `PATH`.
- If ffmpeg is missing, RTSP startup aborts immediately and emits a clear `rtsp-error` message telling the user to configure the ffmpeg path or run `winget install ffmpeg` and restart obs-tiles.

**fix(ci): pin Python 3.11 for Electron packaging**

- The Electron packaging workflow now installs Python 3.11 and exports it to `node-gyp` so native module rebuilds do not fail on GitHub Actions images that default to Python 3.12+.
- This specifically avoids the `distutils` import error raised while rebuilding `speaker` during `electron-builder`.

**Version 5.1 release**

- Update version number in package.json

**fix(youtube): only use configured OBS connection when it exists**

- `YouTubeLiveProvider` now validates `settings.youtube?.obsConnection` against `currentConfig.connections` before passing it to `useObs`.
- If the configured YouTube OBS connection is missing from the active config, it now falls back to `currentConfig.connection`.

**fix(obs): resolve default OBS connection from configured list**

- `useObs` no longer hardcodes `'main'` when no `connection` prop is provided; it now passes `null` through to `getConnection`.
- `getConnection` now accepts `null` and resolves to the first configured OBS connection key in `currentConfig.connections`.
- Added an explicit error log when no OBS connections exist, and aligned connection setup/log messages to use the resolved connection name.

### 2026-04-10

**fix(youtube): show error details below button in error state**

- When `phase === 'error'`, an `ErrorDetails` block renders below the button showing the error message and a "Click to reset and try again." hint. Clicking the button clears the error (existing behaviour) and returns to idle.

**fix(youtube): invalid broadcastStatus=testing filter on liveBroadcasts list**

- `YouTubeLiveService.checkForExistingBroadcasts`: replaced `broadcastStatus=testing` with `broadcastStatus=upcoming`. The `testing` value is only valid on the `liveBroadcasts/transition` endpoint — not as a list filter, causing a 400 Bad Request. The `upcoming` filter returns broadcasts with lifecycle status `created`, `ready`, or `testing`.

 — button-only tile with per-stat lines**

- Removed `viewType` prop from `YouTubeLiveTileConfig` and all related code. The `'preview'` tile mode is gone; `YouTubeLiveTile` now always renders as a full-width `variant="contained"` MUI button.
- Button styling matches the streaming/recording buttons in `Button.tsx`: `StyledButtonMode` sets `width: $size * 16px` and uses MUI `color` prop (`'primary'` for green/Go Live, `'secondary'` for red/live or error) so MUI handles white contrast text automatically. `Mui-disabled` state uses `theme.disabledBackground` / `theme.disabledText`.
- Tile label removed from the button — only the action label (e.g. "Go Live", "Stop", "Starting…") is shown.
- Removed `TileWrapper`, `TileBody`, `LiveBadge`, `LiveStats`, and `ErrorMsg` styled components; unused `error` / `isError` variables cleaned up.
- Added `statsLines?: { elapsed?: boolean; viewers?: boolean }` config option (matching `TextTileConfig.statsLines` pattern). Each enabled stat renders as a `StatsRow` (label + value) below the button, always visible — value is blank when not live.
- `TilePropertiesDialog` `YouTubeLiveForm`: removed View Type select and `YT_VIEW_TYPES` constant; added per-line checkboxes ("Elapsed time", "Concurrent viewers") using the same opt-in pattern as `TextForm`.

### 2026-04-09

**feat(youtube): bundled OAuth credentials + simplified sign-in**

- Added `src/renderer/api/youtube/bundledCredentials.ts` — reads `VITE_YOUTUBE_CLIENT_ID` / `VITE_YOUTUBE_CLIENT_SECRET` env vars injected at build time. Exports `hasBundledCredentials` boolean flag.
- `useYouTubeLive`: auth service now falls back to bundled credentials when the user has not supplied their own `clientId` / `clientSecret`.
- `YouTubeSettingsPanel`: dual-mode UI —
  - **With bundled credentials** (production builds): shows an info box "obs-tiles includes shared Google credentials", sign-in button enabled with no user setup required. A collapsible "Use your own Google credentials…" section exposes the GCP instructions and credential fields for power users who want their own quota.
  - **Without bundled credentials** (local dev builds without `.env.local`): preserves the existing full GCP setup flow.
- Added `.env.local.example` (committed) as a template for local dev builds.
- Added `.env.local` to `.gitignore` to prevent accidental credential commits.
- `src/renderer/vite.config.ts` and `electron.vite.config.ts`: added explicit `envDir` pointing to the project root so both `yarn web` and `yarn dev` find the same `.env.local`.
- Both GitHub Actions workflows (Electron package, web deploy) now inject `VITE_YOUTUBE_CLIENT_ID` and `VITE_YOUTUBE_CLIENT_SECRET` from repository secrets.
- `src/vite-env.d.ts`: declared `ImportMetaEnv` interface with the two new `VITE_` variables.

**fix(youtube-settings): formatted GCP instructions with clickable link**

- `YouTubeSettingsPanel`: replaced the monospace `pre-wrap` instructions text block with a proper `<ol>` list via a `GcpInstructions` component.
- `console.cloud.google.com` is now a clickable link — opens via `shell.openExternal` in Electron (reusing the existing `youtubeOpenBrowser` IPC channel) or `window.open` in web mode.
- Added `InstructionsList` and `InstructionsLink` styled components; `InstructionsBox` no longer uses `font-family: monospace` or `white-space: pre-wrap`.

### 2026-04-08

**fix(edit-mode): render YouTubeLiveTile in inline edit mode**

- `EditableTiles.tsx`: imported `YouTubeLiveTile` and added a `'youtubeLive' in tile` branch to `renderContent()`, passing all tile config props through. Without this, YouTube Live tiles were invisible in edit mode.

**refactor(youtube): remove youtubeLive tile ID — single shared instance**

- `YouTubeLiveTileConfig.youtubeLive` changed from `string` to `true` (boolean discriminator). `isYouTubeLiveTileConfig` guard uses `Boolean()` to accept legacy string values in existing configs.
- `ShortcutAction` union: `tileId: string` removed from `startYoutubeLive` and `stopYoutubeLive` action types — no longer needed with a single shared provider instance.
- `YouTubeLiveTile`: `youtubeLive` prop removed from component interface; label defaults to `title ?? 'YouTube Live'`; keyboard shortcut listener no longer filters by tile ID.
- `useKeyboardShortcuts`: `youtube-live-control` custom event dispatched without `tileId`.
- `KeyboardShortcutsPanel`: Removed `collectYouTubeLiveTileIds` helper, `youtubeLiveTileIds` const, and the tile-ID dropdown from `renderParams` for `startYoutubeLive`/`stopYoutubeLive` shortcuts.
- `TilePropertiesDialog`: "Tile ID" TextField removed from `YouTubeLiveForm`; default tile for AddTileDialog changed to `{ youtubeLive: true }`.
- `detectTileType`: added missing fallback `return 'button'` to silence TypeScript exhaustiveness error.

**refactor(youtube): shared YouTubeLiveProvider context**

- Added `src/renderer/api/youtube/YouTubeLiveProvider.tsx` — a React context provider that mounts a single `useYouTubeLive` instance for the whole app. The OBS connection is taken from `settings.youtube.obsConnection` (falling back to `currentConfig.connection`), matching the connection configured in YouTube Settings.
- `YouTubeLiveProvider` and `useYouTubeLiveContext` exported from `~/api/youtube`.
- `<YouTubeLiveProvider>` mounted inside `<OBSWebsocketProvider>` in `App.tsx`, wrapping `<EditModeProvider>` and all children.
- `YouTubeLiveTile` now calls `useYouTubeLiveContext()` instead of `useYouTubeLive()` directly — it no longer owns its own state machine, service instances, or polling loop. Multiple tiles and keyboard shortcuts all share the same `yt` instance and see consistent phase state.

### 2026-04-07

**feat(youtube): edit mode support for YouTubeLiveTile**

- `TilePropertiesDialog.tsx`: Added `'youtubeLive'` to `TileType` union; `detectTileType` detects `youtubeLive` discriminator; new `YouTubeLiveForm` component with fields for Tile ID, View Type (Preview / Button compact row), Auto-create broadcast checkbox, Default Title (with `{date}` hint), Default Description, display Title, and Tile Size / Font Size.
- `AddTileDialog`: "YouTube Live" option added to the type-picker list with default tile `{ youtubeLive: 'yt-live' }`; form shown after type is selected.
- Added `YT_VIEW_TYPES` constant (`preview` / `button`) separate from the existing `VIEW_TYPES` (`preview` / `checkbox`) used by other tile types.

### 2026-04-07

**feat(youtube): YouTube Live integration — Phase 5 (polish)**

- **`confirmBeforeGoLive` setting:** New checkbox in Settings → General — "Confirm before going live (YouTube)". When enabled, clicking Go Live (or triggering via keyboard shortcut) shows a confirmation dialog before starting the broadcast. Added to `ConfigFileFormat`, `defaults.ts` (`false`), and `SettingsDialog.tsx`.
- **Keyboard shortcuts:** Two new shortcut action types — `startYoutubeLive` (tile ID param) and `stopYoutubeLive` (tile ID param). Registered in `shared/types.ts` `ShortcutAction` union, `KeyboardShortcutsPanel.tsx` (`ACTION_TYPES`, `defaultActionForType`, tile-ID dropdown in `renderParams`), and `useKeyboardShortcuts.ts` (dispatch `youtube-live-control` custom event). `YouTubeLiveTile` listens for the event and routes to `handleGoLive()` / `yt.stopLive()` accordingly.
- **`{date}` template:** Already implemented in Phases 3–4 (no new code).
- **End-to-end test:** Manual — no automated test infrastructure.

### 2026-04-07

**feat(youtube): YouTube Live integration — Phases 0–4 complete**

- Added `docs/youtube-live-integration-spec.md` — full design: OAuth 2.0 (PKCE + localhost redirect), broadcast/stream lifecycle, `SetStreamServiceSettings` adapter additions, `YouTubeLiveTile` tile type, settings schema, phased plan.
- Added OBS Raw Request panel to Settings (permanent diagnostic node): request name, JSON body, Send, read-only response, Copy Response.
- **Phase 0:** `GetStreamServiceSettings` payload confirmed via probe; v5 field names verified: `server`, `key`, `bwtest`, `use_auth`.
- **Phase 1:** `getStreamServiceSettings()` / `setStreamServiceSettings(serviceType, settings)` added to `OBSAdapter` interface, v4 adapter (`GetStreamSettings` / `SetStreamSettings` + `save: true`), v5 adapter (`GetStreamServiceSettings` / `SetStreamServiceSettings`), and `streaming.ts` actions. OBS stream key update confirmed working.
- **Phase 2:** `YouTubeConfig` type added to `shared/types.ts`; `youtube` field added to `ConfigFileFormat`; `YouTubeAuthService` (PKCE + localhost redirect OAuth); `youtube-oauth-start` / `youtube-oauth-result` IPC bridge extracted to `src/main/YouTubeOAuthServer.ts` + registered from `main/index.ts`; `YouTubeSettingsPanel` (GCP setup instructions, credentials, sign-in/out, default broadcast settings with Allow override checkboxes, OBS connection dropdown). YouTube node added to Settings dialog tree.
- **Phase 3:** `YouTubeLiveService` (createStream, createBroadcast with `enableAutoStop: false`, bindStream, transitionBroadcast, getStreamKey, checkForExistingBroadcasts, getBroadcastStatus); `useYouTubeLive` hook (phase state machine: idle → checking-existing → creating-broadcast → configuring-obs → starting-stream → live → stopping, 30 s status polling, endExistingBroadcast); `CreateBroadcastDialog` (title/description/privacy/latency with allow-override, `{date}` substitution); `ResumeBroadcastDialog` (table with per-row Resume/End + Create new).
- **Phase 4:** `YouTubeLiveTile` component (`src/renderer/components/tiles/YouTubeLiveTile.tsx`). `YouTubeLiveTileConfig` registered in `Tiles.tsx` (interface, `isYouTubeLiveTileConfig` guard, union member, render branch). Tile states: not-authenticated (red tint, "Sign in to YouTube" / "Manual Key" in web), idle (green tint, "Go Live"), spinner overlay for all busy phases (checking, preparing, configuring OBS, starting, stopping), live state with red LIVE badge + elapsed timer + viewer count, error state with red border. Web mode: `ManualKeyDialog` (stream key → `setStreamServiceSettings` → `startStreaming`). Electron mode: sign-in via `YouTubeAuthService.startOAuthFlow()` with refresh token persisted to settings. `viewType: 'preview' | 'button'` — button mode renders a compact inline row. Elapsed timer via `setInterval` + `useRef`. `ResumeBroadcastDialog` and `CreateBroadcastDialog` wired in; `autoCreateBroadcast` tile-config flag skips the dialog.

**fix(dev): eliminate blank window race condition on `yarn dev`**

- Replaced the HTTP-poll-then-loadURL approach (which failed because Vite accepts TCP connections before JS compilation is complete, returning `ERR_ABORTED -3`) with a retry-on-failure strategy: `loadURL` is called immediately and `did-fail-load` on the main frame triggers a retry every 500ms for up to 20 attempts.

### 2026-04-07

**feat(shortcuts): additional keyboard shortcut action types**

- Added 12 new shortcut action types:
  - **Start Recording / Stop Recording** — distinct start/stop (toggle already existed)
  - **Start Streaming / Stop Streaming** — distinct start/stop (toggle already existed)
  - **Previous Scene** — switches to the scene that was active before the current one (previous scene tracked via `useCurrentScene`)
  - **Move Scene Item to Top** — brings a scene item to the front (z-top), same logic as SceneItemButton `moveToTop` handler
  - **Mute Audio / Unmute Audio** — explicit mute/unmute via `adapter.setInputMute` (toggle already existed)
  - **Start RTSP / Stop RTSP / Toggle RTSP** — dispatches `rtsp-control` custom event; `RtspStreamTile` listens and calls `toggleActive()` accordingly; Stream ID field matches the tile's `rtspStream` name
  - **Select Config** — dispatches `obs-tiles-open-config-selector` event; `Layout.tsx` listens and opens `ConfigSelectorDialog`
- `KeyboardShortcutsPanel` updated with dropdowns/text fields for all new action parameters
- `useKeyboardShortcuts` now accepts `currentSceneName?` for previous-scene tracking

**fix(shortcuts): display readable names for non-alphanumeric keys**

- Space, arrow keys, Enter, Delete, Tab and other named keys now show readable labels (e.g. `"Space"`, `"Up"`, `"Tab"`) instead of blank or raw `KeyboardEvent.key` values

### 2026-04-07

**feat(shortcuts): configurable keyboard shortcuts**

- New "Keyboard Shortcuts" tree node in the Settings dialog (per-config scope)
- Click-to-record key combo capture: click the field, press any combination, Escape to cancel — normalised to strings like `"Ctrl+Shift+F5"`
- Five supported actions, all tile-independent (fire even if no matching tile exists in the layout):
  - **Toggle Recording** — `Ctrl+Shift+R` by default
  - **Toggle Streaming** — `Ctrl+Shift+S` by default
  - **Switch to Scene** — live scene dropdown populated from the active OBS connection
  - **Toggle Scene Item** — scene dropdown + item dropdown (populated per selected scene)
  - **Toggle Audio Mute** — freetext input name field
- Global `useKeyboardShortcuts` hook mounted in `Layout` dispatches actions directly via the OBS adapter
- Shortcut suppression: no shortcuts fire while any MUI dialog is open (checked via `document.querySelector('[role="dialog"]')`)
- Input guard: no shortcuts fire while focus is inside an `<input>` or `<textarea>`
- Default shortcuts applied to new configs and migrated to existing configs (on load) that have no `shortcuts` key
- New files: `KeyCaptureInput.tsx`, `KeyboardShortcutsPanel.tsx`, `useKeyboardShortcuts.ts`
- Plan document written to `docs/keyboard-shortcuts-plan.md`

**refactor(tiles): shared canvas decode pipeline; eliminate image data from React state for scene thumbnails**

- Extracted `src/renderer/util/decodeAndDraw.ts` — shared `atob` → `Uint8Array` → `createImageBitmap` → `drawImage` → `bitmap.close()` utility used by all three tile rendering paths
- Added `useSceneCanvas` hook to `sceneImage.ts`: polls the OBS adapter directly in a `useEffect`, draws each screenshot imperatively onto a canvas, and never stores image data in React state — eliminates the same Chromium bitmap-retention leak for scene thumbnails regardless of refresh rate
- `SceneButton` and `SceneItemButton` now use `useSceneCanvas` + `TileCanvasElement` instead of `useSceneImage` + `TileImage`
- `useRtspStream` updated to delegate to `decodeAndDraw` instead of inlining the decode logic
- `TileCanvas` component and `TileCanvasProps` interface removed from `TileWrapper` as they are no longer used; `TileCanvasElement` (bare styled canvas) and `TileImage` remain exported

**feat(RtspStreamTile): pause stream during edit mode**

- Stream is automatically stopped when entering inline edit mode and resumed when exiting
- Uses a ref to track whether the stream was active before edit mode, so it only resumes if it was running at the time — manual play/stop changes made during edit mode are not overridden

**fix(EditableTiles): increase max tile size from 30 to 60**

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
