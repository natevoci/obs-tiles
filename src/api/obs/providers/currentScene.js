import { createProvider } from '../createProvider';

export const currentScene = (obs) => createProvider({
	init: (onChanged) => {
		obs.send('GetCurrentScene', {}, data => {
			onChanged(data.name);
		});
		obs.on('SwitchScenes', data => {
			onChanged(data.sceneName);
		});
	}
});
