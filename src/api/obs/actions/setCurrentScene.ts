export const setCurrentScene = (obs: any) => ({
	scene
}: { scene: string }) => {
	obs.send('SetCurrentScene', {
		'scene-name': scene,
	})
}
