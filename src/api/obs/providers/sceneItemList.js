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
					onChanged(data.sceneItems);
				},
			);
		};

		fn();

		if (obs.v4) {
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
		else {
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
	
			obs.on('SceneItemListReindexed', data => {
				if (data.sceneName === scene) {
					fn();
				}
			});

			obs.on('SceneItemEnableStateChanged', data => {
				if (data.sceneName === scene) {
					fn();
				}
			});
		}
	}
});
