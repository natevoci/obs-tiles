import { ConnectionPublic } from '../types'

export const startRecording = (obs: ConnectionPublic) => () => {
	obs.send('StartRecording')
}

export const stopRecording = (obs: ConnectionPublic) => () => {
	obs.send('StopRecording')
}

export const startStopRecording = (obs: ConnectionPublic) => () => {
	obs.send('StartStopRecording')
}
