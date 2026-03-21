import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { VideoSettings } from '../abstraction/types'

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
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

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get video settings (resolution, FPS)
 */
export const useVideoInfo = (
	obs: ConnectionPublic,
	args?: { refreshTime?: number }
): VideoSettings | undefined => {
	return obs.useDataProvider('videoInfo', args)
}
