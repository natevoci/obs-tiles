export const startStreaming = (obs: any) => () => {
	obs.send('StartStreaming')
}

export const stopStreaming = (obs: any) => () => {
	obs.send('StopStreaming')
}

export const startStopStreaming = (obs: any) => () => {
	obs.send('StartStopStreaming')
}
