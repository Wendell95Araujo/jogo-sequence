# 🎮 Row 5 Online

**🌐 [Português](README.md) · English · [Español](README.es.md)**

**Row 5 Online** is a multiplayer digital version of the classic **Sequence** board game, built for the browser and Android. Play with friends or bots in strategic matches for up to **12 players**, right from your browser or as an app.

🔗 **Play online now:** https://game-sequence-multiplayer.web.app/

📦 **Android version (.apk):** available on itch.io 👉 https://wendell95araujo.itch.io/sequence-online

---

## 🧩 Game Features

- ✅ **Online multiplayer** with private, public or code-based rooms
- 🤖 **Practice mode** with AI bots at several difficulty levels
- 👥 **Up to 12 players**, with 1v1, 2v2, 3v3, 4v4 and even 6v6 modes
- 🔄 **Automatic save** of local matches
- 👫 Friends list with real-time invites
- 🏆 Global ranking by points
- 🔔 Push notifications (friend requests, invites and re-engagement)
- 💬 In-game chat
- 📱 **Mobile friendly** and installable as a PWA (Android, iOS, Windows)
- 🌐 3 languages: Português, English, Español
- 🎵 Sound effects, vibration and visual animations
- 🃏 Support for **special cards** (one-eyed and two-eyed Jacks)

---

## 🕹️ How to Play

The goal is to form **sequences of 5 pieces** using the cards in your hand, placing chips on the virtual board.

- **Two-eyed Jack:** plays on any empty space
- **One-eyed Jack:** removes opponents' chips

The winner is whoever completes the required number of sequences.

### Ranking Score

| Scenario | Win | Draw | Loss |
|----------|-----|------|------|
| Solo vs human (1v1, 1v1v1) | 3 pts | 1 pt | 0 |
| Team vs human (2v2, 3v3...) | 2 pts | 1 pt | 0 |
| Vs bot | 1 pt | 0 | 0 |

A minimum of 5 matches is required to appear on the ranking.

---

## 📲 Android Installation

1. Go to: https://wendell95araujo.itch.io/sequence-online
2. Click "Download" to get the `.apk` file
3. On your Android, enable **"Allow unknown apps"**
4. Tap the `.apk` file and follow the installation steps
5. Open the app and play

> ⚠️ Requires Android 5.0 or higher

---

## 🚀 Stack

- **Frontend:** HTML, CSS, JavaScript (jQuery), SweetAlert2, Font Awesome
- **Backend:** Firebase Realtime Database, Firebase Authentication, Firebase Cloud Functions
- **Hosting:** Firebase Hosting (global CDN)
- **PWA:** Service Worker, `manifest.json`, installable on all devices
- **Android:** APK generation with TWA / Web2App tools

### 💡 AI in Practice Mode

Practice mode uses an **AI with a positional-weight strategy**, simulating smart decisions and prioritizing the center of the board and sequence building. Difficulty affects the bot's aggressiveness and intelligence.

---

## 📁 Project Structure

```
├── public/                       # Frontend (hosted on Firebase Hosting)
│   ├── script/
│   │   ├── main.js               # Core game logic
│   │   ├── bot.js                # Bot AI (offline and online)
│   │   ├── auth.js               # Authentication, profile, ELO
│   │   ├── friends.js            # Friends system
│   │   ├── ranking.js            # Global leaderboard
│   │   ├── translate.js          # Translations (pt, en, es)
│   │   └── firebaseConfig.js     # Firebase config (placeholders)
│   ├── style/
│   │   └── style.css             # Game styles
│   ├── assets/                   # Images and sounds
│   ├── sw.js                     # Service Worker (cache)
│   ├── firebase-messaging-sw.js  # Push notifications Service Worker
│   └── *.html                    # Pages
├── functions/                    # Cloud Functions
│   ├── index.js                  # Maintenance + push notifications
│   └── package.json
└── firebase.json                 # Firebase configuration
```

---

## ⚙️ Setup (for developers)

This repository is the **public version** of the project and does not include the Firebase credentials. To run your own instance, create a Firebase project and replace the placeholders:

| Placeholder | Where | What to put |
|-------------|-------|-------------|
| `YOUR_API_KEY`, `YOUR_PROJECT_ID`, `YOUR_MESSAGING_SENDER_ID`, `YOUR_APP_ID`, `YOUR_MEASUREMENT_ID` | `public/script/firebaseConfig.js`, `public/firebase-messaging-sw.js` | Your Firebase project config |
| `YOUR_VAPID_KEY` | `public/script/auth.js` | Web Push certificate (Cloud Messaging) |
| `YOUR_DOMAIN` | `public/`, `functions/index.js` | Your deployment domain |
| `YOUR_MEASUREMENT_ID` | HTMLs (Google Analytics) | Google Analytics ID (optional) |
| `YOUR_ADSENSE_CLIENT_ID` | HTMLs | Google AdSense ID (optional) |

Then create a `.firebaserc` pointing to your project (the Firebase CLI generates it with `firebase init`).

### Local Development

The project requires no build — just serve the `public/` folder:

```bash
npx serve public
```

Or use the Firebase emulator:

```bash
firebase emulators:start
```

### Deploy

```bash
npm install -g firebase-tools
firebase login

# Hosting + Functions
firebase deploy

# Hosting only
firebase deploy --only hosting

# Functions only
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Available Cloud Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `scheduledGameCleanup` | Cron (daily 4am BRT) | Cleans expired games and recalculates stats |
| `manualSyncTrigger` | Write on `meta/triggerSync` | Manual maintenance |
| `sendFriendRequestNotification` | Create on `friend_requests/{uid}/{id}` | Friend request push (translated per language) |
| `sendGameInviteNotification` | Create on `lobby_players/{uid}/invites/{id}` | Game invite push (translated per language) |
| `sendResponseNotification` | Create on `responses/{uid}/{id}` | Response push (bug resolved / support) |
| `notifyInactivePlayers` | Cron (daily 6pm BRT) | Push to players inactive for 7+ days (translated per language) |

---

## 📜 License

This project is independent and **not affiliated with the official creators of the Sequence game**. Created for **educational and recreational** purposes. All rights to the original elements belong to their respective owners.

---

## 🙋‍♂️ Developer

Made by [Wendell Araújo](https://github.com/wendell-araujo)

- 🎮 Game on itch.io: https://wendell95araujo.itch.io/sequence-online
- 🌐 Web portfolio: https://wendell-araujo.web.app/
