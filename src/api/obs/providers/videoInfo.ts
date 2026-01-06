import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'

export const videoInfo = (obs: any, {
	refreshTime = 60000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined
		const fn = () => {
			obs.send('GetVideoInfo', {}, (data: any) => {
				const normalized = camelCaseKeys(data)
				onChanged(normalized)
				timeout = setTimeout(fn, refreshTime)
			})
		}

		fn()

		return () => {
			if (timeout) {
				clearTimeout(timeout)
			}
		}
	}
})
