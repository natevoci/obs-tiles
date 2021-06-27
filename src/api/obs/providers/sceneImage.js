import { createProvider } from '../createProvider';

export const sceneImage = (obs, {
	scene,
	tileSize,
	refreshTime = 1000,
}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		let attached = true;
		const fn = () => {
			obs.send(
				'TakeSourceScreenshot',
				{
					sourceName: scene,
					embedPictureFormat: 'jpg',
					width: tileSize*16,
					height: tileSize*9,
				},
				data => {
					if (attached && data?.img) {
						onChanged(data.img);
						timeout = setTimeout(fn, refreshTime);
					}
				},
				err => {
					console.error(`Error loading shapshot`, {
						connection: obs.name,
						scene,
					}, err);
					onChanged(null);
				}
			);
		};

		fn();

		return () => {
			if (timeout) {
				clearTimeout(timeout);
				attached = false;
			}
		}
	}
});
