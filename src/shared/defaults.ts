// Default keyboard shortcut bindings applied to new and migrated configs
export const DEFAULT_SHORTCUTS = [
  { keys: 'Ctrl+Shift+R', action: { type: 'toggleRecording' } },
  { keys: 'Ctrl+Shift+S', action: { type: 'toggleStreaming' } },
]

// Default settings for data/settings.json
export const DEFAULT_SETTINGS = {
  title: 'obs-tiles',
  currentConfigIndex: 0,
  selectConfigAtLaunch: false,
  autoBackupConfigOnClose: false,
  autoBackupConfigFolder: '',
  ffmpegPath: '',
  confirmBeforeStartStreaming: false,
  confirmBeforeStopStreaming: false,
  confirmBeforeStartRecording: false,
  confirmBeforeStopRecording: false,
  configs: [
    {
      name: 'Default',
      connections: {
        main: {
          address: 'localhost:4455',
          // apiVersion: 'auto' | 'v4' | 'v5' - auto-detect by default
          apiVersion: 'auto',
        }
      },
      connection: 'main',
      tileSize: 10,
      fontSize: 10,
      direction: 'column',
      shortcuts: DEFAULT_SHORTCUTS,
      tiles: [
        {
          group: 'Scenes',
          direction: 'row',
          tiles: [
            {
              scene: 'Scene 1',
            },
            {
              scene: 'Scene 2',
            },
            {
              direction: 'column',
              tiles: [
                {
                  button: 'toggleStreaming',
                },
                {
                  button: 'toggleRecording',
                },
                {
                  text: 'stats',
                },
              ],
            },
            {
              audioInput: {
                inputName: "Mic/Aux",
                maxVolume: 1.0
              },
              title: "Microphone"
            },
          ],
        },
      ]
    }
  ]
}
