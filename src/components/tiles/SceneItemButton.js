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
	
	const sceneItemId = obs.v4 ? sceneItemProperties?.itemId : sceneItemProperties?.sceneItemId;
	const isVisible = obs.v4 ? sceneItemProperties?.visible : sceneItemProperties?.sceneItemEnabled;

	const sceneList = obs.useDataProvider('sceneList');
	const sceneItemListV4 = sceneList?.scenes?.[scene]?.sources;
	const sceneItemListV5 = obs.useDataProvider('sceneItemList', { scene });
	const sceneItemList = obs.v4 ? sceneItemListV4 : sceneItemListV5;
	const visibleSceneItems = sceneItemList?.filter?.(item => obs.v4 ? item.render : item.sceneItemEnabled);
	const isSelected = click === 'moveToTop' ? (
		sceneItemId && visibleSceneItems?.length && sceneItemId === (obs.v4 ? visibleSceneItems?.[0]?.id : visibleSceneItems?.[0]?.sceneItemId)
	) : isVisible;
	
	const imageData = obs.useDataProvider('sceneImage', {
		scene: item,
		tileSize: Math.min(size, 20),
		refreshTime: isSelected ? 40 : 100,
	});


	const handlers = React.useMemo(
		() => ({
			toggleVisible: () => {
				if (obs.connected) {
					if (obs.v4) {
						obs.send('SetSceneItemProperties', {
							'scene-name': scene,
							item,
							visible: !sceneItemProperties?.visible,
						});
					}
					else {
						obs.send('SetSceneItemEnabled', {
							'sceneName': scene,
							'sceneItemId': sceneItemId,
							'sceneItemEnabled': !isVisible,
						});
					}
				}
				else {
					obs.reconnect();
				}
			},
			moveToTop: () => {
				if (obs.v4) {
					const items = sceneItemList
						.filter((item) => item.id !== sceneItemId)
						.map((item) => ({ id: item.id }));
	
					const insertPosition = 0;
					items.splice(insertPosition, 0, { id: sceneItemId });
	
					obs.send('ReorderSceneItems', {
						scene,
						items,
					});
				}
				else {
					obs.send('SetSceneItemIndex', {
						sceneName: scene,
						sceneItemId: sceneItemId,
						sceneItemIndex: sceneItemList.length - 1,
					});
				}
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
