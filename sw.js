const CACHE = 'amine-digital-v1';

// Fichiers à mettre en cache pour le mode hors ligne
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Installation : mise en cache des assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch : network first, fallback cache
self.addEventListener('fetch', function(e) {
  if(e.request.method !== 'GET') return;
  
  // Ne pas intercepter les appels API externes
  var url = e.request.url;
  if(url.includes('firestore') || 
     url.includes('firebase') || 
     url.includes('googleapis') || 
     url.includes('groq.com') || 
     url.includes('onesignal') ||
     url.includes('imgbb') ||
     url.includes('cloudinary')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Mettre en cache la réponse fraîche
        if(response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Hors ligne → retourner depuis le cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// Push notifications OneSignal
self.addEventListener('push', function(e) {
  if(!e.data) return;
  try {
    var data = e.data.json();
    var title = data.title || 'Amine Digital';
    var options = {
      body: data.body || '',
      icon: './logo192.png',
      badge: './logo192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || './' }
    };
    e.waitUntil(self.registration.showNotification(title, options));
  } catch(err) {}
});

// Clic sur notification → ouvrir le site
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    clients.matchAll({type:'window'}).then(function(list) {
      for(var i=0; i<list.length; i++) {
        if(list[i].url === url && 'focus' in list[i]) return list[i].focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
