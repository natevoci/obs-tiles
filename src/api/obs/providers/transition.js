import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const transition = (obs) => createProvider({
	init: (onChanged) => {
		obs.on('TransitionBegin', data => {
			const normalized = camelCaseKeys(data);
			onChanged(normalized);
		});
		obs.on('TransitionEnd', () => {
			onChanged(null);
		});
	},
});
