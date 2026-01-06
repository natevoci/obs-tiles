import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'

export const sceneItemList = (obs: any, {
	scene,
}: { scene: string }) => createProvider({
	init: (onChanged) => {
		const fn = () => {
			obs.send(
				'GetSceneItemList',
				{
					sceneName: scene,
				},
				(data: any) => {
					const normalized = camelCaseKeys(data)
					normalized.sceneItems.reverse()
					onChanged(normalized.sceneItems)
				},
			)
		}

		fn()

		obs.on('SceneItemAdded', (data: any) => {
			const normalized = camelCaseKeys(data)
			if (normalized.sceneName === scene) {
				fn()
			}
		})

		obs.on('SceneItemRemoved', (data: any) => {
			const normalized = camelCaseKeys(data)
			if (normalized.sceneName === scene) {
				fn()
			}
		})

		obs.on('SourceOrderChanged', (data: any) => {
			const normalized = camelCaseKeys(data)
			if (normalized.sceneName === scene) {
				fn()
			}
		})
	}
})
