/**
 * OBS WebSocket v5 Adapter
 * 
 * Implements the OBSAdapter interface for OBS WebSocket protocol v5.x
 * Uses OpCode-based message format and event subscriptions.
 */

import { getAuthResponse } from '../auth'
import {
	OBSAdapter,
	OBSAdapterVersion,
	EventCallback,
	OBSEventType,
} from '../abstraction/adapter'
import {
	Scene,
	SceneItem,
	SceneItemProperties,
	RecordStatus,
	StreamStatus,
	Stats,
	VideoSettings,
	Transition,
	VersionInfo,
} from '../abstraction/types'

/**
 * OBS WebSocket v5 OpCodes
 */
enum OpCode {
	Hello = 0,           // Server -> Client: First message, contains auth info
	Identify = 1,        // Client -> Server: Auth response
	Identified = 2,      // Server -> Client: Auth success
	Reidentify = 3,      // Client -> Server: Update subscriptions
	Event = 5,           // Server -> Client: Event notification
	Request = 6,         // Client -> Server: Request
	RequestResponse = 7, // Server -> Client: Request response
	RequestBatch = 8,    // Client -> Server: Batch request
	RequestBatchResponse = 9, // Server -> Client: Batch response
}

/**
 * Event subscription flags for v5
 */
export enum EventSubscription {
	None = 0,
	General = 1 << 0,
	Config = 1 << 1,
	Scenes = 1 << 2,
	Inputs = 1 << 3,
	Transitions = 1 << 4,
	Filters = 1 << 5,
	Outputs = 1 << 6,
	SceneItems = 1 << 7,
	MediaInputs = 1 << 8,
	Vendors = 1 << 9,
	Ui = 1 << 10,
	All = (1 << 11) - 1,
	InputVolumeMeters = 1 << 16,
	InputActiveStateChanged = 1 << 17,
	InputShowStateChanged = 1 << 18,
	SceneItemTransformChanged = 1 << 19,
}

let requestIdCounter = 0

export class V5Adapter implements OBSAdapter {
	readonly version: OBSAdapterVersion = 5

	private socket: WebSocket | null = null
	private _connected = false
	private eventListeners: Map<string, Set<EventCallback>> = new Map()
	private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map()
	private helloData: any = null
	private password: string = ''

	get connected(): boolean {
		return this._connected
	}

	private generateRequestId(): string {
		return `v5-${++requestIdCounter}`
	}

	// =========================================================================
	// Connection
	// =========================================================================

	async connect(address: string, password?: string): Promise<void> {
		this.password = password || ''
		await this._openSocket(address)
	}

	private async _openSocket(address: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const wsUrl = `ws://${address}`
				this.socket = new WebSocket(wsUrl)

				const onError = () => {
					reject(new Error('WebSocket connection failed'))
				}

				const onOpen = () => {
					this.socket?.removeEventListener('error', onError)
					// Don't set connected yet - wait for Hello and authentication
				}

				this.socket.addEventListener('error', onError)
				this.socket.addEventListener('open', onOpen)

				this.socket.addEventListener('message', async (event) => {
					const message = JSON.parse(event.data)
					
					// Handle Hello message (first message from server)
					if (message.op === OpCode.Hello) {
						this.helloData = message.d
						try {
							await this._identify()
						} catch (err) {
							reject(err)
						}
						return
					}

					// Handle Identified message (auth success)
					if (message.op === OpCode.Identified) {
						this._connected = true
						this._emit('ConnectionOpened', {})
						this._emit('Identified', message.d)
						resolve()
						return
					}

					this._handleMessage(message)
				})

				this.socket.addEventListener('close', (event) => {
					this._connected = false
					this._emit('ConnectionClosed', {})
					
					// If we haven't resolved yet, this is a connection failure
					if (!this._connected) {
						reject({
							code: event.code,
							message: event.reason || 'Connection closed',
							error: event.reason || 'Connection closed',
						})
					}
				})
			} catch (error) {
				reject(error)
			}
		})
	}

	private async _identify(): Promise<void> {
		const identifyData: any = {
			rpcVersion: this.helloData.rpcVersion || 1,
			// Subscribe to all standard events
			eventSubscriptions: EventSubscription.All | EventSubscription.SceneItemTransformChanged,
		}

		// Handle authentication if required
		if (this.helloData.authentication) {
			const { challenge, salt } = this.helloData.authentication
			identifyData.authentication = await getAuthResponse(this.password, challenge, salt)
		}

		this._sendOp(OpCode.Identify, identifyData)
	}

	private _sendOp(opCode: OpCode, data: any): void {
		if (!this.socket) {
			throw new Error('Socket not available')
		}
		this.socket.send(JSON.stringify({ op: opCode, d: data }))
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.close()
			this.socket = null
		}
		this._connected = false
	}

	async getVersion(): Promise<VersionInfo> {
		return this._sendRequest('GetVersion', {}) as Promise<VersionInfo>
	}

	// =========================================================================
	// Scenes
	// =========================================================================

	async getSceneList(): Promise<{ currentProgramSceneName: string; currentPreviewSceneName?: string; scenes: Scene[] }> {
		const data = await this._sendRequest('GetSceneList', {})
		return {
			currentProgramSceneName: data.currentProgramSceneName,
			currentPreviewSceneName: data.currentPreviewSceneName,
			scenes: data.scenes.map((scene: any) => ({
				sceneName: scene.sceneName,
				sceneUuid: scene.sceneUuid,
				sceneIndex: scene.sceneIndex,
			})),
		}
	}

	async getCurrentProgramScene(): Promise<{ sceneName: string; sceneUuid?: string }> {
		const data = await this._sendRequest('GetCurrentProgramScene', {})
		return {
			sceneName: data.sceneName || data.currentProgramSceneName,
			sceneUuid: data.sceneUuid || data.currentProgramSceneUuid,
		}
	}

	async setCurrentProgramScene(sceneName: string): Promise<void> {
		await this._sendRequest('SetCurrentProgramScene', { sceneName })
	}

	// =========================================================================
	// Scene Items
	// =========================================================================

	async getSceneItemList(sceneName: string): Promise<SceneItem[]> {
		const data = await this._sendRequest('GetSceneItemList', { sceneName })
		return data.sceneItems.map((item: any) => ({
			sceneItemId: item.sceneItemId,
			sceneItemIndex: item.sceneItemIndex,
			sourceName: item.sourceName,
			sourceUuid: item.sourceUuid,
			sourceType: item.sourceType,
			inputKind: item.inputKind,
			isGroup: item.isGroup,
			sceneItemEnabled: item.sceneItemEnabled,
			sceneItemLocked: item.sceneItemLocked,
			sceneItemTransform: item.sceneItemTransform,
		}))
	}

	async getSceneItemProperties(sceneName: string, sceneItemId: number): Promise<SceneItemProperties> {
		const [enabledData, lockedData, transformData] = await Promise.all([
			this._sendRequest('GetSceneItemEnabled', { sceneName, sceneItemId }),
			this._sendRequest('GetSceneItemLocked', { sceneName, sceneItemId }),
			this._sendRequest('GetSceneItemTransform', { sceneName, sceneItemId }),
		])

		return {
			sceneName,
			sceneItemId,
			sourceName: transformData.sourceName || '',
			sceneItemEnabled: enabledData.sceneItemEnabled,
			sceneItemLocked: lockedData.sceneItemLocked,
			sceneItemTransform: transformData.sceneItemTransform,
		}
	}

	async setSceneItemEnabled(sceneName: string, sceneItemId: number, enabled: boolean): Promise<void> {
		await this._sendRequest('SetSceneItemEnabled', {
			sceneName,
			sceneItemId,
			sceneItemEnabled: enabled,
		})
	}

	async setSceneItemLocked(sceneName: string, sceneItemId: number, locked: boolean): Promise<void> {
		await this._sendRequest('SetSceneItemLocked', {
			sceneName,
			sceneItemId,
			sceneItemLocked: locked,
		})
	}

	// =========================================================================
	// Recording
	// =========================================================================

	async getRecordStatus(): Promise<RecordStatus> {
		return this._sendRequest('GetRecordStatus', {}) as Promise<RecordStatus>
	}

	async startRecord(): Promise<void> {
		await this._sendRequest('StartRecord', {})
	}

	async stopRecord(): Promise<void> {
		await this._sendRequest('StopRecord', {})
	}

	async toggleRecord(): Promise<void> {
		await this._sendRequest('ToggleRecord', {})
	}

	async pauseRecord(): Promise<void> {
		await this._sendRequest('PauseRecord', {})
	}

	async resumeRecord(): Promise<void> {
		await this._sendRequest('ResumeRecord', {})
	}

	// =========================================================================
	// Streaming
	// =========================================================================

	async getStreamStatus(): Promise<StreamStatus> {
		return this._sendRequest('GetStreamStatus', {}) as Promise<StreamStatus>
	}

	async startStream(): Promise<void> {
		await this._sendRequest('StartStream', {})
	}

	async stopStream(): Promise<void> {
		await this._sendRequest('StopStream', {})
	}

	async toggleStream(): Promise<void> {
		await this._sendRequest('ToggleStream', {})
	}

	// =========================================================================
	// Stats & Info
	// =========================================================================

	async getStats(): Promise<Stats> {
		return this._sendRequest('GetStats', {}) as Promise<Stats>
	}

	async getVideoSettings(): Promise<VideoSettings> {
		return this._sendRequest('GetVideoSettings', {}) as Promise<VideoSettings>
	}

	// =========================================================================
	// Screenshots
	// =========================================================================

	async getSourceScreenshot(
		sourceName: string,
		imageFormat: string,
		imageWidth?: number,
		imageHeight?: number
	): Promise<string> {
		const data = await this._sendRequest('GetSourceScreenshot', {
			sourceName,
			imageFormat,
			imageWidth,
			imageHeight,
		})
		return data.imageData // Extract from response wrapper
	}

	// =========================================================================
	// Transitions
	// =========================================================================

	async getCurrentSceneTransition(): Promise<Transition> {
		return this._sendRequest('GetCurrentSceneTransition', {}) as Promise<Transition>
	}

	// =========================================================================
	// Events
	// =========================================================================

	on<T = any>(eventType: OBSEventType | string, callback: EventCallback<T>): void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, new Set())
		}
		this.eventListeners.get(eventType)!.add(callback)
	}

	once<T = any>(eventType: OBSEventType | string, callback: EventCallback<T>): void {
		const wrapper: EventCallback<T> = (data) => {
			callback(data)
			this.off(eventType, wrapper)
		}
		this.on(eventType, wrapper)
	}

	off(eventType: OBSEventType | string, callback: EventCallback): void {
		const listeners = this.eventListeners.get(eventType)
		if (listeners) {
			listeners.delete(callback)
		}
	}

	private _emit(eventType: string, data: any): void {
		const listeners = this.eventListeners.get(eventType)
		if (listeners) {
			listeners.forEach(callback => {
				try {
					callback(data)
				} catch (error) {
					console.error(`Error in event listener for ${eventType}:`, error)
				}
			})
		}
	}

	// =========================================================================
	// Raw Access
	// =========================================================================

	async sendRaw(requestType: string, requestData?: any): Promise<any> {
		return this._sendRequest(requestType, requestData || {})
	}

	private async _sendRequest(requestType: string, requestData: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this._connected || !this.socket) {
				reject(new Error('Not connected'))
				return
			}

			const requestId = this.generateRequestId()

			this.pendingRequests.set(requestId, { resolve, reject })

			try {
				this._sendOp(OpCode.Request, {
					requestType,
					requestId,
					requestData,
				})
			} catch (error) {
				this.pendingRequests.delete(requestId)
				reject(error)
			}
		})
	}

	private _handleMessage(message: any): void {
		const { op, d } = message

		switch (op) {
			case OpCode.RequestResponse:
				this._handleRequestResponse(d)
				break
			case OpCode.Event:
				this._handleEvent(d)
				break
		}
	}

	private _handleRequestResponse(data: any): void {
		const { requestId, requestStatus, responseData } = data
		const pending = this.pendingRequests.get(requestId)

		if (pending) {
			this.pendingRequests.delete(requestId)
			
			if (requestStatus.result === true) {
				pending.resolve(responseData || {})
			} else {
				pending.reject({
					code: requestStatus.code,
					message: requestStatus.comment,
				})
			}
		}
	}

	private _handleEvent(data: any): void {
		const { eventType, eventData } = data
		this._emit(eventType, eventData || {})
	}
}

export default V5Adapter
