// Default config for config.json
// Config is stored as an array of named configurations
export const DEFAULT_CONFIG = [
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
    direction: 'column',
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
