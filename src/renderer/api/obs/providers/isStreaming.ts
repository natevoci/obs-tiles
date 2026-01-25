import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { StreamStateChangedEvent } from '../abstraction/types'

export const isStreaming = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		const setData = (state: string) => {
			onChanged({
				isStarted: state === 'started',
				isStopped: state === 'stopped',
				isStarting: state === 'starting',
				isStopping: state === 'stopping',
				isLoading: !state,
			})
		}

		// Get initial status
		if (obs.adapter) {
			obs.adapter.getStreamStatus().then((status) => {
				setData(status.outputActive ? 'started' : 'stopped')
			}).catch(() => {
				setData('stopped')
			})
		}

		// Unified event name
		obs.on('StreamStateChanged', (data: StreamStateChangedEvent) => {
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
			}
		})

		setData('')
	},
})
