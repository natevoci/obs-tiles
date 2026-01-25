import { createProvider } from '../createProvider'
import { ConnectionPublic } from '../types'

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
				sources: data.sources,
			})
		})
	}
})
