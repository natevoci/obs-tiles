// Default config for config.json
export const DEFAULT_CONFIG = {
  connections: {
    main: {
      address: 'localhost:4444',
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
