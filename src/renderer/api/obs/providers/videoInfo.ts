import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

export const videoInfo = (obs: ConnectionPublic, {
	refreshTime = 60000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined

		const fetchVideoSettings = () => {
			if (obs.adapter) {
				obs.adapter.getVideoSettings().then((videoData) => {
					onChanged(videoData)
					timeout = setTimeout(fetchVideoSettings, refreshTime)
				})
			}
		}

		fetchVideoSettings()

		return () => {
			if (timeout) {
				clearTimeout(timeout)
			}
		}
	}
})
