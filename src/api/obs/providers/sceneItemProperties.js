import { createProvider } from '../createProvider';

export const sceneItemProperties = (
	obs,
	{
		scene,
		item,
	},
) => createProvider({
	init: (onChanged) => {
		if (obs.v4) {
			const fetchProperties = () => {
				obs.send(
					'GetSceneItemProperties',
					{
						'scene-name': scene,
						'item': item,
					},
					data => {
						onChanged(data);
					},
				);
			} 
			fetchProperties();
			obs.on('SceneItemVisibilityChanged', () => {
				fetchProperties();
			});
			obs.on('SceneItemLockChanged', () => {
				fetchProperties();
			});
			obs.on('SceneItemTransformChanged', () => {
				fetchProperties();
			});
		}
		else {
			const fetchProperties = () => {
				obs.send('GetSceneItemList', {
					'sceneName': scene,
				}, ({sceneItems}) => {
					onChanged(sceneItems.find(data => data.sourceName === item));
				});
			} 
			fetchProperties();
			obs.on('SceneItemEnableStateChanged', () => {
				fetchProperties();
			});
			obs.on('SceneItemLockStateChanged', () => {
				fetchProperties();
			});
			obs.on('SceneItemTransformChanged', () => {
				fetchProperties();
			});
		}
	}
});
