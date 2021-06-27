export const startStreaming = (obs) => () => {
	obs.send('StartStreaming');
};

export const stopStreaming = (obs) => () => {
	obs.send('StopStreaming');
};

export const startStopStreaming = (obs) => () => {
	obs.send('StartStopStreaming');
};
