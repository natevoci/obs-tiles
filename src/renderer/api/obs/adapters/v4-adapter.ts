/**
 * OBS WebSocket v4 Adapter
 * 
 * Implements the OBSAdapter interface for OBS WebSocket protocol v4.9.1
 * Translates kebab-case responses to camelCase and maps v4 events to v5 event names.
 */

import { getAuthResponse } from '../auth'
import { camelCaseKeys } from '../util/camelCaseKeys'
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
 * Event mapping from v4 event names to v5 unified event names
 */
const V4_TO_V5_EVENT_MAP: Record<string, OBSEventType> = {
	'SwitchScenes': 'CurrentProgramSceneChanged',
	'PreviewSceneChanged': 'CurrentPreviewSceneChanged',
	'ScenesChanged': 'SceneListChanged',
	'SceneItemAdded': 'SceneItemCreated',
	'SceneItemRemoved': 'SceneItemRemoved',
	'SourceOrderChanged': 'SceneItemListReindexed',
	'SceneItemVisibilityChanged': 'SceneItemEnableStateChanged',
	'SceneItemLockChanged': 'SceneItemLockStateChanged',
	'SceneItemSelected': 'SceneItemSelected',
	'SceneItemTransformChanged': 'SceneItemTransformChanged',
	'StreamStarting': 'StreamStateChanged',
	'StreamStarted': 'StreamStateChanged',
	'StreamStopping': 'StreamStateChanged',
	'StreamStopped': 'StreamStateChanged',
	'RecordingStarting': 'RecordStateChanged',
	'RecordingStarted': 'RecordStateChanged',
	'RecordingStopping': 'RecordStateChanged',
	'RecordingStopped': 'RecordStateChanged',
	'RecordingPaused': 'RecordStateChanged',
	'RecordingResumed': 'RecordStateChanged',
	'TransitionBegin': 'SceneTransitionStarted',
	'TransitionEnd': 'SceneTransitionEnded',
	'TransitionVideoEnd': 'SceneTransitionVideoEnded',
	'SwitchTransition': 'CurrentSceneTransitionChanged',
	'TransitionDurationChanged': 'CurrentSceneTransitionDurationChanged',
}

/**
 * Reverse mapping for subscribing to v4 events when user subscribes to v5 event names
 */
const V5_TO_V4_EVENT_MAP: Record<string, string[]> = {}
for (const [v4Event, v5Event] of Object.entries(V4_TO_V5_EVENT_MAP)) {
	if (!V5_TO_V4_EVENT_MAP[v5Event]) {
		V5_TO_V4_EVENT_MAP[v5Event] = []
	}
	V5_TO_V4_EVENT_MAP[v5Event].push(v4Event)
}

let messageIdCounter = 0

export class V4Adapter implements OBSAdapter {
	readonly version: OBSAdapterVersion = 4

	private socket: WebSocket | null = null
	private _connected = false
	private eventListeners: Map<string, Set<EventCallback>> = new Map()
	private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map()

	get connected(): boolean {
		return this._connected
	}

	private generateMessageId(): string {
		return `v4-${++messageIdCounter}`
	}

	// =========================================================================
	// Connection
	// =========================================================================

	async connect(address: string, password?: string): Promise<void> {
		await this._openSocket(address)
		await this._authenticate(password || '')
	}

	private async _openSocket(address: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const wsUrl = `ws://${address}`
				console.debug('[v4-adapter] Connecting to:', wsUrl)
				this.socket = new WebSocket(wsUrl)

				const onError = (_error: Event) => {
					console.debug('[v4-adapter] Connection error')
					reject(new Error('WebSocket connection failed'))
				}

				const onOpen = () => {
					console.debug('[v4-adapter] Connection opened')
					this.socket?.removeEventListener('error', onError)
					this._connected = true
					this._emit('ConnectionOpened', {})
					resolve()
				}

				this.socket.addEventListener('error', onError)
				this.socket.addEventListener('open', onOpen)

				this.socket.addEventListener('message', (event) => {
					this._handleMessage(JSON.parse(event.data))
				})

				this.socket.addEventListener('close', () => {
					console.debug('[v4-adapter] Connection closed')
					this._connected = false
					this._emit('ConnectionClosed', {})
				})
			} catch (error) {
				reject(error)
			}
		})
	}

	private async _authenticate(password: string): Promise<void> {
		const authData = await this._sendRaw('GetAuthRequired', {})
		console.debug('[v4-adapter] Auth required:', authData.authRequired)

		if (!authData.authRequired) {
			console.debug('[v4-adapter] No auth required, identified')
			this._emit('Identified', {})
			return
		}

		console.debug('[v4-adapter] Authenticating...')
		const authResponse = await getAuthResponse(password, authData.challenge, authData.salt)
		await this._sendRaw('Authenticate', { auth: authResponse })
		console.debug('[v4-adapter] Authenticated successfully')
		this._emit('Identified', {})
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.close()
			this.socket = null
		}
		this._connected = false
	}

	async getVersion(): Promise<VersionInfo> {
		const data = await this._sendRaw('GetVersion', {})
		return {
			obsVersion: data['obs-studio-version'],
			obsWebSocketVersion: data['obs-websocket-version'],
			availableRequests: data['available-requests']?.split(','),
			supportedImageFormats: data['supported-image-export-formats']?.split(','),
		}
	}

	// =========================================================================
	// Scenes
	// =========================================================================

	async getSceneList(): Promise<{ currentProgramSceneName: string; currentPreviewSceneName?: string; scenes: Scene[] }> {
		const data = await this._sendRaw('GetSceneList', {})
		const normalized = camelCaseKeys(data)
		
		return {
			currentProgramSceneName: normalized.currentScene,
			scenes: normalized.scenes.map((scene: any) => ({
				sceneName: scene.name,
				sceneIndex: normalized.scenes.indexOf(scene),
			})),
		}
	}

	async getCurrentProgramScene(): Promise<{ sceneName: string; sceneUuid?: string }> {
		const data = await this._sendRaw('GetCurrentScene', {})
		const normalized = camelCaseKeys(data)
		return {
			sceneName: normalized.name,
		}
	}

	async setCurrentProgramScene(sceneName: string): Promise<void> {
		await this._sendRaw('SetCurrentScene', { 'scene-name': sceneName })
	}

	// =========================================================================
	// Scene Items
	// =========================================================================

	async getSceneItemList(sceneName: string): Promise<SceneItem[]> {
		const data = await this._sendRaw('GetSceneItemList', { sceneName })
		const normalized = camelCaseKeys(data)
		
		return normalized.sceneItems.map((item: any) => ({
			sceneItemId: item.itemId,
			sceneItemIndex: item.sourceOrder || 0,
			sourceName: item.sourceName,
			sourceType: item.sourceType,
			inputKind: item.sourceKind,
			isGroup: item.isGroup,
			sceneItemEnabled: item.render !== false,
			sceneItemLocked: item.locked === true,
		}))
	}

	async getSceneItemProperties(sceneName: string, sceneItemId: number): Promise<SceneItemProperties> {
		// v4 uses item name or item id via 'item' field
		const data = await this._sendRaw('GetSceneItemProperties', {
			'scene-name': sceneName,
			'item': { id: sceneItemId },
		})
		const normalized = camelCaseKeys(data)

		return {
			sceneName,
			sceneItemId,
			sourceName: normalized.name,
			sceneItemEnabled: normalized.visible !== false,
			sceneItemLocked: normalized.locked === true,
			sceneItemTransform: {
				positionX: normalized.position?.x,
				positionY: normalized.position?.y,
				rotation: normalized.rotation,
				scaleX: normalized.scale?.x,
				scaleY: normalized.scale?.y,
				width: normalized.width,
				height: normalized.height,
				sourceWidth: normalized.sourceWidth,
				sourceHeight: normalized.sourceHeight,
				boundsType: normalized.bounds?.type,
				boundsWidth: normalized.bounds?.x,
				boundsHeight: normalized.bounds?.y,
				cropLeft: normalized.crop?.left,
				cropRight: normalized.crop?.right,
				cropTop: normalized.crop?.top,
				cropBottom: normalized.crop?.bottom,
			},
		}
	}

	async setSceneItemEnabled(sceneName: string, sceneItemId: number, enabled: boolean): Promise<void> {
		await this._sendRaw('SetSceneItemProperties', {
			'scene-name': sceneName,
			'item': { id: sceneItemId },
			'visible': enabled,
		})
	}

	async setSceneItemLocked(sceneName: string, sceneItemId: number, locked: boolean): Promise<void> {
		await this._sendRaw('SetSceneItemProperties', {
			'scene-name': sceneName,
			'item': { id: sceneItemId },
			'locked': locked,
		})
	}

	async setSceneItemIndex(sceneName: string, sceneItemId: number, sceneItemIndex: number): Promise<void> {
		// v4 uses ReorderSceneItems which requires the full list of items in desired order
		// First get the current list of items
		const items = await this.getSceneItemList(sceneName)
		
		// Remove the target item from the list
		const filteredItems = items.filter(item => item.sceneItemId !== sceneItemId)
		
		// Insert it at the desired index
		const v4Index = Math.max(0, Math.min(sceneItemIndex, filteredItems.length))
		const reorderedItems = [
            ...filteredItems.slice(0, v4Index).map(item => ({ id: item.sceneItemId })),
			{ id: sceneItemId },
			...filteredItems.slice(v4Index).map(item => ({ id: item.sceneItemId })),
		]
		
        // Note: v4's ReorderSceneItems uses 0 = first/top, v5 uses 0 = bottom
		await this._sendRaw('ReorderSceneItems', {
			scene: sceneName,
			items: reorderedItems.reverse(), // Reverse for v4 ordering
		})
	}

	// =========================================================================
	// Recording
	// =========================================================================

	async getRecordStatus(): Promise<RecordStatus> {
		const data = await this._sendRaw('GetStreamingStatus', {})
		const normalized = camelCaseKeys(data)
		
		return {
			outputActive: normalized.recording === true,
			outputPaused: normalized.recordingPaused === true,
			outputTimecode: normalized.recTimecode,
			outputBytes: normalized.bytesRecorded,
		}
	}

	async startRecord(): Promise<void> {
		await this._sendRaw('StartRecording', {})
	}

	async stopRecord(): Promise<void> {
		await this._sendRaw('StopRecording', {})
	}

	async toggleRecord(): Promise<void> {
		await this._sendRaw('StartStopRecording', {})
	}

	// =========================================================================
	// Streaming
	// =========================================================================

	async getStreamStatus(): Promise<StreamStatus> {
		const data = await this._sendRaw('GetStreamingStatus', {})
		const normalized = camelCaseKeys(data)
		
		return {
			outputActive: normalized.streaming === true,
			outputTimecode: normalized.streamTimecode,
			outputBytes: normalized.bytesPerSec,
			outputTotalFrames: normalized.totalStreamTime,
		}
	}

	async startStream(): Promise<void> {
		await this._sendRaw('StartStreaming', {})
	}

	async stopStream(): Promise<void> {
		await this._sendRaw('StopStreaming', {})
	}

	async toggleStream(): Promise<void> {
		await this._sendRaw('StartStopStreaming', {})
	}

	// =========================================================================
	// Stats & Info
	// =========================================================================

	async getStats(): Promise<Stats> {
		const data = await this._sendRaw('GetStats', {})
		const normalized = camelCaseKeys(data)
		const stats = normalized.stats || normalized
		
		return {
			cpuUsage: stats.cpuUsage,
			memoryUsage: stats.memoryUsage,
			availableDiskSpace: stats.freeDiskSpace,
			activeFps: stats.fps,
			averageFrameRenderTime: stats.averageFrameTime,
			renderSkippedFrames: stats.renderMissedFrames,
			renderTotalFrames: stats.renderTotalFrames,
			outputSkippedFrames: stats.outputSkippedFrames,
			outputTotalFrames: stats.outputTotalFrames,
		}
	}

	async getVideoSettings(): Promise<VideoSettings> {
		const data = await this._sendRaw('GetVideoInfo', {})
		const normalized = camelCaseKeys(data)
		
		return {
			fpsNumerator: normalized.fps,
			fpsDenominator: 1,
			baseWidth: normalized.baseWidth,
			baseHeight: normalized.baseHeight,
			outputWidth: normalized.outputWidth,
			outputHeight: normalized.outputHeight,
		}
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
		const data = await this._sendRaw('TakeSourceScreenshot', {
			sourceName,
			embedPictureFormat: imageFormat,
			width: imageWidth,
			height: imageHeight,
		})
		const normalized = camelCaseKeys(data)
		return normalized.img
	}

	// =========================================================================
	// Transitions
	// =========================================================================

	async getCurrentSceneTransition(): Promise<Transition> {
		const data = await this._sendRaw('GetCurrentTransition', {})
		const normalized = camelCaseKeys(data)
		
		return {
			transitionName: normalized.name,
			transitionDuration: normalized.duration,
		}
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
		return this._sendRaw(requestType, requestData || {})
	}

	private async _sendRaw(requestType: string, requestData: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this._connected || !this.socket) {
				reject(new Error('Not connected'))
				return
			}

			const messageId = this.generateMessageId()
			const message = {
				'request-type': requestType,
				'message-id': messageId,
				...requestData,
			}
			console.debug('[v4-adapter] Sending request:', requestType, messageId, requestData)

			this.pendingRequests.set(messageId, { resolve, reject })

			try {
				this.socket.send(JSON.stringify(message))
			} catch (error) {
				this.pendingRequests.delete(messageId)
				reject(error)
			}
		})
	}

	private _handleMessage(message: any): void {
		const messageId = message['message-id']
		const updateType = message['update-type']

		// Handle request responses
		if (messageId) {
			const pending = this.pendingRequests.get(messageId)
			if (pending) {
				this.pendingRequests.delete(messageId)
				if (message.status === 'error') {
					console.debug('[v4-adapter] Request failed:', messageId, message.error)
					pending.reject(message)
				} else {
					console.debug('[v4-adapter] Request success:', messageId)
					pending.resolve(camelCaseKeys(message))
				}
			}
			return
		}

		// Handle events
		if (updateType) {
			const normalizedData = this._normalizeEventData(updateType, camelCaseKeys(message))
			console.debug('[v4-adapter] Event received:', updateType, '->', V4_TO_V5_EVENT_MAP[updateType] || updateType)
			
			// Emit with original v4 event name (for backward compatibility)
			this._emit(updateType, normalizedData)

			// Emit with v5 event name
			const v5EventType = V4_TO_V5_EVENT_MAP[updateType]
			if (v5EventType) {
				this._emit(v5EventType, normalizedData)
			}
		}
	}

	/**
	 * Normalize v4 event data to v5 format
	 */
	private _normalizeEventData(eventType: string, data: any): any {
		switch (eventType) {
			case 'SwitchScenes':
				return {
					sceneName: data.sceneName,
					sources: data.sources,
				}
			
			case 'SceneItemVisibilityChanged':
				return {
					sceneName: data.sceneName,
					sceneItemId: data.itemId,
					sceneItemEnabled: data.itemVisible,
				}
			
			case 'SceneItemLockChanged':
				return {
					sceneName: data.sceneName,
					sceneItemId: data.itemId,
					sceneItemLocked: data.itemLocked,
				}

			case 'SceneItemAdded':
				return {
					sceneName: data.sceneName,
					sourceName: data.itemName,
					sceneItemId: data.itemId,
				}

			case 'SceneItemRemoved':
				return {
					sceneName: data.sceneName,
					sourceName: data.itemName,
					sceneItemId: data.itemId,
				}

			case 'StreamStarting':
				return { outputActive: false, outputState: 'OBS_WEBSOCKET_OUTPUT_STARTING' }
			case 'StreamStarted':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED' }
			case 'StreamStopping':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPING' }
			case 'StreamStopped':
				return { outputActive: false, outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED' }

			case 'RecordingStarting':
				return { outputActive: false, outputState: 'OBS_WEBSOCKET_OUTPUT_STARTING' }
			case 'RecordingStarted':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED' }
			case 'RecordingStopping':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPING' }
			case 'RecordingStopped':
				return { outputActive: false, outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED' }
			case 'RecordingPaused':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_PAUSED' }
			case 'RecordingResumed':
				return { outputActive: true, outputState: 'OBS_WEBSOCKET_OUTPUT_RESUMED' }

			case 'TransitionBegin':
				return {
					transitionName: data.name,
					fromSceneName: data.fromScene,
					toSceneName: data.toScene,
				}

			case 'TransitionEnd':
			case 'TransitionVideoEnd':
				return {
					transitionName: data.name,
				}

			default:
				return data
		}
	}
}

export default V4Adapter
