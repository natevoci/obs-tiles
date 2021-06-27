import React from 'react';
import styled, { css } from 'styled-components';

import { useObsWebsocket } from '~/api';

const SceneWrapper = styled.div`
	display: block;
	position: relative;
	align-items: center;
	color: ${p => p.theme.sceneText};
	background-color: ${p => p.theme.sceneBackground};
`;

const SelectionIndicator = styled.div`
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

const StyledImg = styled.img`
	display: block;
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
	opacity: 0;
	&[src] {
		opacity: 1;
	}
`;

const Paragraph = styled.p`
	text-align: center;
	font-size: ${p => p.theme.fontSize.large};
	background-color: #474a23;
`;

export const SceneButton = ({
	scene,
	tileSize = '10',
	connection,
}) => {
	const size = parseInt(tileSize);

	const obs = useObsWebsocket({ connection });

	const currentScene = obs.useCurrentScene();
	
	const transition = obs.useTransition();
	
	const isPrevScene = currentScene === scene && transition?.fromScene === scene;
	const isCurrentScene = transition?.toScene === scene || currentScene === scene;
	
	const imageData = obs.useSceneImage({
		scene,
		tileSize: Math.min(size, 20),
		refreshTime: isCurrentScene ? 200 : 5000,
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
				onClick={() => obs.setCurrentScene({scene})}
			>
				<StyledImg
					src={imageData}
					$size={size}
				/>
				<Paragraph>{scene}</Paragraph>
			</SceneWrapper>
		</>
	);
};
