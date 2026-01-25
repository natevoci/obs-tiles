// Default config for config.json
export const DEFAULT_CONFIG = {
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
      ],
    },
  ]
}
