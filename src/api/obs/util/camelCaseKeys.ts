/**
 * Convert object keys from kebab-case to camelCase
 * @param {Object} obj - The object with kebab-case keys
 * @returns {Object} - New object with camelCase keys
 */
export function camelCaseKeys(obj: any): any {
	if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Array) {
		return obj
	}

	const camelCasedObj: Record<string, any> = {}

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			// Convert kebab-case to camelCase
			const camelCaseKey = key.replace(/-([a-z])/g, (_match, char) => char.toUpperCase())
			const value = obj[key]

			// Recursively convert nested objects and arrays
			if (Array.isArray(value)) {
				camelCasedObj[camelCaseKey] = value.map(item =>
					typeof item === 'object' && item !== null ? camelCaseKeys(item) : item
				)
			} else if (typeof value === 'object' && value !== null) {
				camelCasedObj[camelCaseKey] = camelCaseKeys(value)
			} else {
				camelCasedObj[camelCaseKey] = value
			}
		}
	}

	return camelCasedObj
}
