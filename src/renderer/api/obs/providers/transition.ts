import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { TransitionEvent } from '../abstraction/types'

// ============================================================================
// Provider
// ============================================================================

// Export here and in index.ts for dynamic loading by name
export const transition = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		// Unified event names
		obs.adapter?.on('SceneTransitionStarted', (data: any) => {
			onChanged(data)
		})
		obs.adapter?.on('SceneTransitionEnded', () => {
			onChanged(null)
		})
	},
})

// ============================================================================
// Typed Hook
// ============================================================================

/**
 * Get current transition state (active during scene transitions)
 */
export const useTransition = (obs: ConnectionPublic): TransitionEvent | null | undefined => {
	return obs.useDataProvider('transition')
}
