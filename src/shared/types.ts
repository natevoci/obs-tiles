// ---------------------------------------------------------------------------
// Keyboard Shortcut Types
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | { type: 'toggleRecording' }
  | { type: 'startRecording' }
  | { type: 'stopRecording' }
  | { type: 'toggleStreaming' }
  | { type: 'startStreaming' }
  | { type: 'stopStreaming' }
  | { type: 'switchScene'; sceneName: string }
  | { type: 'switchToPreviousScene' }
  | { type: 'toggleSceneItem'; sceneName: string; sceneItemName: string }
  | { type: 'moveSceneItemToTop'; sceneName: string; sceneItemName: string }
  | { type: 'toggleAudioMute'; inputName: string }
  | { type: 'muteAudio'; inputName: string }
  | { type: 'unmuteAudio'; inputName: string }
  | { type: 'startRtsp'; streamId: string }
  | { type: 'stopRtsp'; streamId: string }
  | { type: 'toggleRtsp'; streamId: string }
  | { type: 'selectConfig' }
  | { type: 'startYoutubeLive'; tileId: string }
  | { type: 'stopYoutubeLive'; tileId: string }

export interface KeyboardShortcut {
  /** Normalised combo string, e.g. "Ctrl+Shift+F5" */
  keys: string
  action: ShortcutAction
}

// ---------------------------------------------------------------------------

export interface ConfigItem {
  name: string
  connections: Record<string, any>
  connection: string
  tileSize: number
  fontSize?: number
  activeRefreshTime?: number
  inactiveRefreshTime?: number
  direction: string
  tiles: any[]
  shortcuts?: KeyboardShortcut[]
  [key: string]: any
}

export interface ConfigFileFormat {
  title: string
  configs: ConfigItem[]
  currentConfigIndex: number
  selectConfigAtLaunch: boolean
  autoBackupConfigOnClose?: boolean
  autoBackupConfigFolder?: string
  confirmBeforeStartStreaming?: boolean
  confirmBeforeStopStreaming?: boolean
  confirmBeforeStartRecording?: boolean
  confirmBeforeStopRecording?: boolean;
  confirmBeforeGoLive?: boolean;
  ffmpegPath?: string;
  youtube?: YouTubeConfig
}

// ---------------------------------------------------------------------------
// YouTube Live Integration
// ---------------------------------------------------------------------------

export interface YouTubeConfig {
  clientId: string
  clientSecret: string
  refreshToken?: string
  defaultPrivacyStatus: 'public' | 'unlisted' | 'private'
  defaultLatency: 'ultraLow' | 'low' | 'normal'
  defaultTitle: string
  defaultDescription: string
  /** When false, Privacy field is hidden in CreateBroadcastDialog */
  allowPrivacyOverride: boolean
  /** When false, Latency field is hidden in CreateBroadcastDialog */
  allowLatencyOverride: boolean
  obsConnection: string
}
