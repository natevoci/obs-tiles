import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

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
