import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

export const stats = (obs: ConnectionPublic, {
	refreshTime = 3000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined

		const fetchStats = () => {
			if (obs.adapter) {
				obs.adapter.getStats().then((statsData) => {
					onChanged(statsData)
					timeout = setTimeout(fetchStats, refreshTime)
				})
			}
		}

		fetchStats()

		return () => {
			if (timeout) {
				clearTimeout(timeout)
			}
		}
	}
})
