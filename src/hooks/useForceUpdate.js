import * as React from 'react';

export const useForceUpdate = () => {
	const [, forceUpdate] = React.useState();
	const fn = React.useCallback(
		() => {
			forceUpdate({});
		},
		[],
	);
	return fn;
}