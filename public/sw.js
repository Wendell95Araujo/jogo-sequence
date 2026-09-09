// v3.1.93
function sendMessageToClients(message) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      if (!clients || clients.length === 0) return;
      clients.forEach((client) => client.postMessage(message));
    });
}

const CACHE_NAME = "tasks-cache-v3.1.95";

const LOCAL_FILES = [
  "/404.html",
  "/game.html",
  "/style/reset.css",
  "/style/style.css",
  "/style/animations.css",
  "/script/firebaseConfig.js",
  "/script/main.js",
  "/script/bot.js",
  "/script/animations.js",
  "/script/auth.js",
  "/script/friends.js",
  "/script/ranking.js",
  "/script/translate.js",
  "/assets/img/logo.webp",
  "/assets/sounds/drawOrDefeat.mp3",
  "/assets/sounds/madeSequence.mp3",
  "/assets/sounds/myTurn.mp3",
  "/assets/sounds/newChat.mp3",
  "/assets/sounds/winner.mp3",
  "/lib/fontawesome-pro-6.7.2-web/css/all.min.css",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-solid-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-regular-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-brands-400.woff2"
];

const EXTERNAL_LIBS = [
  "https://code.jquery.com/jquery-3.7.1.min.js",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js",
  "https://cdn.jsdelivr.net/npm/pwacompat@2.0.8/pwacompat.min.js",
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap",
  "https://flagcdn.com/80x60/es.webp",
  "https://flagcdn.com/80x60/us.webp",
  "https://flagcdn.com/80x60/br.webp",
];

const diceBearAvatars = [];
for (let i = 1; i <= 42; i++) {
  diceBearAvatars.push(`https://api.dicebear.com/8.x/adventurer/svg?seed=${i}`);
}

const botAvatars = [];
["red", "blue", "green"].forEach(color => {
  for (let n = 1; n <= 6; n++) {
    botAvatars.push(`/assets/img/avatars/bot-${color}-${n}.webp`);
  }
});

const ALL_FILES_TO_CACHE = [
  ...LOCAL_FILES, 
  ...EXTERNAL_LIBS,
  ...diceBearAvatars,
  ...botAvatars
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      sendMessageToClients({ type: "caching-started" });

      const cachingPromises = ALL_FILES_TO_CACHE.map((fileUrl) => {
        let fetchOptions = {};
        
        if (fileUrl.endsWith('.mp3')) {
          fetchOptions = { headers: { 'Range': 'bytes=0-' } };
        }

        return fetch(new Request(fileUrl, fetchOptions))
          .then((response) => {
            if (response.ok) return cache.put(fileUrl, response);
            return Promise.resolve();
          })
          .catch(() => Promise.resolve());
      });

      return Promise.all(cachingPromises);
    })
    .then(() => sendMessageToClients({ type: "caching-complete" }))
    .catch((error) => sendMessageToClients({ type: "caching-failed", error: error.message }))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  return self.clients.claim();
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticPaths = ["/assets/", "/lib/", "/style/", "/windows11/", "/android/", "/ios/"];
  const staticHosts = [
    "code.jquery.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "flagcdn.com",
    "api.dicebear.com"
  ];
  return (
    staticPaths.some((path) => url.pathname.startsWith(path)) ||
    staticHosts.some((host) => url.hostname.includes(host))
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;

  if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") return;

  if (url.hostname.includes("firebaseio.com")) return;

  // Navigation requests (HTML pages) - network first, no cache interference
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/game.html"))
    );
    return;
  }

  if (isStaticAsset(event.request)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const networkFetch = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
