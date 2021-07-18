import { createProvider } from '../createProvider';

export const sceneItemProperties = (
	obs,
	{
		scene,
		item,
	},
) => createProvider({
	init: (onChanged) => {
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
		obs.on('SceneItemVisibilityChanged', data => {
			fetchProperties();
		});
		obs.on('SceneItemLockChanged', data => {
			fetchProperties();
		});
		obs.on('SceneItemTransformChanged', data => {
			fetchProperties();
		});
	}
});
