import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

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
