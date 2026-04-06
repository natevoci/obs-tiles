# RTSP Stream Tile — Implementation Specification

**Date:** 2026-04-07  
**Status:** Implemented

---

## Overview

A new `RtspStreamTile` tile type that embeds a live RTSP video feed inside a standard `TileWrapper`. A single `ffmpeg` subprocess runs in the **Electron main process** per stream, decoding both video and audio from one RTSP connection. Video frames are forwarded to the renderer via IPC as JPEG data URLs and displayed in an `<img>` element. Audio is decoded to raw PCM and played directly in the main process via the `speaker` npm package, with a configurable A/V sync delay. Muting discards the PCM bytes in Node.js without touching the ffmpeg process, so unmuting is instantaneous.

This feature is **Electron-only**. In web mode the tile renders a graceful "Not supported in browser" message.

---

## Architecture

```
[RTSP camera]
      │  RTSP (single connection)
      ▼
waitForTcpReachable  (polls TCP every 2 s until reachable or stopped)
      │
      ▼
ffmpeg subprocess  (one per tile, spawned in main process)
      │  stdout  ──────────  JPEG frames (image2pipe)
      │  Windows named pipe ─ raw PCM audio (s16le 48000 stereo)
      ▼
JpegFrameParser  (src/main/JpegFrameParser.ts)
      │  slices on FF D8 … FF D9 markers
      ▼
RtspManager  (src/main/RtspManager.ts — singleton)
      │  video: base64 → webContents.send 'rtsp-frame'
      │  audio: read named pipe → speaker (when unmuted) / discard (when muted)
      │
      │  on ffmpeg exit → scheduleReconnect → TCP probe → re-spawn
      │
      │  ipcMain handlers: rtsp-start, rtsp-stop, rtsp-set-muted
      │  ipcMain push:     rtsp-frame, rtsp-error, rtsp-connecting
      ▼
preload context bridge  (src/preload/index.ts)
      ▼
useRtspStream hook  (renderer)
      │  frameDataUrl: string | null  (current JPEG data URL)
      │  connecting / error / active state
      │  muted / toggleMute
      │  active / toggleActive
      ▼
RtspStreamTile → StreamImage  +  PlayButton (bottom-left)  +  MuteButton (bottom-right)
```

### Multi-stream audio

Each stream has its own ffmpeg process and its own `speaker` instance. If two tiles point at two different RTSP streams and both are unmuted, each plays independently and the OS audio mixer combines them before output — both streams play simultaneously at full volume.

---

## FFmpeg Binary

The main process resolves `ffmpeg.exe` in the following order:

1. **`settings.ffmpegPath`** — absolute directory path stored in `settings.json` (e.g. `D:\Apps\convert\ffmpeg\bin`). This is the primary and recommended source.
2. **`ffmpeg`** on the system `PATH` — convenient for development without configuring the setting.

If neither resolves to a working binary, `rtsp-start` returns an error and the tile displays an error message.

> The `FFmpeg/bin/x64/` DLL folder in the repo is not used by this feature. Those DLLs are for programs that link against ffmpeg at compile time; Node.js cannot call them directly without a compiled native addon. The exe subprocess approach is the correct one.

---

## New Config Interface

Defined in `src/renderer/components/tiles/Tiles.tsx`, extending `BaseTileConfig`:

```typescript
export interface RtspStreamTileConfig extends BaseTileConfig {
    /** Discriminator — also serves as a display label when title is absent */
    rtspStream: string
    /** Full RTSP URL; derived from connection address when omitted */
    streamUrl?: string
    /** Target frame rate in fps. When omitted, frames are passed through at the native stream rate. */
    fps?: number
    /** A/V sync offset in milliseconds — positive delays audio, negative advances it (default: 0) */
    audioSyncOffsetMs?: number
    /** Mute audio on startup (default: true) */
    startMuted?: boolean
}
```

### Default URL derivation

When `streamUrl` is not set, the tile derives the URL from its `connection` property at runtime:
1. Look up the connection's `address` (e.g. `localhost:4455`)
2. Strip the OBS port, keep the hostname: `localhost`
3. Form: `rtsp://{hostname}:554/live`

---

## New & Modified Files

### New files

| File | Purpose |
|------|---------|
| `src/renderer/components/tiles/RtspStreamTile.tsx` | Tile component — renders `StreamImage` + play/stop toggle + mute toggle |
| `src/renderer/api/obs/rtsp/useRtspStream.ts` | Renderer-side IPC hook — start/stop stream, hold current frame |
| `src/renderer/api/obs/rtsp/index.ts` | Re-export barrel |

### Modified files

| File | What changes |
|------|-------------|
| `src/main/index.ts` | Add `RtspManager` class; register `rtsp-start`, `rtsp-stop`, `rtsp-set-muted` IPC handlers; push `rtsp-frame` / `rtsp-error` events to renderer |
| `src/preload/index.ts` | Expose `rtspStart`, `rtspStop`, `rtspSetMuted`, `onRtspFrame`, `offRtspFrame`, `onRtspError`, `offRtspError` via context bridge |
| `src/renderer/components/Settings/SettingsProvider.tsx` | Add the above to the `window.ipcRenderer` type declaration |
| `src/renderer/components/tiles/Tiles.tsx` | Add `RtspStreamTileConfig`, type guard `isRtspStreamTileConfig`, render branch |
| `src/renderer/components/EditMode/TilePropertiesDialog.tsx` | New `RtspStreamForm`; add `'rtspStream'` to `TileType`; update `detectTileType` |
| `src/renderer/components/EditMode/EditableTiles.tsx` | Handle `rtspStream` discriminator in type detection for root `onSave` |
| `src/renderer/components/Settings/ConfigVisualEditor.tsx` | Add `rtspStream` as a selectable tile type |
| `src/shared/defaults.ts` | Add `ffmpegPath: ''` to `DEFAULT_SETTINGS` |
| `src/shared/types.ts` | Add `ffmpegPath?: string` to `ConfigFileFormat` |
| `src/renderer/components/Settings/SettingsDialog.tsx` | Add FFmpeg path field (+ browse button) to the Settings node panel |
| `Changelog.md` | Updated |
| `TODO.md` | Updated |

---

## Main Process: RtspManager

Defined in `src/main/RtspManager.ts`, instantiated once in `src/main/index.ts`.

### Stream entry shape

```typescript
interface RtspStreamEntry {
    process: ChildProcess | null  // null while TCP-probing before first spawn / between reconnects
    audioServer: net.Server       // Windows named pipe server — persists across reconnects
    audioSocket: net.Socket | null
    speaker: any | null
    muted: boolean
    webContents: Electron.WebContents
    stopped: boolean              // set true on explicit stop; halts reconnect loop
    options: RtspStartOptions     // retained so reconnects can re-use the same args
}
```

Active streams are keyed by `streamId` (supplied by the renderer as `rtsp-<rtspStream>`).

### Renderer lifecycle tracking

`RtspManager` subscribes to each renderer's `webContents` the first time a stream is started from it. On `did-navigate` or `destroyed`, all streams belonging to that `webContents` are stopped. This prevents orphaned ffmpeg processes when the user refreshes the browser or navigates away.

### Single ffmpeg process — two outputs

One `ffmpeg` process handles both video and audio for each tile:

| Flag | Effect |
|------|--------|
| `-y` | Overwrite output (named pipe) without prompting — prevents an interactive hang when a stale pipe file exists |
| `-rtsp_transport tcp` | Avoids UDP packet loss and reordering on LAN |
| `-fflags nobuffer` | Bypasses demuxer input buffering; packets reach the decoder as soon as they arrive |
| `-flags low_delay` | Enables low-delay mode in decoders that support it |
| `-analyzeduration 1000000` | Allows up to 1 s for codec parameter detection. Required when audio RTP packets arrive before the H.264 SPS/PPS NAL units — without this ffmpeg misreads the framerate and pegs CPU at ~50% |
| `-probesize 500000` | 500 KB probe window. The original 32-byte value was too small when audio packets preceded video in the RTP stream |
| `-max_delay 0` | Sets the maximum demuxer PTS hold-back to 0 µs |
| `-reorder_queue_size 0` | Disables the RTSP packet reorder queue; safe because TCP guarantees ordering |
| `-hwaccel d3d11va` | Direct3D 11 hardware video decode; ffmpeg falls back to software if the codec is unsupported |
| `-aresample=async=1` | Allows the audio resampler to insert/drop samples to handle minor clock drift |

Video frames go to **stdout** (`pipe:1`); the main process buffers and slices on JPEG markers (`FF D8` … `FF D9`).
Audio raw PCM goes to a **Windows named pipe** created by Node.js before spawning ffmpeg.

### Named pipe lifecycle

1. Before spawning ffmpeg, `RtspManager` calls `net.createServer(socket => ...)` listening on `\\.\.pipe\rtsp-audio-<id-safe>` where `<id-safe>` replaces non-alphanumeric characters with `-`
2. The pipe server is created once in `start()` and persists across ffmpeg reconnects — only closed on `cleanup()`
3. ffmpeg connects to the pipe as a client and writes PCM data continuously
4. On the `data` event: write to the `Speaker` instance (when unmuted) or discard (when muted) — **the pipe is always drained to prevent ffmpeg blocking**
5. On stream entry cleanup: close the speaker, socket, and named pipe server

### Mute / unmute — no ffmpeg restart required

- **Mute**: set `entry.muted = true`; audio bytes from the named pipe are discarded rather than forwarded to the speaker
- **Unmute**: set `entry.muted = false`; incoming bytes are immediately written to the speaker

The RTSP connection, ffmpeg process, and named pipe never restart for mute/unmute. Unmuting is essentially instantaneous.

### TCP pre-connect probe

Before every ffmpeg spawn (initial start and each reconnect), `waitForTcpReachable(host, port, entry)` opens a TCP socket to the RTSP server's host and port. If the connection is refused or times out, it waits 2 s and retries — indefinitely — until the connection succeeds or the stream entry is explicitly stopped. This means the tile shows a connecting spinner until the RTSP server becomes available, rather than immediately showing an error.

### Auto-reconnect

When ffmpeg exits for any reason (server stop, network drop, crash):

1. `scheduleReconnect(entry)` is called (guarded by a `reconnectScheduled` flag to avoid double-scheduling from the `error`+`exit` event pair)
2. `rtsp-connecting` is pushed to the renderer — the tile resets to spinner state
3. After a 1 s pause (lets the OS release the previous connection), `waitForTcpReachable` probes again
4. Once reachable, `spawnFfmpeg` is called and the stream resumes

There is no maximum retry count. Reconnection continues until the tile is explicitly stopped via `rtsp-stop` (which sets `entry.stopped = true`).

- All ffmpeg stderr output is forwarded to `console.log` for debugging

### IPC handlers

| Channel | Direction | Action |
|---------|-----------|--------|
| `rtsp-start` | renderer → main | Create audio pipe server; TCP-probe; spawn ffmpeg; register stdout/pipe handlers |
| `rtsp-stop` | renderer → main | Set `entry.stopped = true`; kill ffmpeg; close pipe and speaker; delete entry |
| `rtsp-set-muted` | renderer → main | Update `entry.muted`; audio bytes are then forwarded or discarded accordingly |
| `rtsp-frame` | main → renderer | Push base64 JPEG frame to the renderer that owns the stream |
| `rtsp-error` | main → renderer | Push error message (e.g. ffmpeg binary not found) |
| `rtsp-connecting` | main → renderer | Pushed when `scheduleReconnect` fires — signals renderer to reset UI to connecting/spinner state |

---

## Low-Latency Strategy

Latency sources in the pipeline and how each is addressed:

### 1. Network / RTSP demuxer

| Source | Mitigation |
|--------|------------|
| Demuxer input buffer | `-fflags nobuffer` |
| Stream probe delay | `-analyzeduration 1000000 -probesize 500000` |
| Demuxer PTS hold-back | `-max_delay 0` |
| Packet reorder queue | `-reorder_queue_size 0` |
| Decoder pipeline delay | `-flags low_delay` |

### 2. Video decode & JPEG encode

- Hardware decode (`-hwaccel d3d11va`) eliminates CPU-side decode time on the GPU path
- JPEG encoding is a single-frame operation — no B-frame delay or lookahead
- Lower `fps` values reduce the interval between frames but do not increase per-frame encode latency

### 3. Node.js stdout → IPC → renderer

- Frames are forwarded to the renderer immediately upon JPEG boundary detection (`FF D9`) — no additional buffering or debounce
- Frames are sent via `webContents.send` (fire-and-forget push), not `invoke` (no round-trip)
- Base64 encoding adds a fixed small overhead; raw binary IPC (`Buffer`) is a possible future optimisation
- Renderer calls `setState` on every incoming frame — no artificial throttle

### 4. Audio pipe → speaker

- The named pipe is always drained so ffmpeg's PCM output never blocks
- The `Speaker` instance is constructed with `samplesPerFrame: 512` (≈10.7 ms at 48000 Hz) rather than the default (~4096 samples = ~85 ms)
- `audioSyncOffsetMs` (default `0`) should only need to be adjusted if the stream source itself has a broadcast A/V offset — it is not a compensating delay for pipeline lag

### 5. End-to-end latency estimate

For a camera with negligible on-device encode latency over a local network:

| Stage | Typical contribution |
|-------|---------------------|
| RTSP network (LAN) | ~1–5 ms |
| ffmpeg demux + decode + JPEG encode | ~10–30 ms |
| Node stdout buffering + base64 | ~1–3 ms |
| Electron IPC | ~1–5 ms |
| React render + browser paint | ~8–16 ms (one frame at 60 Hz) |
| **Total** | **~20–60 ms** |

This is comparable to consumer NVR viewer applications over LAN.

---

## Renderer Hook: `useRtspStream`

```typescript
// src/renderer/api/obs/rtsp/useRtspStream.ts

interface UseRtspStreamOptions {
    streamId: string
    streamUrl: string
    startMuted?: boolean
    fps?: number | null
    audioSyncOffsetMs?: number
    ffmpegPath?: string
}

interface RtspStreamState {
    frameDataUrl: string | null  // current JPEG as data URL (data:image/jpeg;base64,...)
    connecting: boolean
    error: string | null
    muted: boolean
    toggleMute: () => void
    active: boolean              // whether the stream is currently started
    toggleActive: () => void     // stop or restart the stream
}

export function useRtspStream(options: UseRtspStreamOptions): RtspStreamState
```

**Behaviour:**

- On mount (or when `active` becomes `true`): calls `window.ipcRenderer.rtspStart(...)` and sets `connecting = true`
- `connecting` remains `true` until the first `rtsp-frame` arrives (not on `rtspStart` invoke resolution)
- On `rtsp-connecting` IPC push: resets `frameDataUrl = null`, `connecting = true`, `error = null` — tile returns to spinner state during auto-reconnect
- Registers `onRtspFrame`, `onRtspError`, `onRtspConnecting` listeners; all are keyed by `streamId` to ignore events for other tiles
- On `streamId` or `streamUrl` change, or when `active` becomes `false`: cleanup stops the stream and unregisters all listeners
- `toggleMute`: updates local state; a separate effect keeps `window.ipcRenderer.rtspSetMuted` in sync
- `toggleActive`: flips `active`; when stopped, resets `frameDataUrl`, `connecting`, and `error` to idle
- In non-Electron environments (`!window.ipcRenderer`): `connecting = false`, `error = 'RTSP streaming requires Electron (not supported in browser)'`

---

## Tile Component: `RtspStreamTile`

- Uses `TileWrapper` as root (mandatory per tile conventions)
- Renders a `StreamImage` (`<img>`) sized to `tileSize * 16 × tileSize * 9` px with `object-fit: contain` and black background
- `StreamImage` has a `$hasFrame` boolean prop — `visibility: hidden` until the first frame arrives, so no broken-image icon is shown during connection
- `src` is set to `frameDataUrl ?? undefined` (never an empty string) to avoid a failed image request
- No `activeRefreshTime` / `inactiveRefreshTime` — continuous live feed, not polled
- `StyledCircularProgress` overlay while `connecting === true && !frameDataUrl`
- **Play/stop button** — absolute, lower-left corner (`PlayButtonWrapper`): shows `Stop` icon while `active`, `PlayArrow` while stopped. Clicking calls `toggleActive()`
- **Mute button** — absolute, lower-right corner (`MuteButtonWrapper`): shows `VolumeOff` / `VolumeUp`. Clicking calls `toggleMute()`
- Both overlay buttons use the same `StyledMuteButton` styled component with `pointer-events: auto` (required because the parent `TextOverlay` in `TileWrapper` sets `pointer-events: none`)
- No selection highlight overlay (this is a monitor tile, not an action tile)
- Error text rendered in a centred `ErrorText` overlay when `error` is set

---

## Tile Properties Dialog

New `RtspStreamForm` with the following fields:

| Field | Control | Key | Default | Notes |
|-------|---------|-----|---------|-------|
| Stream URL | `TextField` | `streamUrl` | `''` | Placeholder shows derived URL |
| Frame rate | `TextField` (number) | `fps` | *(blank = native stream rate)* | fps |
| Audio sync offset | `TextField` (number) | `audioSyncOffsetMs` | `0` | ms; positive = delay audio |
| Start muted | `Checkbox` | `startMuted` | `true` | |

`detectTileType` updated:
```typescript
if ('rtspStream' in tile) return 'rtspStream'
```

---

## Settings Dialog: FFmpeg Folder

New row in the **Settings** node panel, **Electron-only** section (alongside backup settings):

- **Label**: "FFmpeg folder"
- **Control**: read-only `TextField` displaying the current path + **Browse** button (calls `window.ipcRenderer.selectFolder()`)
- **Key in `settings.json`**: `ffmpegPath`
- **`DEFAULT_SETTINGS`**: `ffmpegPath: ''`
- **Description text**: "Path to folder containing ffmpeg.exe. Leave blank to use system PATH."

---

## IPC Surface

### `preload/index.ts` additions

| Exposed method | Direction | Channel | Transport |
|---------------|-----------|---------|-----------|
| `rtspStart(options)` | renderer → main | `rtsp-start` | `invoke` |
| `rtspStop(streamId)` | renderer → main | `rtsp-stop` | `invoke` |
| `rtspSetMuted(streamId, muted)` | renderer → main | `rtsp-set-muted` | `invoke` |
| `onRtspFrame(cb)` | main → renderer | `rtsp-frame` | `on` |
| `offRtspFrame(cb)` | — | `rtsp-frame` | `removeListener` |
| `onRtspError(cb)` | main → renderer | `rtsp-error` | `on` |
| `offRtspError(cb)` | — | `rtsp-error` | `removeListener` |
| `onRtspConnecting(cb)` | main → renderer | `rtsp-connecting` | `on` |
| `offRtspConnecting(cb)` | — | `rtsp-connecting` | `removeListener` |

### Frame payload

```typescript
// pushed via webContents.send('rtsp-frame', payload)
interface RtspFramePayload {
    streamId: string
    data: string    // base64-encoded JPEG (no data URL prefix; hook prepends 'data:image/jpeg;base64,')
}

// pushed via webContents.send('rtsp-connecting', payload)
interface RtspConnectingPayload {
    streamId: string
}
```

---

## Dependencies

| Package | Purpose | Location |
|---------|---------|----------|
| `speaker` | PCM audio playback in Node.js main process | `dependencies` |

`speaker` is a native addon. Configure `electron-rebuild` (or `@electron/rebuild`) to rebuild it against the app's Electron version during `yarn install` / CI. Add to `package.json`:

```json
"scripts": {
  "postinstall": "electron-rebuild -f -w speaker"
}
```

---

## IPC Frame Rate Considerations

| tileSize | Resolution | ~JPEG size @q:v 5 | 10 fps IPC bandwidth |
|----------|-----------|-------------------|---------------------|
| 10 | 160 × 90 | 3–8 KB | 30–80 KB/s |
| 15 | 240 × 135 | 6–15 KB | 60–150 KB/s |
| 20 | 320 × 180 | 10–25 KB | 100–250 KB/s |

All well within local IPC limits. The `-q:v 5` quality flag is configurable if needed.

> When `fps` is not configured, the `-vf fps` filter is omitted and frames arrive at the native stream rate. The table above assumes 10 fps for comparison purposes.

---

## Out of Scope (Future Work)

- Web mode support
- Per-tile hardware acceleration toggle (always attempts `d3d11va`, falls back to software automatically)
- Recording the RTSP stream to disk
- Sub-millisecond A/V sync (the `audioSyncOffsetMs` field is intentionally coarse)
- Per-tile volume control / multi-stream mixing
- Exponential back-off for reconnect intervals (currently fixed 1 s initial delay + 2 s TCP retry interval)

---

## Implementation Notes

- **Named pipe ID sanitisation**: non-alphanumeric characters in `streamId` are replaced with `-` to form a Windows-safe pipe name: `\\.\.pipe\rtsp-audio-<id-safe>`.
- **`speaker` native addon**: requires `electron-rebuild` to build against the app's Electron version. Audio playback is silently disabled if the module is unavailable at runtime — video continues to work.
- **`probesize` / `analyzeduration`**: originally set to 32 bytes / 0 µs for minimum latency. Raised to 500 KB / 1 s after discovering that when OBS has audio active, audio RTP packets arrive before the H.264 SPS/PPS NAL units, causing ffmpeg to misidentify the stream framerate (90 000 fps) and saturate a CPU core.
- **`pointer-events`**: the `TextOverlay` div inside `TileWrapper` sets `pointer-events: none` to prevent interfering with tile clicks. Overlay buttons inside RTSP tiles must explicitly set `pointer-events: auto` on their wrapper div to remain clickable.
