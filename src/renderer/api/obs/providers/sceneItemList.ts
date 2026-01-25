import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

export const sceneItemList = (obs: ConnectionPublic, {
	scene,
}: { scene: string }) => createProvider({
	init: (onChanged) => {
		const fetchSceneItems = () => {
			if (obs.adapter) {
				obs.adapter.getSceneItemList(scene).then((sceneItems) => {
					// Reverse for display order
					onChanged([...sceneItems].reverse())
				})
			}
		}

		fetchSceneItems()

		// Unified event names
		obs.on('SceneItemCreated', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})

		obs.on('SceneItemRemoved', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})

		obs.on('SceneItemListReindexed', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})
	}
})
