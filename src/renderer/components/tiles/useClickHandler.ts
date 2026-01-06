import React from 'react'
import { useLongPress } from './useLongPress'

interface UseClickHandlerOptions {
	clickAction: string
	longPressAction: string
	handlers: Record<string, (...args: any[]) => void>
	[key: string]: any
}

export const useClickHandler = ({
	clickAction,
	longPressAction,
	handlers,
	...props
}: UseClickHandlerOptions) => {
	const triggerHandler = React.useCallback(
		(action: string) => {
			if (action?.length) {
				const actionParts = action.split(' ')
				if (actionParts.length) {
					const handler = handlers[actionParts[0]]
					if (handler) {
						handler(...(actionParts.slice(1)))
					}
				}
			}
		},
		[handlers],
	)

	const onClick = React.useCallback(
		() => {
			triggerHandler(clickAction)
		},
		[triggerHandler, clickAction],
	)

	const onLongPress = React.useCallback(
		() => {
			triggerHandler(longPressAction)
		},
		[triggerHandler, longPressAction],
	)
	
	return useLongPress({
		onClick,
		onLongPress,
		...props
	})
}
