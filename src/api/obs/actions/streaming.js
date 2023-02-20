export const startStreaming = (obs) => ({ recordWhenStreaming }) => {
	if (obs.v4) {
		obs.send('StartStreaming');
	}
	else {
		obs.send('GetOutputList', {}, ({ outputs }) => {
			obs.send('StartOutput', {
				outputName: outputs[0].outputName,
			});
			if (recordWhenStreaming === 'true') {
				obs.send('StartRecord');
			}
		});
	}
};

export const stopStreaming = (obs) => ({ recordWhenStreaming }) => {
	if (obs.v4) {
		obs.send('StopStreaming');
	}
	else {
		obs.send('GetOutputList', {}, ({ outputs }) => {
			obs.send('StopOutput', {
				outputName: outputs[0].outputName,
			});
			if (recordWhenStreaming === 'true') {
				obs.send('StopRecord');
			}
		});
	}
};

export const startStopStreaming = (obs) => ({ recordWhenStreaming }) => {
	if (obs.v4) {
		obs.send('StartStopStreaming');
	}
	else {
		obs.send('GetOutputList', {}, ({ outputs }) => {
			obs.send('GetOutputStatus', {
				outputName: outputs[0].outputName,
			}, data => {
				obs.send(data.outputActive ? 'StopOutput' : 'StartOutput', {
					outputName: outputs[0].outputName,
				});
				if (recordWhenStreaming && !data.outputActive) {
					obs.send('StartRecord');
				}
			});
		});
	}
};
