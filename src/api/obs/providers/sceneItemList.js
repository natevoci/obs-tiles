import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const sceneItemList = (obs, {
	scene,
}) => createProvider({
	init: (onChanged) => {
		const fn = () => {
			obs.send(
				'GetSceneItemList',
				{
					sceneName: scene,
				},
				data => {
					const normalized = camelCaseKeys(data);
					normalized.sceneItems.reverse(); // The items seem to come in reverse order
					onChanged(normalized.sceneItems);
				},
			);
		};

		fn();

		obs.on('SceneItemAdded', data => {
			const normalized = camelCaseKeys(data);
			if (normalized.sceneName === scene) {
				fn();
			}
		});

		obs.on('SceneItemRemoved', data => {
			const normalized = camelCaseKeys(data);
			if (normalized.sceneName === scene) {
				fn();
			}
		});

		obs.on('SourceOrderChanged', data => {
			const normalized = camelCaseKeys(data);
			if (normalized.sceneName === scene) {
				fn();
			}
		});
	}
});
