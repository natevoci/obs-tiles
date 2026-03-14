---
applyTo: "src/renderer/components/tiles/**,src/shared/**"
---

# Tile Components Instructions

## Tile Type System

All tile configuration types are discriminated unions defined in `src/renderer/components/tiles/Tiles.tsx`. Each type has a corresponding type-guard function (`isGroupTileConfig`, `isSceneButtonTileConfig`, etc.) that also warns about unexpected extra properties.

Current tile types:

| Config interface | Discriminator property |
|-----------------|----------------------|
| `GroupTileConfig` | `tiles` (array) |
| `SceneButtonTileConfig` | `scene` (string) |
| `SceneItemButtonTileConfig` | `sceneItem` (object) |
| `ButtonTileConfig` | `button` (string) |
| `TextTileConfig` | `text` (string) |
| `AudioInputTileConfig` | `audioInput` (object) |

## Adding a New Tile Type

1. **Define the config interface** in `Tiles.tsx` extending `BaseTileConfig`. Use a unique discriminator property.
2. **Add it to the `TileConfig` union** in `Tiles.tsx`.
3. **Write a type guard** (`isMyTileConfig`) following the existing pattern. Include a `warnExtraProps` call listing all valid keys.
4. **Create the component file** `src/renderer/components/tiles/MyTile.tsx`. Use `TileWrapper` as the root element (see below).
5. **Import and register** in `Tiles.tsx` — add an `else if (isMyTileConfig(tile))` branch in the render function.
6. **Update `ConfigVisualEditor.tsx`** (`src/renderer/components/Settings/ConfigVisualEditor.tsx`) to expose the new tile type in the visual settings editor.
7. **Update `src/shared/defaults.ts`** if the new tile type should appear in the default configuration.

## TileWrapper — Required Root Element

Every tile component must use `TileWrapper` from `src/renderer/components/tiles/TileWrapper.tsx` as its outermost element. `TileWrapper` provides:
- Consistent sizing (width/height based on `tileSize`)
- Selection highlight overlay
- Loading spinner overlay
- Screenshot/image overlay

Do not create bare `div` wrappers as tile roots.

## viewType Option

Tiles that have more than one visual presentation support a `viewType` prop:

| Value | Appearance |
|-------|-----------|
| `'preview'` (default) | Full tile with screenshot background |
| `'checkbox'` | Compact inline checkbox row |

When adding `viewType` to a new tile, add `viewType?: 'preview' | 'checkbox'` to the config interface and branch on it inside the component.

## Click / Long-Press Handling

Never attach raw `onClick` handlers directly to tile elements. Use the hooks in `src/renderer/components/tiles/`:

- `useClickHandler` — single click with debounce
- `useLongPress` — separate callbacks for press and long-press

These ensure consistent interaction timing across all tiles.

## Data Access in Tile Components

Tile components must consume OBS data through **typed provider hooks** only. Never call `obs.adapter` directly from a tile component.

```typescript
// Correct — use typed hooks
const currentScene = useCurrentScene(obs)
const sceneList = useSceneList(obs)

// Wrong — never in components
obs.adapter?.on('CurrentProgramSceneChanged', ...)
```

## BaseTileConfig — Common Props

Every tile config inherits these optional properties from `BaseTileConfig`:

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Label rendered below or over the tile |
| `connection` | `string` | Which OBS connection to use (defaults to `config.connection`) |
| `tileSize` | `string \| number` | Override the global tile size for this tile |
