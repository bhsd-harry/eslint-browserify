/* eslint no-underscore-dangle: [2, { "allow": ["_events"] }] */
module.exports = class {
	_events = Object.create(null); // eslint-disable-line unicorn/prefer-private-class-fields

	setMaxListeners() {
		//
	}

	emit(event, ...args) {
		const listeners = this._events[event];
		if (listeners) {
			for (const listener of listeners) {
				listener(...args);
			}
		}
	}

	on(event, listener) {
		this._events[event] ??= [];
		this._events[event].push(listener);
	}
};
