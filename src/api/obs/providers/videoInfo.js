import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const videoInfo = (obs, {
	refreshTime = 60000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const fn = () => {
			obs.send('GetVideoInfo', {}, data => {
				const normalized = camelCaseKeys(data);
				onChanged(normalized);
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
