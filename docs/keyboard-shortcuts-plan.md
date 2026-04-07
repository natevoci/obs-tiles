# Plan: Configurable Keyboard Shortcuts

## Summary

Add a "Keyboard Shortcuts" tree node to the Settings dialog, allowing users to bind key combos (click-to-record) to OBS actions. Shortcuts are stored per-config inside `ConfigItem.shortcuts`. A global `useKeyboardShortcuts` hook mounted in `Layout` listens for combos and fires actions via the OBS adapter.

---

## Decisions

- **Scope**: Per-config (`ConfigItem.shortcuts`)
- **Actions**: Toggle Recording, Toggle Streaming, Switch to Scene, Toggle Scene Item visibility, Toggle Audio Input mute
- **Scene/item selection**: Live OBS dropdowns (scene list, scene item list per scene). Audio input name: freetext (no `getInputList` adapter method exists, consistent with `AudioInputTile`/`AudioInputForm`)
- **Key capture UI**: Click-to-record (click field → press combo → field updates)
- **Dialog suppression**: Shortcuts do not fire while any MUI dialog (including the Settings dialog) is open
- **Default bindings**: Applied automatically to new configs and migrated configs that have no `shortcuts` key

---

## Phase 1 — Data Types

### Step 1: Extend `src/shared/types.ts`

Add `ShortcutAction` discriminated union:

```
{ type: 'toggleRecording' }
{ type: 'toggleStreaming' }
{ type: 'switchScene'; sceneName: string }
{ type: 'toggleSceneItem'; sceneName: string; sceneItemName: string }
{ type: 'toggleAudioMute'; inputName: string }
```

Add `KeyboardShortcut` interface: `{ keys: string; action: ShortcutAction }`

Add `shortcuts?: KeyboardShortcut[]` to `ConfigItem`.

---

## Phase 2 — Key Capture UI Component

### Step 2: Create `src/renderer/components/Settings/KeyCaptureInput.tsx`

- Styled input field displaying current combo string (e.g. `"Ctrl+Shift+F5"`) or placeholder `"Click to record…"`
- On click: enter "recording" mode (visual highlight); on `keydown`, build combo string from `e.ctrlKey`, `e.shiftKey`, `e.altKey`, `e.metaKey` + `e.key` (letters uppercased). Escape cancels.
- Props: `value: string`, `onChange: (keys: string) => void`

---

## Phase 3 — Shortcuts Settings Panel

### Step 3: Create `src/renderer/components/Settings/KeyboardShortcutsPanel.tsx`

- Renders a list of shortcut rows (key combo + action type + conditional params + Delete button)
- "Add Shortcut" button appends a new empty row
- Each row:
  - `KeyCaptureInput` for the key combo
  - Action type `Select` dropdown (Toggle Recording, Toggle Streaming, Switch to Scene, Toggle Scene Item, Toggle Audio Mute)
  - Conditional params based on action type:
    - **Switch Scene** → scene name `Select` populated via `useSceneList(obs)`
    - **Toggle Scene Item** → scene `Select` + item `Select` (populated via `useSceneItemList(obs, { scene })`, stores `sceneItemName` = `sourceName`)
    - **Toggle Audio Mute** → freetext `TextField` for `inputName`
- Receives `obs: ConnectionPublic` as prop to drive live dropdowns
- Props: `obs`, `shortcuts: KeyboardShortcut[]`, `onChange: (shortcuts: KeyboardShortcut[]) => void`

---

## Phase 4 — Settings Dialog Integration

### Step 4: Modify `src/renderer/components/Settings/SettingsDialog.tsx`

- Extend `SelectedNode` type to include `'keyboard-shortcuts'`
- Add new tree node ("Keyboard Shortcuts" with a keyboard icon) after the "Settings" node
- Add `selected === 'keyboard-shortcuts'` branch in `renderRightPanel()` rendering `<KeyboardShortcutsPanel>`
- Add `localShortcuts: KeyboardShortcut[]` state initialised from the current config's `shortcuts`
- `handleSave` writes `localShortcuts` back into the config before calling `saveFullSettings`
- `useObs` called at component level to provide `obs` to the panel

---

## Phase 5 — Runtime Shortcut Engine

### Step 5: Create `src/renderer/hooks/useKeyboardShortcuts.ts`

- Accepts `shortcuts: KeyboardShortcut[]` and `obs: ConnectionPublic`
- Attaches `window.addEventListener('keydown', handler)` on mount; cleans up on unmount
- **Dialog suppression**: bail out if `document.querySelector('[role="dialog"]')` is present — suppresses shortcuts whenever any MUI dialog (including Settings) is open, with no prop threading required
- **Input focus guard**: bail out if `document.activeElement` is an `<input>` or `<textarea>`
- **Actions are tile-independent**: dispatches directly to the OBS adapter — does NOT look for or simulate tile clicks. Shortcuts work regardless of whether a matching tile exists in the layout.
- On match, dispatches:
  - `toggleRecording` → `startStopRecording(obs)()`
  - `toggleStreaming` → `startStopStreaming(obs)()`
  - `switchScene` → `setCurrentScene(obs)({ scene: sceneName })`
  - `toggleSceneItem` → `obs.adapter?.getSceneItemList(sceneName)`, resolves `sceneItemId` by `sourceName`, calls `toggleSceneItemEnabled(obs)(...)`
  - `toggleAudioMute` → `obs.adapter?.toggleInputMute(inputName)`

### Step 6: Mount hook in `src/renderer/components/Layout.tsx`

- Call `useObs({ connection: currentConfig.connection })` and `useKeyboardShortcuts(currentConfig.shortcuts ?? [], obs)`

---

## Phase 6 — Default Shortcuts & Migration

### Step 7: Add `DEFAULT_SHORTCUTS` to `src/shared/defaults.ts`

| Combo | Action |
|---|---|
| `Ctrl+Shift+R` | Toggle Recording |
| `Ctrl+Shift+S` | Toggle Streaming |

Selected to avoid common OS/browser conflicts (`Ctrl+R` = reload, `Ctrl+S` = save — Shift modifier makes them safe).

### Step 8: Apply defaults at two call sites

- **New config**: in `SettingsDialog.tsx` `handleNewConfig()`, include `shortcuts: DEFAULT_SHORTCUTS` in the new `ConfigItem`
- **Migration**: in `SettingsProvider.tsx`, after loading settings, map all configs — if `shortcuts === undefined`, assign `DEFAULT_SHORTCUTS`. Runs once on load, transparent to the user.

---

## Relevant Files

### New

| File | Purpose |
|---|---|
| `src/renderer/components/Settings/KeyCaptureInput.tsx` | Click-to-record key combo input |
| `src/renderer/components/Settings/KeyboardShortcutsPanel.tsx` | Shortcut list editor panel |
| `src/renderer/hooks/useKeyboardShortcuts.ts` | Global keydown listener + action dispatcher |

### Modified

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `ShortcutAction`, `KeyboardShortcut`, `shortcuts?` on `ConfigItem` |
| `src/shared/defaults.ts` | Add `DEFAULT_SHORTCUTS` |
| `src/renderer/components/Settings/SettingsDialog.tsx` | Tree node, panel routing, local state, save logic, new config defaults |
| `src/renderer/components/Settings/SettingsProvider.tsx` | Migration: apply defaults to configs missing `shortcuts` |
| `src/renderer/components/Layout.tsx` | Mount shortcut engine hook |

---

## Verification

1. Open Settings → "Keyboard Shortcuts" tree node appears and shows the two default shortcuts
2. An existing config loaded after migration shows default `Ctrl+Shift+R` / `Ctrl+Shift+S` shortcuts
3. Click "Add Shortcut" → new row appears; click key field, press `Ctrl+1` → shows `"Ctrl+1"`
4. Select "Switch to Scene" action, pick a scene from the dropdown → row updates
5. Save and close Settings. Press `Ctrl+1` while in the main tiles view → OBS switches scene
6. Open Settings dialog → press `Ctrl+Shift+R` → shortcut does **not** fire (dialog suppression)
7. Typing in text/input fields does **not** trigger shortcuts (focus guard)
8. Shortcuts save to `config.json` and reload correctly after app restart (Electron)

---

## Further Considerations

1. **Conflict detection**: Two shortcuts with the same `keys` string currently both fire. A warning indicator in the row could be added later — excluded from MVP scope.
2. **`sceneItemName` resolution**: The panel stores `sceneItemName` (human-readable `sourceName`). The runtime hook resolves it to `sceneItemId` via a fresh `getSceneItemList` call each trigger — robust across sessions but adds one async call per toggle-scene-item trigger.
