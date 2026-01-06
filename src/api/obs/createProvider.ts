import { EventTrigger } from '~/EventTrigger'

interface ProviderConfig {
	init?: (onFetchValueChanged: (data: any) => void) => void
	attach?: (onFetchValueChanged: (data: any) => void) => (() => void) | undefined
}

interface Provider {
	value: any
	attach: (onChange: Function) => void
	detach: (onChange: Function) => void
}

export const createProvider = ({init, attach}: ProviderConfig): Provider => {
	const result: Provider = {
		value: undefined,
		attach: () => {},
		detach: () => {},
	}

	const events = new EventTrigger()

	const onFetchValueChanged = (data: any) => {
		result.value = data
		events.trigger('change', data)
	}

	let unmountFunction: (() => void) | undefined

	init?.(onFetchValueChanged)

	result.attach = (onChange: any) => {
		unmountFunction = attach?.(onFetchValueChanged)
		events.on('change', onChange as any)
	}

	result.detach = (onChange: any) => {
		events.off('change', onChange as any)
		if (events.count('change') === 0) {
			unmountFunction?.()
			unmountFunction = undefined
		}
	}

	return result
}
