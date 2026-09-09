# 🎮 Row 5 Online

**🌐 Português · [English](README.en.md) · [Español](README.es.md)**

**Row 5 Online** é uma versão digital multiplayer do clássico jogo de tabuleiro **Sequence**, feita para navegador e Android. Jogue com amigos ou bots em partidas estratégicas de até **12 jogadores**, direto do seu navegador ou como aplicativo.

🔗 **Jogue agora online:** https://game-sequence-multiplayer.web.app/

📦 **Versão Android (.apk):** disponível no itch.io 👉 https://wendell95araujo.itch.io/sequence-online

---

## 🧩 Recursos do Jogo

- ✅ **Multiplayer online** com salas privadas, públicas ou por código
- 🤖 **Modo treino** com bots de IA em vários níveis de dificuldade
- 👥 **Até 12 jogadores**, com modos 1v1, 2v2, 3v3, 4v4 e até 6v6
- 🔄 **Salvamento automático** de partidas locais
- 👫 Lista de amigos com convites em tempo real
- 🏆 Ranking global por pontos
- 🔔 Push notifications (pedidos de amizade, convites e reengajamento)
- 💬 Chat em jogo
- 📱 **Compatível com dispositivos móveis** e instalável como PWA (Android, iOS, Windows)
- 🌐 3 idiomas: Português, English, Español
- 🎵 Efeitos sonoros, vibração e animações visuais
- 🃏 Suporte a **cartas especiais** (Valetes de um ou dois olhos)

---

## 🕹️ Como Jogar

O objetivo é formar **sequências de 5 peças** usando as cartas da mão, posicionando fichas no tabuleiro virtual.

- **Valete de dois olhos:** joga em qualquer espaço vazio
- **Valete de um olho:** remove fichas dos adversários

Vence quem completar o número necessário de sequências.

### Pontuação do Ranking

| Cenário | Vitória | Empate | Derrota |
|---------|---------|--------|---------|
| Solo vs humano (1v1, 1v1v1) | 3 pts | 1 pt | 0 |
| Time vs humano (2v2, 3v3...) | 2 pts | 1 pt | 0 |
| Vs bot | 1 pt | 0 | 0 |

Mínimo de 5 partidas para aparecer no ranking.

---

## 📲 Instalação no Android

1. Acesse: https://wendell95araujo.itch.io/sequence-online
2. Clique em "Download" para baixar o arquivo `.apk`
3. No seu Android, ative a opção **"Permitir apps desconhecidos"**
4. Toque no arquivo `.apk` e siga as instruções de instalação
5. Abra o app e jogue

> ⚠️ Requer Android 5.0 ou superior

---

## 🚀 Stack

- **Frontend:** HTML, CSS, JavaScript (jQuery), SweetAlert2, Font Awesome
- **Backend:** Firebase Realtime Database, Firebase Authentication, Firebase Cloud Functions
- **Hosting:** Firebase Hosting (CDN global)
- **PWA:** Service Worker, `manifest.json`, instalável em todos os dispositivos
- **Android:** geração de APK com TWA / ferramentas Web2App

### 💡 IA no Modo Treino

O modo treino utiliza uma **IA com estratégia baseada em pesos posicionais**, simulando decisões inteligentes e priorizando o centro do tabuleiro e a formação de sequências. A dificuldade influencia o nível de agressividade e inteligência do bot.

---

## 📁 Estrutura do Projeto

```
├── public/                       # Frontend (hospedado no Firebase Hosting)
│   ├── script/
│   │   ├── main.js               # Lógica principal do jogo
│   │   ├── bot.js                # IA dos bots (offline e online)
│   │   ├── auth.js               # Autenticação, perfil, ELO
│   │   ├── friends.js            # Sistema de amigos
│   │   ├── ranking.js            # Leaderboard global
│   │   ├── translate.js          # Traduções (pt, en, es)
│   │   └── firebaseConfig.js     # Config do Firebase (placeholders)
│   ├── style/
│   │   └── style.css             # Estilos do jogo
│   ├── assets/                   # Imagens e sons
│   ├── sw.js                     # Service Worker (cache)
│   ├── firebase-messaging-sw.js  # Service Worker de push notifications
│   └── *.html                    # Páginas
├── functions/                    # Cloud Functions
│   ├── index.js                  # Manutenção + push notifications
│   └── package.json
└── firebase.json                 # Configuração do Firebase
```

---

## ⚙️ Configuração (para desenvolvedores)

Este repositório é a **versão pública** do projeto e não inclui as credenciais do Firebase. Para rodar sua própria instância, crie um projeto Firebase e substitua os placeholders:

| Placeholder | Onde | O que colocar |
|-------------|------|---------------|
| `YOUR_API_KEY`, `YOUR_PROJECT_ID`, `YOUR_MESSAGING_SENDER_ID`, `YOUR_APP_ID`, `YOUR_MEASUREMENT_ID` | `public/script/firebaseConfig.js`, `public/firebase-messaging-sw.js` | Config do seu projeto Firebase |
| `YOUR_VAPID_KEY` | `public/script/auth.js` | Web Push certificate (Cloud Messaging) |
| `YOUR_DOMAIN` | `public/`, `functions/index.js` | Domínio do seu deploy |
| `YOUR_MEASUREMENT_ID` | HTMLs (Google Analytics) | ID do Google Analytics (opcional) |
| `YOUR_ADSENSE_CLIENT_ID` | HTMLs | ID do Google AdSense (opcional) |

Depois, crie um `.firebaserc` apontando para o seu projeto (o Firebase CLI gera com `firebase init`).

### Desenvolvimento Local

O projeto não requer build — basta servir a pasta `public/`:

```bash
npx serve public
```

Ou usar o emulador do Firebase:

```bash
firebase emulators:start
```

### Deploy

```bash
npm install -g firebase-tools
firebase login

# Hosting + Functions
firebase deploy

# Apenas hosting
firebase deploy --only hosting

# Apenas functions
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Cloud Functions disponíveis

| Function | Trigger | Descrição |
|----------|---------|-----------|
| `scheduledGameCleanup` | Cron (diário 4h BRT) | Limpa jogos expirados e recalcula stats |
| `manualSyncTrigger` | Write em `meta/triggerSync` | Manutenção manual |
| `sendFriendRequestNotification` | Create em `friend_requests/{uid}/{id}` | Push de pedido de amizade (traduzida por idioma) |
| `sendGameInviteNotification` | Create em `lobby_players/{uid}/invites/{id}` | Push de convite para jogar (traduzida por idioma) |
| `sendResponseNotification` | Create em `responses/{uid}/{id}` | Push de resposta (bug resolvido / suporte) |
| `notifyInactivePlayers` | Cron (diário 18h BRT) | Push para jogadores inativos há 7+ dias (traduzida por idioma) |

---

## 📜 Licença

Este projeto é independente e **não afiliado aos criadores oficiais do jogo Sequence**. Criado para fins **educacionais e recreativos**. Todos os direitos dos elementos originais pertencem aos seus respectivos detentores.

---

## 🙋‍♂️ Desenvolvedor

Feito por [Wendell Araújo](https://github.com/wendell-araujo)

- 🎮 Jogo no itch.io: https://wendell95araujo.itch.io/sequence-online
- 🌐 Projeto Web: https://wendell-araujo.web.app/
