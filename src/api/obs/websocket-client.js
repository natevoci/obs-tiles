/**
 * Native OBS WebSocket Client for OBS 4.9.1
 * Implements the OBS WebSocket protocol directly without external dependencies
 */

import { getAuthResponse } from './auth';

const MESSAGE_ID_PREFIX = 'msg-';
let messageIdCounter = 0;

/**
 * OBS WebSocket Client class
 * Provides a complete WebSocket implementation for communicating with OBS Studio via the obs-websocket plugin
 */
export class OBSWebSocketClient {
	constructor() {
		this.socket = null;
		this.isConnected = false;
		this.isAuthenticated = false;
		this.messageCallbacks = new Map();
		this.eventListeners = new Map();
		this.pendingRequests = new Map();
		this.address = null;
		this.password = null;
		this.connectionPromise = null;
		this.resolveConnection = null;
	}

	/**
	 * Connect to OBS WebSocket server
	 * @param {Object} options - Connection options
	 * @param {string} options.address - OBS server address (e.g., 'localhost:4444')
	 * @param {string} options.password - OBS server password
	 * @returns {Promise<void>}
	 */
	connect(options) {
		return new Promise((resolve, reject) => {
			const { address, password } = options;
			this.address = address;
			this.password = password || '';
			this.resolveConnection = resolve;

			try {
				const wsUrl = `ws://${address}`;
				this.socket = new WebSocket(wsUrl);

				this.socket.onopen = () => {
					this.isConnected = true;
				};

				this.socket.onmessage = (event) => {
					this._handleMessage(JSON.parse(event.data));
				};

				this.socket.onerror = (error) => {
					const err = new Error('WebSocket error');
					err.error = error.message;
					this._emit('error', err);
					reject(err);
				};

				this.socket.onclose = () => {
					this.isConnected = false;
					this.isAuthenticated = false;
					this._emit('ConnectionClosed', {});
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Disconnect from OBS WebSocket server
	 */
	disconnect() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
		this.isConnected = false;
		this.messageCallbacks.clear();
		this.pendingRequests.clear();
	}

	/**
	 * Send a request to OBS and get a callback when response arrives
	 * @param {string} requestType - The type of request (e.g., 'GetVersion', 'GetCurrentScene')
	 * @param {Object} requestData - The request data/parameters
	 * @param {Function} callback - Callback function(error, data)
	 */
	sendCallback(requestType, requestData, callback) {
		if (!this.isConnected || !this.isAuthenticated) {
			callback(new Error('Not connected or not authenticated'), null);
			return;
		}

		const messageId = MESSAGE_ID_PREFIX + (messageIdCounter++);
		const message = {
			'request-type': requestType,
			'message-id': messageId,
			...requestData
		};

		this.messageCallbacks.set(messageId, callback);
		this.pendingRequests.set(messageId, { requestType, requestData });

		try {
			this.socket.send(JSON.stringify(message));
		} catch (error) {
			this.messageCallbacks.delete(messageId);
			this.pendingRequests.delete(messageId);
			callback(error, null);
		}
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
	 * Emit an event to all registered listeners
	 * @private
	 */
	_emit(eventType, data) {
		const listeners = this.eventListeners.get(eventType) || [];
		listeners.forEach(listener => {
			try {
				listener(data);
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
		if (messageId && messageId.startsWith(MESSAGE_ID_PREFIX)) {
			const callback = this.messageCallbacks.get(messageId);
			if (callback) {
				this.messageCallbacks.delete(messageId);
				this.pendingRequests.delete(messageId);

				if (status === 'ok') {
					callback(null, message);
				} else {
					const error = new Error(message.error || 'Request failed');
					error.error = message.error;
					callback(error, null);
				}
			}
		}
		// Check if this is an event notification
		else if (updateType) {
			// First, handle authentication if needed
			if (updateType === 'Hello') {
				this._handleHelloMessage(message);
			} else {
				// Emit the event with the original message data
				this._emit(updateType, message);
			}
		}
	}

	/**
	 * Handle the initial Hello message from OBS (authentication challenge)
	 * @private
	 */
	_handleHelloMessage(message) {
		const authRequired = message['auth-required'];

		if (!authRequired) {
			// No authentication required, we're ready to go
			this.isAuthenticated = true;
			this._resolveConnectionIfReady();
			return;
		}

		// Authentication is required
		const challenge = message.challenge;
		const salt = message.salt;

		try {
			getAuthResponse(this.password, challenge, salt).then(authResponse => {
				this._sendAuthenticateMessage(authResponse);
				// Wait for the Authenticate response to confirm success
			}).catch(error => {
				this._emit('error', new Error('Authentication failed: ' + error.message));
			});
		} catch (error) {
			this._emit('error', new Error('Authentication failed: ' + error.message));
		}
	}

	/**
	 * Send authentication message
	 * @private
	 */
	_sendAuthenticateMessage(authResponse) {
		const message = {
			'request-type': 'Authenticate',
			'message-id': MESSAGE_ID_PREFIX + (messageIdCounter++)
		};

		if (authResponse) {
			message.auth = authResponse;
		}

		// Register callback to wait for authentication response
		const messageId = message['message-id'];
		this.messageCallbacks.set(messageId, (err, data) => {
			if (err) {
				this._emit('error', new Error('Authentication failed: ' + err.message));
			} else {
				this.isAuthenticated = true;
				this._resolveConnectionIfReady();
			}
		});

		this.socket.send(JSON.stringify(message));
	}

	/**
	 * Resolve connection promise if authentication is complete
	 * @private
	 */
	_resolveConnectionIfReady() {
		if (this.isConnected && this.isAuthenticated && this.resolveConnection) {
			this.resolveConnection();
			this.resolveConnection = null;
		}
	}
}

export default OBSWebSocketClient;
