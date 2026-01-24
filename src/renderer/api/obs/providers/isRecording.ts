import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'
import { ConnectionPublic } from '../types'

export const isRecording = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		const setData = (data: string) => {
			onChanged({
				isStarted: data === 'started',
				isStopped: data === 'stopped',
				isStarting: data === 'starting',
				isStopping: data === 'stopping',
				isLoading: !data,
			})
		}

		obs.send('GetStreamingStatus', {}, (data: any) => {
			const normalized = camelCaseKeys(data)
			setData(normalized.recording ? 'started' : 'stopped')
		})
		obs.on('RecordingStarting', () => {
			setData('starting')
		})
		obs.on('RecordingStarted', () => {
			setData('started')
		})
		obs.on('RecordingStopping', () => {
			setData('stopping')
		})
		obs.on('RecordingStopped', () => {
			setData('stopped')
		})
		setData('')
	},
})
