type EventCallback = (data?: any) => void

interface EventCallbacks {
	[key: string]: EventCallback[]
}

export class EventTrigger {
	private _callbacks: EventCallbacks = {}

	on(event: string, fn: EventCallback): void {
		if (!this._callbacks[event]) {
			this._callbacks[event] = []
		}
		this._callbacks[event].push(fn)
	}

	count(event: string): number {
		if (!this._callbacks[event]) {
			return 0
		}
		return this._callbacks[event].length
	}

	off(event: string, fn?: EventCallback): void {
		if (this._callbacks[event]) {
			if (fn) {
				const index = this._callbacks[event].indexOf(fn)
				if (index >= 0) {
					this._callbacks[event].splice(index, 1)
				}
			}
			else {
				this._callbacks[event] = []
			}
		}
	}

	trigger(event: string, data?: any): void {
		if (this._callbacks[event]) {
			this._callbacks[event].forEach(fn => {
				fn.call(this, data)
			})
		}
	}
}
