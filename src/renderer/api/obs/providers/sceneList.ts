import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { Scene } from '../abstraction/types'

// ============================================================================
// Types
// ============================================================================

export interface SceneListData {
	currentScene: string
	currentPreviewSceneName?: string
	scenes: Record<string, Scene>
}

// ============================================================================
// Provider
// ============================================================================

export const sceneList = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		const fetchSceneList = () => {
			if (obs.adapter) {
				obs.adapter.getSceneList().then((data) => {
					onChanged({
						currentScene: data.currentProgramSceneName,
						currentPreviewSceneName: data.currentPreviewSceneName,
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
		obs.adapter?.on('CurrentProgramSceneChanged', () => {
			fetchSceneList()
		})

		obs.adapter?.on('CurrentPreviewSceneChanged', () => {
			fetchSceneList()
		})

		obs.adapter?.on('SceneListChanged', () => {
			fetchSceneList()
		})

		obs.adapter?.on('SceneItemCreated', () => {
			fetchSceneList()
		})

		obs.adapter?.on('SceneItemRemoved', () => {
			fetchSceneList()
		})

		obs.adapter?.on('SceneItemEnableStateChanged', () => {
			fetchSceneList()
		})

		obs.adapter?.on('SceneItemListReindexed', () => {
			fetchSceneList()
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get the list of all scenes.
 * `currentScene` is the current program scene name.
 * `currentPreviewSceneName` is set when Studio Mode is active (v5 only).
 * `scenes` is an object mapping scene names to their details.
 */
export const useSceneList = (obs: ConnectionPublic): SceneListData | undefined => {
	return obs.useDataProvider('sceneList')
}
