const CACHE_NAME = "tasks-cache-v1.0.0";
const LOCAL_FILES = [
  "/",
  "/index.html",
  "/style/reset.css",
  "/style/style.css",
  "/script/firebaseConfig.js",
  "/script/script.js",
  "/script/botGameLocal.js",
  "/assets/img/logo.png",
  "/assets/img/cards/F.png",
  "/assets/img/cards/JC-info.png",
  "/assets/img/cards/JD-info.png",
  "/assets/img/cards/JH-info.png",
  "/assets/img/cards/JS-info.png",
  "/assets/img/cards/verso.png",
  "/assets/sounds/drawOrDefeat.wav",
  "/assets/sounds/madeSequence.wav",
  "/assets/sounds/myTurn.mp3",
  "/assets/sounds/newChat.mp3",
  "/assets/sounds/winner.wav",
  "/lib/fontawesome-pro-6.7.2-web/css/all.min.css",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-brands-400.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-brands-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-900.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-light-300.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-light-300.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-regular-400.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-regular-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-thin-100.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-duotone-thin-100.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-light-300.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-light-300.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-regular-400.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-regular-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-light-300.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-light-300.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-regular-400.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-regular-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-solid-900.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-solid-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-thin-100.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-duotone-thin-100.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-light-300.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-light-300.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-regular-400.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-regular-400.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-solid-900.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-solid-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-thin-100.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-sharp-thin-100.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-solid-900.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-solid-900.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-thin-100.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-thin-100.woff2",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-v4compatibility.ttf",
  "/lib/fontawesome-pro-6.7.2-web/webfonts/fa-v4compatibility.woff2",
];

const EXTERNAL_LIBS = [
  "https://code.jquery.com/jquery-3.7.1.min.js",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js",
  "https://cdn.jsdelivr.net/npm/pwacompat@2.0.8/pwacompat.min.js",
  "https://fonts.googleapis.com/css2?family=Roboto&display=swap",
];

const suits = ["C", "D", "H", "S"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "Q", "K", "A"];
const imagePaths = [];
suits.forEach((suit) => {
  values.forEach((value) => {
    imagePaths.push(`/assets/img/cards/${value}${suit}.png`);
  });
});

const TOTAL_AVATARS = 42;
const avatarPaths = [];

for (let i = 1; i <= TOTAL_AVATARS; i++) {
  avatarPaths.push(`https://api.dicebear.com/8.x/adventurer/svg?seed=${i}`);
}

avatarPaths.push('/assets/img/avatars/bot-red.png');
avatarPaths.push('/assets/img/avatars/bot-blue.png');
avatarPaths.push('/assets/img/avatars/bot-green.png');

const FILES_TO_CACHE = [...LOCAL_FILES, ...EXTERNAL_LIBS, ...imagePaths, ...avatarPaths];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Cacheando arquivos para uso offline.");

      return cache.addAll(FILES_TO_CACHE).catch((error) => {
        console.error("Falha ao usar cache.addAll. Verifique as URLs.", error);
        FILES_TO_CACHE.forEach((url) => {
          fetch(url)
            .then((res) => {
              if (!res.ok)
                console.error("Falha no fetch individual para: ", url);
            })
            .catch((err) =>
              console.error("Erro de rede no fetch individual para: ", url, err)
            );
        });
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Deletando cache antigo:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticPaths = ["/assets/", "/lib/", "/style/reset.css"];
  const staticHosts = [
    "code.jquery.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "gstatic.com",
  ];

  return (
    staticPaths.some((path) => url.pathname.startsWith(path)) ||
    staticHosts.some((host) => url.hostname.includes(host))
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
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
        const responseToCache = networkResponse.clone();
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
