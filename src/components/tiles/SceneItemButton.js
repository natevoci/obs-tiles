import React from 'react';

import { useObs } from '~/api/obs';

import {
	SceneWrapper,
	SelectionIndicator,
	TextOverlay,
	StyledCircularProgress,
	StyledImg,
	ImgOverlay,
	Paragraph,
} from './SceneButton';
import { useClickHandler } from './useClickHandler';

export const SceneItemButton = ({
	connection,
	sceneItem: {
		scene,
		item,
		click = 'toggleVisible',
		longPress = 'toggleVisible',
	},
	title,
	tileSize = '10',
}) => {
	const size = parseInt(tileSize);

	const obs = useObs({ connection });

	const sceneItemProperties = obs.useDataProvider('sceneItemProperties', {
		scene,
		item,
	});
	
	const sceneItemId = sceneItemProperties?.itemId;
	const isVisible = sceneItemProperties?.visible;

	const sceneList = obs.useDataProvider('sceneList');
	const sceneItemList = sceneList?.scenes?.[scene]?.sources;
	const visibleSceneItems = sceneItemList?.filter?.(item => item.render);
	const isSelected = click === 'moveToTop' ? (sceneItemId && visibleSceneItems?.length && sceneItemId === visibleSceneItems?.[0]?.id) : isVisible;
	
	const imageData = obs.useDataProvider('sceneImage', {
		scene: item,
		tileSize: Math.min(size, 20),
		refreshTime: isSelected ? 40 : 100,
	});


	const handlers = React.useMemo(
		() => ({
			toggleVisible: () => {
				if (obs.connected) {
					obs.send('SetSceneItemProperties', {
						'scene-name': scene,
						item,
						visible: !sceneItemProperties?.visible,
					});
				}
				else {
					obs.reconnect();
				}
			},
			moveToTop: () => {
				const items = sceneItemList
					.filter((item) => item.id !== sceneItemId)
					.map((item) => ({ id: item.id }));

				const insertPosition = 0;
				items.splice(insertPosition, 0, { id: sceneItemId });

				obs.send('ReorderSceneItems', {
					scene,
					items,
				});
			},
		}),
		[scene, item, sceneItemList, sceneItemProperties, sceneItemId],
	);

	const buttonEventListeners = useClickHandler({
		clickAction: click,
		longPressAction: longPress,
		handlers,
		delay: 600,
	});

	return (
		<>
			<SelectionIndicator
				data-elementtype='SelectionIndicator'
				$isSelected={isSelected}
			/>
			<SceneWrapper
				data-elementtype='SceneWrapper'
				{...buttonEventListeners}
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
					) : !isVisible ? (
						<>
							<p>Disabled</p>
							{click !== 'toggleVisible' && longPress === 'toggleVisible' ? (
								<p><em>Hold to enable</em></p>
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
				<Paragraph>{title ?? item}</Paragraph>
			</SceneWrapper>
		</>
	);
};
