import { ConnectionPublic } from '../types'

export const setCurrentScene = (obs: ConnectionPublic) => ({
	scene
}: { scene: string }) => {
	obs.send('SetCurrentScene', {
		'scene-name': scene,
	})
}
