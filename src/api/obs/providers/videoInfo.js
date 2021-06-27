import { createProvider } from '../createProvider';

export const videoInfo = (obs, {
	refreshTime = 5000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const fn = () => {
			obs.send('GetVideoInfo', {}, data => {
				onChanged(data);
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
