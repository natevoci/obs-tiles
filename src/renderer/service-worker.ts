/// <reference lib="webworker" />

(self as unknown as ServiceWorkerGlobalScope).addEventListener('install', () => {
	console.log('service-worker install')
})

;(self as unknown as ServiceWorkerGlobalScope).addEventListener('activate', function(event: ExtendableEvent) {
	console.log('service-worker activate')
	event.waitUntil(
		// Clear cache when a new version is available
		caches.keys().then(cacheNames => Promise.all(
			cacheNames.map(cacheName => {
				return caches.delete(cacheName)
			})
		)),
	)
})

self.addEventListener('fetch', event => {
	if ((event as any).request.url.startsWith(self.location.origin)) {
		(event as any).respondWith(
			caches.open('obs-tiles-static').then(cache => {
				const r = cache.match((event as any).request).then(response => {
					return response || fetch((event as any).request).then(response => {
						cache.put((event as any).request, response.clone())
						return response
					})
				})
				return r
			})
		)
	}
})
