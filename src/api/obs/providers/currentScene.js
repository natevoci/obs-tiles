import { createProvider } from '../createProvider';

export const currentScene = (obs) => createProvider({
	init: (onChanged) => {
		if (obs.v4) {
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
		else {
			obs.send('GetCurrentProgramScene', {}, data => {
				onChanged({
					name: data.currentProgramSceneName,
				});
			});
			obs.on('CurrentProgramSceneChanged', data => {
				onChanged({
					name: data.sceneName,
				});
			});
		}
	}
});
