/**
 * OBS WebSocket Abstraction Layer Types
 * 
 * These types use v5-style camelCase naming conventions as the standard interface.
 * Both v4 and v5 adapters normalize their responses to match these types.
 */

// ============================================================================
// Scene Types
// ============================================================================

export interface Scene {
	sceneName: string
	sceneUuid?: string
	sceneIndex?: number
}

export interface SceneWithSources extends Scene {
	sources?: SceneItem[]
}

export interface CurrentScene {
	sceneName: string
	sceneUuid?: string
	sources?: SceneItem[]
}

// ============================================================================
// Scene Item Types
// ============================================================================

export interface SceneItem {
	sceneItemId: number
	sceneItemIndex?: number
	sourceName: string
	sourceUuid?: string
	sourceType?: string
	inputKind?: string
	isGroup?: boolean
	sceneItemEnabled?: boolean
	sceneItemLocked?: boolean
	sceneItemTransform?: SceneItemTransform
}

export interface SceneItemTransform {
	positionX?: number
	positionY?: number
	rotation?: number
	scaleX?: number
	scaleY?: number
	width?: number
	height?: number
	sourceWidth?: number
	sourceHeight?: number
	boundsType?: string
	boundsWidth?: number
	boundsHeight?: number
	cropLeft?: number
	cropRight?: number
	cropTop?: number
	cropBottom?: number
}

export interface SceneItemProperties {
	sceneName: string
	sceneItemId: number
	sourceName: string
	sceneItemEnabled: boolean
	sceneItemLocked: boolean
	sceneItemTransform?: SceneItemTransform
}

// ============================================================================
// Recording/Streaming Types
// ============================================================================

export interface RecordStatus {
	outputActive: boolean
	outputPaused?: boolean
	outputTimecode?: string
	outputDuration?: number
	outputBytes?: number
	outputPath?: string
}

export interface StreamStatus {
	outputActive: boolean
	outputReconnecting?: boolean
	outputTimecode?: string
	outputDuration?: number
	outputBytes?: number
	outputCongestion?: number
	outputSkippedFrames?: number
	outputTotalFrames?: number
}

// ============================================================================
// Stats Types
// ============================================================================

export interface Stats {
	cpuUsage: number
	memoryUsage: number
	availableDiskSpace: number
	activeFps: number
	averageFrameRenderTime?: number
	renderSkippedFrames?: number
	renderTotalFrames?: number
	outputSkippedFrames?: number
	outputTotalFrames?: number
	webSocketSessionIncomingMessages?: number
	webSocketSessionOutgoingMessages?: number
}

// ============================================================================
// Video Info Types
// ============================================================================

export interface VideoSettings {
	fpsNumerator?: number
	fpsDenominator?: number
	baseWidth: number
	baseHeight: number
	outputWidth: number
	outputHeight: number
}

// ============================================================================
// Transition Types
// ============================================================================

export interface Transition {
	transitionName: string
	transitionUuid?: string
	transitionKind?: string
	transitionDuration?: number
}

export interface TransitionEvent {
	transitionName: string
	transitionUuid?: string
	fromSceneName?: string
	fromSceneUuid?: string
	toSceneName?: string
	toSceneUuid?: string
}

// ============================================================================
// Screenshot Types
// ============================================================================

export interface ScreenshotResult {
	imageData: string  // Base64 encoded image
}

// ============================================================================
// Version Info Types
// ============================================================================

export interface VersionInfo {
	obsVersion: string
	obsWebSocketVersion: string
	rpcVersion?: number
	availableRequests?: string[]
	supportedImageFormats?: string[]
	platform?: string
	platformDescription?: string
}

// ============================================================================
// Event Data Types (for normalized events)
// ============================================================================

export interface CurrentProgramSceneChangedEvent {
	sceneName: string
	sceneUuid?: string
}

export interface SceneListChangedEvent {
	scenes: Scene[]
}

export interface SceneItemCreatedEvent {
	sceneName: string
	sceneUuid?: string
	sourceName: string
	sourceUuid?: string
	sceneItemId: number
	sceneItemIndex: number
}

export interface SceneItemRemovedEvent {
	sceneName: string
	sceneUuid?: string
	sourceName: string
	sourceUuid?: string
	sceneItemId: number
}

export interface SceneItemEnableStateChangedEvent {
	sceneName: string
	sceneUuid?: string
	sceneItemId: number
	sceneItemEnabled: boolean
}

export interface SceneItemLockStateChangedEvent {
	sceneName: string
	sceneUuid?: string
	sceneItemId: number
	sceneItemLocked: boolean
}

export interface SceneItemListReindexedEvent {
	sceneName: string
	sceneUuid?: string
	sceneItems: Array<{ sceneItemId: number; sceneItemIndex: number }>
}

export interface RecordStateChangedEvent {
	outputActive: boolean
	outputState: 'OBS_WEBSOCKET_OUTPUT_STARTING' | 'OBS_WEBSOCKET_OUTPUT_STARTED' | 
	             'OBS_WEBSOCKET_OUTPUT_STOPPING' | 'OBS_WEBSOCKET_OUTPUT_STOPPED' |
	             'OBS_WEBSOCKET_OUTPUT_PAUSED' | 'OBS_WEBSOCKET_OUTPUT_RESUMED'
	outputPath?: string
}

export interface StreamStateChangedEvent {
	outputActive: boolean
	outputState: 'OBS_WEBSOCKET_OUTPUT_STARTING' | 'OBS_WEBSOCKET_OUTPUT_STARTED' | 
	             'OBS_WEBSOCKET_OUTPUT_STOPPING' | 'OBS_WEBSOCKET_OUTPUT_STOPPED'
}

export interface SceneTransitionStartedEvent {
	transitionName: string
	transitionUuid?: string
}

export interface SceneTransitionEndedEvent {
	transitionName: string
	transitionUuid?: string
}

export interface SceneTransitionVideoEndedEvent {
	transitionName: string
	transitionUuid?: string
}
