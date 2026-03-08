export const setMute = (obs) => ({
	sourceName,
	muted,
}) => {
	obs.send('SetMute', {
		'name': sourceName,
		'muted': muted,
	});
};

export const toggleMute = (obs) => ({
	sourceName,
}) => {
	obs.send('ToggleMute', {
		'name': sourceName,
	});
};
