import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface InputVolumeMeterData {
	/** Peak level for each channel (0.0 to 1.0) */
	inputLevelsMul: number[][]
}

// ============================================================================
// Provider
// ============================================================================

/**
 * Provider for real-time input volume meters.
 * 
 * NOTE: This provider receives high-frequency updates (~50ms intervals).
 * To avoid React re-render overhead, use the onMeterUpdate callback directly
 * instead of relying on state updates.
 * 
 * v5 only - v4 does not support volume meters.
 */
export const inputVolumeMeters = (obs: ConnectionPublic, {
	inputName,
	onMeterUpdate,
}: { 
	inputName: string
	/** Direct callback for high-performance meter updates (bypasses React state) */
	onMeterUpdate?: (levels: number[][]) => void
}) => createProvider({
	init: (onChanged) => {
		// Only v5 supports InputVolumeMeters event
		if (obs.apiVersion !== 5) {
			console.debug('[inputVolumeMeters] Volume meters not supported in v4')
			onChanged({ inputLevelsMul: [] })
			return
		}

		// Listen for volume meter updates
		obs.adapter?.on('InputVolumeMeters', (data: any) => {
			const inputs = data.inputs as Array<{
				inputName: string
				inputLevelsMul: number[][]
			}>
			
			const input = inputs?.find(i => i.inputName === inputName)
			if (input) {
				// High-performance path: call the callback directly
				if (onMeterUpdate) {
					onMeterUpdate(input.inputLevelsMul)
				}
				
				// Also update state for components that use the hook
				// Note: This may cause performance issues if used heavily
				onChanged({ inputLevelsMul: input.inputLevelsMul })
			}
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get real-time volume meter data for an input.
 * 
 * WARNING: This hook updates very frequently (~20x per second).
 * For better performance, use the onMeterUpdate callback parameter
 * to receive updates directly and update DOM via refs.
 * 
 * v5 only - returns empty data for v4 connections.
 */
export const useInputVolumeMeters = (
	obs: ConnectionPublic,
	args: { 
		inputName: string
		onMeterUpdate?: (levels: number[][]) => void
	}
): InputVolumeMeterData | undefined => {
	return obs.useDataProvider('inputVolumeMeters', args)
}
