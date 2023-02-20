import { createProvider } from '../createProvider';

export const transition = (obs) => createProvider({
	init: (onChanged) => {
		if (obs.v4) {
			obs.on('TransitionBegin', data => {
				onChanged(data);
			});
			obs.on('TransitionEnd', () => {
				onChanged(null);
			});
		}
		else {
			obs.on('SceneTransitionStarted', data => {
				onChanged(data);
			});
			obs.on('SceneTransitionEnded', () => {
				onChanged(null);
			});
		}
	},
});
