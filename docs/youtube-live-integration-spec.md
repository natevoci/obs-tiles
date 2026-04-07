# YouTube Live Integration — Specification

**Date:** 2026-04-07  
**Status:** Draft — `GetStreamServiceSettings` payload confirmed

---

## Overview

Integrate YouTube Data API v3 into obs-tiles so that a single "Go Live" interaction:

1. Authenticates with YouTube (via OAuth 2.0, one-time).
2. Shows a pre-flight dialog to configure the broadcast title, visibility, and description.
3. Creates a YouTube `liveBroadcast` and `liveStream` resource via the API.
4. Pushes the resulting RTMP stream key into OBS via `SetStreamServiceSettings` (v5) / `SetStreamSettings` (v4).
5. Starts OBS streaming.
6. On "Stop Streaming", explicitly calls the YouTube API to transition the broadcast to `complete`.

A new `YouTubeLiveTile` provides this as a standalone tile. The existing `toggleStreaming` / `button` infrastructure is extended where it makes sense rather than forked.

---

## Phase 0 — Diagnostic: Probe `Get/SetStreamServiceSettings` ✓ COMPLETED

The OBS WebSocket v5 `GetStreamServiceSettings` response was captured from a live OBS instance configured with Custom RTMP → YouTube. The confirmed v5 response shape:

```json
{
  "streamServiceSettings": {
    "bwtest": false,
    "key": "<stream-key>",
    "server": "rtmp://a.rtmp.youtube.com/live2",
    "use_auth": false
  },
  "streamServiceType": "rtmp_custom"
}
```

**Key findings:**
- Field is `"server"` (not `"url"`).
- `"use_auth": false` is present but not required to be set when updating.
- `"bwtest": false` is a bandwidth-test flag; always `false` for live streaming.
- The `SetStreamServiceSettings` call only needs `server` and `key` — other fields can be omitted.

### v4 — `GetStreamSettings` response shape (inferred, not directly tested)

```json
{
  "type": "rtmp_custom",
  "settings": {
    "server": "rtmp://a.rtmp.youtube.com/live2",
    "key": "<stream-key>",
    "use-auth": false
  }
}
```

Note: v4 uses kebab-case `"use-auth"` matching the v4 wire format convention.

### Permanent diagnostic tool

Rather than removing the diagnostic infrastructure, it has been promoted to a permanent **OBS Raw Request** settings panel (Settings → OBS Raw Request). This allows arbitrary OBS WebSocket requests to be sent and their responses inspected — useful for development, debugging, and future feature work. See the UI Design section.

---

## Authentication

### YouTube Data API v3 — write scope required

Creating and transitioning live broadcasts requires the OAuth 2.0 scope:

```
https://www.googleapis.com/auth/youtube
```

This is a full YouTube account scope. A more narrowly scoped alternative exists:

```
https://www.googleapis.com/auth/youtube.force-ssl
```

Either works for the YouTube Live API calls needed here. The narrower scope should be preferred.

### OAuth 2.0 — chosen flow: Authorization Code + PKCE with localhost redirect

This is the standard "Installed App" flow recommended by Google for desktop applications and is the most user-friendly option.

**How it works (Electron):**

```
obs-tiles (Electron)                          Google OAuth / YouTube
─────────────────────                         ──────────────────────
1. Generate PKCE code_verifier + code_challenge (S256)
2. Start local HTTP server on ephemeral port (e.g. 52345)
3. Open system browser → https://accounts.google.com/o/oauth2/v2/auth
   ?client_id=<client_id>
   &redirect_uri=http://localhost:52345
   &response_type=code
   &scope=https://www.googleapis.com/auth/youtube.force-ssl
   &code_challenge=<code_challenge>
   &code_challenge_method=S256
4.                                    ← User consents in their own browser
5. Browser redirects to http://localhost:52345?code=<auth_code>
6. Local server receives the redirect, closes
7. POST exchange: code + code_verifier → access_token + refresh_token
8. Store refresh_token (see Storage section below)
9. Use access_token for YouTube API calls
10. When access_token expires, POST exchange: refresh_token → new access_token
```

**Why this flow:**

| Option | Pros | Cons |
|--------|------|------|
| Auth Code + PKCE + localhost | Secure, user uses their real browser, no client secret required | Ephemeral port must not be blocked by firewall |
| Device Authorization Grant | Works without browser redirect, no port needed | Shows a `device_code` URL the user must visit — more friction; Google limits this to specific app types |
| Auth Code with embedded BrowserWindow | Fully in-app | Google may block it (Electron BrowserWindow looks like an embedded WebView; Google deprecated this in 2021 for OAuth) |
| API Key only | Simple | Read-only; cannot create broadcasts |

**Google Cloud Project requirement:**

The user must create a Google Cloud Project, enable the YouTube Data API v3, and create an "OAuth 2.0 Client ID" of type **Desktop app**. This provides a `client_id`. For PKCE flows with Desktop app credentials, a `client_secret` is also issued but is considered non-confidential for installed apps — it is stored in settings (see below).

**Web mode:**

In web browser mode there is no ephemeral HTTP server. Options:

1. **Manual key entry**: User creates the broadcast in the YouTube Studio UI and pastes the stream key into a dialog. The app then updates OBS and starts streaming. This avoids OAuth entirely in web mode.
2. **Redirect-based OAuth**: If a known redirect URI is configured (e.g. the web app's own domain), a standard OAuth redirect can be used. This requires server-side infrastructure and is out of scope for the initial implementation.

**Recommendation:** Web mode supports manual stream key entry only in v1. Full YouTube OAuth is Electron-only.

### Token storage

| Mode | Location | Notes |
|------|----------|-------|
| Electron | `settings.json` (`youtubeRefreshToken` field) | IPC-managed; never sent to renderer over an unprotected channel |
| Electron (future) | OS keychain via `keytar` | More secure; as a follow-up improvement |
| Web | N/A (manual key entry) | |

The access token is kept only in memory (renderer state); it is never persisted.

---

## YouTube API Calls

All calls use the base URL `https://www.googleapis.com/youtube/v3/`.

### 1. Create `liveStream` (get RTMP ingestion URL + key)

```
POST /liveStreams?part=snippet,cdn,contentDetails,status
```

Request body:
```json
{
  "snippet": { "title": "<broadcast title> — Stream" },
  "cdn": {
    "frameRate": "variable",
    "ingestionType": "rtmp",
    "resolution": "variable"
  },
  "contentDetails": { "isReusable": false }
}
```

Response (relevant fields):
```json
{
  "id": "<streamId>",
  "cdn": {
    "ingestionInfo": {
      "streamName": "<stream-key>",
      "ingestionAddress": "rtmp://a.rtmp.youtube.com/live2",
      "backupIngestionAddress": "rtmp://b.rtmp.youtube.com/live2"
    }
  }
}
```

### 2. Create `liveBroadcast`

```
POST /liveBroadcasts?part=snippet,status,contentDetails
```

Request body:
```json
{
  "snippet": {
    "title": "<user-provided title>",
    "description": "<user-provided description>",
    "scheduledStartTime": "<ISO 8601 — 'now' or future>"
  },
  "status": {
    "privacyStatus": "public" | "unlisted" | "private"
  },
  "contentDetails": {
    "enableAutoStart": true,
    "enableAutoStop": false,
    "latencyPreference": "ultraLow" | "low" | "normal"
  }
}
```

`enableAutoStart: true` — YouTube automatically transitions the broadcast to `live` when it detects OBS has started sending video data. This removes the need for an explicit `liveBroadcasts.transition` call.

`enableAutoStop: false` — **Always set to `false`.** This ensures YouTube does **not** automatically end the broadcast if OBS stops sending video (due to an OBS crash, network outage, etc.). The broadcast remains in `active` or `testing` state, which allows OBS to reconnect and resume streaming to the same broadcast. The broadcast is only ended by an explicit stop action (see Step 4 below).

Response: `{ "id": "<broadcastId>", ... }`

### 3. Bind stream to broadcast

```
POST /liveBroadcasts/bind?id=<broadcastId>&part=id,contentDetails&streamId=<streamId>
```

No request body. Returns the updated broadcast.

### 4. Transition broadcast (called on explicit stop)

```
POST /liveBroadcasts/transition?broadcastStatus=complete&id=<broadcastId>&part=id,status
```

Called after `stopStream(obs)` when the user explicitly clicks Stop. Because `enableAutoStop` is always `false`, this is the only way the broadcast is ended.

### 5. Check for existing active broadcast (before creating a new one)

```
GET /liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=active&maxResults=10
```

Also check `broadcastStatus=testing` (stream running but not yet live). Called at the start of the "Go Live" flow to detect broadcasts from a previous session that may still be running (after an OBS crash or network outage). If one or more are found, the tile presents the **Resume Broadcast Dialog** showing all of them in a table (see Architecture section). Results from `active` and `testing` queries are combined and deduplicated by `broadcastId`.

If resuming, the existing stream key is fetched:
```
GET /liveStreams?part=cdn&id=<contentDetails.boundStreamId>
```
The `cdn.ingestionInfo.streamName` from the result is used as the stream key.

### 6. List active broadcasts (status polling)

```
GET /liveBroadcasts?part=snippet,statistics,status&broadcastStatus=active&maxResults=5
```

Used to display current viewer count and broadcast state in the tile.

---

## OBS `SetStreamServiceSettings`

### v5 — `SetStreamServiceSettings` (confirmed)

```json
{
  "streamServiceType": "rtmp_custom",
  "streamServiceSettings": {
    "server": "rtmp://a.rtmp.youtube.com/live2",
    "key": "<stream-key>",
    "bwtest": false,
    "use_auth": false
  }
}
```

Field names confirmed via `GetStreamServiceSettings` probe. Only `server` and `key` are strictly required; `bwtest` and `use_auth` may be included to match what OBS expects.

> **Open question:** Does OBS persist the updated key to `obs-studio/basic/service.json` on disk, or only hold it in memory for the current session? Needs testing.

### v4 — `SetStreamSettings` (inferred)

```json
{
  "type": "rtmp_custom",
  "settings": {
    "server": "rtmp://a.rtmp.youtube.com/live2",
    "key": "<stream-key>",
    "use-auth": false
  },
  "save": true
}
```

### Adapter method

A new method is added to `OBSAdapter`:

```typescript
setStreamServiceSettings(serviceType: string, settings: Record<string, unknown>): Promise<void>
getStreamServiceSettings(): Promise<{ serviceType: string; settings: Record<string, unknown> }>
```

v4 translates parameters to `SetStreamSettings` / `GetStreamSettings`.  
v5 translates to `SetStreamServiceSettings` / `GetStreamServiceSettings`.

---

## New Configuration

### `ConfigFileFormat` additions (global settings)

```typescript
interface YouTubeConfig {
  clientId: string
  clientSecret: string       // non-confidential for desktop OAuth apps
  refreshToken?: string      // stored after first auth
  defaultPrivacyStatus: 'public' | 'unlisted' | 'private'
  defaultLatency: 'ultraLow' | 'low' | 'normal'
  defaultTitle: string       // default: '{date} Stream'
}

// Added to ConfigFileFormat:
youtube?: YouTubeConfig
```

`enableAutoStop` is intentionally absent — it is always `false` in the API call and not a user-configurable option.

The `clientId` and `clientSecret` come from the user's Google Cloud Project. Full setup instructions are rendered inline in the `YouTubeSettingsPanel` — see UI Design section.

### `ConfigItem` additions (per-config tile settings)

No changes needed at the `ConfigItem` level. All YouTube configuration lives at the global `ConfigFileFormat` level since OAuth credentials and default broadcast settings apply across all connections.

### `YouTubeLiveTileConfig` (per-tile)

```typescript
export interface YouTubeLiveTileConfig extends BaseTileConfig {
  youtubeLive: string            // discriminator + identifier (e.g. "main")
  connection?: string            // OBS connection to use (defaults to config.connection)
  autoCreateBroadcast?: boolean  // skip the pre-flight dialog (default: false)
  defaultTitle?: string          // pre-fill broadcast title (supports {date} token)
  defaultDescription?: string    // pre-fill broadcast description
}
```

---

## Architecture

```
[User: clicks "Go Live"]
       │
       ▼
YouTubeLiveTile (renderer component)
       │ calls
       ▼
useYouTubeLive hook (renderer)
       │
       ├─ checks auth state
       │       │ not authenticated
       │       ▼
       │   startOAuthFlow()
       │       │ Electron: open system browser + local HTTP server
       │       │ Web: show manual key entry dialog
       │       ▼
       │   access_token + refresh_token stored
       │
       ├─ checkForExistingBroadcasts() [YouTube API service]
       │       │ GET /liveBroadcasts?broadcastStatus=active&maxResults=10
       │       │ GET /liveBroadcasts?broadcastStatus=testing&maxResults=10
       │       │ deduplicate by broadcastId, combine into list
       │       │
       │       ├─ found one or more existing broadcasts
       │       │       ▼
       │       │   ResumeBroadcastDialog (table of broadcasts)
       │       │       │ Resume row: GET /liveStreams?id=<boundStreamId>
       │       │       │             → stream key; skip broadcast creation
       │       │       │ End row:    liveBroadcasts.transition(complete)
       │       │       │             remove row; auto-close if table empty
       │       │       │ Create new: dismiss dialog → CreateBroadcastDialog
       │       │
       │       └─ no existing broadcasts: proceed
       │
       ├─ (if creating new) shows CreateBroadcastDialog
       │       │ user fills title, description, privacy
       │       ▼
       │   createYouTubeBroadcast() [YouTube API service]
       │       │ POST /liveStreams → streamId, streamKey, ingestionAddress
       │       │ POST /liveBroadcasts (enableAutoStop: false) → broadcastId
       │       │ POST /liveBroadcasts/bind → binds stream to broadcast
       │
       ├─ setStreamServiceSettings(obs, 'rtmp_custom', { server, key })
       │       │ via OBSAdapter in streaming actions
       │
       └─ startStream(obs)
               │ OBS begins sending video to YouTube
               │ YouTube auto-starts broadcast (enableAutoStart=true)
               ▼
       YouTubeLiveTile shows "LIVE" status + viewer count

[User: clicks "Stop"]
       │
       ├─ stopStream(obs)
       │       │ OBS stops sending video
       │       │ broadcast remains active (enableAutoStop=false)
       │
       └─ transitionBroadcast(broadcastId, 'complete')
               │ explicitly end the YouTube broadcast via API
               ▼
       Broadcast status: complete
```

### New & modified files

| File | Purpose |
|------|---------|
| `src/renderer/api/youtube/YouTubeAuthService.ts` | OAuth flow, token refresh, token storage via IPC |
| `src/renderer/api/youtube/YouTubeLiveService.ts` | Broadcast and stream CRUD calls |
| `src/renderer/api/youtube/useYouTubeLive.ts` | React hook — auth state, broadcast lifecycle, status polling |
| `src/renderer/api/youtube/index.ts` | Re-export barrel |
| `src/renderer/components/tiles/YouTubeLiveTile.tsx` | Tile component |
| `src/renderer/components/youtube/CreateBroadcastDialog.tsx` | Pre-flight dialog |
| `src/renderer/components/youtube/YouTubeAuthDialog.tsx` | OAuth status + sign-in/out UI |
| `src/renderer/components/Settings/YouTubeSettingsPanel.tsx` | OAuth credentials, default broadcast settings |
| `src/renderer/api/obs/actions/streaming.ts` | Add `setStreamServiceSettings` action |
| `src/renderer/api/obs/abstraction/adapter.ts` | Add `setStreamServiceSettings` + `getStreamServiceSettings` |
| `src/renderer/api/obs/adapters/v4-adapter.ts` | Implement `SetStreamSettings` + `GetStreamSettings` |
| `src/renderer/api/obs/adapters/v5-adapter.ts` | Implement `SetStreamServiceSettings` + `GetStreamServiceSettings` |
| `src/renderer/components/tiles/Tiles.tsx` | Add `YouTubeLiveTileConfig` type + guard + render branch |
| `src/renderer/components/Settings/SettingsDialog.tsx` | Add YouTube settings node; add permanent OBS Raw Request settings node |
| `src/renderer/components/Settings/ConfigVisualEditor.tsx` | Add `youtubeLive` tile type to visual editor |
| `src/shared/types.ts` | Add `YouTubeConfig` interface, extend `ConfigFileFormat` |
| `src/shared/defaults.ts` | Default values for `YouTubeConfig` |
| `src/main/index.ts` (Electron) | IPC handler for OAuth redirect server (`youtube-oauth-start`, `youtube-oauth-result`) |
| `src/preload/index.ts` (Electron) | Expose `youtubeOAuthStart`, `onYouTubeOAuthResult` via context bridge |

---

## UI Design

### `YouTubeLiveTile` tile component

The tile uses `TileWrapper` as its root and works similarly to the existing stream toggle button, but with extra states:

| State | Visual |
|-------|--------|
| Not authenticated | Red tint, "Sign in to YouTube" label |
| Authenticated, idle | Green tint, "Go Live" label |
| Creating broadcast | Spinner overlay, "Preparing…" label |
| Setting OBS stream key | Spinner overlay, "Configuring OBS…" label |
| OBS streaming, YouTube waiting | Amber, "Starting…" |
| Live | Red LIVE badge, viewer count, elapsed time |
| Stopping | Spinner overlay, "Stopping…" |
| Error | Red border, truncated error message |

The tile supports `viewType: 'preview' | 'button'` where `'button'` renders a compact MUI button row (similar to existing `ButtonTileConfig`).

### `CreateBroadcastDialog`

Pre-flight dialog shown before going live (unless `autoCreateBroadcast` is true):

```
┌─────────────────────────────────────────┐
│  Create YouTube Broadcast               │
├─────────────────────────────────────────┤
│  Title *    [                         ] │
│  Description  [                       ] │
│               [                       ] │
│  Privacy    [Public ▼]                  │
│  Latency    [Ultra Low ▼]              │
│                                         │
│            [Cancel]  [Go Live →]       │
└─────────────────────────────────────────┘
```

- Title field pre-filled from `defaultTitle` (supports `{date}` token substituted with `YYYY-MM-DD`).
- "Go Live" is disabled until a title is entered.
- There is no Auto-stop option. `enableAutoStop` is always `false` — the broadcast persists through OBS crashes and reconnects.
- When `autoCreateBroadcast` is true on the tile config, this dialog is skipped and defaults are used.

### Resume Broadcast Dialog

Shown before `CreateBroadcastDialog` if one or more active or testing broadcasts are detected. All matching broadcasts are listed in a table so the user can act on each individually:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Existing YouTube broadcasts found                                   │
├──────────────────────────────────────────────────────────────────────┤
│  One or more YouTube broadcasts are already active. Resume one or    │
│  end them before creating a new broadcast.                           │
│                                                                      │
│  Title                  │ Status  │ Started         │ Actions        │
│  ─────────────────────────────────────────────────────────────────  │
│  2026-04-07 Stream      │ active  │ Apr 7, 09:14    │ [Resume] [End] │
│  Test broadcast         │ testing │ Apr 7, 08:52    │ [Resume] [End] │
│                                                                      │
│                                        [Create new broadcast]        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Resume** — fetches the stream key from the broadcast's bound `liveStream` (`GET /liveStreams?id=<boundStreamId>`) and uses it directly, skipping `CreateBroadcastDialog`. OBS stream settings are updated and streaming begins immediately.
- **End** — calls `liveBroadcasts.transition?broadcastStatus=complete` for that row's broadcast, then removes it from the table. If no broadcasts remain, the dialog closes and proceeds to `CreateBroadcastDialog` automatically.
- **Create new broadcast** — dismisses this dialog and opens `CreateBroadcastDialog` as normal. All listed broadcasts are left running.

Multiple broadcasts are possible after repeated OBS crashes or when the user has manually started a second broadcast in YouTube Studio. The API call that populates the table fetches up to `maxResults=10` for `broadcastStatus=active` and `broadcastStatus=testing` and deduplicates by `broadcastId`.

### `YouTubeSettingsPanel` (in Settings dialog)

A new "YouTube" settings node in the left-panel tree of the Settings dialog:

```
YouTube Live Integration
────────────────────────
Google Cloud Project setup
  ┌─────────────────────────────────────────────────────────────┐
  │ To use YouTube Live integration you need a Google Cloud     │
  │ Project with the YouTube Data API v3 enabled.               │
  │                                                             │
  │ Steps:                                                      │
  │  1. Go to console.cloud.google.com → New project            │
  │  2. APIs & Services → Enable APIs → "YouTube Data API v3"   │
  │  3. APIs & Services → Credentials → + Create Credentials    │
  │     → OAuth client ID → Application type: Desktop app       │
  │  4. Copy the Client ID and Client Secret below              │
  │  5. APIs & Services → OAuth consent screen                  │
  │     → Publishing status: set to "In production"             │
  │     (required to avoid refresh tokens expiring after 7 days)│
  └─────────────────────────────────────────────────────────────┘

OAuth Credentials
  Client ID      [                         ]
  Client Secret  [                         ]

Authentication Status
  [Not signed in]         [Sign in to YouTube]
  or
  [Signed in as user@gmail.com]  [Sign out]

Default broadcast settings
  Privacy        [Unlisted ▼]   [x] Allow override
  Latency        [Ultra Low ▼]  [x] Allow override
  Title template [{date} Stream]
  Description    [                         ]

  If "Allow override" is unchecked for Privacy or Latency, those
  fields will not be shown in the Create Broadcast dialog and the
  default value here will always be used.

OBS connection for stream key updates
  Connection     [main ▼]   (dropdown of configured connections)
```

The "In production" warning is shown as a highlighted notice if `refreshToken` is not set (first-time setup) to reduce the chance of the user missing this step.

### `YouTubeAuthDialog`

A compact dialog shown during the OAuth flow:

```
┌───────────────────────────────────────────┐
│  Sign in to YouTube                        │
├───────────────────────────────────────────┤
│  Your browser will open to sign in.       │
│  After approving, return to obs-tiles.    │
│                                           │
│  [Open browser]          [Cancel]         │
│                                           │
│  Waiting for authorization…  ∙∙∙          │
└───────────────────────────────────────────┘
```

---

## Electron-specific: OAuth IPC Bridge

The local HTTP server for the OAuth redirect runs in the **main process** (not the renderer). This is required because:

- The renderer cannot open a TCP server
- `net` module is Node.js (main process only)

### IPC flow

```
Renderer                         Main process
────────                         ────────────
youtube-oauth-start (invoke) ───► creates net.Server on ephemeral port
                              ◄── returns { port, authUrl }
(opens system browser to authUrl)
                              ← browser redirects to localhost:port?code=…
                              main receives code, closes server
                              sends youtube-oauth-result event → renderer
renderer exchanges code for tokens (via fetch, in renderer)
stores refresh_token in settings via saveSettings IPC
```

The auth code exchange (code → tokens) happens in the renderer using `fetch` to avoid exposing the `client_secret` to the main process unnecessarily. Since this is an installed desktop app, the `client_secret` is not truly confidential — but keeping it in the renderer keeps concerns separated.

---

## Web Mode

YouTube OAuth with redirect is impractical without a server-side callback. Web mode therefore provides:

1. A `YouTubeLiveTile` that shows a **"Manual Key"** button instead of "Go Live".
2. Clicking it opens a simple dialog: `Stream Key [          ]  [Set in OBS + Go Live]`.
3. The entered key is used in `SetStreamServiceSettings` exactly as in Electron mode.
4. The YouTube API calls (broadcast creation, status) are **not available** in web mode.

This gives web users the ability to update the stream key and start streaming in one step, even without API integration.

---

## Broadcast Status Polling

While live, the hook polls `GET /liveBroadcasts?part=snippet,statistics,status&id=<broadcastId>` every 30 seconds to refresh:

- `snippet.liveChatId` (for potential future chat integration)
- `statistics.concurrentViewers`
- `status.lifeCycleStatus` (to detect if YouTube auto-stopped the broadcast externally)

Polling uses `setInterval` inside `useYouTubeLive` and is cleared on component unmount or when the broadcast ends.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| OAuth token expired | Silently refresh using stored refresh_token before any API call |
| Refresh token revoked | Show "Re-authentication required" toast; clear stored token |
| YouTube API quota exceeded | Show error dialog with quota reset time (midnight Pacific) |
| `SetStreamServiceSettings` rejected by OBS | Show error dialog; do not start streaming |
| OBS not connected when "Go Live" clicked | Show error: "OBS is not connected" |
| OBS already streaming when "Go Live" clicked | Show confirmation dialog: "OBS is already streaming. Replace stream key and continue?" |
| Network error during broadcast creation | Show error dialog; allow retry |
| YouTube broadcast stuck in `testing` | Show warning after 60 s with status label; offer "Force to live" button (manual `liveBroadcasts.transition` call) |
| OBS crashes / internet drops mid-stream | Broadcast stays active (enableAutoStop=false); OBS can reconnect and resume streaming; existing `broadcastId` kept in hook state |
| obs-tiles restarted after OBS crash | "Go Live" flow detects existing active broadcast and offers "Resume" dialog |

---

## Security Considerations

- The `client_secret` is stored in `settings.json` next to the executable. For a Desktop app OAuth client, Google treats this as a non-secret (the credential is distributed with the app binary), but users should be advised not to share their `settings.json`.
- The `refresh_token` is stored in `settings.json`. A future improvement is to use the OS keychain via `electron-keytar` (`keytar` npm package) for both values.
- The `access_token` is kept in memory only and never persisted.
- All YouTube API calls use HTTPS. No token data is logged.
- The OBS stream key is sent over the WebSocket connection to OBS; it is not stored by obs-tiles after use.

---

## Implementation Phases

### Phase 0 — Diagnostic probe ✓ DONE

- [x] Added `sendRaw()` to v4 and v5 adapters
- [x] Added OBS Raw Request panel to SettingsDialog (permanent, not temporary)
- [x] Captured `GetStreamServiceSettings` response; confirmed payload shape
- [x] Spec updated with confirmed field names

### Phase 1 — OBS stream key update ✓ DONE

- [x] Add `setStreamServiceSettings` to `OBSAdapter` interface and both adapters
- [x] Add `setStreamServiceSettings` action to `src/renderer/api/obs/actions/streaming.ts`
- [x] Manual test: confirmed OBS updates stream destination when `SetStreamServiceSettings` is called

### Phase 2 — YouTube OAuth ✓ DONE

- [x] Create Google Cloud Project + OAuth Desktop client (documented for users)
- [x] Add `youtube` config fields to `ConfigFileFormat` + `shared/types.ts`
- [x] Add `YouTubeSettingsPanel` in SettingsDialog
- [x] Implement `YouTubeAuthService` (PKCE, token refresh)
- [x] Electron: Add `youtube-oauth-start` / `youtube-oauth-result` IPC in main process
- [x] Preload: Expose auth IPC bridge

### Phase 3 — YouTube API service ✓ DONE

- [x] Implement `YouTubeLiveService` (createStream, createBroadcast, bindStream, transitionBroadcast, getStreamKey, getStatus)
- [x] Implement `checkForExistingBroadcasts()` — query active/testing broadcasts (maxResults=10 each), deduplicate, combine
- [x] Implement `ResumeBroadcastDialog` (table of existing broadcasts with Resume / End per row + Create new button)
- [x] Implement `CreateBroadcastDialog`
- [x] Implement status polling in `useYouTubeLive`

### Phase 4 — Tile UI ✓ DONE

- [x] Implement `YouTubeLiveTile` component (all states)
- [x] Register tile type in `Tiles.tsx` (`YouTubeLiveTileConfig`, `isYouTubeLiveTileConfig`, union + render branch)
- [x] Add manual key fallback path for web mode (`ManualKeyDialog`)

### Phase 5 — Polish & testing

- [ ] Confirm-before-go-live setting (mirroring existing `confirmBeforeStartStreaming`)
- [ ] `{date}` substitution in default title template
- [ ] Keyboard shortcut support (`startYoutubeLive`, `stopYoutubeLive`)
- [ ] End-to-end test: create broadcast → go live → stop → verify broadcast state in YouTube Studio

---

## Open Questions

1. **`SetStreamServiceSettings` persistence** — Does OBS persist the updated stream key to `obs-studio/basic/service.json` on disk, or only hold it in memory for the current session? Needs testing.
2. **Reusable streams** — YouTube allows creating a "persistent" stream that keeps the same key indefinitely. Should the tile optionally reuse a named persistent stream instead of creating a new one per session? This would remove the need to call `SetStreamServiceSettings` on each broadcast.
3. **Multiple OBS connections** — Which connection's stream settings should be updated? Current spec: the connection specified in the tile config (defaulting to `config.connection`). Should all connections be updated?
4. **Pre-stream scene switching** — Should the tile optionally switch to a "holding" scene before going live (common practice to avoid showing a black screen)?
5. **YouTube broadcast thumbnail** — YouTube allows an auto-generated or custom thumbnail. Out of scope for v1.
6. **Chat overlay** — YouTube Live Chat API could feed into a text tile. Out of scope for v1.
