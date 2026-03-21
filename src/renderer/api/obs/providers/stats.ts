import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { Stats } from '../abstraction/types'

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
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

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get OBS stats (CPU, memory, FPS, etc.)
 */
export const useStats = (
	obs: ConnectionPublic,
	args?: { refreshTime?: number }
): Stats | undefined => {
	return obs.useDataProvider('stats', args)
}
