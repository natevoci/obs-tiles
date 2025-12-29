import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const currentScene = (obs) => createProvider({
	init: (onChanged) => {
		obs.send('GetCurrentScene', {}, data => {
			const normalized = camelCaseKeys(data);
			onChanged({
				name: normalized.name,
				sources: normalized.sources,
			});
		});
		obs.on('SwitchScenes', data => {
			const normalized = camelCaseKeys(data);
			onChanged({
				name: normalized.sceneName,
				sources: normalized.sources,
			});
		});
	}
});
