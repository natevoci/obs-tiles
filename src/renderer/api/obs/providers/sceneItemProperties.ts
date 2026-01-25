import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

export const sceneItemProperties = (
	obs: ConnectionPublic,
	{
		scene,
		item,
		sceneItemId,
	}: { scene: string; item?: string; sceneItemId?: number },
) => createProvider({
	init: (onChanged) => {
		const fetchProperties = async () => {
			if (!obs.adapter) return

			try {
				// If we have a sceneItemId, use it directly
				// Otherwise, we need to find it by source name (item)
				let itemId = sceneItemId

				if (itemId === undefined && item) {
					// Look up the scene item ID by name
					const sceneItems = await obs.adapter.getSceneItemList(scene)
					const foundItem = sceneItems.find(si => si.sourceName === item)
					if (foundItem) {
						itemId = foundItem.sceneItemId
					}
				}

				if (itemId !== undefined) {
					const props = await obs.adapter.getSceneItemProperties(scene, itemId)
					onChanged(props)
				}
			} catch (err) {
				console.error('Error fetching scene item properties:', err)
			}
		}

		fetchProperties()

		// Unified event names
		obs.on('SceneItemEnableStateChanged', (data: any) => {
			if (data.sceneName === scene && (data.sceneItemId === sceneItemId || !sceneItemId)) {
				fetchProperties()
			}
		})

		obs.on('SceneItemLockStateChanged', (data: any) => {
			if (data.sceneName === scene && (data.sceneItemId === sceneItemId || !sceneItemId)) {
				fetchProperties()
			}
		})

		obs.on('SceneItemTransformChanged', (data: any) => {
			if (data.sceneName === scene && (data.sceneItemId === sceneItemId || !sceneItemId)) {
				fetchProperties()
			}
		})
	}
})
