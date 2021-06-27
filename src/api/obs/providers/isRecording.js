import { createProvider } from '../createProvider';

export const isRecording = (obs) => createProvider({
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
			setData(data.recording ? 'started' : 'stopped');
		});
		obs.on('RecordingStarting', () => {
			setData('starting');
		});
		obs.on('RecordingStarted', () => {
			setData('started');
		});
		obs.on('RecordingStopping', () => {
			setData('stopping');
		});
		obs.on('RecordingStopped', () => {
			setData('stopped');
		});
		setData();
	},
});
