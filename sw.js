// sw.js — Reading Power Service Worker v2

// 1) Cache adı yükseltildi (v1 → v2)
const CACHE_NAME = 'reading-power-cache-v2';

// 2) Cache’e eklenecek dosyalar
const URLS = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 3) Install aşaması: dosyaları cache’e ekle ve hemen yeni SW’ye geç
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS))
      .then(() => self.skipWaiting())       // yeni SW’yi bekletmeden aktif et
  );
});

// 4) Activate aşaması: eski cache’leri sil ve tüm client’ları yeni SW’ye geçir
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)  // CACHE_NAME harici tüm cache’leri sil
          .map(key => caches.delete(key))
      )
    )
    .then(() => self.clients.claim())       // açık sayfalarda yeni SW’yi kullan
  );
});

// 5) Fetch handler: öncelikle cache’e bak, yoksa ağı kullan
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
