import { useObs, useCurrentScene, useTransition, useSceneImage } from '~/api/obs'
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
	
	const transition = useTransition(obs)
	
	const isPrevScene = currentScene?.name === scene && transition?.fromSceneName === scene
	const isCurrentScene = transition?.toSceneName === scene || currentScene?.name === scene
	
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
			isSelected={isCurrentScene || isPrevScene}
			isDeselecting={isPrevScene}
			elementType='SceneWrapper'
			overlay={overlay}
		>
			<TileImage src={imageData ?? undefined} $size={size} />
		</TileWrapper>
	)
}
