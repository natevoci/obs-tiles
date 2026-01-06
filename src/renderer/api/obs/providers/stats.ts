import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'

export const stats = (obs: any, {
	refreshTime = 3000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined
		const fn = () => {
			obs.send('GetStats', {}, (data: any) => {
				const normalized = camelCaseKeys(data)
				onChanged(normalized.stats)
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
