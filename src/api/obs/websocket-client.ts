import { getAuthResponse } from './auth'

let messageIdCounter = 0

function createDataProxy(data: any, context: string): any {
	return new Proxy(data || {}, {
		get(target, prop) {
			const value = target[prop]
			
			if (value === undefined && typeof prop === 'string' && !(prop in Object.prototype)) {
				const availableKeys = Object.keys(target)
				const keysStr = availableKeys.length > 0 
					? availableKeys.join(', ')
					: '(no properties)'
				
				console.warn(
					`[obs-websocket] Undefined property access in "${context}"\n` +
					`  Property: ${prop}\n` +
					`  Available: ${keysStr}`
				)
			}
			
			return value
		}
	})
}

/**
 * OBSWebSocketClient class
 * Provides a complete WebSocket implementation for communicating with OBS Studio via the obs-websocket plugin
 */
export class OBSWebSocketClient {
	private socket: WebSocket | null = null
	private isConnected = false
	private eventListeners: Map<string, Function[]> = new Map()
	private password: string | null = null

	/**
	 * Generate unique message ID
	 * @private
	 */
	private _generateMessageId(): string {
		return String(messageIdCounter++)
	}

	/**
	 * Connect to OBS WebSocket server
	 * @param {Object} options - Connection options
	 * @param {string} options.address - OBS server address (e.g., 'localhost:4444')
	 * @param {string} options.password - OBS server password
	 * @returns {Promise<void>}
	 */
	async connect(options: { address: string; password?: string }): Promise<void> {
		const { address, password } = options
		this.password = password || ''

		try {
			await this._connect(address, false)
			await this._authenticate(this.password)
		} catch (err) {
			if (this.socket) {
				this.socket.close()
			}
			this.isConnected = false
			this._emit('error', err)
			throw err
		}
	}

	/**
	 * Opens a WebSocket connection without authentication
	 * @private
	 */
	private async _connect(address: string, secure: boolean): Promise<void> {
		return new Promise((resolve, reject) => {
			let settled = false

			try {
				const wsUrl = (secure ? 'wss://' : 'ws://') + address
				this.socket = new WebSocket(wsUrl)

				this.socket.onmessage = (event) => {
					this._handleMessage(JSON.parse(event.data))
				}

				this.socket.onerror = (error) => {
					if (settled) {
						this._emit('error', new Error('WebSocket error: ' + error))
						return
					}
					settled = true
					reject(new Error('WebSocket connection failed'))
				}

				this.socket.onopen = () => {
					if (settled) {
						return
					}
					this.isConnected = true
					settled = true
					this._emit('ConnectionOpened')
					resolve()
				}

				this.socket.onclose = () => {
					this.isConnected = false
					this._emit('ConnectionClosed')
				}
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Authenticate to OBS WebSocket server
	 * Must already have an active connection before calling this method
	 * @private
	 */
	private async _authenticate(password: string = ''): Promise<void> {
		if (!this.isConnected) {
			throw new Error('Not connected')
		}

		try {
			const authData = await this.send('GetAuthRequired', {})

			if (!authData['authRequired']) {
				this._emit('AuthenticationSuccess')
				return
			}

			const challenge = authData.challenge
			const salt = authData.salt

			const authResponse = await getAuthResponse(password, challenge, salt)
			await this.send('Authenticate', { auth: authResponse })

			this._emit('AuthenticationSuccess')
		} catch (err) {
			this._emit('AuthenticationFailure')
			throw err
		}
	}

	/**
	 * Send a request to OBS and wait for response
	 * @param {string} requestType - The type of request (e.g., 'GetVersion', 'GetCurrentScene')
	 * @param {Object} requestData - The request data/parameters
	 * @returns {Promise<Object>} - Response data
	 */
	send(requestType: string, requestData: any = {}): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error('Not connected'))
				return
			}

			const messageId = this._generateMessageId()
			const message = {
				'request-type': requestType,
				'message-id': messageId,
				...requestData
			}

			const handler = (err: any, data: any) => {
				if (err) {
					reject(err)
				} else {
					resolve(data)
				}
			}

			this.once(`obs:internal:message:id-${messageId}`, handler)

			try {
				if (!this.socket) throw new Error('Socket not available')
				this.socket.send(JSON.stringify(message))
			} catch (error) {
				this.removeListener(`obs:internal:message:id-${messageId}`, handler)
				reject(error)
			}
		})
	}

	/**
	 * Send a request to OBS with callback
	 * @param {string} requestType - The type of request (e.g., 'GetVersion', 'GetCurrentScene')
	 * @param {Object} requestData - The request data/parameters
	 * @param {Function} callback - Callback function(error, data)
	 */
	sendCallback(requestType: string, requestData: any, callback: Function): void {
		if (callback === undefined && typeof requestData === 'function') {
			callback = requestData
			requestData = {}
		}

		this.send(requestType, requestData).then((response) => {
			const wrappedData = createDataProxy(response, `${requestType} request`)
			callback(null, wrappedData)
		}).catch(error => {
			callback(error)
		})
	}

	/**
	 * Register an event listener
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} listener - Listener function
	 */
	on(eventType: string, listener: Function): void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, [])
		}
		this.eventListeners.get(eventType)!.push(listener)
	}

	/**
	 * Register a one-time event listener
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} listener - Listener function
	 */
	once(eventType: string, listener: Function): void {
		const wrapper = (...args: any[]) => {
			listener(...args)
			this.removeListener(eventType, wrapper)
		}
		this.on(eventType, wrapper)
	}

	/**
	 * Remove an event listener
	 * @param {string} eventType - Event type
	 * @param {Function} listener - Listener function to remove
	 */
	removeListener(eventType: string, listener: Function): void {
		if (!this.eventListeners.has(eventType)) {
			return
		}
		const listeners = this.eventListeners.get(eventType)!
		const index = listeners.indexOf(listener)
		if (index > -1) {
			listeners.splice(index, 1)
		}
	}

	/**
	 * Emit an event to all registered listeners
	 * @private
	 */
	private _emit(eventType: string, ...args: any[]): void {
		const listeners = this.eventListeners.get(eventType) || []
		listeners.forEach(listener => {
			try {
				listener(...args)
			} catch (error) {
				console.error(`Error in event listener for ${eventType}:`, error)
			}
		})
	}

	/**
	 * Handle incoming WebSocket messages
	 * @private
	 */
	private _handleMessage(message: any): void {
		const messageId = message['message-id']
		const updateType = message['update-type']
		const status = message.status

		if (messageId) {
			let err = null
			let data = null

			if (status === 'error') {
				err = message
			} else {
				data = message
			}

			this._emit(`obs:internal:message:id-${messageId}`, err, data)
		}
		else if (updateType) {
			const wrappedData = createDataProxy(message, `${updateType} event`)
			this._emit(updateType, wrappedData)
		}
	}

	/**
	 * Disconnect from OBS WebSocket server
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.close()
		}
	}
}

export default OBSWebSocketClient
