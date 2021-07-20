# OBS-tiles

http://obs-tiles.deepcreek.org.au/

OBS-tiles provides a simple interface for switching between scenes in one or more [OBS](https://obsproject.com/) instances using the [OBS-websocket](https://github.com/Palakis/obs-websocket/releases) plugin.

## Screenshot

![Screenshot of OBS-web](.github/screenshot.png)

## Features

- JSON configurable UI
- Supports multiple OBS instances
- Is a Progressive Web App (PWA)
  - It can be installed as a desktop application
  - Once installed, it does not require an internet connection, so it can be used in an isolated local network.
- 

## Requirements

- [OBS Studio](https://obsproject.com/) version 27.0.1 or greater.
- [OBS-websocket plugin](https://github.com/Palakis/obs-websocket/releases) version 4.9.1 or greater.
- HTML5 web browser

# Setup

- Load obs-tiles website (eg. http://localhost:1234 during development)
- Click the settings button
- Enter the configuration

# Configuration

## Connections

The connections property defines a set of addresses to obs.

In this example there are two connections that we have named `liveStream` and `projector`. These names will be referred to in the `connection` properties later.
```js
"connections": {
  "liveStream": {
    "address": "192.168.12.56:4444"
  },
  "projector": {
    "address": "192.168.12.58:4444"
  },
},
```

## Connection

The `connection` property sets the default connection to use. This name must match one of the connections defined in the `connections` property.

```js
"connection": "liveStream",
```

## Tile Size

The `tileSize` property sets the size of tiles. This can be overridden in groups and for specific tiles. The default size if not specified is 10.

```js
"tileSize": 12,
```

## Tiles

The `tiles` property takes an array of objects representing the various tile types (see below).

```js
"tiles": [
  ...tile objects...
]
```

## Tile Types

### Scene

This loads a tile for a scene, with a preview of the scene's video content.

```js
{
  "scene": "My scene name",
  "title": "Custom title",
  "tileSize": 12,
},
```

| Property | Value |
| -------- | ----- |
| `scene` | The name of the scene. Must match the scene name in OBS. |
| `title` | (optional) Override the title displayed below the tile. |
| `tileSize` | (optional) override the size of the tile. |


### Scene Item

This loads a tile for a scene item (known as a "source" in OBS), with a preview of the source's video content.

```js
{
  "sceneItem": {
    "scene": 'My scene name',
    "item": 'Source 1',
  },
  "title": 'Custom title',
  "tileSize": 12,
} ,
```

| Property | Value |
| -------- | ----- |
| `sceneItem.scene` | The name of the scene. Must match the scene name in OBS. |
| `sceneItem.item` | The name of the source in the scene. Must match the source name in OBS. |
| `title` | (optional) Override the title displayed below the tile. |
| `tileSize` | (optional) override the size of the tile. |


### Button

Displays a button

```js
{
  "button": "toggleStreaming"
},
```

| Property | Value |
| -------- | ----- |
| `button` | Button Type. |

| Button Type | Description |
| ----------- | ----------- |
| `toggleStreaming` | A button that allows streaming to be toggled on and off. |
| `toggleRecording` | A button that allows recording to be toggled on and off. |


### Text

Displays a block of text.

```js
{
  text: 'stats',
},
```

| Property | Value |
| -------- | ----- |
| `text` | Text type. |

| Text type | Description |
| --------- | ----------- |
| `stats` | Displays statistics from OBS, including fps, cpu, memory and disk usage, ans skipped frames |



### Group

Provides a container for more tiles.
```js
{
  "group": "Live Stream",
  "connection": "liveStream",
  "tileSize": 12,
  "direction": "row",
  "tiles": [],
}
```

| Property | Value |
| -------- | ----- |
| `group` | (optional) The name of the group. If this property is omitted then the group will not contain a title or border. |
| `connection` | (optional) Override the connection used by child tiles. |
| `tileSize` | (optional) Override the tile size for child tiles. |
| `direction` | (optional) `row` or `column` to determine which direction tiles should be stacked. |
| `tiles` | Array of child tile objects. |






# Example configuration

## Simple

This example creates 4 scene tiles, a toggle streaming button, and displays the stats (framerate, cpu, memory, disk space, and skipped frames).

```js
{
  "connections": {
    "liveStream": {
      "address": "192.168.12.56:4444"
    },
  },
  "connection": "liveStream",
  "tiles": [
    {
      "scene": "Blackout"
    },
    {
      "scene": "Screen share"
    },
    {
      "scene": "Camera 1"
    },
    {
      "scene": "Camera 2"
    },
    {
      "button": "toggleStreaming"
    },
    {
      "text": "stats"
    },
  ]
}
```


## Multiple instances of OBS

This example demonstrates connecting to 2 OBS instances.

```js
{
  "connections": {
    "liveStream": {
      "address": "192.168.12.56:4444"
    },
    "projector": {
      "address": "192.168.12.58:4444"
    }
  },
  "tileSize": 12,
  "direction": "column",
  "tiles": [
    {
      "group": "Live Stream",
      "connection": "liveStream",
      "direction": "row",
      "tiles": [
        {
          "scene": "0 - Black"
        },
        {
          "scene": "1 - Projector"
        },
        {
          "scene": "3 - Cameras"
        },
        {
          "scene": "7 - 20-80"
        },
        {
          "scene": "8 - Side by Side"
        },
        {
          "scene": "9 - 80-20"
        },
        {
          "scene": "Video Call (Zoom)"
        },
        {
          "direction": "column",
          "tiles": [
            {
              "button": "toggleStreaming"
            },
            {
              "button": "toggleRecording"
            },
            {
              "text": "stats"
            }
          ]
        }
      ]
    },
    {
      "group": "Projector",
      "connection": "projector",
      "direction": "row",
      "tiles": [
        {
          "scene": "0 - Black"
        },
        {
          "scene": "1 - Screen"
        },
        {
          "scene": "3 - Cameras"
        },
        {
          "scene": "5 - Video Call"
        },
        {
          "scene": "7 - 20-80"
        },
        {
          "scene": "8 - Side by Side"
        },
        {
          "scene": "9 - 80-20"
        },
        {
          "text": "stats"
        }
      ]
    }
  ]
}
```


## Build instructions
### For development

```bash
yarn
yarn start
```
then open http://localhost:1234

### For production
```bash
yarn build
```
Build output is written to the `dist` folder.
