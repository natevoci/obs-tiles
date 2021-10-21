import { createProvider } from '../createProvider';

export const currentScene = (obs) => createProvider({
	init: (onChanged) => {
		obs.send('GetCurrentScene', {}, data => {
			onChanged({
				name: data.name,
				sources: data.sources,
			});
		});
		obs.on('SwitchScenes', data => {
			onChanged({
				name: data.sceneName,
				sources: data.sources,
			});
		});
	}
});
