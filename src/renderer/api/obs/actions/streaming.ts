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

export const getStreamServiceSettings = async (obs: ConnectionPublic) => {
	return obs.adapter?.getStreamServiceSettings()
}

export const setStreamServiceSettings = async (
	obs: ConnectionPublic,
	serviceType: string,
	settings: Record<string, unknown>,
): Promise<void> => {
	await obs.adapter?.setStreamServiceSettings(serviceType, settings)
}
