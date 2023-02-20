import { createProvider } from '../createProvider';

export const isStreaming = (obs) => createProvider({
	init: (onChanged) => {
		const setData = (data) => {
			onChanged({
				isStarted: data === 'started' || data === 'OBS_WEBSOCKET_OUTPUT_STARTED',
				isStopped: data === 'stopped' || data === 'OBS_WEBSOCKET_OUTPUT_STOPPED',
				isStarting: data === 'starting' || data === 'OBS_WEBSOCKET_OUTPUT_STARTING',
				isStopping: data === 'stopping' || data === 'OBS_WEBSOCKET_OUTPUT_STOPPING',
				isLoading: !data,
			});
		};

		if (obs.v4) {
			obs.send('GetStreamingStatus', {}, data => {
				setData(data.streaming ? 'started' : 'stopped');
			});
		}
		else {
			obs.send('GetOutputList', {}, ({ outputs }) => {
				obs.send('GetOutputStatus', {
					outputName: outputs[0].outputName,
				}, data => {
					setData(data.outputActive ? 'started' : 'stopped');
				});
			});
		}	

		if (obs.v4) {
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
		}
		else {
			obs.on('StreamStateChanged', data => {
				setData(data.outputState);
			});
		}
		setData();
	},
});
