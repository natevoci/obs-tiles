import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface InputVolumeData {
	inputVolumeMul: number
	inputVolumeDb: number
}

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
export const inputVolume = (obs: ConnectionPublic, {
	inputName,
}: { inputName: string }) => createProvider({
	init: (onChanged) => {
		const fetchInputVolume = () => {
			if (obs.adapter) {
				obs.adapter.getInputVolume(inputName).then((data) => {
					onChanged({
						inputVolumeMul: data.inputVolumeMul,
						inputVolumeDb: data.inputVolumeDb,
					})
				}).catch((err) => {
					console.error(`[inputVolume] Failed to get volume for ${inputName}:`, err)
				})
			}
		}

		fetchInputVolume()

		// Listen for volume changes
		obs.adapter?.on('InputVolumeChanged', (data: any) => {
			if (data.inputName === inputName) {
				onChanged({
					inputVolumeMul: data.inputVolumeMul,
					inputVolumeDb: data.inputVolumeDb,
				})
			}
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get the volume of an input
 */
export const useInputVolume = (
	obs: ConnectionPublic,
	args: { inputName: string }
): InputVolumeData | undefined => {
	return obs.useDataProvider('inputVolume', args)
}
