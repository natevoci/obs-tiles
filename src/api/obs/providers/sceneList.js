import { createProvider } from '../createProvider';

export const sceneList = (obs) => createProvider({
	init: (onChanged) => {
		const fn = () => {
			obs.send('GetSceneList', {}, data => {
				onChanged({
					currentScene: data.currentScene,
					scenes: data.scenes.reduce(
						(prev, curr) => {
							prev[curr.name] = curr;
							return prev;
						},
						new Map(),
					)
				});
			});
		};

		fn();

		obs.on('SwitchScenes', () => {
			console.log('SwitchScenes');
			fn();
		});

		obs.on('ScenesChanged', () => {
			console.log('ScenesChanged');
			fn();
		});

		obs.on('SceneItemAdded', () => {
			fn();
		});

		obs.on('SceneItemRemoved', () => {
			fn();
		});

		obs.on('SceneItemVisibilityChanged', () => {
			console.log('SceneItemVisibilityChanged');
			fn();
		});

		obs.on('SourceOrderChanged', () => {
			console.log('SourceOrderChanged');
			fn();
		});

		obs.on('SourceRenamed', () => {
			console.log('SourceRenamed');
			fn();
		});

		obs.on('SourceCreated', () => {
			console.log('SourceCreated');
			fn();
		});

		obs.on('SourceDestroyed', () => {
			console.log('SourceDestroyed');
			fn();
		});

	}
});
