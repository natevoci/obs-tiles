/**
 * Native OBS WebSocket Client for OBS 4.9.1
 * Implements the OBS WebSocket protocol directly without external dependencies
 * Based on the working old-Socket.js implementation
 */

import { getAuthResponse } from './auth';

let messageIdCounter = 0;

/**
 * Create a data wrapper with a Proxy that warns about undefined property access
 * @private
 * @param {Object} data - The data object to wrap
 * @param {string} context - Context description (e.g., "SwitchScenes event", "GetSceneList request")
 * @returns {Proxy} - A Proxy wrapper that logs warnings for undefined properties
 */
function createDataProxy(data, context) {
	return new Proxy(data || {}, {
		get(target, prop) {
			const value = target[prop];
			
			// Only warn about undefined properties (not methods or existing properties)
			if (value === undefined && typeof prop === 'string' && !(prop in Object.prototype)) {
				const availableKeys = Object.keys(target);
				const keysStr = availableKeys.length > 0 
					? availableKeys.join(', ')
					: '(no properties)';
				
				console.warn(
					`[obs-websocket] Undefined property access in "${context}"\n` +
					`  Property: ${prop}\n` +
					`  Available: ${keysStr}`
				);
			}
			
			return value;
		}
	});
}

/**
 * OBSWebSocketClient class
 * Provides a complete WebSocket implementation for communicating with OBS Studio via the obs-websocket plugin
 */
export class OBSWebSocketClient {
	constructor() {
		this.socket = null;
		this.isConnected = false;
		this.eventListeners = new Map();
		this.address = null;
		this.password = null;
	}

	/**
	 * Generate unique message ID
	 * @private
	 */
	_generateMessageId() {
		return String(messageIdCounter++);
	}

	/**
	 * Connect to OBS WebSocket server
	 * @param {Object} options - Connection options
	 * @param {string} options.address - OBS server address (e.g., 'localhost:4444')
	 * @param {string} options.password - OBS server password
	 * @returns {Promise<void>}
	 */
	async connect(options) {
		const { address, password } = options;
		this.address = address;
		this.password = password || '';

		try {
			await this._connect(address, false);
			await this._authenticate(this.password);
		} catch (err) {
			if (this.socket) {
				this.socket.close();
			}
			this.isConnected = false;
			this._emit('error', err);
			throw err;
		}
	}

	/**
	 * Opens a WebSocket connection without authentication
	 * @private
	 */
	async _connect(address, secure) {
		return new Promise((resolve, reject) => {
			let settled = false;

			try {
				const wsUrl = (secure ? 'wss://' : 'ws://') + address;
				this.socket = new WebSocket(wsUrl);

				// Set up message handler BEFORE onopen to ensure we don't miss any messages
				this.socket.onmessage = (event) => {
					this._handleMessage(JSON.parse(event.data));
				};

				this.socket.onerror = (error) => {
					if (settled) {
						this._emit('error', new Error('WebSocket error: ' + error.message));
						return;
					}
					settled = true;
					reject(new Error('WebSocket connection failed: ' + error.message));
				};

				this.socket.onopen = () => {
					if (settled) {
						return;
					}
					this.isConnected = true;
					settled = true;
					this._emit('ConnectionOpened');
					resolve();
				};

				this.socket.onclose = () => {
					this.isConnected = false;
					this._emit('ConnectionClosed');
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Authenticate to OBS WebSocket server
	 * Must already have an active connection before calling this method
	 * @private
	 */
	async _authenticate(password = '') {
		if (!this.isConnected) {
			throw new Error('Not connected');
		}

		try {
			// First, get authentication requirements
			const authData = await this.send('GetAuthRequired');

			if (!authData['authRequired']) {
				this._emit('AuthenticationSuccess');
				return;
			}

			// Authentication is required, send Authenticate request
			const challenge = authData.challenge;
			const salt = authData.salt;

			const authResponse = await getAuthResponse(password, challenge, salt);
			await this.send('Authenticate', { auth: authResponse });

			this._emit('AuthenticationSuccess');
		} catch (err) {
			this._emit('AuthenticationFailure');
			throw err;
		}
	}

	/**
	 * Send a request to OBS and wait for response
	 * @param {string} requestType - The type of request (e.g., 'GetVersion', 'GetCurrentScene')
	 * @param {Object} requestData - The request data/parameters
	 * @returns {Promise<Object>} - Response data
	 */
	send(requestType, requestData = {}) {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error('Not connected'));
				return;
			}

			const messageId = this._generateMessageId();
			const message = {
				'request-type': requestType,
				'message-id': messageId,
				...requestData
			};

			// Register a one-time listener for this messageId
			const handler = (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			};

			this.once(`obs:internal:message:id-${messageId}`, handler);

			try {
				this.socket.send(JSON.stringify(message));
			} catch (error) {
				// Remove the handler if send fails
				this.removeListener(`obs:internal:message:id-${messageId}`, handler);
				reject(error);
			}
		});
	}

	/**
	 * Send a request to OBS with callback
	 * @param {string} requestType - The type of request (e.g., 'GetVersion', 'GetCurrentScene')
	 * @param {Object} requestData - The request data/parameters
	 * @param {Function} callback - Callback function(error, data)
	 */
	sendCallback(requestType, requestData, callback) {
		// Allow the `requestData` argument to be omitted
		if (callback === undefined && typeof requestData === 'function') {
			callback = requestData;
			requestData = {};
		}

		this.send(requestType, requestData).then((response) => {
			const wrappedData = createDataProxy(response, `${requestType} request`);
			callback(null, wrappedData);
		}).catch(error => {
			callback(error);
		});
	}

	/**
	 * Register an event listener
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} listener - Listener function
	 */
	on(eventType, listener) {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, []);
		}
		this.eventListeners.get(eventType).push(listener);
	}

	/**
	 * Register a one-time event listener
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} listener - Listener function
	 */
	once(eventType, listener) {
		const wrapper = (...args) => {
			listener(...args);
			this.removeListener(eventType, wrapper);
		};
		this.on(eventType, wrapper);
	}

	/**
	 * Remove an event listener
	 * @param {string} eventType - Event type
	 * @param {Function} listener - Listener function to remove
	 */
	removeListener(eventType, listener) {
		if (!this.eventListeners.has(eventType)) {
			return;
		}
		const listeners = this.eventListeners.get(eventType);
		const index = listeners.indexOf(listener);
		if (index > -1) {
			listeners.splice(index, 1);
		}
	}

	/**
	 * Emit an event to all registered listeners
	 * @private
	 */
	_emit(eventType, ...args) {
		const listeners = this.eventListeners.get(eventType) || [];
		listeners.forEach(listener => {
			try {
				listener(...args);
			} catch (error) {
				console.error(`Error in event listener for ${eventType}:`, error);
			}
		});
	}

	/**
	 * Handle incoming WebSocket messages
	 * @private
	 */
	_handleMessage(message) {
		const messageId = message['message-id'];
		const updateType = message['update-type'];
		const status = message.status;

		// Check if this is a response to a request
		if (messageId) {
			let err = null;
			let data = null;

			if (status === 'error') {
				err = message;
			} else {
				data = message;
			}

			// Emit the message with ID for promise/callback resolution
			this._emit(`obs:internal:message:id-${messageId}`, err, data);
		}
		// Check if this is an event notification
		else if (updateType) {
			// Wrap event data with proxy for undefined property warnings
			const wrappedData = createDataProxy(message, `${updateType} event`);
			this._emit(updateType, wrappedData);
		}
	}

	/**
	 * Disconnect from OBS WebSocket server
	 */
	disconnect() {
		if (this.socket) {
			this.socket.close();
		}
	}
}

export default OBSWebSocketClient;
