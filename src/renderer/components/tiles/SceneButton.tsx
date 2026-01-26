import styled from 'styled-components'
import { CircularProgress } from '@material-ui/core'

import { useObs, useCurrentScene, useTransition, useSceneImage } from '~/api/obs'

export const SceneWrapper = styled.div`
	display: flex;
	flex-direction: column;
	position: relative;
	align-items: center;
	color: ${p => p.theme.sceneText};
	background-color: ${p => p.theme.sceneBackground};
`

interface SelectionIndicatorProps {
	$isSelected: boolean
	$isDeselecting?: boolean
}

export const SelectionIndicator = styled.div<SelectionIndicatorProps>`
	position: absolute;
	width: 100%;
	height: 100%;
	border: 1px solid ${p => p.theme.sceneBorder};
	box-shadow: 0 0 15px 10px ${p => p.theme.selectionHighlight};
	opacity: ${p => !p.$isSelected ? 0.0 : p.$isDeselecting ? 0.6 : 1.0};
	z-index: ${p => !p.$isSelected || p.$isDeselecting ? 5 : 10};
	pointer-events: none;
	transition: box-shadow 0.25s ease-in-out 0s, opacity 0.5s ease-in-out 0s;
`

interface TextOverlayProps {
	$size: number
}

export const TextOverlay = styled.div<TextOverlayProps>`
	position: absolute;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	font-size: ${p => p.theme.fontSize.small};

	> p:not(:first-child) {
		margin-top: ${p => p.theme.fontSize.small};
	}
`

export const StyledCircularProgress = styled(CircularProgress)`
	z-index: 10;
`

interface StyledImgProps {
	$size: number
}

export const StyledImg = styled.img<StyledImgProps>`
	display: block;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	opacity: 0;
	&[src] {
		opacity: 1;
	}
`

interface ImgOverlayProps {
	$size: number
}

export const ImgOverlay = styled.div<ImgOverlayProps>`
	position: absolute;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	box-shadow: inset 0 -7px 3px -5px ${p => p.theme.sceneTextBackground};
`

export const Paragraph = styled.p`
	text-align: center;
	font-size: ${p => p.theme.fontSize.large};
	width: 100%;
	background-color: ${p => p.theme.sceneTextBackground};
`

interface SceneButtonProps {
	connection?: string
	scene: string
	title?: string
	tileSize?: string
}

export const SceneButton = ({
	connection,
	scene,
	title,
	tileSize = '10',
}: SceneButtonProps) => {
	const size = parseInt(tileSize)

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

	return (
		<>
			<SelectionIndicator
				data-elementtype='SelectionIndicator'
				$isSelected={isCurrentScene || isPrevScene}
				$isDeselecting={isPrevScene}
			/>
			<SceneWrapper
				data-elementtype='SceneWrapper'
				onClick={() => {
					if (obs.connected) {
						obs.action('setCurrentScene', {scene})
					}
					else {
						obs.reconnect()
					}
				}}
			>
				<TextOverlay
					$size={size}
				>
					{!obs.connected ? (
						<>
							{obs.failedConnection ?? 'Connecting...'}
							{obs.connecting ? (
								<StyledCircularProgress />
							) : null}
						</>
					) : null}
				</TextOverlay>
				<StyledImg
					src={imageData ?? undefined}
					$size={size}
				/>
				<ImgOverlay
					$size={size}
				/>
				<Paragraph>{title ?? scene}</Paragraph>
			</SceneWrapper>
		</>
	)
}
