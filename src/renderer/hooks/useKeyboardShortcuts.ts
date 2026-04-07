import React from 'react'
import { buildComboString } from '../components/Settings/KeyCaptureInput'
import {
	startStopRecording,
	startStopStreaming,
	setCurrentScene,
	toggleSceneItemEnabled,
} from '../api/obs/actions'
import type { ConnectionPublic } from '../api/obs/types'
import type { KeyboardShortcut } from '../../shared/types'

/**
 * Registers a global keydown listener that fires OBS actions for matching
 * keyboard shortcuts. Shortcuts are config-scoped and completely independent
 * of the tile layout — they work even if no matching tile exists.
 *
 * Guards:
 *  - No dispatch while any MUI dialog (role="dialog") is open
 *  - No dispatch while focus is inside an <input> or <textarea>
 */
export const useKeyboardShortcuts = (
	shortcuts: KeyboardShortcut[],
	obs: ConnectionPublic,
): void => {
	// Keep a stable ref so the event listener always sees the current shortcuts/obs
	// without needing to be re-registered on every render.
	const shortcutsRef = React.useRef(shortcuts)
	const obsRef = React.useRef(obs)
	shortcutsRef.current = shortcuts
	obsRef.current = obs

	React.useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Guard: suppress while any dialog is open (e.g. Settings)
			if (document.querySelector('[role="dialog"]')) return

			// Guard: suppress while typing in a text field
			const active = document.activeElement
			if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return

			const combo = buildComboString(e)
			if (!combo) return

			const matched = shortcutsRef.current.find((s) => s.keys === combo)
			if (!matched) return

			// Prevent default browser behaviour for the combo (e.g. Ctrl+S = save page)
			e.preventDefault()

			const currentObs = obsRef.current
			const { action } = matched

			switch (action.type) {
				case 'toggleRecording':
					startStopRecording(currentObs)()
					break

				case 'toggleStreaming':
					startStopStreaming(currentObs)()
					break

				case 'switchScene':
					setCurrentScene(currentObs)({ scene: action.sceneName })
					break

				case 'toggleSceneItem': {
					const { sceneName, sceneItemName } = action
					if (!currentObs.adapter) break
					currentObs.adapter.getSceneItemList(sceneName).then((items) => {
						const item = items.find((it) => it.sourceName === sceneItemName)
						if (!item) return
						toggleSceneItemEnabled(currentObs)({
							scene: sceneName,
							sceneItemId: item.sceneItemId,
							currentEnabled: item.sceneItemEnabled ?? true,
						})
					})
					break
				}

				case 'toggleAudioMute':
					currentObs.adapter?.toggleInputMute(action.inputName)
					break
			}
		}

		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, []) // runs once; current values accessed via refs
}
