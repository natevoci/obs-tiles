import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'
import { ConnectionPublic } from '../types'

export const transition = (obs: ConnectionPublic) => createProvider({
	init: (onChanged) => {
		obs.on('TransitionBegin', (data: any) => {
			const normalized = camelCaseKeys(data)
			onChanged(normalized)
		})
		obs.on('TransitionEnd', () => {
			onChanged(null)
		})
	},
})
