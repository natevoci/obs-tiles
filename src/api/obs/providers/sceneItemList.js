import { createProvider } from '../createProvider';

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
					data.sceneItems.reverse(); // The items seem to come in reverse order
					onChanged({
						sceneName: data.sceneName,
						sceneItems: data.sceneItems,
					});
				},
			);
		};

		fn();

		obs.on('SceneItemAdded', data => {
			if (data.sceneName === scene) {
				fn();
			}
		});

		obs.on('SceneItemRemoved', data => {
			if (data.sceneName === scene) {
				fn();
			}
		});

		obs.on('SourceOrderChanged', data => {
			if (data.sceneName === scene) {
				fn();
			}
		});

	}
});
