export class EventTrigger {
	constructor() {
		this._callbacks = {};
	}

	on(event, fn) {
		if (!this._callbacks[event]) {
			this._callbacks[event] = [];
		}
		this._callbacks[event].push(fn);
	}

	count(event) {
		if (!this._callbacks[event]) {
			return 0;
		}
		return this._callbacks[event].length;
	}

	off(event, fn) {
		if (this._callbacks[event]) {
			if (fn) {
				const index = this._callbacks[event].indexOf(fn);
				if (index >= 0) {
					this._callbacks[event].splice(index, 1);
				}
			}
			else {
				this._callbacks[event] = [];
			}
		}
	}

	trigger(event, data) {
		if (this._callbacks[event]) {
			this._callbacks[event].forEach(fn => {
				fn.call(this, data);
			})
		}
	}
}
