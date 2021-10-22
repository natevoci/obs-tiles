import React from 'react';
import { useLongPress } from './useLongPress';

export const useClickHandler = ({
	clickAction,
	longPressAction,
	handlers,
	...props
}) => {
	const triggerHandler = React.useCallback(
		(action) => {
			if (action?.length) {
				var actionParts = action.split(' ');
				if (actionParts.length) {
					const handler = handlers[actionParts[0]];
					if (handler) {
						handler(...(actionParts.slice(1)));
					}
				}
			}
		},
		[handlers],
	);

	const onClick = React.useCallback(
		() => {
			triggerHandler(clickAction);
		},
		[triggerHandler, clickAction],
	);

	const onLongPress = React.useCallback(
		() => {
			triggerHandler(longPressAction);
		},
		[triggerHandler, longPressAction],
	);
	
	return useLongPress({
		onClick,
		onLongPress,
		...props
	});
};
