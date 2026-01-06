import React, { useRef, useCallback, useMemo } from 'react'

export interface UseLongPressOptions {
	onClick: (event: React.MouseEvent | React.TouchEvent) => void
	onLongPress: (event: React.MouseEvent | React.TouchEvent) => void
	shouldPreventDefault?: boolean
	delay?: number
}

export const useLongPress = ({
	onClick,
	onLongPress,
	shouldPreventDefault = true,
	delay = 300,
}: UseLongPressOptions) => {
	const [longPressTriggered, setLongPressTriggered] = React.useState(false)
	const timeout = useRef<NodeJS.Timeout>()
	const target = useRef<HTMLElement>()

	const start = useCallback(
		(event: React.MouseEvent | React.TouchEvent) => {
			if (shouldPreventDefault && event.target instanceof HTMLElement) {
				const element = event.target
				element.addEventListener(
					"touchend",
					preventDefault,
					{
						passive: false
					},
				)
				target.current = element
			}
			timeout.current = setTimeout(
				() => {
					onLongPress(event)
					setLongPressTriggered(true)
				},
				delay,
			)
		},
		[onLongPress, delay, shouldPreventDefault]
	)

	const clear = useCallback(
		(event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
			timeout.current && clearTimeout(timeout.current)
			shouldTriggerClick && !longPressTriggered && onClick(event)
			setLongPressTriggered(false)
			if (shouldPreventDefault && target.current) {
				target.current.removeEventListener("touchend", preventDefault)
			}
		},
		[shouldPreventDefault, onClick, longPressTriggered]
	)

	return useMemo(
		() => ({
			onMouseDown: (e: React.MouseEvent) => start(e),
			onTouchStart: (e: React.TouchEvent) => start(e),
			onMouseUp: (e: React.MouseEvent) => clear(e),
			onMouseLeave: (e: React.MouseEvent) => clear(e, false),
			onTouchEnd: (e: React.TouchEvent) => clear(e)
		}),
		[start, clear],
	)
}

const isTouchEvent = (event: React.MouseEvent | React.TouchEvent): event is React.TouchEvent => {
	return "touches" in event
}

const preventDefault = (event: TouchEvent) => {
	if (!isTouchEvent(event as any)) return

	if ((event as any).touches.length < 2 && event.preventDefault) {
		event.preventDefault()
	}
}
