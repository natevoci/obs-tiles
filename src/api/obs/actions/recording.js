export const startRecording = (obs) => () => {
	obs.send('StartRecording');
};

export const stopRecording = (obs) => () => {
	obs.send('StopRecording');
};

export const startStopRecording = (obs) => () => {
	obs.send('StartStopRecording');
};
