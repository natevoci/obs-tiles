export const startRecording = (obs) => () => {
	if (obs.v4) {
		obs.send('StartRecording');
	}
	else {
		obs.send('StartRecord');
	}
};

export const stopRecording = (obs) => () => {
	if (obs.v4) {
		obs.send('StopRecording');
	}
	else {
		obs.send('StopRecord');
	}
};

export const startStopRecording = (obs) => () => {
	if (obs.v4) {
		obs.send('StartStopRecording');
	}
	else {
		obs.send('ToggleRecording');
	}
};
