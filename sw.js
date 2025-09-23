function sendMessageToClients(message) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      if (!clients || clients.length === 0) {
        return;
      }
      clients.forEach((client) => {
        client.postMessage(message);
      });
    });
}

const CACHE_NAME = "tasks-cache-v1.0.0";

const LOCAL_FILES = [
  "/",
  "404.html",
  "/index.html",
  "/privacy.html",
  "/about.html",
  "/contact.html",
  "/rules.html",
  "/style/reset.css",
  "/style/style.css",
  "/style/info.css",
  "/script/firebaseConfig.js",
  "/script/main.js",
  "/script/bot.js",
  "/script/translate.js",
  "/script/info.js",
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
  "https://flagcdn.com/w20/es.png",
  "https://flagcdn.com/w20/us.png",
  "https://flagcdn.com/w20/br.png",
];

const MANIFEST_ICONS = [
  "/windows11/SmallTile.scale-100.png",
  "/windows11/SmallTile.scale-125.png",
  "/windows11/SmallTile.scale-150.png",
  "/windows11/SmallTile.scale-200.png",
  "/windows11/SmallTile.scale-400.png",
  "/windows11/Square150x150Logo.scale-100.png",
  "/windows11/Square150x150Logo.scale-125.png",
  "/windows11/Square150x150Logo.scale-150.png",
  "/windows11/Square150x150Logo.scale-200.png",
  "/windows11/Square150x150Logo.scale-400.png",
  "/windows11/Wide310x150Logo.scale-100.png",
  "/windows11/Wide310x150Logo.scale-125.png",
  "/windows11/Wide310x150Logo.scale-150.png",
  "/windows11/Wide310x150Logo.scale-200.png",
  "/windows11/Wide310x150Logo.scale-400.png",
  "/windows11/LargeTile.scale-100.png",
  "/windows11/LargeTile.scale-125.png",
  "/windows11/LargeTile.scale-150.png",
  "/windows11/LargeTile.scale-200.png",
  "/windows11/LargeTile.scale-400.png",
  "/windows11/Square44x44Logo.scale-100.png",
  "/windows11/Square44x44Logo.scale-125.png",
  "/windows11/Square44x44Logo.scale-150.png",
  "/windows11/Square44x44Logo.scale-200.png",
  "/windows11/Square44x44Logo.scale-400.png",
  "/windows11/StoreLogo.scale-100.png",
  "/windows11/StoreLogo.scale-125.png",
  "/windows11/StoreLogo.scale-150.png",
  "/windows11/StoreLogo.scale-200.png",
  "/windows11/StoreLogo.scale-400.png",
  "/windows11/SplashScreen.scale-100.png",
  "/windows11/SplashScreen.scale-125.png",
  "/windows11/SplashScreen.scale-150.png",
  "/windows11/SplashScreen.scale-200.png",
  "/windows11/SplashScreen.scale-400.png",
  "/windows11/Square44x44Logo.targetsize-16.png",
  "/windows11/Square44x44Logo.targetsize-20.png",
  "/windows11/Square44x44Logo.targetsize-24.png",
  "/windows11/Square44x44Logo.targetsize-30.png",
  "/windows11/Square44x44Logo.targetsize-32.png",
  "/windows11/Square44x44Logo.targetsize-36.png",
  "/windows11/Square44x44Logo.targetsize-40.png",
  "/windows11/Square44x44Logo.targetsize-44.png",
  "/windows11/Square44x44Logo.targetsize-48.png",
  "/windows11/Square44x44Logo.targetsize-60.png",
  "/windows11/Square44x44Logo.targetsize-64.png",
  "/windows11/Square44x44Logo.targetsize-72.png",
  "/windows11/Square44x44Logo.targetsize-80.png",
  "/windows11/Square44x44Logo.targetsize-96.png",
  "/windows11/Square44x44Logo.targetsize-256.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-16.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-20.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-24.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-30.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-32.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-36.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-40.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-44.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-48.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-60.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-64.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-72.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-80.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-96.png",
  "/windows11/Square44x44Logo.altform-unplated_targetsize-256.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-16.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-20.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-24.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-30.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-32.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-36.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-40.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-44.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-48.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-60.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-64.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-72.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-80.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-96.png",
  "/windows11/Square44x44Logo.altform-lightunplated_targetsize-256.png",
  "/android/android-launchericon-512-512.png",
  "/android/android-launchericon-192-192.png",
  "/android/android-launchericon-144-144.png",
  "/android/android-launchericon-96-96.png",
  "/android/android-launchericon-72-72.png",
  "/android/android-launchericon-48-48.png",
  "/ios/16.png",
  "/ios/20.png",
  "/ios/29.png",
  "/ios/32.png",
  "/ios/40.png",
  "/ios/50.png",
  "/ios/57.png",
  "/ios/58.png",
  "/ios/60.png",
  "/ios/64.png",
  "/ios/72.png",
  "/ios/76.png",
  "/ios/80.png",
  "/ios/87.png",
  "/ios/100.png",
  "/ios/114.png",
  "/ios/120.png",
  "/ios/128.png",
  "/ios/144.png",
  "/ios/152.png",
  "/ios/167.png",
  "/ios/180.png",
  "/ios/192.png",
  "/ios/256.png",
  "/ios/512.png",
  "/ios/1024.png",
];

const suits = ["C", "D", "H", "S"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
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
avatarPaths.push("/assets/img/avatars/bot-red.png");
avatarPaths.push("/assets/img/avatars/bot-blue.png");
avatarPaths.push("/assets/img/avatars/bot-green.png");

const ALL_FILES_TO_CACHE = [
  ...LOCAL_FILES,
  ...EXTERNAL_LIBS,
  ...MANIFEST_ICONS,
  ...imagePaths,
  ...avatarPaths,
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      sendMessageToClients({ type: "caching-started" });

      const problematicExtensions = ['.wav', '.mp3'];

      const cachingPromises = ALL_FILES_TO_CACHE.map((fileUrl) => {
        let fetchRequest;

        if (problematicExtensions.some(ext => fileUrl.endsWith(ext))) {
          fetchRequest = new Request(fileUrl, {
            headers: { 'Range': 'bytes=0-' }
          });
        } else {
          fetchRequest = fileUrl;
        }

        return fetch(fetchRequest)
          .then((response) => {
            if (response.ok) {
              return cache.put(fileUrl, response);
            }
            return Promise.resolve();
          })
          .catch(() => {
            return Promise.resolve();
          });
      });

      return Promise.all(cachingPromises);
    })
    .then(() => {
        sendMessageToClients({ type: "caching-complete" });
    })
    .catch((error) => {
        sendMessageToClients({ type: "caching-failed", error: error.message });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
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
        if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
