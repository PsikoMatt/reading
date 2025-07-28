const CACHE_NAME = 'reading-power-cache-v1';
const URLS = ['/', 'index.html', 'style.css', 'script.js', 'manifest.json', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
