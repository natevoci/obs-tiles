import { createProvider } from '../createProvider';

export const isRecording = (obs) => createProvider({
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
		}
		else {
			obs.send('GetRecordStatus', {}, data => {
				setData(data.outputActive ? 'started' : 'stopped');
			});
			obs.on('RecordStateChanged', data => {
				setData(data.outputState);
			});
		}
		setData();
	},
});
