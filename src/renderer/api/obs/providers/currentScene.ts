import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { SceneItem } from '../abstraction/types'

// ============================================================================
// Types
// ============================================================================

export interface CurrentSceneData {
	name: string
	sceneUuid?: string
}

// ============================================================================
// Provider
// ============================================================================

export const currentScene = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		if (obs.adapter) {
			obs.adapter.getCurrentProgramScene().then((data) => {
				onChanged({
					name: data.sceneName,
					sceneUuid: data.sceneUuid,
				})
			})
		}
		// Listen for unified event name (both v4 and v5 adapters emit this)
		obs.on('CurrentProgramSceneChanged', (data: any) => {
			onChanged({
				name: data.sceneName,
				sceneUuid: data.sceneUuid,
			})
		})
	}
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get the current program scene
 */
export const useCurrentScene = (obs: ConnectionPublic): CurrentSceneData | undefined => {
	return obs.useDataProvider('currentScene')
}
