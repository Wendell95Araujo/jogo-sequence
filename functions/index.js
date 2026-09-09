const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// ===== Configuração de arquivamento/limpeza de salas =====
const ARCHIVE_AFTER_HOURS = 6;        // arquiva salas após 6h de inatividade
const DELETE_AFTER_ARCHIVE_DAYS = 30; // deleta salas arquivadas após 30 dias

/**
 * Lógica central: arquiva salas inativas, deleta salas arquivadas antigas
 * e recalcula estatísticas.
 */
async function performMaintenance() {
  const db = admin.database();
  const now = Date.now();

  const ARCHIVE_MS = ARCHIVE_AFTER_HOURS * 60 * 60 * 1000;
  const DELETE_MS = DELETE_AFTER_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

  console.log("⚙️ [Server] Iniciando manutenção...");

  const gamesSnapshot = await db.ref("games").once("value");
  const updates = {};
  let archivedCount = 0;
  let deletedCount = 0;

  gamesSnapshot.forEach((child) => {
    const game = child.val();
    if (!game) return;

    // Fase 2: deletar salas arquivadas há mais de DELETE_AFTER_ARCHIVE_DAYS
    if (game.archived && game.archivedAt) {
      if (now - game.archivedAt >= DELETE_MS) {
        updates[`games/${child.key}`] = null;
        deletedCount++;
      }
      return;
    }

    // Fallback: salas legadas que ainda têm expirationTimestamp vencido
    if (!game.lastActivityAt && game.expirationTimestamp && game.expirationTimestamp <= now) {
      updates[`games/${child.key}`] = null;
      deletedCount++;
      return;
    }

    // Fase 1: arquivar salas inativas há mais de ARCHIVE_AFTER_HOURS
    const lastActivity = game.lastActivityAt || game.createdAt || 0;
    if (lastActivity && (now - lastActivity >= ARCHIVE_MS)) {
      updates[`games/${child.key}/archived`] = true;
      updates[`games/${child.key}/archivedAt`] = now;
      archivedCount++;
    }
  });

  let realActiveGames = 0;
  let realInactiveGames = 0;
  let realOnlineHumans = 0;
  let realPrivateRooms = 0;

  // Reaproveita o snapshot já carregado para calcular estatísticas
  gamesSnapshot.forEach((child) => {
    const game = child.val();
    if (!game || game.gameState === "ended") return;

    // Ignora salas que serão deletadas ou que já/vão ficar arquivadas
    if (updates[`games/${child.key}`] === null) return;
    if (game.archived || updates[`games/${child.key}/archived`] === true) return;

    let humansInThisRoom = 0;

    if (game.players) {
      Object.values(game.players).forEach((p) => {
        if (p.online === true && !p.isBot) {
          humansInThisRoom++;
        }
      });
    }

    realOnlineHumans += humansInThisRoom;

    if (humansInThisRoom > 0) {
      realActiveGames++;
    } else {
      realInactiveGames++;
    }

    if (game.isPrivate) realPrivateRooms++;
  });

  if (archivedCount > 0 || deletedCount > 0) {
    await db.ref().update(updates);
    console.log(`📦 [Server] ${archivedCount} salas arquivadas, 🗑️ ${deletedCount} removidas.`);
  }

  await db.ref("stats").update({
    total_active_games: realActiveGames,
    total_inactive_games: realInactiveGames,
    total_online_players: realOnlineHumans,
    total_private_rooms: realPrivateRooms,
  });

  await db.ref("meta/lastServerSync").set(admin.database.ServerValue.TIMESTAMP);
  
  console.log(`✅ [Server] Sync concluído. Ativas: ${realActiveGames}, Inativas: ${realInactiveGames}`);
}

/**
 * GATILHO 1: Agendado (Cron Job)
 * Roda a cada 6 horas.
 */
exports.scheduledGameCleanup = onSchedule({
  schedule: "0 */6 * * *",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  await performMaintenance();
});

/**
 * GATILHO 2: Manual (Botão do Admin)
 * Escuta escritas em: meta/triggerSync
 * 'onValueWritten' é o equivalente moderno ao 'onWrite' para Realtime DB
 */
exports.manualSyncTrigger = onValueWritten("/meta/triggerSync", async (event) => {
  if (!event.data.after.exists()) return;

  await performMaintenance();
});

const { onValueCreated } = require("firebase-functions/v2/database");

/**
 * Notificação de pedido de amizade
 * Disparado quando um novo pedido é criado em friend_requests/{targetUid}/{requestId}
 * Envia push notification para o usuário alvo informando quem quer ser amigo
 */
exports.sendFriendRequestNotification = onValueCreated(
  "/friend_requests/{targetUid}/{requestId}",
  async (event) => {
    const request = event.data.val();
    if (!request || !request.fromUsername) return;

    const targetUid = event.params.targetUid;
    const db = admin.database();

    const userSnap = await db.ref(`users/${targetUid}`).once("value");
    const user = userSnap.val();

    if (!user || !user.fcmTokens) return;

    const tokens = Object.keys(user.fcmTokens);
    if (tokens.length === 0) return;

    const lang = user.language || "pt";
    const bodies = {
      pt: `${request.fromUsername} quer ser seu amigo!`,
      en: `${request.fromUsername} wants to be your friend!`,
      es: `${request.fromUsername} quiere ser tu amigo!`,
    };

    const message = {
      notification: {
        title: "Row 5 Online",
        body: bodies[lang] || bodies.pt,
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: "https://YOUR_DOMAIN/game.html",
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin.messaging().send({ ...message, token }).catch((error) => {
        if (error.code === "messaging/registration-token-not-registered") {
          db.ref(`users/${targetUid}/fcmTokens/${token}`).remove();
        }
        return null;
      })
    );

    await Promise.all(sendPromises);
  }
);

/**
 * Notifica o remetente quando um pedido de amizade é aceito
 * Disparado quando um novo registro aparece em friend_accepted_notifications/{senderUid}/{notifId}
 * O client escreve neste nó ao aceitar o convite
 */
exports.sendFriendAcceptedNotification = onValueCreated(
  "/friend_accepted_notifications/{senderUid}/{notifId}",
  async (event) => {
    const data = event.data.val();
    if (!data || !data.fromUsername) return;

    const senderUid = event.params.senderUid;
    const db = admin.database();

    const senderSnap = await db.ref(`users/${senderUid}`).once("value");
    const sender = senderSnap.val();

    if (!sender || !sender.fcmTokens) return;

    const tokens = Object.keys(sender.fcmTokens);
    if (tokens.length === 0) return;

    const lang = sender.language || "pt";
    const accepterName = data.fromUsername;
    const bodies = {
      pt: `${accepterName} aceitou seu pedido de amizade!`,
      en: `${accepterName} accepted your friend request!`,
      es: `${accepterName} aceptó tu solicitud de amistad!`,
    };

    const message = {
      notification: {
        title: "Row 5 Online",
        body: bodies[lang] || bodies.pt,
      },
      data: {
        type: "friend_accepted",
        fromUid: data.fromUid || "",
        fromUsername: accepterName,
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: "https://YOUR_DOMAIN/game.html",
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin.messaging().send({ ...message, token }).catch((error) => {
        if (error.code === "messaging/registration-token-not-registered") {
          db.ref(`users/${senderUid}/fcmTokens/${token}`).remove();
        }
        return null;
      })
    );

    await Promise.all(sendPromises);
  }
);

/**
 * Notificação de convite para partida
 * Disparado quando um novo convite é criado em game_invites/{targetId}/{inviteId}
 * Envia push notification informando que alguém convidou o jogador para jogar
 */
exports.sendGameInviteNotification = onValueCreated(
  "/game_invites/{targetId}/{inviteId}",
  async (event) => {
    const invite = event.data.val();
    if (!invite || !invite.hostName) return;

    const targetId = event.params.targetId;
    const db = admin.database();

    const userSnap = await db.ref(`users/${targetId}`).once("value");
    const user = userSnap.val();

    if (!user || !user.fcmTokens) return;

    const tokens = Object.keys(user.fcmTokens);
    if (tokens.length === 0) return;

    const lang = user.language || "pt";
    const hasRoom = !!invite.gameId;

    const bodies = {
      pt: hasRoom ? `${invite.hostName} convidou você para uma partida!` : `${invite.hostName} quer jogar com você!`,
      en: hasRoom ? `${invite.hostName} invited you to a match!` : `${invite.hostName} wants to play with you!`,
      es: hasRoom ? `${invite.hostName} te invitó a una partida!` : `${invite.hostName} quiere jugar contigo!`,
    };

    const message = {
      notification: {
        title: "Row 5 Online",
        body: bodies[lang] || bodies.pt,
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: "https://YOUR_DOMAIN/game.html",
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin.messaging().send({ ...message, token }).catch((error) => {
        if (error.code === "messaging/registration-token-not-registered") {
          db.ref(`users/${targetId}/fcmTokens/${token}`).remove();
        }
        return null;
      })
    );

    await Promise.all(sendPromises);
  }
);

/**
 * Notificação de resposta do suporte/bug
 * Disparado quando uma nova resposta é criada em responses/{targetId}/{responseId}
 * Envia push notification informando que o jogador recebeu uma resposta da equipe
 */
exports.sendResponseNotification = onValueCreated(
  "/responses/{targetId}/{responseId}",
  async (event) => {
    const response = event.data.val();
    if (!response || !response.message) return;

    const targetId = event.params.targetId;
    const db = admin.database();

    const userSnap = await db.ref(`users/${targetId}`).once("value");
    const user = userSnap.val();

    if (!user || !user.fcmTokens) return;

    const tokens = Object.keys(user.fcmTokens);
    if (tokens.length === 0) return;

    const lang = response.language || user.language || "pt";
    const isBug = response.type === "bug";

    const bodies = {
      pt: isBug ? "Seu bug foi analisado e resolvido!" : "Você recebeu uma resposta do suporte.",
      en: isBug ? "Your bug has been reviewed and resolved!" : "You received a response from support.",
      es: isBug ? "¡Tu bug fue analizado y resuelto!" : "Recibiste una respuesta del soporte.",
    };

    const message = {
      notification: {
        title: "Row 5 Online",
        body: bodies[lang] || bodies.pt,
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: "https://YOUR_DOMAIN/game.html",
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin.messaging().send({ ...message, token }).catch((error) => {
        if (error.code === "messaging/registration-token-not-registered") {
          db.ref(`users/${targetId}/fcmTokens/${token}`).remove();
        }
        return null;
      })
    );

    await Promise.all(sendPromises);
  }
);

/**
 * Notificação para jogadores inativos
 * Roda diariamente às 18h (horário de Brasília)
 * Busca usuários com lastSeen > 7 dias, que tenham fcmTokens e notificações ativadas
 */
exports.notifyInactivePlayers = onSchedule({
  schedule: "0 18 * * *",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  const db = admin.database();
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  console.log("📨 [Reengagement] Buscando jogadores inativos há mais de 7 dias...");

  const usersSnap = await db.ref("users")
    .orderByChild("lastSeen")
    .endAt(sevenDaysAgo)
    .once("value");

  if (!usersSnap.exists()) {
    console.log("✅ [Reengagement] Nenhum jogador inativo encontrado.");
    return;
  }

  const notifications = {
    pt: {
      title: "Row 5 Online",
      body: "Faz tempo que não joga! Seus adversários estão esperando. Que tal uma partida rápida?",
    },
    en: {
      title: "Row 5 Online",
      body: "It's been a while! Your opponents are waiting. How about a quick match?",
    },
    es: {
      title: "Row 5 Online",
      body: "¡Hace tiempo que no juegas! Tus rivales te esperan. ¿Qué tal una partida rápida?",
    },
  };

  let sentCount = 0;
  let skippedCount = 0;
  const tokensToRemove = [];

  const sendPromises = [];

  usersSnap.forEach((userSnap) => {
    const user = userSnap.val();
    const uid = userSnap.key;

    if (!user || !user.fcmTokens) {
      skippedCount++;
      return;
    }

    if (user.lastReengagementNotification && user.lastReengagementNotification > sevenDaysAgo) {
      skippedCount++;
      return;
    }

    const tokens = Object.keys(user.fcmTokens);
    if (tokens.length === 0) {
      skippedCount++;
      return;
    }

    const lang = user.language || "pt";
    const notif = notifications[lang] || notifications.pt;

    const message = {
      notification: {
        title: notif.title,
        body: notif.body,
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: "https://YOUR_DOMAIN/game.html",
        },
      },
    };

    tokens.forEach((token) => {
      sendPromises.push(
        admin.messaging().send({ ...message, token }).then(() => {
          sentCount++;
        }).catch((error) => {
          if (error.code === "messaging/registration-token-not-registered") {
            tokensToRemove.push({ uid, token });
          }
        })
      );
    });

    sendPromises.push(
      db.ref(`users/${uid}/lastReengagementNotification`).set(now)
    );
  });

  await Promise.all(sendPromises);

  if (tokensToRemove.length > 0) {
    const cleanupUpdates = {};
    tokensToRemove.forEach(({ uid, token }) => {
      cleanupUpdates[`users/${uid}/fcmTokens/${token}`] = null;
    });
    await db.ref().update(cleanupUpdates);
    console.log(`🧹 [Reengagement] ${tokensToRemove.length} tokens inválidos removidos.`);
  }

  console.log(`✅ [Reengagement] Concluído. Enviados: ${sentCount}, Ignorados: ${skippedCount}`);
});

/**
 * Recalcula a média de avaliações em tempo real
 * Disparado quando uma nova review é adicionada ou removida em game_reviews
 * Também traduz o comentário para pt/en/es se houver texto
 */
exports.recalculateRating = onValueWritten("/game_reviews/{reviewId}", async (event) => {
  const db = admin.database();
  const reviewId = event.params.reviewId;

  const snap = await db.ref("game_reviews").once("value");
  const reviews = snap.val();

  if (!reviews) {
    await db.ref("meta/public_rating").set({ average: 0, count: 0, updatedAt: admin.database.ServerValue.TIMESTAMP });
    return;
  }

  const reviewsArray = Object.values(reviews);
  const count = reviewsArray.length;
  const sum = reviewsArray.reduce((acc, r) => acc + (r.stars || 0), 0);
  const average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;

  await db.ref("meta/public_rating").set({
    average,
    count,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  });

  console.log(`⭐ [Rating] Recalculado: ${average} (${count} avaliações)`);

  const review = event.data.after.val();
  if (!review || !review.comment || review.comment.trim() === "" || review.translations) return;

  try {
    const { Translate } = require("@google-cloud/translate").v2;
    const translate = new Translate();
    const text = review.comment.trim();
    const sourceLang = review.language || null;
    const targetLangs = ["pt", "en", "es"].filter(l => l !== sourceLang);

    const translations = {};
    if (sourceLang) translations[sourceLang] = text;

    for (const lang of targetLangs) {
      const [result] = await translate.translate(text, lang);
      translations[lang] = result;
    }

    await db.ref(`game_reviews/${reviewId}/translations`).set(translations);

    console.log(`🌐 [Translate] Review ${reviewId} traduzida (${sourceLang || "auto"} → ${targetLangs.join(", ")}).`);
  } catch (error) {
    console.error(`❌ [Translate] Erro ao traduzir review ${reviewId}:`, error.message);
  }
});

/**
 * Notificação de turno para jogador offline
 * Disparado quando o host escreve em turn_notifications/{targetUid}/{notifId}
 * Envia push informando que é a vez do jogador e ele deve voltar à partida
 */
exports.sendTurnNotification = onValueCreated(
  "/turn_notifications/{targetUid}/{notifId}",
  async (event) => {
    const targetUid = event.params.targetUid;
    const data = event.data.val();
    const db = admin.database();

    await db.ref(`turn_notifications/${targetUid}/${event.params.notifId}`).remove();

    if (!data || !data.gameId) return;

    let tokens = [];
    let tokenBasePath = null;
    let lang = "pt";

    const userSnap = await db.ref(`users/${targetUid}`).once("value");
    const user = userSnap.val();

    if (user && user.fcmTokens) {
      tokens = Object.keys(user.fcmTokens);
      tokenBasePath = `users/${targetUid}/fcmTokens`;
      lang = user.language || "pt";
    }

    if (tokens.length === 0 && data.deviceId) {
      const deviceSnap = await db.ref(`device_tokens/${data.deviceId}`).once("value");
      const deviceTokens = deviceSnap.val();
      if (deviceTokens) {
        tokens = Object.keys(deviceTokens);
        tokenBasePath = `device_tokens/${data.deviceId}`;
      }
    }

    if (tokens.length === 0) return;
    const bodies = {
      pt: `É a sua vez! Volte à partida.`,
      en: `It's your turn! Come back to the game.`,
      es: `¡Es tu turno! Vuelve a la partida.`,
    };

    const message = {
      notification: {
        title: "Row 5 Online",
        body: bodies[lang] || bodies.pt,
      },
      data: {
        gameId: data.gameId,
        type: "yourTurn",
      },
      webpush: {
        notification: {
          icon: "https://YOUR_DOMAIN/assets/img/logo.png",
          badge: "https://YOUR_DOMAIN/assets/img/logo.png",
        },
        fcmOptions: {
          link: `https://YOUR_DOMAIN/game.html?game=${data.gameId}`,
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin.messaging().send({ ...message, token }).catch((error) => {
        if (error.code === "messaging/registration-token-not-registered" && tokenBasePath) {
          db.ref(`${tokenBasePath}/${token}`).remove();
        }
        return null;
      })
    );

    await Promise.all(sendPromises);
    console.log(`📲 [TurnNotif] Notificação enviada para ${targetUid} (game: ${data.gameId})`);
  }
);
