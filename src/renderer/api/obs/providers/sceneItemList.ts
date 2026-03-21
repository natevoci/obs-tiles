import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { SceneItem } from '../abstraction/types'

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
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
		obs.adapter?.on('SceneItemCreated', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})

		obs.adapter?.on('SceneItemRemoved', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})

		obs.adapter?.on('SceneItemListReindexed', (data: any) => {
			if (data.sceneName === scene) {
				fetchSceneItems()
			}
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get the list of scene items for a specific scene
 */
export const useSceneItemList = (
	obs: ConnectionPublic,
	args: { scene: string }
): SceneItem[] | undefined => {
	return obs.useDataProvider('sceneItemList', args)
}
