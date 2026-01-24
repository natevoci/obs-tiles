import { ConnectionPublic } from '../types'

export const startStreaming = (obs: ConnectionPublic) => () => {
	obs.send('StartStreaming')
}

export const stopStreaming = (obs: ConnectionPublic) => () => {
	obs.send('StopStreaming')
}

export const startStopStreaming = (obs: ConnectionPublic) => () => {
	obs.send('StartStopStreaming')
}
