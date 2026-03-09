import { useObs, useCurrentScene, useTransition, useSceneImage, useSceneList } from '~/api/obs'
import { TileWrapper, TileImage, StyledCircularProgress } from './TileWrapper'
import { CheckboxTile } from './CheckboxTile'
import type { SceneButtonTileConfig } from './Tiles';

// Legacy exports for backwards compatibility (deprecated - use TileWrapper instead)
export { TileWrapper as SceneWrapper } from './TileWrapper'
export { StyledCircularProgress } from './TileWrapper'

export const SceneButton = ({
	connection,
	scene,
	title,
	tileSize = '10',
	viewType = 'preview',
}: SceneButtonTileConfig) => {
	const size = parseInt(String(tileSize));

	const obs = useObs({ connection })

	const currentScene = useCurrentScene(obs)
	const sceneList = useSceneList(obs)
	
	const transition = useTransition(obs)
	
	const isPrevScene = currentScene?.name === scene && transition?.fromSceneName === scene
	const isCurrentScene = transition?.toSceneName === scene || currentScene?.name === scene

	// Suppress the selection overlay when this tile is configured to show the live
	// program or preview scene — those tiles act as monitors, not scene-switchers,
	// so a permanent glow would be misleading.
	const isProgramScene = scene === sceneList?.currentScene
	const isPreviewScene = scene === sceneList?.currentPreviewSceneName
	const suppressOverlay = isProgramScene || isPreviewScene
	
	const imageData = useSceneImage(obs, {
		scene,
		tileSize: Math.min(size, 20),
		refreshTime: isCurrentScene ? 40 : 100,
	})

	const handleClick = () => {
		if (obs.connected) {
			obs.action('setCurrentScene', { scene })
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
				size={size}
				label={title ?? scene}
				checked={isCurrentScene}
				eventHandlers={{ onClick: handleClick }}
			/>
		)
	}

	return (
		<TileWrapper
			size={size}
			label={title ?? scene}
			onClick={handleClick}
			isSelected={!suppressOverlay && (isCurrentScene || isPrevScene)}
			isDeselecting={!suppressOverlay && isPrevScene}
			elementType='SceneWrapper'
			overlay={overlay}
		>
			<TileImage src={imageData ?? undefined} $size={size} />
		</TileWrapper>
	)
}
