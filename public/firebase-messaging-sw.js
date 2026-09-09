importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (!title) return;

  const link = payload.fcmOptions?.link || payload.data?.link || "/game.html";
  const gameId = payload.data?.gameId;

  self.registration.showNotification(title, {
    body: body || "",
    icon: "/assets/img/logo.png",
    badge: "/assets/img/logo.png",
    data: { url: link, gameId: gameId },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const gameId = event.notification.data?.gameId;
  const fallbackUrl = event.notification.data?.url || "/game.html";
  const targetUrl = gameId ? `/game.html?game=${gameId}` : fallbackUrl;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/game.html") && "navigate" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
