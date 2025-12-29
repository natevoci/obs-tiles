import { createProvider } from '../createProvider';
import { camelCaseKeys } from '../util/camelCaseKeys';

export const isStreaming = (obs) => createProvider({
	init: (onChanged) => {
		const setData = (data) => {
			onChanged({
				isStarted: data === 'started',
				isStopped: data === 'stopped',
				isStarting: data === 'starting',
				isStopping: data === 'stopping',
				isLoading: !data,
			});
		};

		obs.send('GetStreamingStatus', {}, data => {
			const normalized = camelCaseKeys(data);
			setData(normalized.streaming ? 'started' : 'stopped');
		});
		obs.on('StreamStarting', () => {
			setData('starting');
		});
		obs.on('StreamStarted', () => {
			setData('started');
		});
		obs.on('StreamStopping', () => {
			setData('stopping');
		});
		obs.on('StreamStopped', () => {
			setData('stopped');
		});
		setData();
	},
});
