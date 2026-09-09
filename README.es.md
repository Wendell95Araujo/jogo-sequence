# 🎮 Row 5 Online

**🌐 [Português](README.md) · [English](README.en.md) · Español**

**Row 5 Online** es una versión digital multijugador del clásico juego de mesa **Sequence**, hecha para navegador y Android. Juega con amigos o bots en partidas estratégicas de hasta **12 jugadores**, directamente desde tu navegador o como aplicación.

🔗 **Juega en línea ahora:** https://game-sequence-multiplayer.web.app/

📦 **Versión Android (.apk):** disponible en itch.io 👉 https://wendell95araujo.itch.io/sequence-online

---

## 🧩 Características del Juego

- ✅ **Multijugador en línea** con salas privadas, públicas o por código
- 🤖 **Modo entrenamiento** con bots de IA en varios niveles de dificultad
- 👥 **Hasta 12 jugadores**, con modos 1v1, 2v2, 3v3, 4v4 e incluso 6v6
- 🔄 **Guardado automático** de partidas locales
- 👫 Lista de amigos con invitaciones en tiempo real
- 🏆 Ranking global por puntos
- 🔔 Notificaciones push (solicitudes de amistad, invitaciones y reenganche)
- 💬 Chat en el juego
- 📱 **Compatible con móviles** e instalable como PWA (Android, iOS, Windows)
- 🌐 3 idiomas: Português, English, Español
- 🎵 Efectos de sonido, vibración y animaciones visuales
- 🃏 Soporte para **cartas especiales** (Jotas de uno o dos ojos)

---

## 🕹️ Cómo Jugar

El objetivo es formar **secuencias de 5 piezas** usando las cartas de tu mano, colocando fichas en el tablero virtual.

- **Jota de dos ojos:** juega en cualquier espacio vacío
- **Jota de un ojo:** elimina fichas de los adversarios

Gana quien complete el número necesario de secuencias.

### Puntuación del Ranking

| Escenario | Victoria | Empate | Derrota |
|-----------|----------|--------|---------|
| Solo vs humano (1v1, 1v1v1) | 3 pts | 1 pt | 0 |
| Equipo vs humano (2v2, 3v3...) | 2 pts | 1 pt | 0 |
| Vs bot | 1 pt | 0 | 0 |

Se requiere un mínimo de 5 partidas para aparecer en el ranking.

---

## 📲 Instalación en Android

1. Accede a: https://wendell95araujo.itch.io/sequence-online
2. Haz clic en "Download" para descargar el archivo `.apk`
3. En tu Android, activa la opción **"Permitir apps desconocidas"**
4. Toca el archivo `.apk` y sigue las instrucciones de instalación
5. Abre la app y juega

> ⚠️ Requiere Android 5.0 o superior

---

## 🚀 Stack

- **Frontend:** HTML, CSS, JavaScript (jQuery), SweetAlert2, Font Awesome
- **Backend:** Firebase Realtime Database, Firebase Authentication, Firebase Cloud Functions
- **Hosting:** Firebase Hosting (CDN global)
- **PWA:** Service Worker, `manifest.json`, instalable en todos los dispositivos
- **Android:** generación de APK con TWA / herramientas Web2App

### 💡 IA en el Modo Entrenamiento

El modo entrenamiento utiliza una **IA con estrategia basada en pesos posicionales**, simulando decisiones inteligentes y priorizando el centro del tablero y la formación de secuencias. La dificultad influye en el nivel de agresividad e inteligencia del bot.

---

## 📁 Estructura del Proyecto

```
├── public/                       # Frontend (alojado en Firebase Hosting)
│   ├── script/
│   │   ├── main.js               # Lógica principal del juego
│   │   ├── bot.js                # IA de los bots (offline y online)
│   │   ├── auth.js               # Autenticación, perfil, ELO
│   │   ├── friends.js            # Sistema de amigos
│   │   ├── ranking.js            # Clasificación global
│   │   ├── translate.js          # Traducciones (pt, en, es)
│   │   └── firebaseConfig.js     # Config de Firebase (placeholders)
│   ├── style/
│   │   └── style.css             # Estilos del juego
│   ├── assets/                   # Imágenes y sonidos
│   ├── sw.js                     # Service Worker (caché)
│   ├── firebase-messaging-sw.js  # Service Worker de notificaciones push
│   └── *.html                    # Páginas
├── functions/                    # Cloud Functions
│   ├── index.js                  # Mantenimiento + notificaciones push
│   └── package.json
└── firebase.json                 # Configuración de Firebase
```

---

## ⚙️ Configuración (para desarrolladores)

Este repositorio es la **versión pública** del proyecto y no incluye las credenciales de Firebase. Para ejecutar tu propia instancia, crea un proyecto de Firebase y reemplaza los placeholders:

| Placeholder | Dónde | Qué colocar |
|-------------|-------|-------------|
| `YOUR_API_KEY`, `YOUR_PROJECT_ID`, `YOUR_MESSAGING_SENDER_ID`, `YOUR_APP_ID`, `YOUR_MEASUREMENT_ID` | `public/script/firebaseConfig.js`, `public/firebase-messaging-sw.js` | Config de tu proyecto de Firebase |
| `YOUR_VAPID_KEY` | `public/script/auth.js` | Web Push certificate (Cloud Messaging) |
| `YOUR_DOMAIN` | `public/`, `functions/index.js` | Dominio de tu despliegue |
| `YOUR_MEASUREMENT_ID` | HTMLs (Google Analytics) | ID de Google Analytics (opcional) |
| `YOUR_ADSENSE_CLIENT_ID` | HTMLs | ID de Google AdSense (opcional) |

Luego crea un `.firebaserc` apuntando a tu proyecto (la CLI de Firebase lo genera con `firebase init`).

### Desarrollo Local

El proyecto no requiere build — solo sirve la carpeta `public/`:

```bash
npx serve public
```

O usa el emulador de Firebase:

```bash
firebase emulators:start
```

### Despliegue

```bash
npm install -g firebase-tools
firebase login

# Hosting + Functions
firebase deploy

# Solo hosting
firebase deploy --only hosting

# Solo functions
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Cloud Functions disponibles

| Function | Trigger | Descripción |
|----------|---------|-------------|
| `scheduledGameCleanup` | Cron (diario 4h BRT) | Limpia juegos expirados y recalcula estadísticas |
| `manualSyncTrigger` | Write en `meta/triggerSync` | Mantenimiento manual |
| `sendFriendRequestNotification` | Create en `friend_requests/{uid}/{id}` | Push de solicitud de amistad (traducida por idioma) |
| `sendGameInviteNotification` | Create en `lobby_players/{uid}/invites/{id}` | Push de invitación a jugar (traducida por idioma) |
| `sendResponseNotification` | Create en `responses/{uid}/{id}` | Push de respuesta (bug resuelto / soporte) |
| `notifyInactivePlayers` | Cron (diario 18h BRT) | Push a jugadores inactivos por 7+ días (traducida por idioma) |

---

## 📜 Licencia

Este proyecto es independiente y **no está afiliado a los creadores oficiales del juego Sequence**. Creado con fines **educativos y recreativos**. Todos los derechos de los elementos originales pertenecen a sus respectivos propietarios.

---

## 🙋‍♂️ Desarrollador

Hecho por [Wendell Araújo](https://github.com/wendell-araujo)

- 🎮 Juego en itch.io: https://wendell95araujo.itch.io/sequence-online
- 🌐 Portafolio web: https://wendell-araujo.web.app/
