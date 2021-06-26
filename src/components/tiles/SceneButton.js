import React from 'react';
import styled, { css } from 'styled-components';

import { useObsWebsocket } from '~/api';

const SceneWrapper = styled.div`
	display: block;
	position: relative;
	align-items: center;
	border: 1px solid ${p => p.theme.border};
	color: ${p => p.theme.sceneText};
	background-color: ${p => p.theme.sceneBackground};
`;

const SelectionIndicator = styled.div`
	position: absolute;
	width: 100%;
	height: 100%;
	box-shadow: 0 0 15px 10px ${p => p.theme.selectionHighlight};
	opacity: ${p => !p.$isVisible ? 0.0 : p.$isPrevScene ? 0.6 : 1.0};
	z-index: ${p => !p.$isVisible || p.$isPrevScene ? 5 : 10};
	pointer-events: none;
	transition: box-shadow 0.25s ease-in-out 0s, opacity 0.5s ease-in-out 0s;
`;

const StyledImg = styled.img`
	width: ${p => p.$size*16}px;
	height: ${p => p.$size*9}px;
`;

const Paragraph = styled.p`
	text-align: center;
`;

export const SceneButton = ({
	tile: {
		scene,
		size = '10',
	},
	connectionName,
}) => {
	const tileSize = parseInt(size);

	const obs = useObsWebsocket({ connectionName });

	const imageData = obs.useSceneImage({
		scene,
		tileSize,
	});

	const currentScene = obs.useCurrentScene();

	const transition = obs.useTransition();

	const isPrevScene = currentScene === scene && transition?.fromScene === scene;
	const isCurrentScene = transition?.toScene === scene || currentScene === scene;

	return (
		<>
			<SelectionIndicator
				$isVisible={isCurrentScene || isPrevScene}
				$isPrevScene={isPrevScene}
			/>
			<SceneWrapper
				data-elementtype='SceneWrapper'
				$currentScene={currentScene === scene}
				onClick={() => obs.setCurrentScene({scene})}
			>
				<StyledImg
					src={imageData}
					$size={tileSize}
				/>
				<Paragraph>{scene}</Paragraph>
			</SceneWrapper>
		</>
	);
};
