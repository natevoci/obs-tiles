import React from 'react';
import styled, { css } from 'styled-components';
import { CircularProgress } from '@material-ui/core';

import { useObs } from '~/src/api/obs';

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
	opacity: ${p => !p.$isVisible ? 0.0 : p.$isPrevScene ? 0.6 : 1.0};
	z-index: ${p => !p.$isVisible || p.$isPrevScene ? 5 : 10};
	pointer-events: none;
	transition: box-shadow 0.25s ease-in-out 0s, opacity 0.5s ease-in-out 0s;
`;

export const Connecting = styled.p`
	position: absolute;
	text-align: center;
	font-size: ${p => p.theme.fontSize.small};
	top: 20%;
`;

export const StyledCircularProgress = styled(CircularProgress)`
	position: absolute;
	top: 40%;
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
	
	const isPrevScene = currentScene === scene && transition?.fromScene === scene;
	const isCurrentScene = transition?.toScene === scene || currentScene === scene;
	
	const imageData = obs.useDataProvider('sceneImage', {
		scene,
		tileSize: Math.min(size, 20),
		refreshTime: isCurrentScene ? 40 : 100,
	});

	return (
		<>
			<SelectionIndicator
				data-elementtype='SelectionIndicator'
				$isVisible={isCurrentScene || isPrevScene}
				$isPrevScene={isPrevScene}
			/>
			<SceneWrapper
				data-elementtype='SceneWrapper'
				$isCurrentScene={isCurrentScene || isPrevScene}
				$isPrevScene={isPrevScene}
				onClick={() => {
					if (obs.connected) {
						obs.action('setCurrentScene', {scene});
					}
					else {
						obs.reconnect();
					}
				}}
				>
				{!obs.connected ? (
					<>
						<Connecting>{obs.failedConnection ?? 'Connecting...'}</Connecting>
						{obs.connecting ? (
							<StyledCircularProgress />
						) : null}
					</>
				) : null}
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
