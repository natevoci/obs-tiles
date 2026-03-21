export const SCENE_PLACEHOLDER_PROGRAM = '__OBS_PROGRAM_SCENE__'
export const SCENE_PLACEHOLDER_PREVIEW = '__OBS_PREVIEW_SCENE__'

interface SceneListLike {
	currentScene?: string
	currentPreviewSceneName?: string
}

export const resolveScenePlaceholder = (scene: string, sceneList?: SceneListLike): string => {
	if (scene === SCENE_PLACEHOLDER_PROGRAM) {
		return sceneList?.currentScene ?? ''
	}

	if (scene === SCENE_PLACEHOLDER_PREVIEW) {
		return sceneList?.currentPreviewSceneName ?? ''
	}

	return scene
}
