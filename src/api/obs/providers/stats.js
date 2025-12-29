import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const stats = (obs, {
	refreshTime = 3000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const fn = () => {
			obs.send('GetStats', {}, data => {
				const normalized = camelCaseKeys(data);
				onChanged(normalized.stats);
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
