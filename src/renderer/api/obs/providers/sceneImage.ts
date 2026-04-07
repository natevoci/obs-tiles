import React from 'react'
import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { decodeAndDraw } from '~/util/decodeAndDraw'

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
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

/**
 * Polls OBS for scene/source thumbnails and draws directly onto a canvas,
 * bypassing React state for image data entirely. Returns a canvasRef to attach
 * to a <canvas> element and a hasFrame boolean for initial visibility control.
 */
export const useSceneCanvas = (
	obs: ConnectionPublic,
	{ scene, tileSize, refreshTime = 1000 }: { scene: string; tileSize: number; refreshTime?: number }
): { canvasRef: React.RefObject<HTMLCanvasElement>; hasFrame: boolean } => {
	const canvasRef = React.useRef<HTMLCanvasElement>(null)
	const [hasFrame, setHasFrame] = React.useState(false)
	const hasFrameRef = React.useRef(false)

	React.useEffect(() => {
		hasFrameRef.current = false
		setHasFrame(false)

		if (!obs.connected || !obs.adapter || !scene) return

		let attached = true
		let timeout: ReturnType<typeof setTimeout> | undefined

		const fetchAndDraw = () => {
			if (!attached || !obs.adapter) return
			obs.adapter.getSourceScreenshot(scene, 'jpg', tileSize * 16, tileSize * 9)
				.then(imageData => {
					if (!attached || !imageData) return
					const canvas = canvasRef.current
					if (!canvas) return
					return decodeAndDraw(imageData, canvas).then(() => {
						if (!attached) return
						if (!hasFrameRef.current) {
							hasFrameRef.current = true
							setHasFrame(true)
						}
						timeout = setTimeout(fetchAndDraw, refreshTime)
					})
				})
				.catch(() => {
					if (attached) timeout = setTimeout(fetchAndDraw, refreshTime)
				})
		}

		fetchAndDraw()

		return () => {
			attached = false
			if (timeout) clearTimeout(timeout)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [obs.connected, scene, tileSize, refreshTime])

	return { canvasRef, hasFrame }
}
