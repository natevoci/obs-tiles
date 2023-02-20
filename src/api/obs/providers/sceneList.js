import { createProvider } from '../createProvider';

export const sceneList = (obs) => createProvider({
	init: (onChanged) => {
		if (obs.v4) {
			const fn = () => {
				obs.send('GetSceneList', {}, data => {
					onChanged({
						currentScene: data.currentScene,
						scenes: data.scenes.reduce( // The items seem to come in reverse order
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
		else {
			const fn = () => {
				obs.send('GetSceneList', {}, data => {
					onChanged({
						currentScene: data.currentProgramSceneName,
						scenes: data.scenes.reduce( // The items seem to come in reverse order
							(prev, curr) => {
								prev[curr.sceneName] = curr;
								return prev;
							},
							new Map(),
						)
					});
				});
			};

			fn();

			obs.on('SceneCreated', () => {
				fn();
			});
			
			obs.on('SceneRemoved', () => {
				fn();
			});
			
			obs.on('SceneNameChanged', () => {
				fn();
			});
			
			obs.on('CurrentProgramSceneChanged', () => {
				console.log('CurrentProgramSceneChanged');
				fn();
			});

			obs.on('SceneListChanged', () => {
				console.log('SceneListChanged');
				fn();
			});	

			obs.on('SceneItemCreated', () => {
				console.log('SceneItemCreated');
				fn();
			});

			obs.on('SceneItemRemoved', () => {
				console.log('SceneItemRemoved');
				fn();
			});

			obs.on('SceneItemListReindexed', () => {
				console.log('SceneItemListReindexed');
				fn();
			});

			obs.on('SceneItemEnableStateChanged', () => {
				console.log('SceneItemEnableStateChanged');
				fn();
			});
		}
	}
});
