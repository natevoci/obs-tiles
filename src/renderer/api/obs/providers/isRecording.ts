import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { RecordStateChangedEvent } from '../abstraction/types'

// ============================================================================
// Types
// ============================================================================

export interface RecordingState {
	isStarted: boolean
	isStopped: boolean
	isStarting: boolean
	isStopping: boolean
	isPaused: boolean
	isLoading: boolean
}

// ============================================================================
// Provider
// ============================================================================

export const isRecording = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		const setData = (state: string) => {
			onChanged({
				isStarted: state === 'started',
				isStopped: state === 'stopped',
				isStarting: state === 'starting',
				isStopping: state === 'stopping',
				isPaused: state === 'paused',
				isLoading: !state,
			})
		}

		// Get initial status
		if (obs.adapter) {
			obs.adapter.getRecordStatus().then((status) => {
				if (status.outputPaused) {
					setData('paused')
				} else {
					setData(status.outputActive ? 'started' : 'stopped')
				}
			}).catch(() => {
				setData('stopped')
			})
		}

		// Unified event name
		obs.on('RecordStateChanged', (data: RecordStateChangedEvent) => {
			switch (data.outputState) {
				case 'OBS_WEBSOCKET_OUTPUT_STARTING':
					setData('starting')
					break
				case 'OBS_WEBSOCKET_OUTPUT_STARTED':
					setData('started')
					break
				case 'OBS_WEBSOCKET_OUTPUT_STOPPING':
					setData('stopping')
					break
				case 'OBS_WEBSOCKET_OUTPUT_STOPPED':
					setData('stopped')
					break
				case 'OBS_WEBSOCKET_OUTPUT_PAUSED':
					setData('paused')
					break
				case 'OBS_WEBSOCKET_OUTPUT_RESUMED':
					setData('started')
					break
			}
		})

		setData('')
	},
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get recording state
 */
export const useIsRecording = (obs: ConnectionPublic): RecordingState => {
	return obs.useDataProvider('isRecording')
}
