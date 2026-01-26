import { ConnectionPublic } from '../types'

/**
 * Toggle the enabled/visible state of a scene item
 */
export const toggleSceneItemEnabled = (obs: ConnectionPublic) => async ({
	scene,
	sceneItemId,
	currentEnabled,
}: {
	scene: string
	sceneItemId: number
	currentEnabled: boolean
}) => {
	if (!obs.adapter) return
	await obs.adapter.setSceneItemEnabled(scene, sceneItemId, !currentEnabled)
}

/**
 * Set the enabled/visible state of a scene item
 */
export const setSceneItemEnabled = (obs: ConnectionPublic) => async ({
	scene,
	sceneItemId,
	enabled,
}: {
	scene: string
	sceneItemId: number
	enabled: boolean
}) => {
	if (!obs.adapter) return
	await obs.adapter.setSceneItemEnabled(scene, sceneItemId, enabled)
}

/**
 * Move a scene item to a specific index (z-order)
 */
export const setSceneItemIndex = (obs: ConnectionPublic) => async ({
	scene,
	sceneItemId,
	sceneItemIndex,
}: {
	scene: string
	sceneItemId: number
	sceneItemIndex: number
}) => {
	if (!obs.adapter) return
	await obs.adapter.setSceneItemIndex(scene, sceneItemId, sceneItemIndex)
}

/**
 * Move a scene item to the top (front) of the scene
 * Note: In v5, index 0 is the bottom, so we need to get the list length
 * In v4, the adapter handles the conversion internally
 */
export const moveSceneItemToTop = (obs: ConnectionPublic) => async ({
	scene,
	sceneItemId,
}: {
	scene: string
	sceneItemId: number
}) => {
	if (!obs.adapter) return
	// In v5, higher index = closer to front/top
	// Get scene items to find the max index
	const items = await obs.adapter.getSceneItemList(scene)
	if (!items || items.length === 0) return
	
	// Move to the highest index (top/front)
	const topIndex = items.length - 1
	await obs.adapter.setSceneItemIndex(scene, sceneItemId, topIndex)
}

/**
 * Move a scene item to the bottom (back) of the scene
 */
export const moveSceneItemToBottom = (obs: ConnectionPublic) => async ({
	scene,
	sceneItemId,
}: {
	scene: string
	sceneItemId: number
}) => {
	if (!obs.adapter) return
	// In v5, index 0 is the bottom/back
	await obs.adapter.setSceneItemIndex(scene, sceneItemId, 0)
}
