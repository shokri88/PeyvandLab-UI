'use strict';
const CACHE = 'peyvand-ui-v1';
const CORE = ['./', './index.html', './offline.html', './splash.html', './manifest.webmanifest', './assets/css/app.css', './assets/css/fonts.css', './assets/js/app.js', './assets/vendor/bootstrap/bootstrap.rtl.min.css', './assets/vendor/bootstrap/bootstrap.bundle.min.js', './assets/images/logo.webp', './assets/images/icons/icon-192.png', './assets/images/icons/icon-512.png', './assets/font/Vazirmatn.woff2', './assets/font/PelakFA-Regular.woff', './assets/font/PelakFA-Bold.woff'];
const BASE = new URL('./', self.location.href);
const PAGES = new Set(['','index.html','splash.html','offline.html','about.html','contact.html','services.html','departments.html','department.html','doctors.html','tests.html','preparation.html','faq.html','blog.html','article.html','article-thalassemia.html','article-heart.html','home-sampling.html','child-sampling.html','international.html','partners.html','news.html','careers.html','privacy.html']);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('peyvand-ui-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const relative = url.pathname.slice(BASE.pathname.length);
  // Never cache personal workflows, API requests, query strings or external portals.
  if (url.search || relative.startsWith('api/') || (!relative.startsWith('assets/') && !PAGES.has(relative) && relative !== 'manifest.webmanifest')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy))); }
      return response;
    }).catch(async () => (await caches.match(req)) || (await caches.match(new URL('offline.html', BASE)))));
  } else if (relative.startsWith('assets/')) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
      if (response.ok && response.type === 'basic') { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy))); }
      return response;
    })));
  }
});
