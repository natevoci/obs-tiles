import { EventTrigger } from '/src/EventTrigger';

export const createProvider = ({init, attach}) => {
	let result = {
		value: undefined
	};

	const events = new EventTrigger();

	const onFetchValueChanged = data => {
		result.value = data;
		events.trigger('change', data);
	}

	let unmountFunction;
	init?.(onFetchValueChanged);

	result.attach = (onChange) => {
		unmountFunction = attach?.(onFetchValueChanged);
		events.on('change', onChange);
	};

	result.detach = (onChange) => {
		events.off('change', onChange);
		if (events.count('change') === 0) {
			unmountFunction?.();
			unmountFunction = null;
		}
	};

	return result;
};
