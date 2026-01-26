import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'
import { TransitionEvent } from '../abstraction/types'

// ============================================================================
// Provider
// ============================================================================

export const transition = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		// Unified event names
		obs.on('SceneTransitionStarted', (data: any) => {
			onChanged(data)
		})
		obs.on('SceneTransitionEnded', () => {
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
