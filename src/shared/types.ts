// ---------------------------------------------------------------------------
// Keyboard Shortcut Types
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | { type: 'toggleRecording' }
  | { type: 'toggleStreaming' }
  | { type: 'switchScene'; sceneName: string }
  | { type: 'toggleSceneItem'; sceneName: string; sceneItemName: string }
  | { type: 'toggleAudioMute'; inputName: string }

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
  ffmpegPath?: string;
}
