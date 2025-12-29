import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

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
					const normalized = camelCaseKeys(data);
					onChanged(normalized);
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
});
