export const startRecording = (obs: any) => () => {
	obs.send('StartRecording')
}

export const stopRecording = (obs: any) => () => {
	obs.send('StopRecording')
}

export const startStopRecording = (obs: any) => () => {
	obs.send('StartStopRecording')
}
