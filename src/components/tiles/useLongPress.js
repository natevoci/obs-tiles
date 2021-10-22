import React from "react";

export const useLongPress = ({
	onClick,
	onLongPress,
	shouldPreventDefault = true,
	delay = 300,
}) => {
	const [longPressTriggered, setLongPressTriggered] = React.useState(false);
	const timeout = React.useRef();
	const target = React.useRef();

	const start = React.useCallback(
		(event) => {
			if (shouldPreventDefault && event.target) {
				event.target.addEventListener(
					"touchend",
					preventDefault,
					{
						passive: false
					},
				);
				target.current = event.target;
			}
			timeout.current = setTimeout(
				() => {
					onLongPress(event);
					setLongPressTriggered(true);
				},
				delay,
			);
		},
		[onLongPress, delay, shouldPreventDefault]
	);

	const clear = React.useCallback(
		(event, shouldTriggerClick = true) => {
			timeout.current && clearTimeout(timeout.current);
			shouldTriggerClick && !longPressTriggered && onClick();
			setLongPressTriggered(false);
			if (shouldPreventDefault && target.current) {
				target.current.removeEventListener("touchend", preventDefault);
			}
		},
		[shouldPreventDefault, onClick, longPressTriggered]
	);

	return React.useMemo(
		() => ({
			onMouseDown: e => start(e),
			onTouchStart: e => start(e),
			onMouseUp: e => clear(e),
			onMouseLeave: e => clear(e, false),
			onTouchEnd: e => clear(e)
		}),
		[start, clear],
	);
};

const isTouchEvent = event => {
	return "touches" in event;
};

const preventDefault = event => {
	if (!isTouchEvent(event)) return;

	if (event.touches.length < 2 && event.preventDefault) {
		event.preventDefault();
	}
};
