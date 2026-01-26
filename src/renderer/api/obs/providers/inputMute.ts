import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface InputMuteData {
	inputMuted: boolean
}

// ============================================================================
// Provider
// ============================================================================

export const inputMute = (obs: ConnectionPublic, {
	inputName,
}: { inputName: string }) => createProvider({
	init: (onChanged) => {
		const fetchInputMute = () => {
			if (obs.adapter) {
				obs.adapter.getInputMute(inputName).then((data) => {
					onChanged({
						inputMuted: data.inputMuted,
					})
				}).catch((err) => {
					console.error(`[inputMute] Failed to get mute state for ${inputName}:`, err)
				})
			}
		}

		fetchInputMute()

		// Listen for mute state changes
		obs.adapter?.on('InputMuteStateChanged', (data: any) => {
			if (data.inputName === inputName) {
				onChanged({
					inputMuted: data.inputMuted,
				})
			}
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get the mute state of an input
 */
export const useInputMute = (
	obs: ConnectionPublic,
	args: { inputName: string }
): InputMuteData | undefined => {
	return obs.useDataProvider('inputMute', args)
}
