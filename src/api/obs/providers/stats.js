import { createProvider } from '../createProvider';

export const stats = (obs, {
	refreshTime = 3000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const fn = () => {
			obs.send('GetStats', {}, data => {
				onChanged(data.stats);
				timeout = setTimeout(fn, refreshTime);
			});
		};

		fn();

		return () => {
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}
});
