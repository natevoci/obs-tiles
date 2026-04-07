/**
 * Decodes a JPEG base64 string or data-URL, draws it onto the given canvas,
 * and immediately frees the decoded bitmap via bitmap.close().
 */
export async function decodeAndDraw(base64OrDataUrl: string, canvas: HTMLCanvasElement): Promise<void> {
	const base64 = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	const blob = new Blob([bytes], { type: 'image/jpeg' })
	const bitmap = await createImageBitmap(blob)
	if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
		canvas.width = bitmap.width
		canvas.height = bitmap.height
	}
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
	bitmap.close()
}
