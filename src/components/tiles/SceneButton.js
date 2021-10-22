import React from 'react';
import styled from 'styled-components';
import { CircularProgress } from '@material-ui/core';

import { useObs } from '~/api/obs';

export const SceneWrapper = styled.div`
	display: flex;
	flex-direction: column;
	position: relative;
	align-items: center;
	color: ${p => p.theme.sceneText};
	background-color: ${p => p.theme.sceneBackground};
`;

export const SelectionIndicator = styled.div`
	position: absolute;
	width: 100%;
	height: 100%;
	border: 1px solid ${p => p.theme.sceneBorder};
	box-shadow: 0 0 15px 10px ${p => p.theme.selectionHighlight};
	opacity: ${p => !p.$isSelected ? 0.0 : p.$isDeselecting ? 0.6 : 1.0};
	z-index: ${p => !p.$isSelected || p.$isDeselecting ? 5 : 10};
	pointer-events: none;
	transition: box-shadow 0.25s ease-in-out 0s, opacity 0.5s ease-in-out 0s;
`;

export const TextOverlay = styled.div`
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
`;

export const StyledCircularProgress = styled(CircularProgress)`
	z-index: 10;
`;

export const StyledImg = styled.img`
	display: block;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	opacity: 0;
	&[src] {
		opacity: 1;
	}
`;

export const ImgOverlay = styled.div`
	position: absolute;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	box-shadow: inset 0 -7px 3px -5px ${p => p.theme.sceneTextBackground};
`;

export const Paragraph = styled.p`
	text-align: center;
	font-size: ${p => p.theme.fontSize.large};
	width: 100%;
	background-color: ${p => p.theme.sceneTextBackground};
`;

export const SceneButton = ({
	connection,
	scene,
	title,
	tileSize = '10',
}) => {
	const size = parseInt(tileSize);

	const obs = useObs({ connection });

	const currentScene = obs.useDataProvider('currentScene');
	
	const transition = obs.useDataProvider('transition');
	
	const isPrevScene = currentScene?.name === scene && transition?.fromScene === scene;
	const isCurrentScene = transition?.toScene === scene || currentScene?.name === scene;
	
	const imageData = obs.useDataProvider('sceneImage', {
		scene,
		tileSize: Math.min(size, 20),
		refreshTime: isCurrentScene ? 40 : 100,
	});

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
						obs.action('setCurrentScene', {scene});
					}
					else {
						obs.reconnect();
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
					src={imageData}
					$size={size}
				/>
				<ImgOverlay
					$size={size}
				/>
				<Paragraph>{title ?? scene}</Paragraph>
			</SceneWrapper>
		</>
	);
};
