import { createProvider } from '../createProvider';

export const transition = (obs) => createProvider({
	init: (onChanged) => {
		obs.on('TransitionBegin', data => {
			onChanged(data);
		});
		obs.on('TransitionEnd', () => {
			onChanged(null);
		});
	},
});
