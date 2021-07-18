import React from 'react';

import { useObs } from '/src/api/obs';

import {
	SceneWrapper,
	SelectionIndicator,
	Connecting,
	StyledCircularProgress,
	StyledImg,
	ImgOverlay,
	Paragraph,
} from './SceneButton';

export const SceneItemButton = ({
	connection,
	sceneItem: {
		title,
		scene,
		item,
	},
	tileSize = '10',
}) => {
	const size = parseInt(tileSize);

	const obs = useObs({ connection });

	const sceneItemProperties = obs.useDataProvider('sceneItemProperties', {
		scene,
		item,
	});
	
	const isCurrentScene = sceneItemProperties?.visible;
	
	const imageData = obs.useDataProvider('sceneImage', {
		scene: item,
		tileSize: Math.min(size, 20),
		refreshTime: isCurrentScene ? 40 : 100,
	});

	return (
		<>
			<SelectionIndicator
				data-elementtype='SelectionIndicator'
				$isVisible={isCurrentScene}
			/>
			<SceneWrapper
				data-elementtype='SceneWrapper'
				$isCurrentScene={isCurrentScene}
				onClick={() => {
					if (obs.connected) {
						obs.send('SetSceneItemProperties', {
							'scene-name': scene,
							'item': item,
							visible: !sceneItemProperties?.visible,
						});
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
				<Paragraph>{title ?? item}</Paragraph>
			</SceneWrapper>
		</>
	);
};
