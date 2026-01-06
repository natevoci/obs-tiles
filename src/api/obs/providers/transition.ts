import { createProvider } from '../createProvider'
import { camelCaseKeys } from '../util/camelCaseKeys'

export const transition = (obs: any) => createProvider({
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
