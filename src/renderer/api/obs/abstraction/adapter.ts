/**
 * OBS WebSocket Adapter Interface
 * 
 * This interface defines the contract that both v4 and v5 adapters must implement.
 * Method names and data structures follow v5 conventions.
 */

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
} from './types'

export type OBSAdapterVersion = 4 | 5

export type EventCallback<T = any> = (data: T) => void
export type ErrorCallback = (error: any) => void

/**
 * Unified event names (v5-style)
 * v4 adapters will map their events to these names
 */
export type OBSEventType =
	// General
	| 'ConnectionOpened'
	| 'ConnectionClosed'
	| 'ConnectionError'
	| 'Identified'
	// Scenes
	| 'CurrentProgramSceneChanged'
	| 'CurrentPreviewSceneChanged'
	| 'SceneListChanged'
	| 'SceneCreated'
	| 'SceneRemoved'
	| 'SceneNameChanged'
	// Scene Items
	| 'SceneItemCreated'
	| 'SceneItemRemoved'
	| 'SceneItemListReindexed'
	| 'SceneItemEnableStateChanged'
	| 'SceneItemLockStateChanged'
	| 'SceneItemSelected'
	| 'SceneItemTransformChanged'
	// Outputs
	| 'StreamStateChanged'
	| 'RecordStateChanged'
	// Inputs
	| 'InputVolumeChanged'
	| 'InputMuteStateChanged'
	| 'InputVolumeMeters'
	// Transitions
	| 'SceneTransitionStarted'
	| 'SceneTransitionEnded'
	| 'SceneTransitionVideoEnded'
	| 'CurrentSceneTransitionChanged'
	| 'CurrentSceneTransitionDurationChanged'

/**
 * OBS WebSocket Adapter Interface
 * 
 * All methods use Promises for async operations.
 * Event handling uses a pub/sub pattern with unified event names.
 */
export interface OBSAdapter {
	/** The API version this adapter implements */
	readonly version: OBSAdapterVersion

	/** Whether the adapter is currently connected */
	readonly connected: boolean

	// =========================================================================
	// Connection
	// =========================================================================

	/**
	 * Connect to OBS WebSocket server
	 * @param address - Server address (e.g., 'localhost:4455')
	 * @param password - Optional password for authentication
	 */
	connect(address: string, password?: string): Promise<void>

	/**
	 * Disconnect from OBS WebSocket server
	 */
	disconnect(): void

	/**
	 * Get version information about OBS and the WebSocket server
	 */
	getVersion(): Promise<VersionInfo>

	// =========================================================================
	// Scenes
	// =========================================================================

	/**
	 * Get list of all scenes
	 */
	getSceneList(): Promise<{ currentProgramSceneName: string; currentPreviewSceneName?: string; scenes: Scene[] }>

	/**
	 * Get the current program scene
	 */
	getCurrentProgramScene(): Promise<{ sceneName: string; sceneUuid?: string }>

	/**
	 * Set the current program scene
	 * @param sceneName - Name of the scene to switch to
	 */
	setCurrentProgramScene(sceneName: string): Promise<void>

	// =========================================================================
	// Scene Items
	// =========================================================================

	/**
	 * Get list of scene items in a scene
	 * @param sceneName - Name of the scene
	 */
	getSceneItemList(sceneName: string): Promise<SceneItem[]>

	/**
	 * Get properties of a scene item
	 * @param sceneName - Name of the scene
	 * @param sceneItemId - ID of the scene item
	 */
	getSceneItemProperties(sceneName: string, sceneItemId: number): Promise<SceneItemProperties>

	/**
	 * Set the enabled state of a scene item
	 * @param sceneName - Name of the scene
	 * @param sceneItemId - ID of the scene item
	 * @param enabled - Whether the item should be enabled
	 */
	setSceneItemEnabled(sceneName: string, sceneItemId: number, enabled: boolean): Promise<void>

	/**
	 * Set the locked state of a scene item
	 * @param sceneName - Name of the scene
	 * @param sceneItemId - ID of the scene item
	 * @param locked - Whether the item should be locked
	 */
	setSceneItemLocked(sceneName: string, sceneItemId: number, locked: boolean): Promise<void>

	/**
	 * Set the index (z-order) of a scene item
	 * @param sceneName - Name of the scene
	 * @param sceneItemId - ID of the scene item
	 * @param sceneItemIndex - New index for the item (0 = bottom in v5, top in v4)
	 */
	setSceneItemIndex(sceneName: string, sceneItemId: number, sceneItemIndex: number): Promise<void>

	// =========================================================================
	// Recording
	// =========================================================================

	/**
	 * Get the current recording status
	 */
	getRecordStatus(): Promise<RecordStatus>

	/**
	 * Start recording
	 */
	startRecord(): Promise<void>

	/**
	 * Stop recording
	 */
	stopRecord(): Promise<void>

	/**
	 * Toggle recording state
	 */
	toggleRecord(): Promise<void>

	/**
	 * Pause recording (v5 only, v4 will throw)
	 */
	pauseRecord?(): Promise<void>

	/**
	 * Resume recording (v5 only, v4 will throw)
	 */
	resumeRecord?(): Promise<void>

	// =========================================================================
	// Streaming
	// =========================================================================

	/**
	 * Get the current streaming status
	 */
	getStreamStatus(): Promise<StreamStatus>

	/**
	 * Start streaming
	 */
	startStream(): Promise<void>

	/**
	 * Stop streaming
	 */
	stopStream(): Promise<void>

	/**
	 * Toggle streaming state
	 */
	toggleStream(): Promise<void>

	/**
	 * Get the current stream service settings (RTMP server + key, etc.)
	 */
	getStreamServiceSettings(): Promise<{ serviceType: string; settings: Record<string, unknown> }>

	/**
	 * Update the stream service settings (e.g. to push a new YouTube stream key)
	 * @param serviceType - e.g. 'rtmp_custom'
	 * @param settings - Service-specific settings (server, key, etc.)
	 */
	setStreamServiceSettings(serviceType: string, settings: Record<string, unknown>): Promise<void>

	// =========================================================================
	// Inputs (Audio)
	// =========================================================================

	/**
	 * Get the volume of an input
	 * @param inputName - Name of the input
	 */
	getInputVolume(inputName: string): Promise<{ inputVolumeMul: number; inputVolumeDb: number }>

	/**
	 * Set the volume of an input
	 * @param inputName - Name of the input
	 * @param inputVolumeMul - Volume multiplier (0.0 to 20.0, where 1.0 = 0dB)
	 * @param inputVolumeDb - Volume in dB (alternative to multiplier)
	 */
	setInputVolume(inputName: string, inputVolumeMul?: number, inputVolumeDb?: number): Promise<void>

	/**
	 * Get the mute state of an input
	 * @param inputName - Name of the input
	 */
	getInputMute(inputName: string): Promise<{ inputMuted: boolean }>

	/**
	 * Set the mute state of an input
	 * @param inputName - Name of the input
	 * @param inputMuted - Whether the input should be muted
	 */
	setInputMute(inputName: string, inputMuted: boolean): Promise<void>

	/**
	 * Toggle the mute state of an input
	 * @param inputName - Name of the input
	 */
	toggleInputMute(inputName: string): Promise<{ inputMuted: boolean }>

	// =========================================================================
	// Stats & Info
	// =========================================================================

	/**
	 * Get OBS statistics
	 */
	getStats(): Promise<Stats>

	/**
	 * Get video settings
	 */
	getVideoSettings(): Promise<VideoSettings>

	// =========================================================================
	// Screenshots
	// =========================================================================

	/**
	 * Take a screenshot of a source
	 * @param sourceName - Name of the source to screenshot
	 * @param imageFormat - Format of the image (e.g., 'png', 'jpg')
	 * @param imageWidth - Optional width of the image
	 * @param imageHeight - Optional height of the image
	 */
	getSourceScreenshot(
		sourceName: string,
		imageFormat: string,
		imageWidth?: number,
		imageHeight?: number
	): Promise<string>

	// =========================================================================
	// Transitions
	// =========================================================================

	/**
	 * Get the current scene transition
	 */
	getCurrentSceneTransition(): Promise<Transition>

	// =========================================================================
	// Events
	// =========================================================================

	/**
	 * Subscribe to an event
	 * @param eventType - The event type to subscribe to
	 * @param callback - Callback function when event occurs
	 */
	on<T = any>(eventType: OBSEventType | string, callback: EventCallback<T>): void

	/**
	 * Subscribe to an event for a single occurrence
	 * @param eventType - The event type to subscribe to
	 * @param callback - Callback function when event occurs
	 */
	once<T = any>(eventType: OBSEventType | string, callback: EventCallback<T>): void

	/**
	 * Unsubscribe from an event
	 * @param eventType - The event type to unsubscribe from
	 * @param callback - The callback function to remove
	 */
	off(eventType: OBSEventType | string, callback: EventCallback): void

	// =========================================================================
	// Raw Access (for advanced use cases)
	// =========================================================================

	/**
	 * Send a raw request to OBS (for operations not covered by the interface)
	 * Request/response format depends on the adapter version
	 * @param requestType - The request type
	 * @param requestData - The request data
	 */
	sendRaw(requestType: string, requestData?: any): Promise<any>
}

/**
 * Connection options for creating an adapter
 */
export interface AdapterConnectionOptions {
	address: string
	password?: string
	/** Force a specific API version instead of auto-detecting */
	forceVersion?: OBSAdapterVersion | 'auto'
	/** Subscribe to high-volume InputVolumeMeters events (v5 only) */
	subscribeVolumeMeters?: boolean
}
