import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'

export const sceneImage = (obs: any, {
	scene,
	tileSize,
	refreshTime = 1000,
}: { scene: string; tileSize: number; refreshTime?: number }) => createProvider({
	attach: (onChanged) => {
		let timeout: NodeJS.Timeout | undefined
		let attached = true
		const fn = () => {
			if (obs.connected) {
				obs.send(
					'TakeSourceScreenshot',
					{
						sourceName: scene,
						embedPictureFormat: 'jpg',
						width: tileSize*16,
						height: tileSize*9,
					},
					(data: any) => {
						const normalized = camelCaseKeys(data)
						if (attached && normalized.img) {
							onChanged(normalized.img)
							timeout = setTimeout(fn, refreshTime)
						}
					},
					(err: any) => {
						console.error(`Error loading snapshot`, {
							connection: obs.name,
							scene,
						}, err)
						onChanged(null)
					}
				)
			}
		}

		fn()

		return () => {
			if (timeout) {
				clearTimeout(timeout)
				attached = false
			}
		}
	}
})
