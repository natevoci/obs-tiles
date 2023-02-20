import { createProvider } from '../createProvider';

export const previewScene = (obs) => createProvider({
	init: (onChanged) => {
		if (!obs.v4) {
			obs.send('GetCurrentPreviewScene', {}, data => {
				onChanged({
					name: data.currentPreviewSceneName,
				});
			});
			obs.on('CurrentPreviewSceneChanged', data => {
				onChanged({
					name: data.sceneName,
				});
			});
		}
	}
});
