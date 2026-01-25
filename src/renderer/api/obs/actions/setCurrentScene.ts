import { ConnectionPublic } from '../types'

export const setCurrentScene = (obs: ConnectionPublic) => ({
	scene
}: { scene: string }) => {
	obs.adapter?.setCurrentProgramScene(scene)
}
