import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'
import { ConnectionPublic } from '../types'

export const currentScene = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		obs.send('GetCurrentScene', {}, (data: any) => {
			const normalized = camelCaseKeys(data)
			onChanged({
				name: normalized.name,
				sources: normalized.sources,
			})
		})
		obs.on('SwitchScenes', (data: any) => {
			const normalized = camelCaseKeys(data)
			onChanged({
				name: normalized.sceneName,
				sources: normalized.sources,
			})
		})
	}
})
