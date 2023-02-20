import { createProvider } from '../createProvider';

export const videoInfo = (obs, {
	refreshTime = 60000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const fn = () => {
			if (obs.v4) {
				obs.send('GetVideoInfo', {}, data => {
					onChanged(data);
					timeout = setTimeout(fn, refreshTime);
				});
			}
			else {
				obs.send('GetVideoSettings', {}, ({
					fpsNumerator,
					fpsDenominator,
					...data
				}) => {
					onChanged({
						fps: data.fpsNumerator / data.fpsDenominator,
						...data,
					});
					timeout = setTimeout(fn, refreshTime);
				});
			}
		};

		fn();

		return () => {
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}
});
