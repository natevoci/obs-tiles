import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

// ============================================================================
// Provider
// ============================================================================

export const sceneImage = (obs: ConnectionPublic, {
	scene,
	tileSize,
	refreshTime = 1000,
}: { scene: string; tileSize: number; refreshTime?: number }) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined
		let attached = true

		const fetchScreenshot = () => {
			if (obs.connected && obs.adapter) {
				if (!scene)
					return onChanged(null)
				
				obs.adapter.getSourceScreenshot(
					scene,
					'jpg',
					tileSize * 16,
					tileSize * 9
				).then((imageData) => {
					if (attached && imageData) {
						onChanged(imageData)
						timeout = setTimeout(fetchScreenshot, refreshTime)
					}
				}).catch((err) => {
					console.error(`Error loading snapshot`, {
						connection: obs.name,
						scene,
					}, err)
					onChanged(null)
				})
			}
		}

		fetchScreenshot()

		return () => {
			if (timeout) {
				clearTimeout(timeout)
				attached = false
			}
		}
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get a screenshot/thumbnail of a scene or source
 */
export const useSceneImage = (
	obs: ConnectionPublic,
	args: { scene: string; tileSize: number; refreshTime?: number }
): string | null | undefined => {
	return obs.useDataProvider('sceneImage', args)
}
