import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

export const sceneList = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		const fetchSceneList = () => {
			if (obs.adapter) {
				obs.adapter.getSceneList().then((data) => {
					onChanged({
						currentScene: data.currentProgramSceneName,
						scenes: data.scenes.reduce(
							(prev: Record<string, any>, curr: any) => {
								prev[curr.sceneName] = curr
								return prev
							},
							{},
						)
					})
				})
			}
		}

		fetchSceneList()

		// Unified event names
		obs.on('CurrentProgramSceneChanged', () => {
			fetchSceneList()
		})

		obs.on('SceneListChanged', () => {
			fetchSceneList()
		})

		obs.on('SceneItemCreated', () => {
			fetchSceneList()
		})

		obs.on('SceneItemRemoved', () => {
			fetchSceneList()
		})

		obs.on('SceneItemEnableStateChanged', () => {
			fetchSceneList()
		})

		obs.on('SceneItemListReindexed', () => {
			fetchSceneList()
		})
	}
})
