import { useObs, useCurrentScene, useTransition, useSceneCanvas, useSceneList } from '~/api/obs'
import { TileWrapper, TileCanvasElement, StyledCircularProgress } from './TileWrapper'
import { CheckboxTile } from './CheckboxTile'
import type { SceneButtonTileConfig } from './Tiles';
import { resolveScenePlaceholder, SCENE_PLACEHOLDER_PREVIEW, SCENE_PLACEHOLDER_PROGRAM } from './scenePlaceholders.ts'

// Legacy exports for backwards compatibility (deprecated - use TileWrapper instead)
export { TileWrapper as SceneWrapper } from './TileWrapper'
export { StyledCircularProgress } from './TileWrapper'

export const SceneButton = ({
	connection,
	scene,
	title,
	tileSize = '10',
	fontSize,
	activeRefreshTime,
	inactiveRefreshTime,
	viewType = 'preview',
}: SceneButtonTileConfig) => {
	const tileSizeInt = parseInt(String(tileSize));
	const labelFontSize = parseInt(String(fontSize ?? tileSize));

	const obs = useObs({ connection })

	const currentScene = useCurrentScene(obs)
	const sceneList = useSceneList(obs)
	const resolvedScene = resolveScenePlaceholder(scene, sceneList)
	const defaultLabel =
		scene === SCENE_PLACEHOLDER_PROGRAM
			? 'Program'
			: scene === SCENE_PLACEHOLDER_PREVIEW
				? 'Preview'
				: (resolvedScene || scene)
	
	const transition = useTransition(obs)
	
	const isPrevScene = currentScene?.name === resolvedScene && transition?.fromSceneName === resolvedScene
	const isCurrentScene = transition?.toSceneName === resolvedScene || currentScene?.name === resolvedScene

	// Suppress the selection overlay when this tile is configured to show the live
	// program or preview scene - those tiles act as monitors, not scene-switchers,
	// so a permanent glow would be misleading.
	const isProgramScene = scene === SCENE_PLACEHOLDER_PROGRAM
	const isPreviewScene = scene === SCENE_PLACEHOLDER_PREVIEW
	const suppressOverlay = isProgramScene || isPreviewScene
	
	const { canvasRef, hasFrame } = useSceneCanvas(obs, {
		scene: resolvedScene,
		tileSize: Math.min(tileSizeInt, 20),
		refreshTime: isCurrentScene ? (activeRefreshTime ?? 400) : (inactiveRefreshTime ?? 1000),
	})

	const handleClick = () => {
		if (obs.connected) {
			if (resolvedScene) {
				obs.action('setCurrentScene', { scene: resolvedScene })
			}
		} else {
			obs.reconnect()
		}
	}

	const overlay = !obs.connected ? (
		<>
			{obs.failedConnection ?? 'Connecting...'}
			{obs.connecting ? <StyledCircularProgress /> : null}
		</>
	) : null

	if (viewType === 'checkbox') {
		return (
			<CheckboxTile
				size={tileSizeInt}
				fontSize={labelFontSize}
				label={title ?? defaultLabel}
				checked={isCurrentScene}
				eventHandlers={{ onClick: handleClick }}
			/>
		)
	}

	return (
		<TileWrapper
			size={tileSizeInt}
			fontSize={labelFontSize}
			label={title ?? defaultLabel}
			onClick={handleClick}
			isSelected={!suppressOverlay && (isCurrentScene || isPrevScene)}
			isDeselecting={!suppressOverlay && isPrevScene}
			elementType='SceneWrapper'
			overlay={overlay}
		>
			<TileCanvasElement ref={canvasRef} $size={tileSizeInt} $visible={hasFrame} />
		</TileWrapper>
	)
}
