export const setCurrentScene = (obs) => ({
	scene
}) => {
	if (obs.v4) {
		obs.send('SetCurrentScene', {
			'scene-name': scene,
		});
	}
	else {
		obs.send('SetCurrentProgramScene', {
			'sceneName': scene,
		});
	}
};
