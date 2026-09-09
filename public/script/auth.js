const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;
let userProfile = null;

const ADMIN_UIDS = ["hq087r9cQ0RqncdhIgJGVjdHnGm2", "hafFgITAhWbunkM8UzCkqKHWox42"];

let authResolved = false;
let authNullTimeout = null;

setTimeout(() => { $("#auth-section").show(); }, 0);

auth.onAuthStateChanged((user) => {
  authResolved = true;
  currentUser = user;
  if (user) {
    if (authNullTimeout) { clearTimeout(authNullTimeout); authNullTimeout = null; }
    $("#auth-loading").show();
    $("#auth-login-btn").hide();
    $("#auth-user-info").hide();
    $("#name-options").hide();
    loadUserProfile(user.uid);
    initPushNotifications();
    migrateDeviceTokensToUser();
    promptPushOptIn();
    setTimeout(() => {
      if ($("#auth-loading").is(":visible")) {
        updateAuthUI(!!userProfile);
      }
    }, 5000);
  } else {
    userProfile = null;
    authNullTimeout = setTimeout(() => {
      if (!currentUser) {
        // Se offline e há perfil salvo no localStorage, restaurar sessão visual
        restoreOfflineProfile();
      }
    }, 500);
  }
});

setTimeout(() => {
  if (!authResolved) {
    esconderLoading();
    // Se auth não resolveu (offline), tentar restaurar perfil do cache
    restoreOfflineProfile();
  }
}, 5000);

function restoreOfflineProfile() {
  const cachedProfile = localStorage.getItem("sequenceUserProfile");
  if (cachedProfile && !navigator.onLine) {
    try {
      const profile = JSON.parse(cachedProfile);
      userProfile = {
        username: profile.username,
        avatar: profile.avatar,
        stats: { points: profile.points || 0 }
      };
      myPlayerName = profile.username;
      selectedAvatarId = profile.avatar || 1;
      $("#player-name-input").val(profile.username);
      initializeAvatarSelector();
      updateAuthUI(true);
    } catch (e) {
      updateAuthUI(false);
    }
  } else {
    updateAuthUI(false);
  }
}

function loadUserProfile(uid) {
  database.ref(`users/${uid}`).on("value", (snapshot) => {
    userProfile = snapshot.val();
    if (userProfile) {
      myPlayerName = userProfile.username;
      selectedAvatarId = userProfile.avatar || 1;
      $("#player-name-input").val(userProfile.username);
      localStorage.removeItem(NICKNAME_STORAGE_KEY);
      localStorage.removeItem(AVATAR_STORAGE_KEY);

      // Salvar perfil no localStorage para uso offline
      localStorage.setItem("sequenceUserProfile", JSON.stringify({
        username: userProfile.username,
        avatar: userProfile.avatar || 1,
        uid: uid,
        points: userProfile.stats?.points || 0
      }));

      const localHistory = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};
      const cloudHistory = userProfile.detailedHistory || {};
      const cloudHasDetails = !!(cloudHistory.byMode || cloudHistory.byDifficulty);
      const localHasDetails = !!(localHistory.byMode || localHistory.byDifficulty);

      if (!window._historySynced) {
        window._historySynced = true;
        if (cloudHasDetails || localHasDetails) {
          const merged = mergeHistoryMax(localHistory, cloudHistory);
          localStorage.setItem("sequenceWinLossHistory", JSON.stringify(merged));
          database.ref(`users/${uid}/detailedHistory`).set(merged).catch(() => {});
        } else if (cloudHistory.wins != null || cloudHistory.losses != null) {
          const merged = mergeHistoryMax(localHistory, cloudHistory);
          localStorage.setItem("sequenceWinLossHistory", JSON.stringify(merged));
        }
      }

      initializeAvatarSelector();
      updateAuthUI(true);
      initFriendsSystem();
      loadUnlockedAvatarsFromFirebase();
      updateLobbyPresenceWithUid(uid);
      if (userProfile.settings?.pushNotifications) {
        $("#auth-notifications-btn").find("i").removeClass("fa-bell-slash").addClass("fa-bell");
      } else {
        $("#auth-notifications-btn").find("i").removeClass("fa-bell").addClass("fa-bell-slash");
      }
      if (!userProfile.language || userProfile.language !== currentLanguage) {
        database.ref(`users/${uid}/language`).set(currentLanguage);
      }
      migrateStatsStructure(uid);
      migrateRetroactiveSequences();
      syncLocalStatsToProfile(uid);
      syncRankingData(uid);
    } else if (currentUser && !window._isCreatingAccount) {
      promptUsernameForNewAccount(currentUser);
    }
  });
}

function updateAuthUI(loggedIn) {
  $("#auth-section").show();
  $("#auth-loading").hide();
  if (typeof esconderLoading === "function") {
    esconderLoading();
  } else {
    setTimeout(() => { if (typeof esconderLoading === "function") esconderLoading(); }, 100);
  }
  if (loggedIn && userProfile) {
    $("#auth-login-btn").hide();
    $("#auth-user-info").show();
    $("#auth-lobby-avatar-img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${userProfile.avatar || 1}`);
    const hasRank = !!userProfile.stats?.rank;
    const rankIcon = hasRank
      ? (() => { const r = getPlayerRank(userProfile.stats.points || 0); return ` ${getRankBadgeSvg(r, 20)}`; })()
      : "";
    $("#auth-username-display").html(`${userProfile.username}${rankIcon}`);
    $("#player-name-input").val(userProfile.username).prop("disabled", true);
    $("#name-options").hide();
  } else if (loggedIn && !userProfile) {
    $("#auth-login-btn").hide();
    $("#auth-user-info").hide();
    $("#name-options").hide();
  } else {
    $("#auth-login-btn").show();
    $("#auth-user-info").hide();
    $("#player-name-input").prop("disabled", false);
    $("#name-options").show();
  }
}

function updateLobbyPresenceWithUid(uid) {
  if (lobbyPresenceRef) {
    lobbyPresenceRef.remove();
  }

  database.ref(`lobby_players/${getDeviceId()}`).remove();

  lobbyPresenceRef = database.ref(`lobby_players/${uid}`);
  const playerData = {
    name: userProfile?.username || myPlayerName || "",
    avatar: selectedAvatarId,
    uid: uid,
    deviceId: getDeviceId(),
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
  };
  lobbyPresenceRef.set(playerData);
  lobbyPresenceRef.onDisconnect().remove();

  database.ref(`users/${uid}/status`).set("online");
  database.ref(`users/${uid}/status`).onDisconnect().set("offline");
  database.ref(`users/${uid}/lastSeen`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
  database.ref(`users/${uid}/currentGameId`).onDisconnect().remove();

  if (lobbyInvitesRef) lobbyInvitesRef.off();
  lobbyInvitesRef = database.ref(`game_invites/${uid}`);
  lobbyInvitesRef.on("child_added", (snapshot) => {
    const invite = snapshot.val();
    if (!invite) return;
    showInviteNotification(invite, snapshot.key);
  });
}

function openAuthModal() {
  Swal.fire({
    title: translate("auth.loginTitle"),
    html: `
      <div class="auth-modal-container">
        <div class="auth-modal-fields">
          <button id="swal-google-login" class="auth-google-btn">
            <i class="fab fa-google"></i>
            ${translate("auth.googleBtn")}
          </button>
          <div class="auth-divider">${translate("auth.orDivider")}</div>
          <input id="swal-auth-email" type="email" class="swal2-input" placeholder="${translate("auth.emailPlaceholder")}">
          <input id="swal-auth-password" type="password" class="swal2-input" placeholder="${translate("auth.passwordPlaceholder")}">
          <div id="swal-auth-register-fields" class="auth-register-fields">
            <input id="swal-auth-password-confirm" type="password" class="swal2-input" placeholder="${translate("auth.confirmPasswordPlaceholder")}">
            <input id="swal-auth-username" type="text" class="swal2-input" placeholder="${translate("auth.usernamePlaceholder")}" maxlength="20">
          </div>
          <div class="auth-btn-row">
            <button id="swal-auth-login-btn" class="auth-btn-primary">${translate("auth.loginBtn")}</button>
            <button id="swal-auth-register-btn" class="auth-btn-secondary">${translate("auth.registerBtn")}</button>
          </div>
          <button id="swal-auth-forgot-btn" class="auth-forgot-btn">${translate("auth.forgotPassword")}</button>
        </div>
      </div>`,
    showConfirmButton: false,
    showCloseButton: true,
    didOpen: () => {
      let isRegisterMode = false;

      $("#swal-google-login").on("click", loginWithGoogle);

      $("#swal-auth-login-btn").on("click", () => {
        if (isRegisterMode) {
          registerWithEmail();
        } else {
          loginWithEmail();
        }
      });

      $("#swal-auth-register-btn").on("click", () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
          $("#swal-auth-register-fields").show();
          $("#swal-auth-login-btn").text(translate("auth.createAccountBtn"));
          $("#swal-auth-register-btn").text(translate("auth.backToLogin"));
        } else {
          $("#swal-auth-register-fields").hide();
          $("#swal-auth-login-btn").text(translate("auth.loginBtn"));
          $("#swal-auth-register-btn").text(translate("auth.registerBtn"));
        }
      });

      $("#swal-auth-forgot-btn").on("click", forgotPassword);
    },
  });
}

function loginWithGoogle() {
  auth.signInWithPopup(googleProvider).then((result) => {
    const user = result.user;
    database.ref(`users/${user.uid}`).once("value", (snapshot) => {
      if (!snapshot.exists()) {
        Swal.close();
        promptUsernameForNewAccount(user);
      } else {
        Swal.close();
        showToast(translate("auth.loginSuccess"), { icon: "success" });
      }
    });
  }).catch((error) => {
    if (error.code !== "auth/popup-closed-by-user") {
      showToast(error.message, { icon: "error" });
    }
  });
}

function loginWithEmail() {
  const email = $("#swal-auth-email").val().trim();
  const password = $("#swal-auth-password").val();

  if (!email || !password) {
    Swal.showValidationMessage(translate("auth.fillAllFields"));
    return;
  }

  auth.signInWithEmailAndPassword(email, password).then(() => {
    Swal.close();
    showToast(translate("auth.loginSuccess"), { icon: "success" });
  }).catch((error) => {
    let msg = translate("auth.loginError");
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      msg = translate("auth.invalidCredentials");
    } else if (error.code === "auth/too-many-requests") {
      msg = translate("auth.tooManyAttempts");
    }
    Swal.showValidationMessage(msg);
  });
}

function registerWithEmail() {
  const email = $("#swal-auth-email").val().trim();
  const password = $("#swal-auth-password").val();
  const confirmPassword = $("#swal-auth-password-confirm").val();
  const username = $("#swal-auth-username").val().trim();

  if (!email || !password || !confirmPassword || !username) {
    Swal.showValidationMessage(translate("auth.fillAllFields"));
    return;
  }

  if (password !== confirmPassword) {
    Swal.showValidationMessage(translate("auth.passwordMismatch"));
    return;
  }

  if (password.length < 6) {
    Swal.showValidationMessage(translate("auth.passwordTooShort"));
    return;
  }

  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_\-]+$/.test(username)) {
    Swal.showValidationMessage(translate("auth.usernameInvalid"));
    return;
  }

  const usernameLower = username.toLowerCase();

  database.ref(`usernames/${usernameLower}`).once("value", (snapshot) => {
    if (snapshot.exists()) {
      Swal.showValidationMessage(translate("auth.usernameTaken"));
      return;
    }

    window._isCreatingAccount = true;
    auth.createUserWithEmailAndPassword(email, password).then((result) => {
      const user = result.user;
      return createUserProfile(user, username);
    }).then(() => {
      window._isCreatingAccount = false;
      Swal.close();
      showToast(translate("auth.accountCreated"), { icon: "success" });
    }).catch((error) => {
      window._isCreatingAccount = false;
      let msg = translate("auth.registerError");
      if (error.code === "auth/email-already-in-use") {
        msg = translate("auth.emailInUse");
      } else if (error.code === "auth/weak-password") {
        msg = translate("auth.passwordTooShort");
      }
      Swal.showValidationMessage(msg);
    });
  });
}

function promptUsernameForNewAccount(user) {
  Swal.fire({
    title: translate("auth.chooseUsername"),
    input: "text",
    inputPlaceholder: translate("auth.usernamePlaceholder"),
    inputAttributes: { maxlength: "20" },
    showCancelButton: false,
    allowOutsideClick: false,
    confirmButtonText: translate("auth.confirmUsername"),
    inputValidator: (value) => {
      if (!value || value.length < 3) return translate("auth.usernameMin3");
      if (!/^[a-zA-Z0-9_\-]+$/.test(value)) return translate("auth.usernameInvalid");
    },
    preConfirm: (username) => {
      const usernameLower = username.toLowerCase();
      return database.ref(`usernames/${usernameLower}`).once("value").then((snapshot) => {
        if (snapshot.exists()) {
          Swal.showValidationMessage(translate("auth.usernameTaken"));
          return false;
        }
        return createUserProfile(user, username);
      });
    },
  }).then((result) => {
    if (result.isConfirmed) {
      showToast(translate("auth.accountCreated"), { icon: "success" });
    }
  });
}

function createUserProfile(user, username) {
  const usernameLower = username.toLowerCase();

  const localHistory = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || { wins: 0, losses: 0, draws: 0 };
  const offlineWins = localHistory.wins || 0;
  const offlineLosses = localHistory.losses || 0;
  const offlineDraws = localHistory.draws || 0;
  const offlineTotal = offlineWins + offlineLosses + offlineDraws;

  const profile = {
    username: username,
    usernameLower: usernameLower,
    avatar: selectedAvatarId,
    email: user.email,
    deviceId: getDeviceId(),
    language: currentLanguage || "pt",
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastSeen: firebase.database.ServerValue.TIMESTAMP,
    emailVerified: user.emailVerified || false,
    stats: {
      wins: 0,
      losses: 0,
      draws: 0,
      onlineWins: 0,
      onlineLosses: 0,
      onlineDraws: 0,
      onlineGamesPlayed: 0,
      offlineWins: offlineWins,
      offlineLosses: offlineLosses,
      offlineDraws: offlineDraws,
      offlineGamesPlayed: offlineTotal,
      points: 0,
      gamesPlayed: offlineTotal,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    },
    settings: {
      pushNotifications: false,
    },
  };

  const updates = {};
  updates[`users/${user.uid}`] = profile;
  updates[`usernames/${usernameLower}`] = user.uid;
  updates[`stats/total_users`] = firebase.database.ServerValue.increment(1);

  return database.ref().update(updates).then(() => {
    localStorage.removeItem("sequenceWinLossHistory");
    const unlocked = getUnlockedAvatars();
    if (unlocked.length > 0) {
      database.ref(`users/${user.uid}/unlockedAvatars`).set(unlocked).catch(() => {});
    }
  });
}

let statsMigrated = false;

function migrateStatsStructure(uid) {
  if (statsMigrated) return;
  statsMigrated = true;

  const stats = userProfile.stats || {};

  if (stats.onlineGamesPlayed !== undefined) return;

  if (connectionStatus !== "online") {
    statsMigrated = false;
    return;
  }

  const localHistory = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};
  const localWins = localHistory.wins || 0;
  const localLosses = localHistory.losses || 0;
  const localDraws = localHistory.draws || 0;
  const localTotal = localWins + localLosses + localDraws;

  const oldWins = stats.wins || 0;
  const oldLosses = stats.losses || 0;
  const oldDraws = stats.draws || 0;
  const oldTotal = stats.gamesPlayed || 0;

  const offlineWins = localTotal > 0 ? localWins : 0;
  const offlineLosses = localTotal > 0 ? localLosses : 0;
  const offlineDraws = localTotal > 0 ? localDraws : 0;
  const offlineTotal = offlineWins + offlineLosses + offlineDraws;

  const onlineWins = Math.max(0, oldWins - offlineWins);
  const onlineLosses = Math.max(0, oldLosses - offlineLosses);
  const onlineDraws = Math.max(0, oldDraws - offlineDraws);
  const onlineTotal = onlineWins + onlineLosses + onlineDraws;

  const newStats = {
    onlineWins: onlineWins,
    onlineLosses: onlineLosses,
    onlineDraws: onlineDraws,
    onlineGamesPlayed: onlineTotal,
    offlineWins: offlineWins,
    offlineLosses: offlineLosses,
    offlineDraws: offlineDraws,
    offlineGamesPlayed: offlineTotal,
    wins: oldWins,
    losses: oldLosses,
    draws: oldDraws,
    gamesPlayed: oldTotal || (onlineTotal + offlineTotal),
    points: stats.points || 0,
    rank: stats.rank || null,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
  };

  database.ref(`users/${uid}/stats`).set(newStats).then(() => {
    if (localTotal > 0) {
      localStorage.removeItem("sequenceWinLossHistory");
    }
  });
}

let localStatsSynced = false;

function syncLocalStatsToProfile(uid) {
  if (localStatsSynced) return;

  if (connectionStatus !== "online") return;

  localStatsSynced = true;

  const localHistory = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};
  const cloudStats = userProfile.stats || {};

  const localLastUpdated = localHistory.lastUpdated || 0;
  const cloudLastUpdated = cloudStats.lastUpdated || 0;

  const localWins = localHistory.wins || 0;
  const localLosses = localHistory.losses || 0;
  const localDraws = localHistory.draws || 0;
  const localTotal = localWins + localLosses + localDraws;

  const cloudOfflineWins = cloudStats.offlineWins || 0;
  const cloudOfflineLosses = cloudStats.offlineLosses || 0;
  const cloudOfflineDraws = cloudStats.offlineDraws || 0;
  const cloudOfflineTotal = cloudOfflineWins + cloudOfflineLosses + cloudOfflineDraws;

  if (localTotal === 0 && cloudOfflineTotal === 0) return;

  if (localLastUpdated > cloudLastUpdated && localTotal > cloudOfflineTotal) {
    const diffWins = localWins - cloudOfflineWins;
    const diffLosses = localLosses - cloudOfflineLosses;
    const diffDraws = localDraws - cloudOfflineDraws;

    if (diffWins <= 0 && diffLosses <= 0 && diffDraws <= 0) {
      syncCloudToLocal(cloudStats);
      return;
    }

    const updates = {};
    if (diffWins > 0) {
      updates[`users/${uid}/stats/offlineWins`] = firebase.database.ServerValue.increment(diffWins);
      updates[`users/${uid}/stats/gamesPlayed`] = firebase.database.ServerValue.increment(diffWins);
    }
    if (diffLosses > 0) {
      updates[`users/${uid}/stats/offlineLosses`] = firebase.database.ServerValue.increment(diffLosses);
      updates[`users/${uid}/stats/gamesPlayed`] = firebase.database.ServerValue.increment(diffLosses);
    }
    if (diffDraws > 0) {
      updates[`users/${uid}/stats/offlineDraws`] = firebase.database.ServerValue.increment(diffDraws);
      updates[`users/${uid}/stats/gamesPlayed`] = firebase.database.ServerValue.increment(diffDraws);
    }
    updates[`users/${uid}/stats/lastUpdated`] = firebase.database.ServerValue.TIMESTAMP;

    database.ref().update(updates).then(() => {
      syncCloudToLocal(Object.assign({}, cloudStats, {
        offlineWins: cloudOfflineWins + Math.max(0, diffWins),
        offlineLosses: cloudOfflineLosses + Math.max(0, diffLosses),
        offlineDraws: cloudOfflineDraws + Math.max(0, diffDraws),
        lastUpdated: Date.now(),
      }));
    });
  } else {
    syncCloudToLocal(cloudStats);
  }
}

function syncRankingData(uid) {
  const stats = userProfile.stats || {};
  const totalGames = stats.gamesPlayed || 0;
  if (totalGames < 5) return;

  const currentPoints = stats.points || 0;
  const currentWins = stats.wins || 0;
  const rank = getPlayerRank(currentPoints);

  const updates = {};
  updates[`rankings/global/${uid}/points`] = currentPoints;
  updates[`rankings/global/${uid}/gamesPlayed`] = totalGames;
  updates[`rankings/global/${uid}/wins`] = currentWins;
  updates[`rankings/global/${uid}/username`] = userProfile.username;
  updates[`rankings/global/${uid}/avatar`] = userProfile.avatar || 1;
  updates[`users/${uid}/stats/rank`] = rank.key;

  database.ref().update(updates).catch(() => {});
}

function mergeHistoryMax(local, cloud) {
  const maxNum = (a, b) => {
    const numA = Number(a) || 0;
    const numB = Number(b) || 0;
    const result = Math.max(numA, numB);
    return isNaN(result) ? 0 : result;
  };

  const mergeSubObj = (a, b) => {
    const result = {};
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    keys.forEach(k => {
      const valA = (a || {})[k];
      const valB = (b || {})[k];
      if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
        result[k] = mergeSubObj(valA, valB);
      } else if (typeof valA === 'object' && valA !== null) {
        result[k] = valA;
      } else if (typeof valB === 'object' && valB !== null) {
        result[k] = valB;
      } else {
        result[k] = maxNum(valA, valB);
      }
    });
    return result;
  };

  return {
    wins: maxNum(local.wins, cloud.wins),
    losses: maxNum(local.losses, cloud.losses),
    draws: maxNum(local.draws, cloud.draws),
    streak: local.streak || cloud.streak || 0,
    byMode: mergeSubObj(local.byMode, cloud.byMode),
    byDifficulty: mergeSubObj(local.byDifficulty, cloud.byDifficulty),
    onlineVsBot: mergeSubObj(local.onlineVsBot, cloud.onlineVsBot),
    onlineVsHumans: mergeSubObj(local.onlineVsHumans, cloud.onlineVsHumans),
    lastUpdated: Math.max(local.lastUpdated || 0, cloud.lastUpdated || 0) || Date.now(),
  };
}

function syncCloudToLocal(cloudStats) {
  const existing = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};

  const synced = {
    wins: cloudStats.offlineWins || existing.wins || 0,
    losses: cloudStats.offlineLosses || existing.losses || 0,
    draws: cloudStats.offlineDraws || existing.draws || 0,
    streak: existing.streak || 0,
    byMode: existing.byMode || {},
    byDifficulty: existing.byDifficulty || {},
    onlineVsBot: existing.onlineVsBot || { wins: 0, losses: 0, draws: 0 },
    onlineVsHumans: existing.onlineVsHumans || { wins: 0, losses: 0, draws: 0 },
    lastUpdated: cloudStats.lastUpdated || Date.now(),
  };

  localStorage.setItem("sequenceWinLossHistory", JSON.stringify(synced));
}

function forgotPassword() {
  const email = $("#swal-auth-email").val().trim();
  if (!email) {
    showToast(translate("auth.enterEmailFirst"), { icon: "warning" });
    return;
  }

  auth.languageCode = currentLanguage;
  auth.sendPasswordResetEmail(email).then(() => {
    showToast(translate("auth.resetEmailSent"), { icon: "success" });
  }).catch((error) => {
    if (error.code === "auth/user-not-found") {
      showToast(translate("auth.emailNotFound"), { icon: "error" });
    } else {
      showToast(translate("auth.resetError"), { icon: "error" });
    }
  });
}

function migrateRetroactiveSequences() {
  if (!currentUser || !userProfile) return;
  if (window._sequencesMigrated) return;
  const stats = userProfile.stats || {};

  window._sequencesMigrated = true;

  const uid = currentUser.uid;
  const updates = {};

  const offWins = stats.offlineWins || 0;
  const offLosses = stats.offlineLosses || 0;
  const offDraws = stats.offlineDraws || 0;
  const onWins = stats.onlineWins || 0;
  const onLosses = stats.onlineLosses || 0;
  const onDraws = stats.onlineDraws || 0;

  const correctWins = offWins + onWins;
  const correctLosses = offLosses + onLosses;
  const correctDraws = offDraws + onDraws;
  const correctGamesPlayed = correctWins + correctLosses + correctDraws;

  if (correctWins !== (stats.wins || 0)) updates[`users/${uid}/stats/wins`] = correctWins;
  if (correctLosses !== (stats.losses || 0)) updates[`users/${uid}/stats/losses`] = correctLosses;
  if (correctDraws !== (stats.draws || 0)) updates[`users/${uid}/stats/draws`] = correctDraws;
  if (correctGamesPlayed !== (stats.gamesPlayed || 0)) updates[`users/${uid}/stats/gamesPlayed`] = correctGamesPlayed;

  if ((stats.sequencesCompleted || 0) === 0 && correctWins > 0) {
    const history = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};
    const byMode = history.byMode || {};

    let estimated = 0;

    Object.entries(byMode).forEach(([modeKey, data]) => {
      const [players, teams] = modeKey.split("_").map(Number);
      const seqToWin = teams === 3 ? 1 : 2;
      estimated += (data.wins || 0) * seqToWin;
    });

    if (estimated === 0) {
      estimated = (offWins * 2) + (onWins * 1);
    }

    if (estimated > 0) {
      updates[`users/${uid}/stats/sequencesCompleted`] = estimated;
    }
  }

  if (Object.keys(updates).length > 0) {
    database.ref().update(updates).then(() => {
      if (!userProfile.stats) userProfile.stats = {};
      userProfile.stats.wins = correctWins;
      userProfile.stats.losses = correctLosses;
      userProfile.stats.draws = correctDraws;
      userProfile.stats.gamesPlayed = correctGamesPlayed;
      if (updates[`users/${uid}/stats/sequencesCompleted`]) {
        userProfile.stats.sequencesCompleted = updates[`users/${uid}/stats/sequencesCompleted`];
      }
    }).catch(() => {});
  }
}

function buildDetailedHistoryTable() {
  const history = JSON.parse(localStorage.getItem("sequenceWinLossHistory")) || {};
  const byMode = history.byMode || {};
  const byDifficulty = history.byDifficulty || {};
  const onlineVsBot = history.onlineVsBot || { wins: 0, losses: 0, draws: 0 };
  const onlineVsHumans = history.onlineVsHumans || { wins: 0, losses: 0, draws: 0 };

  const allModes = [
    { key: "2_2", label: "1v1 (2)" },
    { key: "3_3", label: "1v1v1 (3)" },
    { key: "4_2", label: "2v2 (4)" },
    { key: "6_2", label: "3v3 (6)" },
    { key: "6_3", label: "2v2v2 (6)" },
    { key: "8_2", label: "4v4 (8)" },
    { key: "9_3", label: "3v3v3 (9)" },
    { key: "10_2", label: "5v5 (10)" },
    { key: "12_2", label: "6v6 (12)" },
    { key: "12_3", label: "4v4v4 (12)" },
  ];

  const difficulties = ["easy", "medium", "hard", "expert"];
  const diffLabels = { easy: translate("difficultyOptions.easy"), medium: translate("difficultyOptions.medium"), hard: translate("difficultyOptions.hard"), expert: translate("difficultyOptions.expert") };

  const w = translate("profile.winsShort");
  const l = translate("profile.lossesShort");
  const d = translate("profile.drawsShort");

  let html = `<table class="profile-history-table"><thead><tr><th style="text-align: left;">${translate("gameMode")}</th><th>${w}</th><th>${l}</th><th>${d}</th></tr></thead><tbody>`;

  html += `<tr class="history-section-header"><td colspan="4"><strong><i class="fas fa-gamepad"></i> ${translate("profile.byGameMode")}</strong></td></tr>`;
  allModes.forEach(m => {
    const data = byMode[m.key] || { wins: 0, losses: 0, draws: 0 };
    html += `<tr><td>${m.label}</td><td>${data.wins}</td><td>${data.losses}</td><td>${data.draws}</td></tr>`;
  });

  html += `<tr class="history-section-header"><td colspan="4"><strong><i class="fas fa-robot"></i> ${translate("profile.byDifficulty")}</strong></td></tr>`;
  difficulties.forEach(diff => {
    const data = byDifficulty[diff] || { wins: 0, losses: 0, draws: 0 };
    html += `<tr><td>${diffLabels[diff]}</td><td>${data.wins}</td><td>${data.losses}</td><td>${data.draws}</td></tr>`;
  });

  html += `<tr class="history-section-header"><td colspan="4"><strong><i class="fas fa-globe"></i> ${translate("profile.onlineBreakdown")}</strong></td></tr>`;
  html += `<tr><td>${translate("profile.vsHumans")}</td><td>${onlineVsHumans.wins}</td><td>${onlineVsHumans.losses}</td><td>${onlineVsHumans.draws}</td></tr>`;
  html += `<tr><td>${translate("profile.vsBots")}</td><td>${onlineVsBot.wins}</td><td>${onlineVsBot.losses}</td><td>${onlineVsBot.draws}</td></tr>`;

  html += `</tbody></table>`;
  return html;
}

function openProfileModal() {
  if (!currentUser || !userProfile) return;

  const stats = userProfile.stats || {};
  const onlineWins = stats.onlineWins || 0;
  const onlineLosses = stats.onlineLosses || 0;
  const onlineDraws = stats.onlineDraws || 0;
  const onlineGames = stats.onlineGamesPlayed || 0;
  const offlineWins = stats.offlineWins || 0;
  const offlineLosses = stats.offlineLosses || 0;
  const offlineDraws = stats.offlineDraws || 0;
  const offlineGames = stats.offlineGamesPlayed || 0;
  const points = stats.points || 0;
  const sequencesCompleted = stats.sequencesCompleted || 0;
  const hasRank = (onlineGames + offlineGames) >= 5;
  const rank = getPlayerRank(points);
  const rankBadge = hasRank ? `<span class="rank-badge">${getRankBadgeSvg(rank, 18)}</span>` : "";

  let nextRankHtml = "";
  if (hasRank) {
    const nextRankInfo = getNextRankInfo(points);
    if (nextRankInfo) {
      nextRankHtml = `<p class="profile-next-rank"><i class="fas fa-arrow-up"></i> ${translate(nextRankInfo.remaining === 1 ? "ranking.pointsToNext" : "ranking.pointsToNextPlural", { points: nextRankInfo.remaining, rank: translate(nextRankInfo.nextRank.key) })}</p>`;
    }
  }

  Swal.fire({
    title: translate("auth.profileTitle"),
    html: `
      <div class="auth-modal-container">
        <div class="profile-header">
          <img src="https://api.dicebear.com/8.x/adventurer/svg?seed=${userProfile.avatar || 1}" class="profile-avatar-img">
          <p class="profile-username">${userProfile.username} ${rankBadge}</p>
          <p class="profile-email">${userProfile.email}</p>
          ${nextRankHtml}
          ${hasRank ? `<div style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
            <button class="ranking-tiers-btn" onclick="Swal.close();showRankTiersModal('profile')" style="font-size:0.75em;padding:5px 10px;">
              <i class="fas fa-layer-group"></i> ${translate("ranking.viewTiers")}
            </button>
            <button class="ranking-tiers-btn" onclick="Swal.close();showScoringModal('profile')" style="font-size:0.75em;padding:5px 10px;">
              <i class="fas fa-calculator"></i> ${translate("ranking.howScoring")}
            </button>
          </div>` : ""}
        </div>

        <div class="profile-stats-section">
          <h4 class="profile-stats-title"><i class="fas fa-globe"></i> ${translate("profile.onlineStats")}</h4>
          <div class="friend-profile-stats">
            <div class="friend-profile-stat"><strong>${onlineGames}</strong><small>${translate("ranking.games")}</small></div>
            <div class="friend-profile-stat"><strong>${onlineWins}</strong><small>${translate("ranking.wins")}</small></div>
            <div class="friend-profile-stat"><strong>${onlineLosses}</strong><small>${translate("friends.profileLosses")}</small></div>
            <div class="friend-profile-stat"><strong>${onlineDraws}</strong><small>${translate("friends.profileDraws")}</small></div>
            <div class="friend-profile-stat"><strong>${points}</strong><small>${translate("ranking.points")}</small></div>
          </div>
          <h4 class="profile-stats-title"><i class="fas fa-robot"></i> ${translate("profile.offlineStats")}</h4>
          <div class="friend-profile-stats">
            <div class="friend-profile-stat"><strong>${offlineGames}</strong><small>${translate("ranking.games")}</small></div>
            <div class="friend-profile-stat"><strong>${offlineWins}</strong><small>${translate("ranking.wins")}</small></div>
            <div class="friend-profile-stat"><strong>${offlineLosses}</strong><small>${translate("friends.profileLosses")}</small></div>
            <div class="friend-profile-stat"><strong>${offlineDraws}</strong><small>${translate("friends.profileDraws")}</small></div>
          </div>

          <div class="friend-profile-stats" style="margin-top:8px;justify-content:center;">
            <div class="friend-profile-stat"><strong>${sequencesCompleted}</strong><small>${translate("profile.sequences")}</small></div>
          </div>

          <div class="profile-history-section">
            <h4 class="profile-stats-title profile-history-toggle" style="cursor:pointer;"><i class="fas fa-chart-bar"></i> ${translate("profile.detailedHistory")} <i class="fas fa-chevron-down" style="font-size:0.7em;margin-left:5px;"></i></h4>
            <div class="profile-history-content" style="display:none;">
              ${buildDetailedHistoryTable()}
            </div>
          </div>
        </div>

        <hr class="modal-separator">
        <div id="profile-edit-section" style="display:none;">
          <label class="modal-label">${translate("auth.usernameLabel")}</label>
          <input id="swal-profile-username" type="text" class="swal2-input" value="${userProfile.username}" maxlength="20">
          <label class="modal-label">${translate("auth.avatarLabel")}</label>
          <div class="profile-avatar-selector">
            <div class="profile-avatar-actions">
              <div class="profile-gender-toggle">
                <button type="button" class="gender-btn active" data-gender="all">${translate("auth.genderAll")}</button>
                <button type="button" class="gender-btn" data-gender="m"><i class="fas fa-mars"></i></button>
                <button type="button" class="gender-btn" data-gender="f"><i class="fas fa-venus"></i></button>
              </div>
              <button type="button" id="profile-avatar-random" class="profile-random-btn" title="${translate("auth.randomAvatar")}"><i class="fas fa-dice"></i></button>
            </div>
            <div id="profile-avatar-dropdown" class="profile-avatar-dropdown">
              <div id="profile-avatar-selected" class="profile-avatar-dropdown-selected">
                <img src="https://api.dicebear.com/8.x/adventurer/svg?seed=${userProfile.avatar || 1}" data-avatar-id="${userProfile.avatar || 1}">
                <span class="dropdown-arrow"><i class="fas fa-chevron-down"></i></span>
              </div>
              <div id="profile-avatar-panel" class="profile-avatar-dropdown-panel"></div>
            </div>
          </div>
        </div>
        <div id="profile-view-actions">
          <button id="swal-edit-profile-btn" class="auth-btn-secondary" style="width:100%;"><i class="fas fa-pen"></i> ${translate("auth.editProfile")}</button>
        </div>
        <hr class="modal-separator">
        <button id="swal-delete-account-btn" class="auth-delete-account-btn"><i class="fas fa-trash"></i> ${translate("auth.deleteAccount")}</button>
      </div>`,
    confirmButtonText: translate("auth.saveProfile"),
    showCancelButton: true,
    cancelButtonText: translate("cancel"),
    showCloseButton: true,
    didOpen: () => {
      const $editSection = $("#profile-edit-section");
      const $viewActions = $("#profile-view-actions");
      const $confirmBtn = $(".swal2-confirm");
      const $cancelBtn = $(".swal2-cancel");

      $confirmBtn.hide();
      $cancelBtn.hide();

      let selectedAvatar = userProfile.avatar || 1;
      let currentGender = "all";

      const panel = $("#profile-avatar-panel");

      function renderAvatarPanel(gender) {
        panel.empty();
        let avatars = [];
        if (gender === "m") avatars = AVATARS_MALE;
        else if (gender === "f") avatars = AVATARS_FEMALE;
        else avatars = Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1);

        avatars.forEach(id => {
          const selectedClass = id === selectedAvatar ? "selected" : "";
          const locked = !isAvatarUnlocked(id);
          const wrapper = $(`<div class="profile-avatar-opt-wrapper ${locked ? 'avatar-locked' : ''}" data-id="${id}"></div>`);
          const img = $(`<img src="https://api.dicebear.com/8.x/adventurer/svg?seed=${id}" data-id="${id}" class="profile-avatar-opt ${selectedClass}">`);
          wrapper.append(img);
          if (locked) {
            wrapper.append(`<span class="avatar-lock-icon"><i class="fas fa-lock"></i></span>`);
          }
          panel.append(wrapper);
        });
      }

      renderAvatarPanel("all");

      $("#profile-avatar-selected").on("click", function () {
        $("#profile-avatar-dropdown").toggleClass("open");
      });

      panel.on("click", ".profile-avatar-opt-wrapper", function () {
        const id = parseInt($(this).data("id"));
        const locked = !isAvatarUnlocked(id);

        if (locked) {
          const reason = getAvatarUnlockReason(id);
          let htmlText = "";

          if (reason.type === 'games') {
            const current = getPlayerGamesPlayed();
            htmlText = translate("avatarUnlockByGames").replace("{need}", reason.value).replace("{current}", current);
          } else if (reason.type === 'points') {
            const current = getPlayerPoints();
            htmlText = translate("avatarUnlockByPoints").replace("{need}", reason.value).replace("{current}", current);
          } else {
            htmlText = translate("avatarUnlockByAd");
          }

          Swal.fire({
            title: translate("avatarLocked"),
            html: htmlText,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-play"></i> ' + translate("watchAd"),
            cancelButtonText: translate("close"),
            toast: true,
            position: "center",
          }).then((result) => {
            if (result.isConfirmed) {
              showRewardedAdForAvatar(id, () => {
                selectedAvatar = id;
                $("#profile-avatar-selected img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`).attr("data-avatar-id", selectedAvatar);
                $(".profile-avatar-img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`);
                renderAvatarPanel(currentGender);
                $("#profile-avatar-dropdown").removeClass("open");
                showToast(translate("avatarUnlockedSingle"), { icon: "success" });
              }, () => {
                showToast(translate("adNotAvailable"), { icon: "warning" });
              });
            }
          });
          return;
        }

        selectedAvatar = id;
        panel.find("img").removeClass("selected");
        $(this).find("img").addClass("selected");
        $("#profile-avatar-selected img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`).attr("data-avatar-id", selectedAvatar);
        $(".profile-avatar-img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`);
        $("#profile-avatar-dropdown").removeClass("open");
      });

      $(".profile-gender-toggle .gender-btn").on("click", function () {
        $(".profile-gender-toggle .gender-btn").removeClass("active");
        $(this).addClass("active");
        currentGender = $(this).data("gender");
        renderAvatarPanel(currentGender);
      });

      $("#profile-avatar-random").on("click", function () {
        let avatars = [];
        if (currentGender === "m") avatars = AVATARS_MALE;
        else if (currentGender === "f") avatars = AVATARS_FEMALE;
        else avatars = Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1);

        const unlockedAvatars = avatars.filter(id => isAvatarUnlocked(id));
        if (unlockedAvatars.length === 0) return;

        selectedAvatar = unlockedAvatars[Math.floor(Math.random() * unlockedAvatars.length)];
        $("#profile-avatar-selected img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`).attr("data-avatar-id", selectedAvatar);
        $(".profile-avatar-img").attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${selectedAvatar}`);
        renderAvatarPanel(currentGender);
      });

      $(document).on("click.profileDropdown", function (e) {
        if (!$(e.target).closest("#profile-avatar-dropdown").length) {
          $("#profile-avatar-dropdown").removeClass("open");
        }
      });

      Swal.getPopup()._selectedAvatar = () => selectedAvatar;

      $("#swal-edit-profile-btn").on("click", () => {
        $editSection.slideDown(200);
        $viewActions.hide();
        $confirmBtn.show();
        $cancelBtn.show();
      });

      $(".profile-history-toggle").on("click", function () {
        const $content = $(this).next(".profile-history-content");
        const $arrow = $(this).find(".fa-chevron-down, .fa-chevron-up");
        $content.slideToggle(200);
        $arrow.toggleClass("fa-chevron-down fa-chevron-up");
      });

      $("#swal-delete-account-btn").on("click", () => {
        $(document).off("click.profileDropdown");
        Swal.close();
        deleteAccount();
      });
    },
    didClose: () => {
      $(document).off("click.profileDropdown");
    },
    preConfirm: () => {
      const newUsername = $("#swal-profile-username").val().trim();
      const newAvatar = Swal.getPopup()._selectedAvatar();

      if (!newUsername || newUsername.length < 3 || !/^[a-zA-Z0-9_\-]+$/.test(newUsername)) {
        Swal.showValidationMessage(translate("auth.usernameInvalid"));
        return false;
      }

      const newUsernameLower = newUsername.toLowerCase();
      const oldUsernameLower = (userProfile.usernameLower || userProfile.username).toLowerCase();

      if (newUsername === userProfile.username && newAvatar === userProfile.avatar) {
        return true;
      }

      if (newUsernameLower !== oldUsernameLower) {
        return database.ref(`usernames/${newUsernameLower}`).once("value").then((snapshot) => {
          if (snapshot.exists()) {
            Swal.showValidationMessage(translate("auth.usernameTaken"));
            return false;
          }
          const updates = {};
          updates[`users/${currentUser.uid}/username`] = newUsername;
          updates[`users/${currentUser.uid}/usernameLower`] = newUsernameLower;
          updates[`users/${currentUser.uid}/avatar`] = newAvatar;
          updates[`usernames/${oldUsernameLower}`] = null;
          updates[`usernames/${newUsernameLower}`] = currentUser.uid;
          if (userProfile.stats && (userProfile.stats.gamesPlayed || 0) >= 5) {
            updates[`rankings/global/${currentUser.uid}/username`] = newUsername;
            updates[`rankings/global/${currentUser.uid}/avatar`] = newAvatar;
          }
          return database.ref().update(updates);
        });
      } else {
        const updates = {};
        updates[`users/${currentUser.uid}/username`] = newUsername;
        updates[`users/${currentUser.uid}/avatar`] = newAvatar;
        if (userProfile.stats && (userProfile.stats.gamesPlayed || 0) >= 5) {
          updates[`rankings/global/${currentUser.uid}/username`] = newUsername;
          updates[`rankings/global/${currentUser.uid}/avatar`] = newAvatar;
        }
        return database.ref().update(updates);
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      showToast(translate("auth.profileSaved"), { icon: "success" });
    }
  });
}

function deleteAccount() {
  if (!currentUser || !userProfile) return;

  Swal.fire({
    title: translate("auth.deleteAccountTitle"),
    html: translate("auth.deleteAccountText"),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: translate("auth.deleteAccountConfirm"),
    cancelButtonText: translate("cancel"),
    confirmButtonColor: "#e74c3c",
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: translate("auth.deleteAccountFinalTitle"),
        input: "text",
        inputPlaceholder: translate("auth.deleteAccountTypeName"),
        icon: "error",
        showCancelButton: true,
        confirmButtonText: translate("auth.deleteAccountFinalConfirm"),
        cancelButtonText: translate("cancel"),
        confirmButtonColor: "#e74c3c",
        preConfirm: (value) => {
          if (value.toLowerCase() !== userProfile.username.toLowerCase()) {
            Swal.showValidationMessage(translate("auth.deleteAccountNameMismatch"));
            return false;
          }
          return true;
        },
      }).then((finalResult) => {
        if (finalResult.isConfirmed) {
          executeAccountDeletion();
        }
      });
    }
  });
}

function executeAccountDeletion() {
  const uid = currentUser.uid;
  const username = (userProfile.usernameLower || userProfile.username.toLowerCase());

  const updates = {};
  updates[`users/${uid}`] = null;
  updates[`usernames/${username}`] = null;
  updates[`rankings/global/${uid}`] = null;
  updates[`friends/${uid}`] = null;
  updates[`friend_requests/${uid}`] = null;
  updates[`sent_requests/${uid}`] = null;
  updates[`blocked/${uid}`] = null;
  updates[`stats/total_users`] = firebase.database.ServerValue.increment(-1);

  database.ref().update(updates).then(() => {
    return currentUser.delete();
  }).then(() => {
    localStorage.removeItem("sequenceWinLossHistory");
    localStorage.removeItem("sequenceGameData");
    showToast(translate("auth.deleteAccountSuccess"), { icon: "success" });
    setTimeout(() => window.location.reload(), 2000);
  }).catch((error) => {
    if (error.code === "auth/requires-recent-login") {
      showToast(translate("auth.deleteAccountRelogin"), { icon: "warning", timer: 5000 });
    } else {
      showToast(translate("auth.deleteAccountError"), { icon: "error" });
    }
  });
}

function updateUserStats(result, isAgainstBot, isTeamGame, opponentPoints, sequences) {
  if (!currentUser || !userProfile) return;

  const uid = currentUser.uid;
  const seqCount = sequences || 0;

  if (isAgainstBot) {
    const offlineUpdates = {};
    offlineUpdates[`users/${uid}/stats/gamesPlayed`] = firebase.database.ServerValue.increment(1);
    offlineUpdates[`users/${uid}/stats/offlineGamesPlayed`] = firebase.database.ServerValue.increment(1);
    offlineUpdates[`users/${uid}/stats/${result === "win" ? "wins" : result === "loss" ? "losses" : "draws"}`] = firebase.database.ServerValue.increment(1);
    offlineUpdates[`users/${uid}/stats/${result === "win" ? "offlineWins" : result === "loss" ? "offlineLosses" : "offlineDraws"}`] = firebase.database.ServerValue.increment(1);
    offlineUpdates[`users/${uid}/stats/lastUpdated`] = firebase.database.ServerValue.TIMESTAMP;
    offlineUpdates[`users/${uid}/lastSeen`] = firebase.database.ServerValue.TIMESTAMP;

    if (seqCount > 0) {
      offlineUpdates[`users/${uid}/stats/sequencesCompleted`] = firebase.database.ServerValue.increment(seqCount);
    }

    if (result === "win") {
      offlineUpdates[`users/${uid}/stats/points`] = firebase.database.ServerValue.increment(1);
    }

    const myTotalGamesBot = (userProfile.stats?.gamesPlayed || 0) + 1;
    if (myTotalGamesBot >= 5) {
      const currentPoints = (userProfile.stats?.points || 0) + (result === "win" ? 1 : 0);
      const newRank = getPlayerRank(currentPoints);
      offlineUpdates[`users/${uid}/stats/rank`] = newRank.key;
      offlineUpdates[`rankings/global/${uid}/points`] = currentPoints;
      offlineUpdates[`rankings/global/${uid}/username`] = userProfile.username;
      offlineUpdates[`rankings/global/${uid}/avatar`] = userProfile.avatar;
      offlineUpdates[`rankings/global/${uid}/wins`] = firebase.database.ServerValue.increment(result === "win" ? 1 : 0);
      offlineUpdates[`rankings/global/${uid}/gamesPlayed`] = firebase.database.ServerValue.increment(1);
    }

    database.ref().update(offlineUpdates).catch((err) => {
      console.warn("Erro ao salvar stats offline:", err.message);
    });

    if (!userProfile.stats) userProfile.stats = {};
    userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
    userProfile.stats.offlineGamesPlayed = (userProfile.stats.offlineGamesPlayed || 0) + 1;
    userProfile.stats.sequencesCompleted = (userProfile.stats.sequencesCompleted || 0) + seqCount;
    if (result === "win") {
      userProfile.stats.wins = (userProfile.stats.wins || 0) + 1;
      userProfile.stats.offlineWins = (userProfile.stats.offlineWins || 0) + 1;
      userProfile.stats.points = (userProfile.stats.points || 0) + 1;
    } else if (result === "loss") {
      userProfile.stats.losses = (userProfile.stats.losses || 0) + 1;
      userProfile.stats.offlineLosses = (userProfile.stats.offlineLosses || 0) + 1;
    } else {
      userProfile.stats.draws = (userProfile.stats.draws || 0) + 1;
      userProfile.stats.offlineDraws = (userProfile.stats.offlineDraws || 0) + 1;
    }

    return;
  }

  const myPoints = userProfile.stats?.points || 0;
  const myOnlineGames = (userProfile.stats?.onlineGamesPlayed || 0) + 1;
  const myTotalGames = (userProfile.stats?.gamesPlayed || 0) + 1;
  let pointsGained = 0;

  if (isTeamGame) {
    if (result === "win") pointsGained = 2;
    else if (result === "draw") pointsGained = 1;
  } else {
    if (result === "win") pointsGained = 3;
    else if (result === "draw") pointsGained = 1;
  }

  if (result === "win" && opponentPoints != null) {
    const myRank = getPlayerRank(myPoints);
    const opponentRank = getPlayerRank(opponentPoints);
    const myTierIndex = RANK_TIERS.indexOf(myRank);
    const opponentTierIndex = RANK_TIERS.indexOf(opponentRank);
    const tierDiff = opponentTierIndex - myTierIndex;
    if (tierDiff > 0) {
      const bonus = Math.min(5, Math.ceil(tierDiff / 3));
      pointsGained += bonus;
    }
  }

  const currentPointsTotal = myPoints + pointsGained;

  const updates = {};
  updates[`users/${uid}/stats/points`] = currentPointsTotal;
  updates[`users/${uid}/stats/gamesPlayed`] = firebase.database.ServerValue.increment(1);
  updates[`users/${uid}/stats/onlineGamesPlayed`] = firebase.database.ServerValue.increment(1);
  updates[`users/${uid}/stats/${result === "win" ? "wins" : result === "loss" ? "losses" : "draws"}`] = firebase.database.ServerValue.increment(1);
  updates[`users/${uid}/stats/${result === "win" ? "onlineWins" : result === "loss" ? "onlineLosses" : "onlineDraws"}`] = firebase.database.ServerValue.increment(1);
  updates[`users/${uid}/stats/lastUpdated`] = firebase.database.ServerValue.TIMESTAMP;
  updates[`users/${uid}/lastSeen`] = firebase.database.ServerValue.TIMESTAMP;

  if (seqCount > 0) {
    updates[`users/${uid}/stats/sequencesCompleted`] = firebase.database.ServerValue.increment(seqCount);
  }

  if (myTotalGames >= 5) {
    const newRank = getPlayerRank(currentPointsTotal);
    updates[`users/${uid}/stats/rank`] = newRank.key;
    updates[`rankings/global/${uid}/points`] = currentPointsTotal;
    updates[`rankings/global/${uid}/username`] = userProfile.username;
    updates[`rankings/global/${uid}/avatar`] = userProfile.avatar;
    updates[`rankings/global/${uid}/wins`] = firebase.database.ServerValue.increment(result === "win" ? 1 : 0);
    updates[`rankings/global/${uid}/gamesPlayed`] = firebase.database.ServerValue.increment(1);
  }

  database.ref().update(updates).then(() => {
    if (myTotalGames >= 5) {
      database.ref("rankings/global").orderByChild("points").once("value", (snap) => {
        const all = snap.val() || {};
        const sorted = Object.entries(all)
          .filter(([, data]) => (data.gamesPlayed || 0) >= 5)
          .map(([id, data]) => ({ id, points: data.points || 0 }))
          .sort((a, b) => b.points - a.points);

        const posUpdates = {};
        sorted.forEach((p, i) => {
          posUpdates[`rankings/global/${p.id}/position`] = i + 1;
        });
        if (Object.keys(posUpdates).length > 0) {
          database.ref().update(posUpdates).catch(() => {});
        }

        const position = sorted.findIndex((p) => p.id === uid) + 1;
        if (position > 0) {
          database.ref(`users/${uid}/stats/position`).set(position).catch(() => {});
        }
      });
    }
  });

  if (!userProfile.stats) userProfile.stats = {};
  userProfile.stats.gamesPlayed = (userProfile.stats.gamesPlayed || 0) + 1;
  userProfile.stats.onlineGamesPlayed = (userProfile.stats.onlineGamesPlayed || 0) + 1;
  userProfile.stats.points = currentPointsTotal;
  userProfile.stats.sequencesCompleted = (userProfile.stats.sequencesCompleted || 0) + seqCount;
  if (result === "win") {
    userProfile.stats.wins = (userProfile.stats.wins || 0) + 1;
    userProfile.stats.onlineWins = (userProfile.stats.onlineWins || 0) + 1;
  } else if (result === "loss") {
    userProfile.stats.losses = (userProfile.stats.losses || 0) + 1;
    userProfile.stats.onlineLosses = (userProfile.stats.onlineLosses || 0) + 1;
  } else {
    userProfile.stats.draws = (userProfile.stats.draws || 0) + 1;
    userProfile.stats.onlineDraws = (userProfile.stats.onlineDraws || 0) + 1;
  }

  return pointsGained;
}

$(document).ready(function () {
  $("#auth-login-btn").on("click", openAuthModal);
  $("#auth-avatar-btn").on("click", openProfileModal);
  $("#auth-friends-btn").on("click", openFriendsModal);
  $("#auth-ranking-btn").on("click", openRankingModal);
  $("#auth-logout-btn").on("click", () => {
    Swal.fire({
      title: translate("auth.logoutConfirmTitle"),
      text: translate("auth.logoutConfirmText"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: translate("auth.logout"),
      cancelButtonText: translate("cancel"),
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("sequenceWinLossHistory");
        localStorage.removeItem("sequenceUserProfile");
        auth.signOut().then(() => {
          showToast(translate("auth.logoutSuccess"), { icon: "success" });
          window.location.reload();
        });
      }
    });
  });
});

const VAPID_KEY = "YOUR_VAPID_KEY";

function initPushNotifications() {
  if (!currentUser || !("Notification" in window) || !firebase.messaging) return;

  if (Notification.permission === "granted") {
    getFcmTokenAndSave();
  }
}

function requestPushPermission() {
  if (!("Notification" in window)) {
    showToast(translate("auth.pushNotSupported"), { icon: "warning" });
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      getFcmTokenAndSave();
      showToast(translate("auth.pushEnabled"), { icon: "success" });
      $("#auth-notifications-btn").find("i").removeClass("fa-bell-slash").addClass("fa-bell");
    } else {
      showToast(translate("auth.pushDenied"), { icon: "info" });
      $("#auth-notifications-btn").find("i").removeClass("fa-bell").addClass("fa-bell-slash");
    }
  });
}

function getFcmTokenAndSave() {
  if (!VAPID_KEY || VAPID_KEY === "COLOQUE_SUA_VAPID_KEY_AQUI") return;

  const messaging = firebase.messaging();
  messaging.getToken({ vapidKey: VAPID_KEY }).then((token) => {
    if (!token) return;
    if (currentUser) {
      database.ref(`users/${currentUser.uid}/fcmTokens/${token}`).set(true);
    } else {
      const deviceId = getDeviceId();
      database.ref(`device_tokens/${deviceId}/${token}`).set(true);
    }
  }).catch((err) => {
    console.warn("FCM token error:", err.message);
  });
}

function promptPushOptIn() {
  if (!("Notification" in window) || !firebase.messaging) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem("pushOptInDismissed")) return;

  const sessionCount = parseInt(sessionStorage.getItem("pushOptInSessionCount") || "0") + 1;
  sessionStorage.setItem("pushOptInSessionCount", String(sessionCount));

  if (sessionCount < 3) return;

  setTimeout(() => {
    Swal.fire({
      title: translate("auth.pushOptInTitle"),
      text: translate("auth.pushOptInText"),
      icon: "info",
      showCancelButton: true,
      confirmButtonText: translate("auth.pushOptInConfirm"),
      cancelButtonText: translate("auth.pushOptInLater"),
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        requestPushPermission();
      } else {
        localStorage.setItem("pushOptInDismissed", "true");
      }
    });
  }, 5000);
}

function migrateDeviceTokensToUser() {
  if (!currentUser) return;
  const deviceId = getDeviceId();
  const deviceRef = database.ref(`device_tokens/${deviceId}`);

  deviceRef.once("value", (snapshot) => {
    const tokens = snapshot.val();
    if (!tokens) return;

    const updates = {};
    Object.keys(tokens).forEach((token) => {
      updates[`users/${currentUser.uid}/fcmTokens/${token}`] = true;
    });

    database.ref().update(updates).then(() => {
      deviceRef.remove();
    });
  });
}
