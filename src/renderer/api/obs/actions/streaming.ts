import { ConnectionPublic } from '../types'

export const startStreaming = (obs: ConnectionPublic) => () => {
	obs.adapter?.startStream()
}

export const stopStreaming = (obs: ConnectionPublic) => () => {
	obs.adapter?.stopStream()
}

export const startStopStreaming = (obs: ConnectionPublic) => () => {
	obs.adapter?.toggleStream()
}
