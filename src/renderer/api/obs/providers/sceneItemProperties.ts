import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'
import { ConnectionPublic } from '../types'

export const sceneItemProperties = (
	obs: ConnectionPublic,
	{
		scene,
		item,
	}: { scene: string; item: string },
) => createProvider({
	init: (onChanged) => {
		const fetchProperties = () => {
			obs.send(
				'GetSceneItemProperties',
				{
					'scene-name': scene,
					'item': item,
				},
				(data: any) => {
					const normalized = camelCaseKeys(data)
					onChanged(normalized)
				},
			)
		} 
		fetchProperties()
		obs.on('SceneItemVisibilityChanged', () => {
			fetchProperties()
		})
		obs.on('SceneItemLockChanged', () => {
			fetchProperties()
		})
		obs.on('SceneItemTransformChanged', () => {
			fetchProperties()
		})
	}
})
