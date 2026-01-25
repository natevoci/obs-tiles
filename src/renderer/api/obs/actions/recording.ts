import { ConnectionPublic } from '../types'

export const startRecording = (obs: ConnectionPublic) => () => {
	obs.adapter?.startRecord()
}

export const stopRecording = (obs: ConnectionPublic) => () => {
	obs.adapter?.stopRecord()
}

export const startStopRecording = (obs: ConnectionPublic) => () => {
	obs.adapter?.toggleRecord()
}
