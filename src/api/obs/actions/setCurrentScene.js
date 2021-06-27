export const setCurrentScene = (obs) => ({
	scene
}) => {
	obs.send('SetCurrentScene', {
		'scene-name': scene,
	});
};
