import React from 'react';
import { useObs, useSceneItemProperties, useSceneItemList, useSceneImage } from '~/api/obs';
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
import type { SceneItemButtonTileConfig } from './Tiles';

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
}: SceneItemButtonTileConfig) => {
	const size = parseInt(String(tileSize));
	
	const obs = useObs({ connection });

	const sceneItemProperties = useSceneItemProperties(obs, { scene, item });
	const sceneItemId = sceneItemProperties?.sceneItemId;
	const isVisible = sceneItemProperties?.sceneItemEnabled ?? false;

	const sceneItemList = useSceneItemList(obs, { scene });
	const visibleSceneItems = sceneItemList?.filter((item) => item.sceneItemEnabled);
	const isSelected = click === 'moveToTop'
		? Boolean(sceneItemId && visibleSceneItems?.length && sceneItemId === visibleSceneItems[0]?.sceneItemId)
		: isVisible;

	const imageData = useSceneImage(obs, {
		scene: item,
		tileSize: Math.min(size, 20),
		refreshTime: isSelected ? 40 : 100,
	});

	const handlers = React.useMemo(
		() => ({
			toggleVisible: async () => {
				if (obs.connected && obs.adapter && sceneItemId !== undefined) {
					await obs.adapter.setSceneItemEnabled(
						scene,
						sceneItemId,
						!sceneItemProperties?.sceneItemEnabled
					)
				}
				else if (!obs.connected) {
					obs.reconnect()
				}
			},
			moveToTop: async () => {
				if (!obs.adapter || !sceneItemList || sceneItemId === undefined) return
				
				// In v5, higher index = closer to front/top
				// Move to the highest index to bring to front
				const topIndex = sceneItemList.length - 1
				await obs.adapter.setSceneItemIndex(scene, sceneItemId, topIndex)
			},
		}),
		[scene, item, sceneItemList, sceneItemProperties, sceneItemId, obs],
	)

	const buttonEventListeners = useClickHandler({
		clickAction: click,
		longPressAction: longPress,
		handlers,
		delay: 600,
	})

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
					src={imageData ?? undefined}
					$size={size}
				/>
				<ImgOverlay
					$size={size}
				/>
				<Paragraph>{title ?? item}</Paragraph>
			</SceneWrapper>
		</>
	)
}
