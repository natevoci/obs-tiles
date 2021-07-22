self.addEventListener('install', () => {
	console.log('server-worker install');
});

self.addEventListener('activate', function(event) {
	console.log('server-worker activate');
	event.waitUntil(
		// Clear cache when a new version is available
		caches.keys().then(cacheNames => Promise.all(
			cacheNames.map(cacheName => {
				return caches.delete(cacheName);
			})
		)),
	);
});

self.addEventListener('fetch', event => {
	// console.log(`server-worker fetch: ${event.request.url}`);

	// Just cache http and https request. (ie. don't cache chrome-extension requests)
	if (/^https?:\/\//.exec(event.request.url)) {
		event.respondWith(
			caches.open('obs-tiles-static').then(cache => {
				const r = cache.match(event.request).then(response => {
					return response || fetch(event.request).then(response => {
						cache.put(event.request, response.clone());
						return response;
					});
				});
				return r;
			})
		);
	}
});
