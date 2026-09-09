$(document).ready(function () {
  if ("serviceWorker" in navigator) {
    let deferredPrompt;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $("#installApp").css("display", "flex").show();
      buttonAppInstall();
    });

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true;
    if (isIos && !isStandalone) {
      $("#installApp").css("display", "flex").show();
      buttonAppInstall();
    }

    $("#installAppButton").on("click", function () {
      if (isIos) {
        Swal.fire({
          title: translate("installIosTitle"),
          html: translate("installIosInstructions"),
          icon: "info",
          confirmButtonText: "OK",
          toast: false,
        });
        return;
      }
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          $("#installApp").hide();
          registerPwaInstall();
        }
        deferredPrompt = null;
      });
    });

    let cachingToast = null;

    navigator.serviceWorker.addEventListener("message", (event) => {
      const { type } = event.data;
      const isSmallScreen = window.innerWidth < 500;
      const position = isSmallScreen ? "bottom" : "top-end";

      if (type === "caching-started") {
        if (cachingToast) cachingToast.close();
        cachingToast = Swal.fire({
          toast: true,
          position: position,
          icon: "info",
          title: translate("sw.cachingStartedTitle"),
          text: translate("sw.cachingStartedText"),
          showConfirmButton: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
      }

      if (type === "caching-complete") {
        if (cachingToast) cachingToast.close();
        Swal.fire({
          toast: true,
          position: position,
          icon: "success",
          title: translate("sw.cachingCompleteTitle"),
          showConfirmButton: false,
          timer: 3000,
          didClose: () => {
            checkAndShowUpdateModal();
          },
        });
      }

      if (type === "caching-failed") {
        if (cachingToast) cachingToast.close();
        Swal.fire({
          toast: true,
          position: position,
          icon: "error",
          title: translate("sw.cachingFailedTitle"),
          html: translate("sw.cachingFailedText"),
          showConfirmButton: true,
          confirmButtonText: translate("close"),
        });
      }
    });

    navigator.serviceWorker.register("/sw.js").catch(function (err) {});

    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; }
      if (refreshing) return;
      if (currentGameId && currentGameDataState?.gameState === "playing") return;
      refreshing = true;
      $(".loading").show();
      window.location.reload();
    });
  }

  setTimeout(() => {
    if (!Swal.isVisible()) {
      checkAndShowUpdateModal();
    }
  }, 4000);

  setTimeout(() => {
    tryShowPendingPrompt();
  }, 3000);

  if (!sessionStorage.getItem("timePromptScheduled")) {
    sessionStorage.setItem("timePromptScheduled", "1");
    setTimeout(
      () => {
        if (!currentGameId) checkSmartPrompts("time_elapsed");
      },
      7 * 60 * 1000,
    );
  }
});

function buttonAppInstall() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const $button = $("#installAppButton");
  let translationKey = "downloadGeneric";

  if (/android/i.test(userAgent)) {
    translationKey = "downloadAndroid";
  } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    translationKey = "downloadIos";
  } else if (/windows/i.test(userAgent)) {
    translationKey = "downloadWindows";
  }

  $button.html(translate(translationKey));
}

const CURRENT_VERSION = "3.0.0";

const $loadingDiv = $(".loading");
const BOARD_LAYOUT = [
  ["F", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "F"],
  ["6C", "5C", "4C", "3C", "2C", "AH", "KH", "QH", "TH", "TS"],
  ["7C", "AS", "2D", "3D", "4D", "5D", "6D", "7D", "9H", "QS"],
  ["8C", "KS", "6C", "5C", "4C", "3C", "2C", "8D", "8H", "KS"],
  ["9C", "QS", "7C", "6H", "5H", "4H", "AH", "9D", "7H", "AS"],
  ["TC", "TS", "8C", "7H", "2H", "3H", "KH", "TD", "6H", "2D"],
  ["QC", "9S", "9C", "8H", "9H", "TH", "QH", "QD", "5H", "3D"],
  ["KC", "8S", "TC", "QC", "KC", "AC", "AD", "KD", "4H", "4D"],
  ["AC", "7S", "6S", "5S", "4S", "3S", "2S", "2H", "3H", "5D"],
  ["F", "AD", "KD", "QD", "TD", "9D", "8D", "7D", "6D", "F"],
];
const suitIcons = { S: "fa-spade", H: "fa-heart", D: "fa-diamond", C: "fa-club" };
const suitColors = { S: "suit-black", H: "suit-red", D: "suit-red", C: "suit-black" };
const TEAM_COLORS = { team1: "red", team2: "blue", team3: "green" };
const CARDS_PER_PLAYER = { 2: 7, 3: 6, 4: 6, 6: 5, 8: 4, 9: 4, 10: 3, 12: 3 };
const SEQUENCES_TO_WIN = { 2: 2, 3: 1 };
const MIN_CARDS_IN_HAND = { 2: 5, 3: 4, 4: 4, 6: 3, 8: 3, 9: 3, 10: 3, 12: 3 };
const DEFAULT_MAX_PLAYERS = 12;
const DEFAULT_MAX_PLAYERS_PER_TEAM = 6;
const hostname = window.location.hostname;
const isDevEnv =
  hostname === "localhost" ||
  hostname.startsWith("127.") ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname === "::1" ||
  hostname.includes("--pr") ||
  hostname.includes("--preview");
const isLocalDev =
  hostname === "localhost" ||
  hostname.startsWith("127.") ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname === "::1";
const baseURL = isLocalDev
  ? `${window.location.origin}/public`
  : window.location.origin;

const RECONNECTION_GRACE_PERIOD_MS = 30000;
const BOT_TAKEOVER_DELAY_MS = 60000;

const isVibrationAvailable = () => {
  return "vibrate" in navigator;
};

const feedbacks = {
  draw: {
    audio: new Audio(`${baseURL}/assets/sounds/drawOrDefeat.mp3`),
    vibration: [250, 150, 250],
  },
  defeat: {
    audio: new Audio(`${baseURL}/assets/sounds/drawOrDefeat.mp3`),
    vibration: [500, 200, 200],
  },
  sequenceSuccess: {
    audio: new Audio(`${baseURL}/assets/sounds/madeSequence.mp3`),
    vibration: [50, 75, 50, 75, 150],
  },
  myTurn: {
    audio: new Audio(`${baseURL}/assets/sounds/myTurn.mp3`),
    vibration: [200, 100, 200],
  },
  newMessage: {
    audio: new Audio(`${baseURL}/assets/sounds/newChat.mp3`),
    vibration: [100],
  },
  winner: {
    audio: new Audio(`${baseURL}/assets/sounds/winner.mp3`),
    vibration: [50, 50, 100, 50, 150, 50, 250],
  },
  uiClick: {
    audio: new Audio(`${baseURL}/assets/sounds/myTurn.mp3`),
    vibration: null,
  },
  cliqueConfig: {
    audio: null,
    vibration: [75],
  },
};

(function unlockAudioiOS() {
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().then(() => ctx.close()).catch(() => {});
    Object.values(feedbacks).forEach(fb => {
      if (fb.audio) {
        fb.audio.muted = true;
        fb.audio.play().then(() => {
          fb.audio.pause();
          fb.audio.muted = false;
          fb.audio.currentTime = 0;
        }).catch(() => {});
      }
    });
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('click', unlock, true);
  };
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('click', unlock, true);
})();

const MUTE_STORAGE_KEY = "sequenceGameMuted";
const VIBRATION_STORAGE_KEY = "sequenceGameVibrationOff";
const CHAT_MUTE_STORAGE_KEY = "sequenceGameChatMuted";
const NICKNAME_STORAGE_KEY = "sequenceGameNickname";
const GAMEMODE_STORAGE_KEY = "sequenceGameMode";
const BOT_DIFFICULTY_STORAGE_KEY = "sequenceGameBotDifficulty";
const AVATAR_STORAGE_KEY = "sequenceGameAvatar";
const TOTAL_AVATARS = 42;
const FREE_AVATARS_COUNT = 21;
const AD_EVERY_N_GAMES = 5;
const UNLOCKED_AVATARS_KEY = "sequenceUnlockedAvatars";
const GAMES_PLAYED_KEY = "sequenceGamesPlayedSinceAd";
const AVATAR_MILESTONES = [
  { games: 5, avatar: 22 },
  { games: 10, avatar: 23 },
  { games: 15, avatar: 24 },
  { games: 20, avatar: 25 },
  { games: 30, avatar: 26 },
  { games: 40, avatar: 27 },
  { games: 50, avatar: 28 },
  { games: 65, avatar: 29 },
  { games: 80, avatar: 30 },
  { games: 100, avatar: 31 },
  { points: 30, avatar: 32 },
  { points: 60, avatar: 33 },
  { points: 100, avatar: 34 },
  { points: 200, avatar: 35 },
  { points: 375, avatar: 36 },
  { points: 650, avatar: 37 },
  { points: 1100, avatar: 38 },
  { points: 1800, avatar: 39 },
];

let myPlayerId = null;
let refreshing = false;
let isKickingPlayer = false;
let isResettingGame = false;
let animatingCells = new Set();
let pendingSequenceCells = [];
let pendingSequenceIsMine = false;
let myLastDiscardTimestamp = 0;
let handAnimationLocked = false;
let afkCheckInterval = null;
let activeHint = null;
let isLeavingIntentionally = false;
let myTeamId = null;
let myPlayerName = null;
let currentGameId = null;
let urlSecret = null;
let selectedHandCard = null;
let drawTimer = null;
let drawCountdownInterval = null;
let turnInterval = null;
let lastMessageCount = 0;
let previousPlayersState = {};
let isLocalGame = false;
let isInitialLoad = true;
let previousGameData = {};
let hasPlayedNewMessageSound = false;
let isMuted = false;
let isChatMuted = false;
let isVibratingOff = false;
let isReconnecting = false;
let amITheHost = false;
let hostTransferTimeout = null;
let wasHostBeforeDisconnect = false;
let isSpectator = false;
let spectatorListenerRef = null;
let selectedAvatarId = 1;
let connectionStatus = "connecting";
let currentGameDataState = {};
let lobbyPresenceRef = null;
let lobbyInvitesRef = null;

function applyTranslations() {
  initializeTranslations();

  if (isLocalGame) {
    $(".game-id-text").text(translate("practice"));
  }

  updateLobbyInfo();
  buttonAppInstall();
  updateConnectionStatusUI();

  if (currentGameId && !isLocalGame) {
    database.ref("games/" + currentGameId).once("value", (snapshot) => {
      if (snapshot.exists()) {
        const gameData = snapshot.val();
        renderAll(gameData);
        if (gameData.gameState === "team-selection") {
          renderTeamSelectionUI(gameData);
        }
      }
    });
  } else if (isLocalGame) {
    renderAll(localGameData);
  }
}


function getGamesPlayedSinceAd() {
  return parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || "0");
}

function incrementGamesPlayed() {
  const count = getGamesPlayedSinceAd() + 1;
  localStorage.setItem(GAMES_PLAYED_KEY, count.toString());
  return count;
}

function resetGamesPlayed() {
  localStorage.setItem(GAMES_PLAYED_KEY, "0");
}

function shouldShowAd() {
  return getGamesPlayedSinceAd() >= AD_EVERY_N_GAMES;
}

function showInterstitialAd(name, onDone) {
  if (!window.H5_ADS_ENABLED) {
    if (onDone) onDone();
    return;
  }
  if (typeof adBreak === 'function' && shouldShowAd()) {
    resetGamesPlayed();
    incrementAnalytics({ ads_interstitial_requested: 1 });
    adBreak({
      type: 'next',
      name: name,
      beforeAd: () => { /* mute/pause game */ },
      afterAd: () => { /* resume */ },
      adBreakDone: (placementInfo) => {
        if (placementInfo && placementInfo.breakStatus === 'viewed') {
          incrementAnalytics({ ads_interstitial_shown: 1 });
        }
        if (onDone) onDone();
      }
    });
  } else {
    incrementGamesPlayed();
    if (onDone) onDone();
  }
}

function getUnlockedAvatars() {
  try {
    return JSON.parse(localStorage.getItem(UNLOCKED_AVATARS_KEY) || "[]");
  } catch { return []; }
}

function unlockAvatar(avatarId) {
  const unlocked = getUnlockedAvatars();
  if (!unlocked.includes(avatarId)) {
    unlocked.push(avatarId);
    localStorage.setItem(UNLOCKED_AVATARS_KEY, JSON.stringify(unlocked));
    syncUnlockedAvatarsToFirebase();
  }
}

function syncUnlockedAvatarsToFirebase() {
  const unlocked = getUnlockedAvatars();
  if (unlocked.length === 0) return;
  try {
    if (currentUser && currentUser.uid) {
      database.ref(`users/${currentUser.uid}/unlockedAvatars`).set(unlocked).catch(() => {});
    } else {
      database.ref(`devices/${getDeviceId()}/unlockedAvatars`).set(unlocked).catch(() => {});
    }
  } catch {}
}

function loadUnlockedAvatarsFromFirebase() {
  const loadFromRef = (ref) => {
    ref.once("value", (snapshot) => {
      const cloudAvatars = snapshot.val();
      if (cloudAvatars && Array.isArray(cloudAvatars)) {
        const local = getUnlockedAvatars();
        const merged = [...new Set([...local, ...cloudAvatars])];
        localStorage.setItem(UNLOCKED_AVATARS_KEY, JSON.stringify(merged));
        if (merged.length > cloudAvatars.length) {
          syncUnlockedAvatarsToFirebase();
        }
        initializeAvatarSelector();
      }
    }).catch(() => {});
  };

  if (currentUser && currentUser.uid) {
    loadFromRef(database.ref(`users/${currentUser.uid}/unlockedAvatars`));
  } else if (navigator.onLine) {
    loadFromRef(database.ref(`devices/${getDeviceId()}/unlockedAvatars`));
  }
}

function ensureCurrentAvatarUnlocked() {
  if (selectedAvatarId > FREE_AVATARS_COUNT && !getUnlockedAvatars().includes(selectedAvatarId)) {
    unlockAvatar(selectedAvatarId);
  }
}

function getPlayerGamesPlayed() {
  const local = parseInt(localStorage.getItem("gamesPlayedCount") || "0");
  const profile = userProfile?.stats?.gamesPlayed || 0;
  return Math.max(local, profile);
}

function getPlayerPoints() {
  return userProfile?.stats?.points || 0;
}

function isAvatarUnlockedByProgression(avatarId) {
  const milestone = AVATAR_MILESTONES.find(m => m.avatar === avatarId);
  if (!milestone) return false;
  if (milestone.games) return getPlayerGamesPlayed() >= milestone.games;
  if (milestone.points) return getPlayerPoints() >= milestone.points;
  return false;
}

function isAvatarUnlocked(avatarId) {
  if (avatarId <= FREE_AVATARS_COUNT) return true;
  if (isAvatarUnlockedByProgression(avatarId)) return true;
  return getUnlockedAvatars().includes(avatarId);
}

function getAvatarUnlockReason(avatarId) {
  const milestone = AVATAR_MILESTONES.find(m => m.avatar === avatarId);
  if (milestone) {
    if (milestone.games) return { type: 'games', value: milestone.games };
    if (milestone.points) return { type: 'points', value: milestone.points };
  }
  return { type: 'ad' };
}

function showRewardedAdForAvatar(avatarId, onSuccess, onFail) {
  if (!window.H5_ADS_ENABLED) {
    unlockAvatar(avatarId);
    if (onSuccess) onSuccess();
    return;
  }
  if (typeof adBreak !== 'function') {
    if (onFail) onFail();
    return;
  }
  incrementAnalytics({ ads_rewarded_requested: 1 });
  adBreak({
    type: 'reward',
    name: 'unlock-avatar-' + avatarId,
    beforeReward: (showAdFn) => { showAdFn(); },
    adViewed: () => {
      incrementAnalytics({ ads_rewarded_completed: 1 });
      unlockAvatar(avatarId);
      if (onSuccess) onSuccess();
    },
    adDismissed: () => { if (onFail) onFail(); },
    adBreakDone: () => {}
  });
}

function initializeAvatarSelector() {
  const panel = $("#avatar-dropdown-panel");
  const selectedDisplayImg = $("#avatar-dropdown-selected img");
  const seed = selectedAvatarId;

  panel.empty();
  selectedDisplayImg
    .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`)
    .attr("data-avatar-id", selectedAvatarId)
    .attr("alt", `Avatar ${seed}`);

  for (let i = 1; i <= TOTAL_AVATARS; i++) {
    const locked = !isAvatarUnlocked(i);
    const wrapper = $("<div>").addClass("avatar-option-wrapper").attr("data-avatar-id", i);
    const avatarImg = $("<img>")
      .addClass("avatar-option")
      .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${i}`)
      .attr("data-avatar-id", i)
      .attr("alt", `Avatar ${i}`);

    if (locked) {
      wrapper.addClass("avatar-locked");
      const lockIcon = $("<span>").addClass("avatar-lock-icon").html('<i class="fas fa-lock"></i>');
      wrapper.append(avatarImg).append(lockIcon);
    } else {
      wrapper.append(avatarImg);
    }

    if (i === selectedAvatarId) {
      avatarImg.addClass("selected-avatar");
    }

    panel.append(wrapper);
  }
}

function updateConnectionStatusUI() {
  const $status = $("#connection-status");
  const $info = $("#connection-status-info");

  switch (connectionStatus) {
    case "online":
      $status.text(translate("onlineStatus")).css("color", "lightgreen");
      $info.text(translate("connectedToServer"));
      break;

    case "offline":
      $status.text(translate("offlineModeStatus")).css("color", "orange");
      $info.text(translate("noConnectionPracticeOnly"));
      break;

    case "connecting":
      $status.text(translate("connecting")).css("color", "yellow");
      $info.text(translate("connectingToServer"));
      break;
  }
}

$("#avatar-dropdown-selected").on("click", function (event) {
  event.stopPropagation();
  $(this).toggleClass("active");
  $("#avatar-dropdown-container").toggleClass("open");
});

$("#avatar-dropdown-panel").on("click", ".avatar-option-wrapper", function () {
  const avatarId = parseInt($(this).attr("data-avatar-id"));
  const isLocked = !isAvatarUnlocked(avatarId);

  if (isLocked) {
    const reason = getAvatarUnlockReason(avatarId);
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
        showRewardedAdForAvatar(avatarId, () => {
          selectedAvatarId = avatarId;
          $("#avatar-dropdown-selected img")
            .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${avatarId}`)
            .attr("alt", `Avatar ${avatarId}`);
          localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatarId);
          initializeAvatarSelector();
          $("#avatar-dropdown-container").removeClass("open");
          $("#avatar-dropdown-selected").removeClass("active");
          showToast(translate("avatarUnlockedSingle"), { icon: "success" });
        }, () => {
          showToast(translate("adNotAvailable"), { icon: "warning" });
        });
      }
    });
    return;
  }

  selectedAvatarId = avatarId;
  $("#avatar-dropdown-selected img")
    .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${avatarId}`)
    .attr("alt", `Avatar ${avatarId}`);
  $("#avatar-dropdown-panel .avatar-option").removeClass("selected-avatar");
  $(this).find(".avatar-option").addClass("selected-avatar");
  localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatarId);
  $("#avatar-dropdown-container").removeClass("open");
  $("#avatar-dropdown-selected").removeClass("active");
});

$(document).on("click", function () {
  if ($("#avatar-dropdown-container").hasClass("open")) {
    $("#avatar-dropdown-container").removeClass("open");
  }

  if ($("#avatar-dropdown-selected").hasClass("active")) {
    $("#avatar-dropdown-selected").removeClass("active");
  }
});

function setOnlineMode(online, options = {}) {
  const $createRoom = $("#create-game-btn");
  const $idRomInput = $("#game-id-input");
  const $enterRoom = $("#join-game-btn");
  const $findRandom = $("#find-random-game-btn");
  const $lobbyBtn = $("#view-online-players-btn");
  const $onlineLabel = $("#online-label");
  const $bugReportBtn = $(".report-bug-btn");

  if (!online) {
    connectionStatus = options.isConnecting ? "connecting" : "offline";
    $createRoom.addClass("offline-disabled");
    $idRomInput.prop("disabled", true);
    $enterRoom.addClass("offline-disabled");
    $findRandom.addClass("offline-disabled");
    $lobbyBtn.addClass("offline-disabled");
    $onlineLabel.css("opacity", 0.6);
    $bugReportBtn.hide();
    $("#server-info").hide();

    if (!options.isConnecting) {
      esconderLoading();
    }

    if (!options.isConnecting && !options.silent) {
      showToast(options.toastMessage || translate("noConnectionPracticeOnly"), {
        icon: "warning",
      });
    }
  } else {
    connectionStatus = "online";
    $createRoom.removeClass("offline-disabled");
    $idRomInput.prop("disabled", false);
    $enterRoom.removeClass("offline-disabled");
    $findRandom.removeClass("offline-disabled");
    $lobbyBtn.removeClass("offline-disabled");
    $onlineLabel.css("opacity", 1);
    $bugReportBtn.show();

    if (options.toastMessage && !options.silent) {
      showToast(options.toastMessage, { icon: "success", timer: 3000 });
    }
  }
  updateConnectionStatusUI();
}

function attemptToConnect(isInitial = false) {
  if (window.firebaseConnectionTimeout) {
    clearTimeout(window.firebaseConnectionTimeout);
  }

  database.ref(".info/connected").off();

  setOnlineMode(false, { isConnecting: true });

  const connectionListener = (snapshot) => {
    if (snapshot.val() === true) {
      clearTimeout(window.firebaseConnectionTimeout);
      database.ref(".info/connected").off("value", connectionListener);

      const toastMessage = isInitial ? null : translate("onlineAgain");
      setOnlineMode(true, { toastMessage: toastMessage });
      updateLobbyInfo();
    } else {
      if (!isInitial && connectionStatus === 'online') {
         const isLobbyVisible = $("#lobby").is(":visible");
         setOnlineMode(false, { silent: !isLobbyVisible });
      }
    }
  };

  database.ref(".info/connected").on("value", connectionListener);

  window.firebaseConnectionTimeout = setTimeout(() => {
    if (connectionStatus !== 'online') {
      const toastMessage = isInitial
        ? translate("noConnectionPracticeOnly")
        : translate("reconnectFailed");
      
      const isLobbyVisible = $("#lobby").is(":visible");
        
      setOnlineMode(false, { toastMessage: toastMessage, silent: !isLobbyVisible });
    }
  }, 15000);
}

function initializeApp() {
  const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLang) {
    currentLanguage = savedLang;
  } else {
    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "en") {
      currentLanguage = "en";
    } else if (browserLang === "es") {
      currentLanguage = "es";
    } else {
      currentLanguage = "pt";
    }
  }

  loadLobbySettings();
  ensureCurrentAvatarUnlocked();
  mostrarLoading();

  if (!sessionStorage.getItem("sessionCounted")) {
    sessionStorage.setItem("sessionCounted", "true");
    incrementAnalytics({ sessions: 1 });
    checkExistingPwaInstall();
    trackCountryVisitLobby();
  }

  if (!navigator.onLine) {
    setOnlineMode(false, {
      toastMessage: translate("offline.practiceOnly"),
    });
    checkUrlForGame();
    initializeConfigState();
    applyTranslations();
    return;
  }

  attemptToConnect(true);
  loadUnlockedAvatarsFromFirebase();
  checkUrlForGame();
  initializeConfigState();
  applyTranslations();

  setTimeout(() => {
    if (!currentUser && typeof promptPushOptIn === "function") {
      promptPushOptIn();
    }
  }, 3000);

  const savedName = localStorage.getItem(NICKNAME_STORAGE_KEY);
  if (savedName && !currentGameId) {
    setTimeout(() => {
      if (!currentUser) {
        joinLobbyPresence();
      }
    }, 2500);
  }

  setTimeout(() => checkStartupNotifications(), 4000);
}

window.addEventListener("offline", () => {
  if (window.firebaseConnectionTimeout) {
    clearTimeout(window.firebaseConnectionTimeout);
  }
  database.ref(".info/connected").off();
  setOnlineMode(false, { toastMessage: translate("offline.connectionLost") });
});

window.addEventListener("online", () => {
  attemptToConnect(false);
});

initializeApp();

function updateSoundButtonUI() {
  const $button = $(".toggle-sound-btn");
  const $text = $button.find("span");
  const $labelIcon = $("#label-sound-icon");

  if (isMuted) {
    $text.text(translate("off"));
    $button.attr("title", translate("clickToUnmute"));
    $labelIcon.removeClass("fa-volume-high").addClass("fa-volume-xmark");
  } else {
    $text.text(translate("on"));
    $button.attr("title", translate("clickToMute"));
    $labelIcon.removeClass("fa-volume-xmark").addClass("fa-volume-high");
  }
}

function updateVibrationButtonUI() {
  const $button = $(".toggle-vibrate-btn");
  const $text = $button.find("span");

  if (!isVibrationAvailable()) {
    $button.prop("disabled", true);
    $text.text(translate("unavailable"));
    $button.attr("title", translate("vibrationNotSupported"));
    return;
  }

  if (isVibratingOff) {
    $text.text(translate("off"));
    $button.attr("title", translate("clickToEnableVibration"));
  } else {
    $text.text(translate("on"));
    $button.attr("title", translate("clickToDisableVibration"));
  }
}

function updateChatMuteButtonUI() {
  const $button = $(".toggle-chat-mute-btn");
  const $text = $button.find("span");
  const $labelIcon = $("#label-chat-mute-icon");

  if (isMuted) {
    $button.prop("disabled", true).addClass("disabled-by-global");
    $text.text(translate("off"));
    $labelIcon.removeClass("fa-comment").addClass("fa-comment-slash");
    return;
  }

  $button.prop("disabled", false).removeClass("disabled-by-global");

  if (isChatMuted) {
    $text.text(translate("off"));
    $labelIcon.removeClass("fa-comment").addClass("fa-comment-slash");
  } else {
    $text.text(translate("on"));
    $labelIcon.removeClass("fa-comment-slash").addClass("fa-comment");
  }
}

function updateDarkModeUI() {
  const isDark = document.body.classList.contains("dark-mode");
  const $button = $(".toggle-dark-mode-btn");
  const $text = $button.find(".config-text");
  const $labelIcon = $("#label-theme-icon");

  if (isDark) {
    $text.text(translate("settingsModal.themeDark"));
    $labelIcon.removeClass("fa-sun-bright").addClass("fa-moon");
    $button.addClass("active");
  } else {
    $text.text(translate("settingsModal.themeLight"));
    $labelIcon.removeClass("fa-moon").addClass("fa-sun-bright");
    $button.removeClass("active");
  }
}

const CARD_STYLES = [
  { key: "solid", weight: "900", family: "Font Awesome 6 Pro" },
  { key: "outline", weight: "400", family: "Font Awesome 6 Pro" },
  { key: "light", weight: "300", family: "Font Awesome 6 Pro" },
  { key: "duotone", weight: "900", family: "Font Awesome 6 Duotone" },
];

const CARD_STYLE_CLASSES = ["fa-solid", "fa-regular", "fa-light", "fa-duotone", "fas", "far", "fal", "fad"];

function applyCardStyle(style) {
  if (!style) {
    const savedStyle = localStorage.getItem("sequenceCardStyle") || "outline";
    style = CARD_STYLES.find(s => s.key === savedStyle) || CARD_STYLES[0];
  }

  const newClass = style.key === "solid" ? "fa-solid" :
                   style.key === "outline" ? "fa-regular" :
                   style.key === "light" ? "fa-light" :
                   style.key === "duotone" ? "fa-duotone" : "fa-regular";

  $(".card-suit").removeClass(CARD_STYLE_CLASSES.join(" ")).addClass(newClass);
  $(".card-suit-small").removeClass(CARD_STYLE_CLASSES.join(" ")).addClass("fa-solid");
}

$(function() {
  const boardEl = document.getElementById("board");
  if (boardEl) {
    new MutationObserver(() => applyCardStyle()).observe(boardEl, { childList: true, subtree: true });
  }
  const handEl = document.getElementById("player-hand");
  if (handEl) {
    new MutationObserver(() => applyCardStyle()).observe(handEl, { childList: true, subtree: true });
  }
  const discardEl = document.getElementById("discard-pile");
  if (discardEl) {
    new MutationObserver(() => applyCardStyle()).observe(discardEl, { childList: true, subtree: true });
  }
});

function updateCardStyleUI() {
  const savedStyle = localStorage.getItem("sequenceCardStyle") || "outline";
  const style = CARD_STYLES.find(s => s.key === savedStyle) || CARD_STYLES[0];

  const $button = $(".toggle-card-style-btn");
  const $text = $button.find(".config-text");
  const $labelIcon = $("#label-card-icon");

  $text.text(translate("settingsModal.style_" + style.key));

  $labelIcon.removeClass("fas far fal fad").addClass(
    style.key === "outline" ? "far" :
    style.key === "light" ? "fal" :
    style.key === "duotone" ? "fad" : "fas"
  );
}

function loadVisualPreferences() {
  if (localStorage.getItem("sequenceDarkMode") === "true") {
    document.body.classList.add("dark-mode");
  }

  let savedStyle = localStorage.getItem("sequenceCardStyle") || "outline";
  if (savedStyle === "900") { savedStyle = "solid"; localStorage.setItem("sequenceCardStyle", "solid"); }
  if (savedStyle === "400") { savedStyle = "outline"; localStorage.setItem("sequenceCardStyle", "outline"); }

  const style = CARD_STYLES.find(s => s.key === savedStyle) || CARD_STYLES[0];
  document.documentElement.style.setProperty("--suit-font-weight", style.weight);
  document.documentElement.style.setProperty("--suit-font-family", style.family);
  $(function() { applyCardStyle(style); });
}

initializeConfigState();
loadVisualPreferences();

function initializeConfigState() {
  const savedMuteState = localStorage.getItem(MUTE_STORAGE_KEY);
  const savedVibrateState = localStorage.getItem(VIBRATION_STORAGE_KEY);
  const savedChatMuteState = localStorage.getItem(CHAT_MUTE_STORAGE_KEY);

  isMuted = savedMuteState === "true";
  isVibratingOff = savedVibrateState === "true";
  isChatMuted = savedChatMuteState === "true";
}

function playFeedback(type, varyPitch = false) {
  const fb = feedbacks[type];
  if (!fb) return;

  if (!isMuted && fb.audio) {
    if (varyPitch) {
      fb.audio.playbackRate = 0.95 + Math.random() * 0.1;
    } else {
      fb.audio.playbackRate = 1;
    }

    fb.audio.currentTime = 0;
    fb.audio.play().catch(() => {});
  }

  if (!isVibratingOff && "vibrate" in navigator && fb.vibration) {
    navigator.vibrate(fb.vibration);
  }
}

function getTeamColor(teamId) {
  if (typeof isLocalGame !== 'undefined' && isLocalGame && typeof localGameData !== 'undefined') {
    const team = localGameData.teams?.[teamId];
    if (team && team.color) return team.color;
  }
  if (typeof currentGameDataState !== 'undefined') {
    const team = currentGameDataState.teams?.[teamId];
    if (team && team.color) return team.color;
  }
  return TEAM_COLORS[teamId] || "red";
}

function isAnimationsEnabled() {
  return localStorage.getItem("sequenceAnimationsOff") !== "true";
}

function saveLobbySettings() {
  const nickname = $("#player-name-input").val().trim();
  const gameMode = $("#player-count-select").val();
  const botDifficulty = $("#difficulty-select").val();

  if (nickname) {
    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  }
  if (gameMode && gameMode !== "0") {
    localStorage.setItem(GAMEMODE_STORAGE_KEY, gameMode);
  }
  if (botDifficulty && botDifficulty !== "0") {
    localStorage.setItem(BOT_DIFFICULTY_STORAGE_KEY, botDifficulty);
  }

  localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatarId);
}

function loadLobbySettings() {
  const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
  const savedGameMode = localStorage.getItem(GAMEMODE_STORAGE_KEY);
  const savedBotDifficulty = localStorage.getItem(BOT_DIFFICULTY_STORAGE_KEY);
  const savedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY);

  if (savedNickname) {
    $("#player-name-input").val(savedNickname);
  }
  if (savedGameMode) {
    $("#player-count-select").val(savedGameMode);
  }
  if (savedBotDifficulty) {
    $("#difficulty-select").val(savedBotDifficulty);
  }
  if (savedAvatar) {
    selectedAvatarId = parseInt(savedAvatar);
  }

  initializeAvatarSelector();
}

function mostrarLoading() {
  $loadingDiv.css("display", "flex").show();
}

function esconderLoading() {
  if (typeof refreshing !== 'undefined' && refreshing) return;
  $loadingDiv.addClass("loading-exit");
  setTimeout(() => $loadingDiv.hide().removeClass("loading-exit"), 1050);
}

mostrarLoading();

setTimeout(() => {
  if ($loadingDiv.is(':visible') && !$loadingDiv.hasClass('loading-exit')) {
    console.warn('[Loading] Fallback timeout - forçando esconder loading');
    esconderLoading();
  }
}, 10000);

let cachedOnlinePlayerCount = 0;
let cachedActiveGameCount = 0;

function updateLobbyInfo() {
  database.ref("lobby_players").on("value", (snapshot) => {
    const lobbyPlayers = snapshot.val();
    cachedOnlinePlayerCount = lobbyPlayers ? Object.keys(lobbyPlayers).length : 0;
  });
}

updateLobbyInfo();

function checkUrlForGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameIdFromUrl = urlParams.get("game");
  const secretFromUrl = urlParams.get("secret");
  const actionFromUrl = urlParams.get("action");

  if (secretFromUrl) {
    urlSecret = secretFromUrl;
  }

  if (actionFromUrl) {
    setTimeout(() => {
      Swal.close();
      setTimeout(() => {
        if (actionFromUrl === "support" && typeof contactSupportOpen === "function") {
          contactSupportOpen(false);
        } else if (actionFromUrl === "bug" && typeof reportBugOpen === "function") {
          reportBugOpen(false);
        } else if (actionFromUrl === "contact" && typeof modalConfigOpen === "function") {
          modalConfigOpen(3);
        }
      }, 300);
      window.history.replaceState({}, "", window.location.pathname);
    }, 2500);
  }

  if (gameIdFromUrl) {
    if (sessionStorage.getItem("isSpectator") === "true") {
      sessionStorage.removeItem("isSpectator");
      currentGameId = gameIdFromUrl.toUpperCase();
      joinGameAsSpectator(currentGameId);
      return;
    }
    const storedGameData = JSON.parse(localStorage.getItem("sequenceGameData"));
    if (
      storedGameData &&
      storedGameData.gameId.toUpperCase() === gameIdFromUrl.toUpperCase()
    ) {
      myPlayerId = storedGameData.playerId;
      myPlayerName = storedGameData.playerName;
      currentGameId = gameIdFromUrl.toUpperCase();
      setupGameUI(currentGameId);
    } else {
      $("#game-id-input").val(gameIdFromUrl.toUpperCase());
    }
  }
}

checkUrlForGame();

$("#deck-pile").on("click", function () {
  if ($(this).hasClass("disabled")) return;
  $(this).removeClass("awaiting-draw");

  if (isLocalGame) {
    onDeckClickLocal();
  } else {
    if (isAnimationsEnabled()) handAnimationLocked = true;
    clearTimeout(drawTimer);
    endTurnAndAdvance();
  }
});

function endTurnAndAdvance(isTimeout = false) {
  if (
    isTimeout &&
    currentGameDataState.turnState !== "drawing" &&
    currentGameDataState.turnState !== "playing"
  ) {
    return;
  }

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData || gameData.gameState === "finished") return;

      const currentPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];

      if (isTimeout && gameData.turnState !== "drawing") return;

      gameData.lastActivityAt = Date.now();

      const isMyTurn = currentPlayerId === myPlayerId;

      const isPlayerOffline =
        gameData.players[currentPlayerId] &&
        gameData.players[currentPlayerId].online === false;

      const canIAction = isMyTurn || (isPlayerOffline && amITheHost);

      if (!canIAction) return;

      const settings = gameData.settings || { reshuffleOnEmpty: true };

      if (settings.reshuffleOnEmpty && (!gameData.deck || gameData.deck.length === 0)) {
        reshuffleDiscardPile(gameData);
      }

      const player = gameData.players[currentPlayerId];
      const handSize = (player.hand || []).length;
      const minCardsForThisGame = MIN_CARDS_IN_HAND[gameData.playerCount];

      let shouldDraw = false;

      if (isTimeout) {
        if (handSize < minCardsForThisGame) shouldDraw = true;
      } else {
        if (gameData.turnState === "drawing") shouldDraw = true;
      }

      if (shouldDraw) {
        drawCardFromDeck(gameData, gameData.players[currentPlayerId]);
      }

      let nextPlayerIndex = gameData.currentPlayerIndex;
      let playersChecked = 0;
      let foundNextPlayer = false;

      do {
        nextPlayerIndex = (nextPlayerIndex + 1) % gameData.playerCount;
        playersChecked++;

        const nextPlayerId = gameData.turnOrder[nextPlayerIndex];
        const nextPlayer = gameData.players[nextPlayerId];

        const hasCardsAvailable =
          (gameData.deck && gameData.deck.length > 0) ||
          (gameData.discardPile && gameData.discardPile.length > 0);

        if (
          hasCardsAvailable ||
          canPlayerPlay(nextPlayer, gameData.boardState)
        ) {
          foundNextPlayer = true;
          break;
        }
      } while (playersChecked < gameData.playerCount);

      if (!foundNextPlayer) {
        let maxSequences = -1;
        let winningTeams = [];

        Object.values(gameData.teams).forEach((team) => {
          const sequences = team.sequencesCompleted || 0;

          if (sequences > maxSequences) {
            maxSequences = sequences;
            winningTeams = [team.id];
          } else if (sequences === maxSequences && maxSequences > 0) {
            winningTeams.push(team.id);
          }
        });

        gameData.gameState = "finished";
        gameData.gameEndedAt = Date.now();

        if (maxSequences <= 0 || winningTeams.length === 0) {
          gameData.winner = null;
          gameData.gameMessage = { key: "noMorePlays" };
        } else if (winningTeams.length === 1) {
          const winnerId = winningTeams[0];
          gameData.winner = winnerId;
          const winningTeamName = translate(
            `teamNames.${gameData.teams[winnerId].color}`,
          ).toUpperCase();
          gameData.gameMessage = {
            key: "winnerBySequences",
            params: { teamName: winningTeamName },
          };
        } else {
          gameData.winner = null;
          gameData.gameMessage = { key: "drawBySequences" };
        }
      } else {
        gameData.currentPlayerIndex = nextPlayerIndex;
        gameData.turnState = "playing";
        gameData.cardExchangedThisTurn = false;
        gameData.turnCounter = (gameData.turnCounter || 0) + 1;

        const nextPlayerName =
          gameData.players[gameData.turnOrder[nextPlayerIndex]].name;

        gameData.gameMessage = {
          key: "waitingForPlayer",
          params: { playerName: nextPlayerName },
        };
      }

      return gameData;
    })
    .catch(() => {});
}

$("#hide-chat-btn").on("click", function () {
  $("#chat-container").removeClass("show");
  $("#show-chat-btn").removeClass("has-new-message");
  $(".mobile-chat-btn").removeClass("has-new-message");
});

function sendChatMessage() {
  const messageText = $("#chat-input").val().trim();
  if (messageText === "" || !currentGameId) return;
  if (!myPlayerId && !isSpectator) return;

  incrementAnalytics({ chat_messages_sent: 1 });
  if (isSpectator) incrementAnalytics({ spectator_chat_messages: 1 });

  const messageData = {
    playerId: isSpectator ? `spectator_${currentUser?.uid || "anon"}` : myPlayerId,
    playerName: myPlayerName || userProfile?.username || "Spectator",
    text: messageText,
    isSpectator: isSpectator || null,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  };
  database.ref(`games/${currentGameId}/chat`).push(messageData);
  $("#chat-input").val("");
}

$("#send-chat-btn").on("click", sendChatMessage);
$("#chat-input").on("keyup", function (event) {
  if (event.key === "Enter") {
    sendChatMessage();
  }
});

$("#player-name-input").on("blur", function () {
  const name = $(this).val().trim();
  if (name && !currentGameId) {
    if (!lobbyPresenceRef) {
      joinLobbyPresence();
    } else {
      updateLobbyPresenceName();
    }
  }
});

$("#create-game-btn").on("click", function () {
  isLocalGame = false;
  myPlayerName = $("#player-name-input").val().trim();
  if (!myPlayerName) {
    showToast(translate("nameNeeded"), {
      title: translate("oops"),
      icon: "warning",
    });
    return;
  }

  saveLobbySettings();
  mostrarLoading();
  const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
  initializeGameInFirebase(gameId);
});

$("#join-game-btn").on("click", function () {
  isLocalGame = false;
  myPlayerName = $("#player-name-input").val().trim();
  if (!myPlayerName) {
    showToast(translate("nameNeeded"), {
      title: translate("oops"),
      icon: "warning",
    });
    return;
  }
  const gameId = $("#game-id-input").val().toUpperCase().trim();
  if (!gameId) {
    showToast(translate("roomCodeNeeded"), {
      title: translate("oops"),
      icon: "warning",
    });
    return;
  }
  saveLobbySettings();
  mostrarLoading();
  joinGame(gameId, myPlayerName);
});

$("#game-id-input").on("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    $("#join-game-btn").click();
  }
});

$(".copy-id-btn").on("click", function () {
  const isPrivate = currentGameDataState.isPrivate;
  const password = currentGameDataState.password;

  let gameUrl = window.location.href.split("?")[0] + "?game=" + currentGameId;

  if (isPrivate && password) {
    gameUrl += `&secret=${password}`;
  }

  navigator.clipboard.writeText(gameUrl).then(() => {
    showToast(translate("linkCopiedDescription"), {
      icon: "success",
      title: translate("linkCopied"),
    });
  });
});

$("#find-random-game-btn").on("click", function () {
  isLocalGame = false;
  myPlayerName = $("#player-name-input").val().trim();
  if (!myPlayerName) {
    showToast(translate("lobby.enterNamePromptRandom"), {
      title: translate("oops"),
      icon: "warning",
    });
    return;
  }
  saveLobbySettings();
  findRandomGame();
});

$("#view-online-players-btn").on("click", function () {
  viewOnlinePlayersFromLobby();
});

$(".leave-game-btn").on("click", function () {
  Swal.fire({
    title: translate("leaveGameTitle"),
    text: isLocalGame
      ? translate("leaveGameLocalBody")
      : translate("leaveGameOnlineBody"),
    icon: "warning",
    showDenyButton: isLocalGame,
    showCancelButton: true,
    confirmButtonText: isLocalGame
      ? `<i class='fas fa-save'></i> ${translate("saveAndLeave")}`
      : `<i class='fas fa-right-from-bracket'></i> ${translate(
          "leaveGameOnlineConfirm",
        )}`,
    denyButtonText: `<i class='fas fa-right-from-bracket'></i> ${translate(
      "leaveWithoutSaving",
    )}`,
    cancelButtonText: `<i class='fas fa-times'></i> ${translate("cancel")}`,
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      confirmButton: "swal2-button-full",
      denyButton: "swal2-confirm swal2-button-full",
      cancelButton: "swal2-button-full",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      if (isLocalGame) leaveGameLocal(true);
      else leaveGame();
    }
    if (result.isDenied) {
      if (isLocalGame) leaveGameLocal(false);
    }
  });
});

function leaveGame() {
  isLeavingIntentionally = true;
  if (!currentGameId || !myPlayerId) {
    if (isSpectator && currentGameId && currentUser) {
      database.ref(`games/${currentGameId}/spectators/${currentUser.uid}`).remove();
      database.ref(`users/${currentUser.uid}/currentGameId`).remove();
      database.ref(`users/${currentUser.uid}/status`).set("online");
    }
    if (spectatorListenerRef) { spectatorListenerRef.off(); spectatorListenerRef = null; }
    isSpectator = false;
    window.location.href = window.location.pathname;
    return;
  }

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (gameData.players && gameData.players[myPlayerId]) {
        const localDeviceId = getDeviceId();
        const dbDeviceId = gameData.players[myPlayerId].deviceId;

        if (dbDeviceId !== localDeviceId) {
          database.ref(`games/${currentGameId}/players/${myPlayerId}`).update({
            deviceId: localDeviceId,
          });
          gameData.players[myPlayerId].deviceId = localDeviceId;
        }

        if (
          gameData.gameState === "team-selection" &&
          !gameData.players[myPlayerId].teamId
        ) {
          delete gameData.players[myPlayerId];
        } else {
          gameData.players[myPlayerId].online = false;
        }
      }

      const isAnyoneElseOnline = Object.values(gameData.players || {}).some(
        (p) => p.online === true,
      );

      if (!isAnyoneElseOnline) {
        gameData.gameMessage = { key: "everyoneLeft" };
      }

      return gameData;
    })
    .then(() => {
      if (currentUser) {
        database.ref(`users/${currentUser.uid}/currentGameId`).remove();
        database.ref(`users/${currentUser.uid}/status`).set("online");
      }
      localStorage.removeItem("sequenceGameData");
      window.history.pushState({}, "", window.location.pathname);
      window.location.reload();
    })
    .catch((error) => {
      showToast(translate("errors.leaveGame"), {
        icon: "error",
      });
    });
}

function findRandomGame() {
  myPlayerName = $("#player-name-input").val().trim();
  if (!myPlayerName) {
    showToast(translate("lobby.enterNamePromptRandom"), {
      title: translate("oops"),
      icon: "warning",
    });
    return;
  }

  saveLobbySettings();
  incrementAnalytics({ matchmaking_searches: 1 });
  let matchFound = false;
  let searchCancelled = false;
  let createdRoomId = null;
  let roomListener = null;
  const SEARCH_PHASE_DURATION = 4000;
  const INVITE_PHASE_DURATION = 8000;
  const TOTAL_DURATION = SEARCH_PHASE_DURATION + INVITE_PHASE_DURATION;

  Swal.fire({
    title: translate("lobby.searchingTitle"),
    html: `<div class="matchmaking-search">
      <p>${translate("lobby.searchingText")}</p>
      <div class="search-timer"><i class="fas fa-spinner fa-spin"></i></div>
    </div>`,
    allowOutsideClick: false,
    allowEscapeKey: true,
    showCancelButton: true,
    showConfirmButton: false,
    cancelButtonText: translate("cancel"),
    timer: TOTAL_DURATION,
    timerProgressBar: true,
    didOpen: () => {
      setTimeout(() => {
        if (matchFound || searchCancelled) return;
        const popup = Swal.getPopup();
        if (popup) {
          const pEl = popup.querySelector(".matchmaking-search p");
          if (pEl) pEl.textContent = translate("lobby.invitingPlayersText");
        }
      }, SEARCH_PHASE_DURATION);
    },
  }).then((result) => {
    if (result.dismiss === Swal.DismissReason.cancel) {
      searchCancelled = true;
      cleanupRandomSearch();
    } else if (result.dismiss === Swal.DismissReason.timer) {
      if (!matchFound && !searchCancelled) {
        showNoMatchModal();
      }
    }
  });

  function cleanupRandomSearch() {
    if (roomListener) {
      roomListener.off();
      roomListener = null;
    }
  }

  function deleteCreatedRoom() {
    if (createdRoomId) {
      database.ref("games/" + createdRoomId).once("value", (snap) => {
        const game = snap.val();
        if (game && game.players) {
          const humanCount = Object.values(game.players).filter(
            (p) => p.online && !p.isBot && p.id !== "player1"
          ).length;
          if (humanCount === 0) {
            database.ref("games/" + createdRoomId).remove();
          }
        }
      });
      createdRoomId = null;
    }
  }

  function createRoomAndInvite() {
    if (matchFound || searchCancelled) return;

    const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
    createdRoomId = gameId;

    const deck = createAndShuffleDeck();
    let teams = {};
    for (const teamId in TEAM_COLORS) {
      teams[teamId] = {
        id: teamId,
        color: TEAM_COLORS[teamId],
        members: [],
        sequencesCompleted: 0,
      };
    }

    const newGame = {
      gameId: gameId,
      settings: { reshuffleOnEmpty: true, autoDraw: false, useTurnTimer: false, turnDuration: 30, timeoutPenalty: "skip" },
      isPrivate: false,
      gameState: "team-selection",
      capacity: DEFAULT_MAX_PLAYERS,
      playerCount: null,
      numTeams: null,
      boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
      lockedChips: {},
      players: {},
      teams: teams,
      deck: deck,
      discardPile: [],
      turnOrder: [],
      currentPlayerIndex: 0,
      turnState: "playing",
      chat: {},
      gameMessage: { key: "waitingForPlayers", params: { current: 1, capacity: DEFAULT_MAX_PLAYERS } },
      winner: null,
      botIntentions: {},
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      fromRandomSearch: true,
    };

    database.ref("games/" + gameId).set(newGame).then(() => {
      myPlayerId = "player1";
      currentGameId = gameId;

      database.ref("games/" + gameId + "/players/player1").set({
        id: "player1",
        name: myPlayerName,
        deviceId: getDeviceId(),
        avatar: selectedAvatarId,
        teamId: null,
        hand: [],
        online: true,
        host: true,
      });

      broadcastLobbyInvites(gameId);
      listenForPlayerJoin(gameId);
    });
  }

  function broadcastLobbyInvites(gameId) {
    database.ref("lobby_players").once("value", (snapshot) => {
      const lobbyPlayers = snapshot.val();
      if (!lobbyPlayers) return;

      const myDeviceId = getDeviceId();
      const myName = myPlayerName ? myPlayerName.toLowerCase() : "";
      const candidates = Object.entries(lobbyPlayers).filter(([deviceId, player]) => {
        if (deviceId === myDeviceId) return false;
        if (!player || !player.name) return false;
        if (player.name.toLowerCase() === myName) return false;
        if (player.declined && player.declined[gameId]) return false;
        return true;
      });

      const maxInvites = Math.min(candidates.length, 5);
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const toInvite = shuffled.slice(0, maxInvites);

      toInvite.forEach(([deviceId]) => {
        const inviteData = {
          gameId: gameId,
          hostName: myPlayerName,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
        };
        database.ref(`game_invites/${deviceId}`).push(inviteData);
      });

      if (toInvite.length > 0) {
        incrementAnalytics({ lobby_invites_sent: toInvite.length });
      }
    });
  }

  function listenForPlayerJoin(gameId) {
    roomListener = database.ref("games/" + gameId + "/players");
    roomListener.on("value", (snapshot) => {
      if (matchFound || searchCancelled) return;
      const players = snapshot.val();
      if (!players) return;

      const otherHumans = Object.values(players).filter(
        (p) => p.online && !p.isBot && p.id !== "player1"
      );

      if (otherHumans.length > 0) {
        matchFound = true;
        cleanupRandomSearch();
        Swal.close();
        showToast(translate("matchFound"), { icon: "success", timer: 1500 });
        setTimeout(() => {
          leaveLobbyPresence();
          setupGameUI(gameId);
        }, 500);
      }
    });
  }

  const gamesRef = database.ref("games");

  function attemptSearch() {
    if (matchFound || searchCancelled) return;

    gamesRef
      .orderByChild("gameState")
      .limitToFirst(50)
      .once("value")
      .then((snapshot) => {
        if (matchFound || searchCancelled) return;

        const games = snapshot.val();
        let gameToJoin = null;

        if (games) {
          const myDeviceId = getDeviceId();

          const foundEntry = Object.entries(games).find(([gameId, game]) => {
            if (!game || game.isPrivate) return false;
            if (game.isAutoGenerated) return false;
            if (game.archived) return false;

            if (game.gameState === "finished" || game.gameState === "ended")
              return false;

            const players = game.players || {};

            const activePlayersCount = Object.values(players).filter(
              (p) => p && p.online === true,
            ).length;
            if (activePlayersCount === 0) return false;

            const existingByDevice = Object.values(players).find(
              (p) => p && p.deviceId === myDeviceId,
            );
            if (existingByDevice) return true;

            const isNameTaken = Object.values(players).some((p) => {
              return (
                p &&
                p.name &&
                p.online &&
                p.name.toLowerCase() === myPlayerName.toLowerCase()
              );
            });
            if (isNameTaken) return false;

            const maxPlayers =
              game.playerCount ?? game.capacity ?? DEFAULT_MAX_PLAYERS;

            const waitingSlotsAvailable =
              (game.gameState === "waiting" ||
                game.gameState === "team-selection") &&
              Object.keys(players).length < maxPlayers;

            const hasReconnectSlot =
              game.gameState === "playing" &&
              Object.values(players).some((p) => {
                if (!p || p.online !== false || p.isBot) return false;
                if (!p.disconnectedAt) return true;
                return (
                  Date.now() - p.disconnectedAt > RECONNECTION_GRACE_PERIOD_MS
                );
              });

            return waitingSlotsAvailable || hasReconnectSlot;
          });

          if (foundEntry) {
            const [gameId, game] = foundEntry;
            gameToJoin = { ...game, gameId };
          }
        }

        if (gameToJoin && !matchFound && !searchCancelled) {
          matchFound = true;
          cleanupRandomSearch();
          deleteCreatedRoom();
          Swal.close();

          showToast(translate("matchFound"), { icon: "success", timer: 1500 });

          setTimeout(() => {
            const onlinePlayer = Object.values(gameToJoin.players || {}).find(
              (p) => p?.online,
            );
            const onlinePlayerName =
              onlinePlayer?.name || translate("general.someone");

            showToast(
              translate("joiningGameOf", { playerName: onlinePlayerName }),
              { icon: "success" },
            );

            incrementAnalytics({ games_started_online_random_joined: 1, matchmaking_found_existing: 1 });
            joinGame(gameToJoin.gameId, myPlayerName, { fromRandom: true });
          }, 1000);
        }
      });
  }

  attemptSearch();

  setTimeout(() => {
    if (matchFound || searchCancelled) return;
    createRoomAndInvite();
  }, SEARCH_PHASE_DURATION);

  function showNoMatchModal() {
    cleanupRandomSearch();

    Swal.fire({
      title: translate("lobby.noMatchTitle"),
      text: translate("lobby.noMatchText"),
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: translate("lobby.playAgainstBot"),
      denyButtonText: translate("lobby.keepRoomOpen"),
      cancelButtonText: translate("cancel"),
    }).then((result) => {
      if (result.isConfirmed) {
        incrementAnalytics({ matchmaking_timeout_bot: 1 });
        deleteCreatedRoom();
        mostrarLoading();
        createBotMatch();
      } else if (result.isDenied) {
        if (createdRoomId) {
          incrementAnalytics({ online_rooms_created: 1, online_rooms_created_from_random: 1, matchmaking_timeout_keep: 1 });
          leaveLobbyPresence();
          setupGameUI(createdRoomId);
        }
      } else {
        incrementAnalytics({ matchmaking_timeout_cancel: 1 });
        deleteCreatedRoom();
      }
    });
  }
}

function initializeGameInFirebase(gameId) {
  const deck = createAndShuffleDeck();
  let teams = {};
  for (const teamId in TEAM_COLORS) {
    teams[teamId] = {
      id: teamId,
      color: TEAM_COLORS[teamId],
      members: [],
      sequencesCompleted: 0,
    };
  }

  const newGame = {
    gameId: gameId,
    settings: {
      reshuffleOnEmpty: true,
      autoDraw: false,
      useTurnTimer: false,
      turnDuration: 30,
      timeoutPenalty: "skip",
    },
    isPrivate: false,
    gameState: "team-selection",
    capacity: DEFAULT_MAX_PLAYERS,
    playerCount: null,
    numTeams: null,
    boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
    lockedChips: {},
    players: {},
    teams: teams,
    deck: deck,
    discardPile: [],
    turnOrder: [],
    currentPlayerIndex: 0,
    turnState: "playing",
    chat: {},
    gameMessage: {
      key: "waitingForPlayers",
      params: { current: 1, capacity: DEFAULT_MAX_PLAYERS },
    },
    winner: null,
    botIntentions: {},
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  database
    .ref("games/" + gameId)
    .set(newGame)
    .then(() => {
      incrementAnalytics({
        online_rooms_created: 1,
      });
      addPlayerToGame(gameId, "player1");
    });
}

function getGameConfiguration(players, teams) {
  const playerCount = Object.values(players || {}).filter((p) => p.id).length;
  const teamMembers = {};
  Object.values(teams || {}).forEach((team) => {
    if (team.members && team.members.length > 0) {
      teamMembers[team.id] = team.members.length;
    }
  });

  const teamCount = Object.keys(teamMembers).length;
  const teamSizes = Object.values(teamMembers);

  if (teamCount === 0 || teamSizes.length === 0) return { canStart: false };

  const isBalanced = teamSizes.every((size) => size === teamSizes[0]);
  if (!isBalanced) return { canStart: false };

  const playersPerTeam = teamSizes[0];
  if (playerCount !== teamCount * playersPerTeam) return { canStart: false };

  const validModes = {
    2: [{ numTeams: 2, playersPerTeam: 1 }],
    3: [{ numTeams: 3, playersPerTeam: 1 }],
    4: [{ numTeams: 2, playersPerTeam: 2 }],
    6: [
      { numTeams: 2, playersPerTeam: 3 },
      { numTeams: 3, playersPerTeam: 2 },
    ],
    8: [{ numTeams: 2, playersPerTeam: 4 }],
    9: [{ numTeams: 3, playersPerTeam: 3 }],
    10: [{ numTeams: 2, playersPerTeam: 5 }],
    12: [
      { numTeams: 2, playersPerTeam: 6 },
      { numTeams: 3, playersPerTeam: 4 },
    ],
  };

  if (validModes[playerCount]) {
    for (const mode of validModes[playerCount]) {
      if (
        mode.numTeams === teamCount &&
        mode.playersPerTeam === playersPerTeam
      ) {
        return {
          canStart: true,
          playerCount: playerCount,
          numTeams: teamCount,
          playersPerTeam: playersPerTeam,
        };
      }
    }
  }

  return { canStart: false };
}

function joinGame(gameId, playerName, options = {}) {
  const { fromRandom = false, providedPassword = null } = options;
  const gameRef = database.ref("games/" + gameId);
  const myDeviceId = getDeviceId();

  gameRef.once("value").then((snapshot) => {
    const gameData = snapshot.val();

    if (!gameData) {
      esconderLoading();
      showToast(translate("roomNotFound"), {
        title: translate("error"),
        icon: "error",
      });
      return;
    }

    if (gameData.isPrivate && gameData.password) {
      let passToUse = providedPassword;

      if (!passToUse && urlSecret) {
        passToUse = urlSecret;
      }

      if (String(passToUse) !== String(gameData.password)) {
        esconderLoading();

        if (fromRandom) return;

        Swal.fire({
          title: translate("privateRoom.title"),
          html: `
              <p style="margin-bottom: 15px;">${translate("privateRoom.enterPass")}</p>
              <input
                type="number" 
                id="swal-password-input" 
                class="swal2-input pin-input" 
                placeholder="0000"
                maxlength="4" 
                inputmode="numeric" 
                pattern="[0-9]*"
                autocomplete="off"
                oninput="if(this.value.length > 4) this.value = this.value.slice(0, 4);">
              `,
          showCancelButton: true,
          confirmButtonText: translate("privateRoom.btnEnter"),
          cancelButtonText: translate("cancel"),
          didOpen: () => {
            const input = document.getElementById("swal-password-input");
            if (input) input.focus();

            input.addEventListener("keypress", (e) => {
              if (e.key === "Enter") {
                Swal.clickConfirm();
              }
            });
          },
          preConfirm: () => {
            const value = document.getElementById("swal-password-input").value;

            if (!value || value.length !== 4) {
              Swal.showValidationMessage(translate("privateRoom.errorLength"));
              return false;
            }

            if (String(value) !== String(gameData.password)) {
              Swal.showValidationMessage(translate("privateRoom.incorrectPass"));
              return false;
            }

            return value;
          },
        }).then((result) => {
          if (result.isConfirmed) {
            mostrarLoading();
            joinGame(gameId, playerName, { ...options, providedPassword: result.value });
          }
        });
        return;
      }
    }

    const banned = gameData.bannedDeviceIds;
    const isBanned =
      banned &&
      (Array.isArray(banned)
        ? banned.includes(myDeviceId)
        : Object.values(banned).includes(myDeviceId));

    if (isBanned) {
      esconderLoading();
      Swal.fire({
        title: translate("bannedTitle"),
        text: translate("bannedText"),
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const players = gameData.players || {};
    const nameTaken = Object.values(players).some(
      (p) =>
        p &&
        p.name &&
        p.online === true &&
        p.name.toLowerCase() === playerName.toLowerCase() &&
        p.deviceId !== myDeviceId &&
        !p.isTempBot
    );

    if (nameTaken) {
      esconderLoading();
      showToast(translate("nameInUse", { playerName }), {
        title: translate("nameInUseTitle"),
        icon: "warning",
      });
      return;
    }

    gameRef
      .transaction((gameDataTx) => {
        if (gameDataTx === null) return gameDataTx;
        if (!gameDataTx.players) gameDataTx.players = {};

        gameDataTx.lastActivityAt = Date.now();
        if (gameDataTx.archived) {
          gameDataTx.archived = null;
          gameDataTx.archivedAt = null;
        }

        const txPlayers = gameDataTx.players;

        let playerKey = Object.keys(txPlayers).find(
          (k) =>
            txPlayers[k] &&
            (txPlayers[k].deviceId === myDeviceId ||
              (txPlayers[k].isTempBot &&
                txPlayers[k].name?.toLowerCase() === playerName.toLowerCase())),
        );

        if (playerKey) {
          const p = txPlayers[playerKey];

          p.name = playerName;
          p.deviceId = myDeviceId;
          p.avatar = selectedAvatarId;
          p.online = true;
          p.disconnectedAt = null;

          if (p.isTempBot) {
            p.isBot = false;
            p.isTempBot = null;
            p.online = true;

            gameDataTx.gameMessage = {
              key: "playerReclaimed",
              params: { playerName },
            };
          }

          return gameDataTx;
        }

        if (
          gameDataTx.gameState === "waiting" ||
          gameDataTx.gameState === "team-selection"
        ) {
          const activeCount = Object.values(txPlayers).filter(
            (p) => p && p.online === true,
          ).length;

          const capacity =
            gameDataTx.playerCount ||
            gameDataTx.capacity ||
            DEFAULT_MAX_PLAYERS;

          if (activeCount >= capacity) return;

          const newId = `player_${Date.now()}`;
          txPlayers[newId] = {
            id: newId,
            name: playerName,
            deviceId: myDeviceId,
            avatar: selectedAvatarId,
            teamId: null,
            hand: [],
            online: false,
            disconnectedAt: null,
          };

          return gameDataTx;
        }

        if (gameDataTx.gameState === "playing") {
          const now = Date.now();

          const disconnectedKey = Object.keys(txPlayers).find((k) => {
            const p = txPlayers[k];
            return (
              p &&
              p.online === false &&
              !p.isBot &&
              (!p.disconnectedAt ||
                now - p.disconnectedAt > RECONNECTION_GRACE_PERIOD_MS)
            );
          });

          if (disconnectedKey) {
            const p = txPlayers[disconnectedKey];
            const oldName = p.name || translate("general.someone");

            p.name = playerName;
            p.deviceId = myDeviceId;
            p.avatar = selectedAvatarId;
            p.online = true;
            p.disconnectedAt = null;

            gameDataTx.gameMessage = {
              key: "playerReplaced",
              params: { newPlayer: playerName, oldPlayer: oldName },
            };

            return gameDataTx;
          }
        }

        return;
      })
      .then((result) => {
        if (!result.committed) {
          if (fromRandom) {
            createBotMatch(true);
            return;
          }

          const currentData = result.snapshot.val();
          if (currentData && currentData.gameState === "playing") {
            esconderLoading();
            Swal.fire({
              title: translate("joinFailedTitle"),
              text: translate("spectator.gameInProgressAsk"),
              icon: "question",
              showCancelButton: true,
              confirmButtonText: translate("spectator.watchBtn"),
              cancelButtonText: translate("cancel"),
            }).then((swalResult) => {
              if (swalResult.isConfirmed) {
                joinGameAsSpectator(gameId);
              }
            });
            return;
          }

          showToast(translate("joinFailedFull"), {
            title: translate("joinFailedTitle"),
            icon: "warning",
          });
          esconderLoading();
          return;
        }

        const finalData = result.snapshot.val();
        const myEntry = Object.entries(finalData.players).find(
          ([, p]) => p && p.deviceId === myDeviceId,
        );

        if (!myEntry) {
          esconderLoading();
          showToast(translate("joinError"), { icon: "error" });
          return;
        }

        myPlayerId = myEntry[0];
        myPlayerName = myEntry[1].name;
        currentGameId = gameId;

        setupGameUI(gameId);
        esconderLoading();
      })
      .catch(() => {
        esconderLoading();
        showToast(translate("joinError"), { icon: "error" });
      });
  });
}

function joinGameAsSpectator(gameId) {
  const gameRef = database.ref("games/" + gameId);

  gameRef.once("value").then((snapshot) => {
    const gameData = snapshot.val();

    if (!gameData) {
      esconderLoading();
      showToast(translate("roomNotFound"), { title: translate("error"), icon: "error" });
      return;
    }

    if (gameData.gameState !== "playing" && gameData.gameState !== "team-selection") {
      esconderLoading();
      showToast(translate("spectator.gameNotActive"), { icon: "warning" });
      return;
    }

    isSpectator = true;
    myPlayerId = null;
    currentGameId = gameId;

    incrementAnalytics({ spectator_joins: 1 });

    if (currentUser) {
      database.ref(`games/${gameId}/spectators/${currentUser.uid}`).set({
        username: userProfile?.username || myPlayerName,
        avatar: selectedAvatarId,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
      });
      database.ref(`games/${gameId}/spectators/${currentUser.uid}`).onDisconnect().remove();
    }

    setupSpectatorUI(gameId);
  });
}

function setupSpectatorUI(gameId) {
  leaveLobbyPresence();

  if (currentUser) {
    database.ref(`users/${currentUser.uid}/status`).set("playing");
    database.ref(`users/${currentUser.uid}/currentGameId`).set(gameId);
  }

  initializeBoard();

  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?game=" + gameId;
  window.history.pushState({ path: newUrl }, "", newUrl);

  const entrarComoEspectador = () => {
    $("#lobby").hide();
    $(".chat-btn-container").show();
    $(".game-id-text").text(gameId);
    $(".persistent-game-info").show();
    $(".mobile-chat-btn").addClass("show");
    $("#hint-btn").hide();
  };

  if (document.startViewTransition) {
    document.startViewTransition(entrarComoEspectador);
  } else {
    entrarComoEspectador();
  }

  listenToGameUpdatesAsSpectator(gameId);
  listenToSpectators(gameId);
}

function listenToGameUpdatesAsSpectator(gameId) {
  const gameRef = database.ref("games/" + gameId);

  gameRef.off();

  gameRef.once("value", (initialSnapshot) => {
    const gameData = initialSnapshot.val();
    if (!gameData) {
      showToast(translate("gameExpired"), { title: translate("game.endedTitle"), icon: "warning", timer: 5000 });
      window.history.pushState({}, "", window.location.pathname);
      setTimeout(() => window.location.reload(), 4000);
      return;
    }

    currentGameDataState = gameData;
    previousGameData = JSON.parse(JSON.stringify(gameData));

    if (gameData.gameState === "team-selection") {
      convertSpectatorToPlayer(gameId);
      return;
    }

    const transicaoParaTabuleiro = () => {
      $("#team-selection-modal").hide();
      $("#game-container").show();
      renderBoard(gameData);
      updateGameInfo(gameData);
      renderChat(gameData.chat, gameData.players, gameData.teams);
      applySpectatorRestrictions();
      if (typeof animarFichasExistentes === "function") animarFichasExistentes();
      esconderLoading();
    };

    if (document.startViewTransition) {
      document.startViewTransition(transicaoParaTabuleiro);
    } else {
      transicaoParaTabuleiro();
    }

    gameRef.child("boardState").on("value", (snapshot) => {
      if (!snapshot.val()) return;
      const newBoardState = snapshot.val();
      const oldBoardState = currentGameDataState.boardState || {};

      if (typeof animarFichaOponente === "function" && currentGameDataState.teams) {
        const newSlot = detectarNovaFicha(oldBoardState, newBoardState);
        if (newSlot) {
          const teamColor = currentGameDataState.teams[newSlot.teamId]?.color || "blue";
          const slotEl = document.querySelector(
            `.card-slot[data-row="${newSlot.row}"][data-col="${newSlot.col}"]`
          );
          if (slotEl) {
            const turnOrder = currentGameDataState.turnOrder || [];
            const currentIdx = currentGameDataState.currentPlayerIndex || 0;
            const totalPlayers = turnOrder.length;
            const direcao = typeof getPosicaoParaEspectador === 'function'
              ? getPosicaoParaEspectador(currentIdx, totalPlayers) : 'top';
            const origem = typeof getOrigemPorDirecao === 'function'
              ? getOrigemPorDirecao(direcao, null, 0, 1) : { x: window.innerWidth / 2, y: -20 };

            const corMap = { blue: '#2980b9', red: '#e53935', green: '#27ae60' };
            const borderMap = { blue: '#1c4e7a', red: '#8e1b1b', green: '#1e6b3c' };
            const rectDestino = slotEl.getBoundingClientRect();
            slotEl.setAttribute('data-animating', 'true');

            const fantasma = document.createElement('div');
            Object.assign(fantasma.style, {
              position: 'fixed', top: `${origem.y}px`, left: `${origem.x}px`,
              width: '20px', height: '20px', borderRadius: '50%',
              background: corMap[teamColor] || '#e53935',
              border: `2px solid ${borderMap[teamColor] || 'rgba(0,0,0,0.3)'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)', zIndex: '9999',
              pointerEvents: 'none', transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)', opacity: '0.9'
            });
            document.body.appendChild(fantasma);
            requestAnimationFrame(() => {
              fantasma.style.top = `${rectDestino.top + rectDestino.height / 2 - 10}px`;
              fantasma.style.left = `${rectDestino.left + rectDestino.width / 2 - 10}px`;
              fantasma.style.transform = 'scale(0.85)';
            });
            fantasma.addEventListener('transitionend', () => { fantasma.remove(); slotEl.removeAttribute('data-animating'); }, { once: true });
            setTimeout(() => { if (document.body.contains(fantasma)) fantasma.remove(); slotEl.removeAttribute('data-animating'); }, 600);
          }
        }

        const removedSlot = detectarFichaRemovida(oldBoardState, newBoardState);
        if (removedSlot) {
          const removedColor = currentGameDataState.teams[removedSlot.teamId]?.color || "red";
          const numTeams = currentGameDataState.numTeams || 2;
          const slotEl = document.querySelector(`.card-slot[data-row="${removedSlot.row}"][data-col="${removedSlot.col}"]`);
          if (slotEl && typeof animarRemocaoFicha === "function") {
            animarRemocaoFicha(slotEl, removedColor, removedSlot.teamId, numTeams);
          }
        }
      }

      currentGameDataState.boardState = newBoardState;
      renderBoard(currentGameDataState);
    });

    gameRef.child("lockedChips").on("value", (snapshot) => {
      currentGameDataState.lockedChips = snapshot.val() || {};
      renderBoard(currentGameDataState);
    });

    gameRef.child("currentPlayerIndex").on("value", (snapshot) => {
      currentGameDataState.currentPlayerIndex = snapshot.val();
      updateGameInfo(currentGameDataState);
    });

    gameRef.child("turnState").on("value", (snapshot) => {
      currentGameDataState.turnState = snapshot.val();
    });

    gameRef.child("gameState").on("value", (snapshot) => {
      const newState = snapshot.val();
      const previousState = currentGameDataState.gameState;
      currentGameDataState.gameState = newState;

      if (newState === "team-selection") {
        gameRef.off();
        convertSpectatorToPlayer(gameId);
        return;
      }

      if (newState === "finished" && previousState !== "finished") {
        database.ref(`games/${gameId}/winner`).once("value", (winSnap) => {
          const winnerId = winSnap.val();
          currentGameDataState.winner = winnerId;
          updateGameInfo(currentGameDataState);

          if (typeof dispararCelebracao === "function") {
            const winnerTeam = winnerId ? currentGameDataState.teams?.[winnerId] : null;
            if (winnerTeam) {
              setTimeout(() => { celebrarVitoria(winnerTeam.color); playFeedback("winner"); }, 1500);
            } else {
              setTimeout(() => { if (typeof celebrarEmpate === "function") celebrarEmpate(); }, 1500);
            }
          }
        });
      }

      if (newState === "ended") {
        Swal.fire({
          title: translate("matchFinished"),
          text: translate("rematchRejectedInfo"),
          icon: "info",
          timer: 4000,
          allowEscapeKey: false,
          allowOutsideClick: false,
        }).then(() => {
          window.location.href = window.location.pathname;
        });
      }
    });

    gameRef.child("gameMessage").on("value", (snapshot) => {
      currentGameDataState.gameMessage = snapshot.val();
      updateGameInfo(currentGameDataState);
    });

    gameRef.child("chat").on("value", (snapshot) => {
      const chatData = snapshot.val() || {};
      currentGameDataState.chat = chatData;
      renderChat(chatData, currentGameDataState.players, currentGameDataState.teams);
    });

    gameRef.child("teams").on("value", (snapshot) => {
      const newTeams = snapshot.val();
      if (!newTeams) return;

      const oldTeams = currentGameDataState.teams || {};
      Object.values(newTeams).forEach((team) => {
        const oldTeam = oldTeams[team.id];
        if (oldTeam && (team.sequencesCompleted || 0) > (oldTeam.sequencesCompleted || 0)) {
          if (typeof dispararCelebracao === "function") {
            playFeedback("sequenceSuccess");
            const lockedElements = document.querySelectorAll('.chip.locked');
            const recentLocked = Array.from(lockedElements).slice(-5);
            dispararCelebracao('sequencia', null, recentLocked, false);
          }
        }
      });

      currentGameDataState.teams = newTeams;
      updateGameInfo(currentGameDataState);
    });

    gameRef.child("players").on("value", (snapshot) => {
      const newPlayers = snapshot.val();
      if (!newPlayers) return;
      currentGameDataState.players = newPlayers;
      updateGameInfo(currentGameDataState);
    });

    gameRef.child("deck").on("value", (snapshot) => {
      const oldDeck = currentGameDataState.deck || [];
      const newDeck = snapshot.val() || [];
      currentGameDataState.deck = newDeck;

      const deckDiminuiu = newDeck.length < (Array.isArray(oldDeck) ? oldDeck.length : 0);
      if (deckDiminuiu) {
        const turnOrder = currentGameDataState.turnOrder || [];
        const currentIdx = currentGameDataState.currentPlayerIndex || 0;
        const totalPlayers = turnOrder.length;
        const direcao = typeof getPosicaoParaEspectador === 'function'
          ? getPosicaoParaEspectador(currentIdx, totalPlayers) : 'top';
        const destino = typeof getOrigemPorDirecao === 'function'
          ? getOrigemPorDirecao(direcao, null, 0, 1) : { x: window.innerWidth / 2, y: -20 };

        const deck = document.getElementById('deck-pile');
        if (deck) {
          const deckRect = deck.getBoundingClientRect();
          const fantasma = document.createElement('div');
          Object.assign(fantasma.style, {
            position: 'fixed', top: `${deckRect.top}px`, left: `${deckRect.left}px`,
            width: `${deckRect.width}px`, height: `${deckRect.height}px`,
            zIndex: '9998', pointerEvents: 'none',
            transition: 'all 0.65s cubic-bezier(0.25, 1, 0.5, 1)', opacity: '1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', margin: '0',
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            border: '2px solid white', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          });
          fantasma.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:7px;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:1px 3px;border-radius:3px;">ROW 5</span>`;
          document.body.appendChild(fantasma);
          requestAnimationFrame(() => { fantasma.style.top = `${destino.y}px`; fantasma.style.left = `${destino.x}px`; fantasma.style.transform = 'scale(0.8)'; fantasma.style.opacity = '0.7'; });
          fantasma.addEventListener('transitionend', () => fantasma.remove(), { once: true });
          setTimeout(() => { if (document.body.contains(fantasma)) fantasma.remove(); }, 750);
        }
      }
      updateGameInfo(currentGameDataState);
    });

    gameRef.child("discardPile").on("value", (snapshot) => {
      const oldPile = currentGameDataState.discardPile || [];
      const newPile = snapshot.val() || [];
      currentGameDataState.discardPile = newPile;

      const isNewCard = newPile.length > oldPile.length;
      const lastCard = isNewCard && newPile.length > 0 ? newPile[newPile.length - 1] : null;

      if (isNewCard && lastCard && typeof animarDescarte === "function") {
        const turnOrder = currentGameDataState.turnOrder || [];
        const currentIdx = currentGameDataState.currentPlayerIndex || 0;
        const totalPlayers = turnOrder.length;
        const direcao = typeof getPosicaoParaEspectador === 'function'
          ? getPosicaoParaEspectador(currentIdx, totalPlayers) : 'top';
        const origem = typeof getOrigemPorDirecao === 'function'
          ? getOrigemPorDirecao(direcao, null, 0, 1) : { x: window.innerWidth / 2, y: -20 };
        const fakeRect = { top: origem.y, left: origem.x, width: 28, height: 50 };
        animarDescarte(null, fakeRect, lastCard);
      }

      const randomDelay = isNewCard ? 300 : 0;
      setTimeout(() => updateGameInfo(currentGameDataState), randomDelay);
    });
  });
}

function applySpectatorRestrictions() {
  $("#player-hand").hide();
  $(".hand-title").hide();
  $("#chip-stack").hide();
  $(".draw-countdown").hide();
  $("#board .card-slot").css("pointer-events", "none");
  $(".deck-discard-container").css("pointer-events", "none");
  $(".spectator-badge-fixed").remove();
  $("body").append(
    `<div class="spectator-badge-fixed"><i class="fas fa-eye"></i> ${translate("spectator.badge")}</div>`
  );
  sessionStorage.setItem("isSpectator", "true");
  localStorage.removeItem("sequenceGameData");
}

function convertSpectatorToPlayer(gameId) {
  isSpectator = false;
  $(".spectator-badge-fixed").remove();
  sessionStorage.removeItem("isSpectator");

  if (currentUser) {
    database.ref(`games/${gameId}/spectators/${currentUser.uid}`).remove();
  }

  const playerName = userProfile?.username || myPlayerName || $("#player-name-input").val().trim();
  myPlayerName = playerName;

  joinGame(gameId, playerName);
}

function listenToSpectators(gameId) {
  if (spectatorListenerRef) spectatorListenerRef.off();
  spectatorListenerRef = database.ref(`games/${gameId}/spectators`);

  spectatorListenerRef.on("value", (snapshot) => {
    const spectators = snapshot.val() || {};
    const count = Object.keys(spectators).length;
    const $btn = $(".spectator-count-btn");

    if (count > 0) {
      $btn.show();
      $btn.find(".spectator-count-num").text(count);
    } else {
      $btn.hide();
    }
  });

  $(".spectator-count-btn").off("click").on("click", () => {
    openSpectatorsModal(gameId);
  });
}

function openSpectatorsModal(gameId) {
  database.ref(`games/${gameId}/spectators`).once("value", (snapshot) => {
    const spectators = snapshot.val() || {};
    const entries = Object.entries(spectators);

    let listHtml = "";
    if (entries.length === 0) {
      listHtml = `<p class="modal-empty-text">${translate("spectator.noSpectators")}</p>`;
    } else {
      listHtml = '<ul class="modal-list">';
      entries.forEach(([uid, spec]) => {
        const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${spec.avatar || 1}`;
        listHtml += `<li class="modal-list-item">
          <div class="modal-list-item-info">
            <img src="${avatarSrc}">
            <span>${spec.username}</span>
          </div>
        </li>`;
      });
      listHtml += "</ul>";
    }

    Swal.fire({
      title: `<i class="fas fa-eye"></i> ${translate("spectator.listTitle")}`,
      html: listHtml,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
    });
  });
}

function openPlayersListModal() {
  const gameData = isLocalGame ? (typeof localGameData !== 'undefined' ? localGameData : null) : currentGameDataState;
  if (!gameData || !gameData.players) return;

  const players = gameData.players;
  const teams = gameData.teams || {};
  const turnOrder = gameData.turnOrder || [];

  const playersByTeam = {};
  const noTeam = [];

  Object.entries(players)
    .filter(([, p]) => p && p.name)
    .sort((a, b) => {
      const idxA = turnOrder.indexOf(a[0]);
      const idxB = turnOrder.indexOf(b[0]);
      return idxA - idxB;
    })
    .forEach(([playerId, player]) => {
      if (player.teamId && teams[player.teamId]) {
        if (!playersByTeam[player.teamId]) playersByTeam[player.teamId] = [];
        playersByTeam[player.teamId].push({ playerId, player });
      } else {
        noTeam.push({ playerId, player });
      }
    });

  let listHtml = '';

  const renderPlayer = (playerId, player) => {
    const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${player.avatar || 1}`;
    const rankBadge = (!player.isBot && player.rank)
      ? (() => { const r = getPlayerRank(player.rankingPoints || 0); return ` ${getRankBadgeSvg(r, 20)}`; })()
      : "";
    const botIcon = player.isBot ? ' <i class="fas fa-robot" style="opacity:0.6;font-size:0.75em;"></i>' : "";
    const onlineIcon = !isLocalGame && !player.isBot
      ? (player.online ? ' <i class="fas fa-circle" style="color:#27ae60;font-size:0.5em;vertical-align:middle;"></i>' : ' <i class="fas fa-circle" style="color:#e74c3c;font-size:0.5em;vertical-align:middle;"></i>')
      : "";
    const hostIcon = !isLocalGame && player.host ? ' <i class="fas fa-crown" style="color:#f1c40f;font-size:0.7em;"></i>' : "";

    return `<li class="modal-list-item">
      <div class="modal-list-item-info">
        <img src="${avatarSrc}">
        <span>${player.name}${hostIcon}${rankBadge}${botIcon}${onlineIcon}</span>
      </div>
    </li>`;
  };

  Object.entries(teams).forEach(([teamId, team]) => {
    const teamPlayers = playersByTeam[teamId] || [];
    if (teamPlayers.length === 0) return;

    const teamName = translate(`teamNames.${team.color}`);
    listHtml += `<div class="players-list-team-section team-section-${team.color}">
      <div class="players-list-team-header team-header-${team.color}">
        <strong>${teamName}</strong>
      </div>
      <ul class="modal-list">
        ${teamPlayers.map(({ playerId, player }) => renderPlayer(playerId, player)).join('')}
      </ul>
    </div>`;
  });

  if (noTeam.length > 0) {
    listHtml += `<div class="players-list-team-section">
      <ul class="modal-list">
        ${noTeam.map(({ playerId, player }) => renderPlayer(playerId, player)).join('')}
      </ul>
    </div>`;
  }

  Swal.fire({
    title: `<i class="fas fa-users"></i> ${translate("playersList")}`,
    html: listHtml,
    showConfirmButton: false,
    showCloseButton: true,
    customClass: { popup: "swal2-players-list-popup" },
  });
}

function createBotMatch(isFallback = false) {
  let delayInicial = 0;

  if (!isFallback) {
    showToast(translate("noRoomsFound"), {
      icon: "info",
      timer: 2500,
    });
    delayInicial = 1200;
  } else {
    showToast(translate("roomFullFallback"), {
      icon: "warning",
      timer: 3000,
    });
    delayInicial = 2500;
  }

  setTimeout(() => {
    showToast(translate("startingBotGame"), { icon: "success", timer: 1500 });
  }, delayInicial);

  setTimeout(() => {
    saveLobbySettings();

    myPlayerName =
      $("#player-name-input").val().trim() || translate("defaultPlayerName");

    const isTwoPlayerGame = Math.random() < 0.7;
    const playerCount = isTwoPlayerGame ? 2 : 3;
    const numTeams = isTwoPlayerGame ? 2 : 3;

    const availableColors = ["red", "blue", "green"];
    const userColor = availableColors.splice(
      Math.floor(Math.random() * availableColors.length),
      1,
    )[0];

    const botColors = [];
    for (let i = 1; i < numTeams; i++) {
      botColors.push(
        availableColors.splice(
          Math.floor(Math.random() * availableColors.length),
          1,
        )[0],
      );
    }

    const availableBots = BOT_NAMES.filter(
      (bot) => bot.name.toLowerCase() !== myPlayerName.toLowerCase(),
    )
      .sort(() => 0.5 - Math.random())
      .slice(0, playerCount - 1);

    const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
    myPlayerId = "player1";
    currentGameId = gameId;

    let players = {
      [myPlayerId]: {
        id: myPlayerId,
        name: myPlayerName,
        avatar: selectedAvatarId,
        hand: [],
        online: true,
        host: true,
      },
    };

    for (let i = 0; i < availableBots.length; i++) {
      const botId = `bot_${Date.now()}_${i}`;
      const botInfo = availableBots[i];
      players[botId] = {
        id: botId,
        name: botInfo.name,
        avatar: botInfo.avatar,
        hand: [],
        online: true,
        isBot: true,
      };
    }

    let teams = {};
    teams.team1 = {
      id: "team1",
      color: userColor,
      members: [],
      sequencesCompleted: 0,
    };

    for (let i = 0; i < botColors.length; i++) {
      const teamId = `team${i + 2}`;
      teams[teamId] = {
        id: teamId,
        color: botColors[i],
        members: [],
        sequencesCompleted: 0,
      };
    }

    const sortedTeamIds = Object.keys(teams).sort();
    const playerList = Object.keys(players);

    for (let i = 0; i < playerCount; i++) {
      const pId = playerList[i];
      const teamId = sortedTeamIds[i % numTeams];
      players[pId].teamId = teamId;
      teams[teamId].members.push(pId);
    }

    const deck = createAndShuffleDeck();
    const cardsToDeal = CARDS_PER_PLAYER[playerCount];

    Object.values(players).forEach((p) => {
      p.hand = [];
      for (let i = 0; i < cardsToDeal; i++) {
        if (deck.length > 0) p.hand.push(deck.pop());
      }
    });

    const turnOrder = [];
    const maxMembersPerTeam = Math.ceil(playerCount / numTeams);
    const sortedTeams = Object.values(teams).sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    for (let i = 0; i < maxMembersPerTeam; i++) {
      sortedTeams.forEach((team) => {
        if (team.members[i]) turnOrder.push(team.members[i]);
      });
    }

    const prevFirst = currentGameDataState?.previousFirstPlayer;
    if (prevFirst && turnOrder.includes(prevFirst)) {
      const idx = turnOrder.indexOf(prevFirst);
      turnOrder.push(...turnOrder.splice(0, idx + 1));
    }

    const gameData = {
      gameId: gameId,
      isAutoGenerated: true,
      gameState: "playing",
      gameStartedAt: firebase.database.ServerValue.TIMESTAMP,
      playerCount: playerCount,
      numTeams: numTeams,
      boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
      lockedChips: {},
      players: players,
      teams: teams,
      deck: deck,
      discardPile: [],
      turnOrder: turnOrder,
      currentPlayerIndex: 0,
      turnState: "playing",
      winner: null,
      gameMessage: {
        key: "gameStarted",
        params: { playerName: players[turnOrder[0]].name },
      },
      lastActivityAt: Date.now(),
      rematchVotes: {},
      chat: {},
      botIntentions: {},
      botDifficulty: "expert",
    };

    database
      .ref("games/" + gameId)
      .set(gameData)
      .then(() => {
        const modeKey = `${playerCount}_${numTeams}`;

        incrementAnalytics({
          games_started_total: 1,
          games_started_online_random_created: 1,
          [`online_game_mode_${modeKey}`]: 1,
        });

        logGameEvent("game_starts", gameId, "auto_bot_created");

        setupGameUI(gameId, { keepLobbyPresence: true });
        esconderLoading();
      });
  }, delayInicial + 800);
}

function reclaimHost(gameId) {
  if (!gameId || !myPlayerId) return;

  database.ref(`games/${gameId}`).once("value", (snap) => {
    const gameData = snap.val();
    if (!gameData) return;

    const previousHostId = gameData.previousHostId;
    const hostTransferredAt = gameData.hostTransferredAt || 0;
    const elapsed = Date.now() - hostTransferredAt;

    if (previousHostId !== myPlayerId || elapsed > RECONNECTION_GRACE_PERIOD_MS) return;

    database.ref(`games/${gameId}/players`).transaction((players) => {
      if (!players) return players;

      const currentHost = Object.entries(players).find(([, p]) => p && p.host === true && p.id !== myPlayerId);

      if (currentHost) {
        players[currentHost[0]].host = null;
      }

      if (players[myPlayerId]) {
        players[myPlayerId].host = true;
      }

      return players;
    }).then((result) => {
      if (result.committed) {
        amITheHost = true;
        wasHostBeforeDisconnect = false;

        database.ref(`games/${gameId}/previousHostId`).remove();
        database.ref(`games/${gameId}/hostTransferredAt`).remove();

        showToast(translate("hostReclaimedByMe"), { icon: "success", timer: 3000 });

        if (afkCheckInterval) clearInterval(afkCheckInterval);
        afkCheckInterval = setInterval(hostMonitorAfkPlayers, 5000);
      }
    });
  });
}

function attemptHostTransfer(gameId) {
  if (!gameId || !currentGameDataState.players) return;

  const playerList = Object.values(currentGameDataState.players);
  const activeHost = playerList.find((p) => p && p.host === true && p.online === true);
  if (activeHost) return;

  const candidates = playerList.filter((p) => p && p.online === true && !p.isBot);
  if (candidates.length === 0) return;

  candidates.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const newHostCandidate = candidates[0];

  if (newHostCandidate.id === myPlayerId && !amITheHost) {
    amITheHost = true;

    const oldHost = playerList.find((p) => p && p.host === true && p.id !== myPlayerId);
    const updates = {};
    if (oldHost) {
      updates[`games/${gameId}/players/${oldHost.id}/host`] = null;
    }
    updates[`games/${gameId}/players/${myPlayerId}/host`] = true;
    updates[`games/${gameId}/hostTransferredAt`] = firebase.database.ServerValue.TIMESTAMP;
    updates[`games/${gameId}/previousHostId`] = oldHost ? oldHost.id : null;

    database.ref().update(updates)
      .then(() => {
        showToast(translate("youAreNewHost"), { icon: "info", timer: 4000 });
      });

    if (afkCheckInterval) clearInterval(afkCheckInterval);
    afkCheckInterval = setInterval(hostMonitorAfkPlayers, 5000);

    setTimeout(() => {
      checkAndSkipStuckTurn(currentGameDataState);
    }, 1500);
  }
}

function hostMonitorAfkPlayers() {
  if (
    !amITheHost ||
    !currentGameId ||
    !currentGameDataState ||
    currentGameDataState.gameState !== "playing"
  )
    return;

  const now = Date.now();
  const players = currentGameDataState.players || {};
  let needsUpdate = false;
  let playerToConvert = null;

  Object.values(players).forEach((player) => {
    if (!player.isBot && player.online === false && player.disconnectedAt) {
      if (now - player.disconnectedAt > BOT_TAKEOVER_DELAY_MS) {
        playerToConvert = player.id;
        needsUpdate = true;
      }
    }
  });

  if (needsUpdate && playerToConvert) {
    isKickingPlayer = true;
    database
      .ref("games/" + currentGameId)
      .transaction((gameData) => {
        if (!gameData) return;
        if (
          !gameData.players ||
          !gameData.players[playerToConvert]
        )
          return;

        const p = gameData.players[playerToConvert];

        if (!p.isBot && p.online === false) {
          p.isBot = true;
          p.isTempBot = true;
          p.online = true;
          p.disconnectedAt = null;

          gameData.gameMessage = {
            key: "botTakeover",
            params: { playerName: p.name },
          };
        }
        return gameData;
      })
      .then((result) => {
        isKickingPlayer = false;

        if (result.committed) {
          const updatedGameData = result.snapshot.val();
          const currentPlayerId =
            updatedGameData.turnOrder[updatedGameData.currentPlayerIndex];

          if (currentPlayerId === playerToConvert) {
            const botPlayer = updatedGameData.players[playerToConvert];

            setTimeout(() => {
              executeBotTurnAsHost(updatedGameData, botPlayer);
            }, 2500);
          }
        }
      })
      .catch(() => {
        console.error("Erro no takeover do bot:", error);
        isKickingPlayer = false;
      });
  }
}

function addPlayerToGame(gameId, playerId) {
  const gameRef = database.ref("games/" + gameId);
  myPlayerId = playerId;
  gameRef
    .transaction((gameData) => {
      if (gameData) {
        if (!gameData.players) gameData.players = {};

        gameData.players[playerId] = {
          id: playerId,
          name: myPlayerName,
          deviceId: getDeviceId(),
          uid: currentUser ? currentUser.uid : null,
          rankingPoints: userProfile?.stats?.points || 0,
          rank: userProfile?.stats?.rank || null,
          avatar: selectedAvatarId,
          teamId: null,
          hand: [],
          online: true,
          host: playerId === "player1",
        };

        const currentPlayers = Object.keys(gameData.players).length;
        gameData.gameMessage = {
          key: "choosingTeams",
          params: { current: currentPlayers, capacity: gameData.capacity },
        };
      }
      return gameData;
    })
    .then(() => {
      setupGameUI(gameId);
    })
    .catch((error) => {
      showToast(translate("errors.addPlayer"), {
        icon: "error",
      });
      esconderLoading();
    });
}

function setupGameUI(gameId, options) {
  mostrarLoading();
  currentGameId = gameId;
  if (!options?.keepLobbyPresence) {
    leaveLobbyPresence();
  }

  if (currentUser) {
    if (!options?.keepLobbyPresence) {
      database.ref(`users/${currentUser.uid}/status`).set("playing");
    }
    database.ref(`users/${currentUser.uid}/currentGameId`).set(gameId);
  }

  initializeBoard();

  if (!isLocalGame) {
    const gameDataToStore = {
      gameId: gameId,
      playerId: myPlayerId,
      playerName: myPlayerName,
    };
    localStorage.setItem("sequenceGameData", JSON.stringify(gameDataToStore));
    const newUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname +
      "?game=" +
      gameId;
    window.history.pushState({ path: newUrl }, "", newUrl);

    const entrarNaSala = () => {
      $("#lobby").hide();
      $(".chat-btn-container").show();
      $(".game-id-text").text(gameId);
      $(".persistent-game-info").show();
      $("#hint-btn").hide()
      $(".mobile-chat-btn").addClass("show");
    };

    if (document.startViewTransition) {
      document.startViewTransition(entrarNaSala);
    } else {
      entrarNaSala();
    }

    listenToGameUpdates(gameId);
    listenToSpectators(gameId);
    setupPresenceSystem();
    loadSessionHistoryBadge();
  } else {
    const entrarOffline = () => {
      $("#lobby").hide();
      $(".game-id-text").text(translate("practice"));
      $(".copy-id-btn").hide();
      $(".chat-btn-container").hide();
      $(".mobile-chat-btn").removeClass("show").hide();
      $(".spectator-count-btn").hide();
      $(".persistent-game-info").show();
      $("#game-container").show();
    };

    if (document.startViewTransition) {
      document.startViewTransition(entrarOffline);
    } else {
      entrarOffline();
    }
  }
}

function listenToGameUpdates(gameId) {
  const gameRef = database.ref("games/" + gameId);
  isInitialLoad = true;

  if (afkCheckInterval) clearInterval(afkCheckInterval);

  gameRef.off();

  gameRef.on("value", () => {});

  gameRef.once("value", (initialSnapshot) => {
    let gameData = initialSnapshot.val();
    if (!gameData) {
      showToast(translate("gameExpired"), {
        title: translate("game.endedTitle"),
        icon: "warning",
        timer: 5000,
      });
      localStorage.removeItem("sequenceGameData");
      window.history.pushState({}, "", window.location.pathname);
      setTimeout(() => window.location.reload(), 4000);
      return;
    }

    if (!gameData.players || !gameData.players[myPlayerId]) {
      Swal.fire({
        title: translate("kickedTitle"),
        text: translate("kickedText"),
        icon: "error",
        confirmButtonText: "OK",
        allowOutsideClick: false,
      }).then(() => {
        localStorage.removeItem("sequenceGameData");
        window.location.href = window.location.pathname;
      });
      return;
    }

    const myInitialPlayer = gameData.players
      ? gameData.players[myPlayerId]
      : null;
    if (myInitialPlayer && myInitialPlayer.host) {
      amITheHost = true;
    }

    if (amITheHost && gameData.gameState === "team-selection") {
      hostCleanupGhostPlayers(gameData);
    }

    currentGameDataState = gameData;
    previousGameData = JSON.parse(JSON.stringify(gameData));

    if (gameData.gameState === "team-selection") {
      renderTeamSelectionUI(gameData);
    } else {
      $("#team-selection-modal").hide();
      $("#game-container").show();
      renderAll(gameData);
      if (typeof animarFichasExistentes === "function") animarFichasExistentes();
      if (typeof animarMontarPilha === "function") animarMontarPilha(500);
      manageTurnState(gameData);

      if (gameData.gameState === "ended") {
        Swal.fire({
          title: translate("matchFinished"),
          text: translate("rematchRejectedInfo"),
          icon: "info",
          allowEscapeKey: false,
          allowOutsideClick: false,
          confirmButtonText: "OK",
        }).then(() => {
          localStorage.removeItem("sequenceGameData");
          window.location.href = window.location.pathname;
        });
      }
    }
    esconderLoading();

    if (amITheHost) {
      afkCheckInterval = setInterval(hostMonitorAfkPlayers, 5000);
    }

    const turnListener = (snapshot) => {
      const key = snapshot.key;
      const value = snapshot.val();
      const previousGameState = currentGameDataState.gameState;
      const previousPlayerIndex = previousGameData.currentPlayerIndex;

      currentGameDataState[key] = value;

      if (key === "gameState" && value === "team-selection") {
        Swal.close();
        $("#game-container").hide();
        renderTeamSelectionUI(currentGameDataState);
        if (amITheHost) hostCleanupGhostPlayers(currentGameDataState);
      }

      if (key === "gameState") {
        if (value === "playing" && amITheHost) {
          if (!afkCheckInterval)
            afkCheckInterval = setInterval(hostMonitorAfkPlayers, 5000);
        } else if (value !== "playing") {
          if (afkCheckInterval) {
            clearInterval(afkCheckInterval);
            afkCheckInterval = null;
          }
        }
      }

      if (
        key === "gameState" &&
        value === "playing" &&
        (previousGameState === "team-selection" ||
          previousGameState === "finished")
      ) {
        Swal.close();

        database.ref("games/" + currentGameId).once("value", (gameSnapshot) => {
          const fullGameData = gameSnapshot.val();
          if (!fullGameData) return;

          currentGameDataState = fullGameData;
          previousGameData = JSON.parse(JSON.stringify(fullGameData));

          $("#team-selection-modal").hide();
          $("#game-container").show();
          renderAll(currentGameDataState);

          if (previousGameState === "team-selection" && typeof animarDistribuicao === "function") {
            const playerCount = fullGameData.playerCount || fullGameData.turnOrder.length;
            const cardsInHand = CARDS_PER_PLAYER[playerCount] || 6;
            const totalCardsDealt = cardsInHand * playerCount;
            animarDistribuicao(cardsInHand, totalCardsDealt, () => {
              if (typeof animarMontarPilha === "function") animarMontarPilha(0);
              manageTurnState(currentGameDataState);
            });
          } else {
            if (typeof animarMontarPilha === "function") animarMontarPilha(0);
            manageTurnState(currentGameDataState);
          }

          const currentPlayerIndex = fullGameData.currentPlayerIndex;
          const currentPlayer =
            fullGameData.players[fullGameData.turnOrder[currentPlayerIndex]];

          if (amITheHost && currentPlayer && currentPlayer.isBot) {
            const delay = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500;
            setTimeout(() => {
              executeBotTurnAsHost(fullGameData, currentPlayer);
            }, delay);
          }
        });
        return;
      }

      if (
        key === "currentPlayerIndex" &&
        !isInitialLoad &&
        previousGameData.turnOrder &&
        currentGameDataState.turnOrder
      ) {
        const isMyTurnNow =
          currentGameDataState.turnOrder[value] === myPlayerId;
        const wasMyTurnBefore =
          previousGameData.turnOrder[previousPlayerIndex] === myPlayerId;
        if (isMyTurnNow && !wasMyTurnBefore) {
          playFeedback("myTurn", true);

          const myHand = currentGameDataState.players[myPlayerId]?.hand || [];
          renderPlayerHand(
            myHand,
            currentGameDataState.gameState,
            null,
            currentGameDataState,
            true,
          );
        }
      }

      updateGameInfo(currentGameDataState);
      manageTurnState(currentGameDataState);

      if (
        !currentGameDataState.players ||
        !currentGameDataState.turnOrder ||
        currentGameDataState.turnOrder.length === 0
      ) {
        return;
      }

      const currentPlayerIndex = currentGameDataState.currentPlayerIndex;
      const currentPlayer =
        currentGameDataState.players[
          currentGameDataState.turnOrder[currentPlayerIndex]
        ];

      if (
        amITheHost &&
        currentPlayer &&
        currentPlayer.isBot &&
        currentGameDataState.gameState === "playing" &&
        currentGameDataState.turnState === "playing"
      ) {
        const delay = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500;
        setTimeout(() => {
          const latestCurrentPlayerIndex =
            currentGameDataState.currentPlayerIndex;
          if (latestCurrentPlayerIndex === currentPlayerIndex) {
            executeBotTurnAsHost(currentGameDataState, currentPlayer);
          }
        }, delay);
      }

      if (
        amITheHost &&
        currentPlayer &&
        !currentPlayer.isBot &&
        currentPlayer.online === false &&
        (currentPlayer.uid || currentPlayer.deviceId) &&
        currentGameDataState.gameState === "playing" &&
        currentGameDataState.turnState === "playing"
      ) {
        const turnCounter = currentGameDataState.turnCounter || 0;
        const lastNotifTurn = currentGameDataState.lastNotificationTurn || -1;
        if (turnCounter !== lastNotifTurn) {
          database.ref(`games/${currentGameId}/lastNotificationTurn`).set(turnCounter);
          const notifTarget = currentPlayer.uid || currentPlayer.deviceId;
          database.ref(`turn_notifications/${notifTarget}`).push({
            gameId: currentGameId,
            deviceId: currentPlayer.deviceId || null,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          });
        }
      }

      if (
        key === "gameState" &&
        value === "finished" &&
        previousGameState !== "finished"
      ) {
        handleGameFinished();
      }

      if (key === "gameState" && value === "ended") {
        Swal.fire({
          title: translate("matchFinished"),
          text: translate("rematchRejectedInfo"),
          icon: "info",
          timer: 4000,
          allowEscapeKey: false,
          allowOutsideClick: false,
        }).then(() => {
          localStorage.removeItem("sequenceGameData");
          window.location.href = window.location.pathname;
        });
      }

      previousGameData[key] = value;
    };

    gameRef.child("boardState").on("value", (snapshot) => {
      if (!snapshot.val()) return;
      const newBoardState = snapshot.val();
      const oldBoardState = currentGameDataState.boardState || {};

      if (typeof animarFichaOponente === "function" && currentGameDataState.teams && isAnimationsEnabled()) {
        const newSlot = detectarNovaFicha(oldBoardState, newBoardState);
        if (newSlot && newSlot.teamId !== myTeamId) {
          const slotKey = `${newSlot.row}_${newSlot.col}`;
          const teamColor = currentGameDataState.teams[newSlot.teamId]?.color || "blue";
          const numTeams = currentGameDataState.numTeams || 2;
          const slotEl = document.querySelector(
            `.card-slot[data-row="${newSlot.row}"][data-col="${newSlot.col}"]`
          );
          if (slotEl) {
            const currentIdx = currentGameDataState.currentPlayerIndex || 0;
            const whoPlayed = currentGameDataState.turnOrder
              ? currentGameDataState.turnOrder[currentIdx]
              : null;
            animatingCells.add(slotKey);
            animarFichaOponente(slotEl, teamColor, newSlot.teamId, numTeams, whoPlayed, () => {
              animatingCells.delete(slotKey);
              renderBoard(currentGameDataState);
              processPendingSequence(slotKey);
            });
          }
        }

        const removedSlot = detectarFichaRemovida(oldBoardState, newBoardState);
        if (removedSlot) {
          const removedColor = currentGameDataState.teams[removedSlot.teamId]?.color || "red";
          const slotEl = document.querySelector(
            `.card-slot[data-row="${removedSlot.row}"][data-col="${removedSlot.col}"]`
          );
          if (slotEl) {
            if (removedSlot.teamId === myTeamId) {
              animarDevolucaoParaPilha(slotEl, removedColor);
            } else {
              const numTeams = currentGameDataState.numTeams || 2;
              animarRemocaoFicha(slotEl, removedColor, removedSlot.teamId, numTeams);
            }
          }
        }
      }

      currentGameDataState.boardState = newBoardState;
      renderBoard(currentGameDataState);
    });

    gameRef.child("lockedChips").on("value", (snapshot) => {
      const newLockedChips = snapshot.val() || {};
      const oldLockedChips = currentGameDataState.lockedChips || {};

      const newlyLocked = [];
      Object.keys(newLockedChips).forEach(key => {
        if (!oldLockedChips[key]) newlyLocked.push(key);
      });

      currentGameDataState.lockedChips = newLockedChips;

      if (newlyLocked.length > 0) {
        const firstKey = newlyLocked[0];
        const boardState = currentGameDataState.boardState || {};
        const chipTeam = boardState[firstKey];
        const isMySequence = chipTeam === myTeamId;

        const stillAnimating = newlyLocked.some(key => animatingCells.has(key));
        if (stillAnimating) {
          pendingSequenceCells = newlyLocked;
          pendingSequenceIsMine = isMySequence;
          renderBoard(currentGameDataState);
        } else {
          renderBoard(currentGameDataState);
          celebrateSequenceForCells(newlyLocked, isMySequence);
        }
      } else {
        renderBoard(currentGameDataState);
      }
    });

    gameRef.child(`players/${myPlayerId}/hand`).on("value", (snapshot) => {
      if (currentGameDataState.gameState === "team-selection") {
        return;
      }
      const newHand = snapshot.val() || [];
      const oldHand = currentGameDataState.players?.[myPlayerId]?.hand || [];

      let newlyDrawnCard = null;

      const oldCardCounts = oldHand.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
      }, {});

      for (const card of newHand) {
        if (!oldCardCounts[card] || oldCardCounts[card] === 0) {
          newlyDrawnCard = card;
          break;
        } else {
          oldCardCounts[card]--;
        }
      }

      if (
        currentGameDataState.players &&
        currentGameDataState.players[myPlayerId]
      ) {
        currentGameDataState.players[myPlayerId].hand = newHand;
      }

      if (handAnimationLocked) {
        if (newlyDrawnCard && typeof animarCompraCarta === "function" && isAnimationsEnabled()) {
          const drawDelay = animatingCells.size > 0 ? 900 : 200;
          setTimeout(() => {
            if (!handAnimationLocked) return;
            $("#player-hand").children().filter(function() {
              return this.style.opacity === '0';
            }).remove();
            animarCompraCarta(newlyDrawnCard, () => {
              handAnimationLocked = false;
              const isMyTurnAfter = currentGameDataState.turnOrder &&
                currentGameDataState.turnOrder[currentGameDataState.currentPlayerIndex] === myPlayerId;
              renderPlayerHand(newHand, currentGameDataState.gameState, newlyDrawnCard, currentGameDataState, isMyTurnAfter);
            });
          }, drawDelay);
        }
        return;
      }

      const isMyTurn =
        currentGameDataState.turnOrder &&
        currentGameDataState.turnOrder[
          currentGameDataState.currentPlayerIndex
        ] === myPlayerId;

      if (newlyDrawnCard && typeof animarCompraCarta === "function" && isAnimationsEnabled()) {
        setTimeout(() => {
          animarCompraCarta(newlyDrawnCard, () => {
            renderPlayerHand(
              newHand,
              currentGameDataState.gameState,
              newlyDrawnCard,
              currentGameDataState,
              isMyTurn,
            );
          });
        }, 700);
      } else {
        const renderDelay = newlyDrawnCard ? 500 : 0;
        setTimeout(() => {
          renderPlayerHand(
            newHand,
            currentGameDataState.gameState,
            newlyDrawnCard,
            currentGameDataState,
            isMyTurn,
          );
        }, renderDelay);
      }
    });

    gameRef.child("settings").on("value", (snapshot) => {
      const newSettings = snapshot.val();
      if (!newSettings) return;

      const oldSettings = currentGameDataState.settings || {};
      currentGameDataState.settings = newSettings;

      if (currentGameDataState.gameState === "team-selection") {
        $("#host-settings-btn")
          .off("click")
          .on("click", () =>
            openHostSettingsModal(
              currentGameDataState.settings,
              currentGameDataState.isPrivate,
              currentGameDataState.password,
            ),
          );
      }

      if (!amITheHost && !isInitialLoad && Object.keys(oldSettings).length > 0) {
        const changes = [];
        if (oldSettings.autoDraw !== newSettings.autoDraw) {
          changes.push(translate(newSettings.autoDraw ? "hostSettingsChanged.autoDrawOn" : "hostSettingsChanged.autoDrawOff"));
        }
        if (oldSettings.reshuffleOnEmpty !== newSettings.reshuffleOnEmpty) {
          changes.push(translate(newSettings.reshuffleOnEmpty ? "hostSettingsChanged.reshuffleOn" : "hostSettingsChanged.reshuffleOff"));
        }
        if (oldSettings.useTurnTimer !== newSettings.useTurnTimer) {
          changes.push(translate(newSettings.useTurnTimer ? "hostSettingsChanged.timerOn" : "hostSettingsChanged.timerOff", { duration: newSettings.turnDuration }));
        } else if (newSettings.useTurnTimer && oldSettings.turnDuration !== newSettings.turnDuration) {
          changes.push(translate("hostSettingsChanged.timerChanged", { duration: newSettings.turnDuration }));
        }
        if (changes.length > 0) {
          showToast(changes.join("<br>"), { icon: "info", timer: 4000 });
        }
      }

      if (currentGameDataState.gameState === "playing") {
        const timerChanged = oldSettings.useTurnTimer !== newSettings.useTurnTimer ||
          oldSettings.turnDuration !== newSettings.turnDuration;
        if (timerChanged) {
          clearInterval(turnInterval);
          $("#turn-timer-container").hide();
          $(".timer-badge").removeClass("timer-urgent");

          if (newSettings.useTurnTimer) {
            $("#turn-timer-container").css("display", "flex");
            const turnStart = currentGameDataState.turnStartTimestamp || Date.now();
            const durationMs = newSettings.turnDuration * 1000;

            const updateTimer = () => {
              const elapsed = Date.now() - turnStart;
              const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
              const $timerVal = $("#turn-timer-value");
              $timerVal.text(remaining + "s");
              if (remaining <= 5) $timerVal.css("color", "#e74c3c");
              else if (remaining <= 10) $timerVal.css("color", "#f1c40f");
              else $timerVal.css("color", "#fff");
              if (remaining <= 3) $(".timer-badge").addClass("timer-urgent");
              else $(".timer-badge").removeClass("timer-urgent");
              if (remaining === 0) {
                clearInterval(turnInterval);
                handleTurnTimeout(currentGameDataState);
              }
            };
            updateTimer();
            turnInterval = setInterval(updateTimer, 1000);
          }
        }

        if (!oldSettings.autoDraw && newSettings.autoDraw && currentGameDataState.turnState === "drawing") {
          const isMyTurn = currentGameDataState.turnOrder &&
            currentGameDataState.turnOrder[currentGameDataState.currentPlayerIndex] === myPlayerId;
          if (isMyTurn) {
            clearTimeout(drawTimer);
            clearInterval(drawCountdownInterval);
            $(".draw-countdown").hide();
            $("#deck-pile").removeClass("awaiting-draw");
            endTurnAndAdvance(false);
          }
        }
      }
    });

    gameRef.child("currentPlayerIndex").on("value", turnListener);
    gameRef.child("turnState").on("value", turnListener);
    gameRef.child("gameState").on("value", turnListener);
    gameRef.child("gameMessage").on("value", turnListener);

    gameRef.child("chat").on("value", (snapshot) => {
      const chatData = snapshot.val() || {};
      currentGameDataState.chat = chatData;
      updateChatNotification(currentGameDataState);
      renderChat(
        chatData,
        currentGameDataState.players,
        currentGameDataState.teams,
      );
    });

    let lastActionPlayerIndex = null;

    const pileListener = (snapshot) => {
      const oldPile = currentGameDataState[snapshot.key] || [];
      currentGameDataState[snapshot.key] = snapshot.val() || [];

      if (snapshot.key === 'discardPile') {
        const newPile = currentGameDataState.discardPile || [];
        const isNewCard = newPile.length > oldPile.length;
        const lastCard = newPile.length > 0 ? newPile[newPile.length - 1] : null;
        const prevIdx = previousGameData.currentPlayerIndex ?? currentGameDataState.currentPlayerIndex ?? 0;
        const isMyDiscardByIndex = currentGameDataState.turnOrder &&
          currentGameDataState.turnOrder[prevIdx] === myPlayerId;
        const isMyDiscardByTimestamp = myLastDiscardTimestamp > 0 && (Date.now() - myLastDiscardTimestamp) < 3000;
        const isMyDiscard = isMyDiscardByIndex || isMyDiscardByTimestamp;

        if (isNewCard) lastActionPlayerIndex = prevIdx;

        if (isNewCard && isMyDiscardByTimestamp) {
          myLastDiscardTimestamp = 0;
        }

        if (isNewCard && lastCard && !isMyDiscard && typeof animarDescarte === "function") {
          const turnOrder = currentGameDataState.turnOrder || [];
          const currentIdx = prevIdx;
          const playerId = turnOrder[currentIdx];
          const myIdx = turnOrder.indexOf(myPlayerId);
          const numTeams = currentGameDataState.numTeams || 2;
          const player = currentGameDataState.players?.[playerId];
          const teamId = player ? player.teamId : 'team2';

          let direcao = 'top', subIdx = 0, totalLado = 1;
          if (myIdx >= 0 && currentIdx >= 0 && typeof getPosicaoParaJogador === 'function') {
            direcao = getPosicaoParaJogador(currentIdx, myIdx, turnOrder.length, numTeams, teamId, myTeamId);
            const sub = typeof getSubPosicao === 'function' ? getSubPosicao(currentIdx, myIdx, turnOrder.length) : { subIndex: 0, totalNoLado: 1 };
            subIdx = sub.subIndex; totalLado = sub.totalNoLado;
          }
          const origem = typeof getOrigemPorDirecao === 'function' ? getOrigemPorDirecao(direcao, null, subIdx, totalLado) : { x: window.innerWidth / 2, y: -20 };
          animarDescarte(null, { top: origem.y, left: origem.x, width: 28, height: 50 }, lastCard);
        }
        const randomDelay = Math.random() > 0.5 ? 200 : 400;
        setTimeout(() => updateGameInfo(currentGameDataState), randomDelay);

      } else if (snapshot.key === 'deck') {
        const newDeck = currentGameDataState.deck || [];
        const oldDeckLen = Array.isArray(oldPile) ? oldPile.length : 0;
        const deckDiminuiu = newDeck.length < oldDeckLen;
        const deckCresceu = newDeck.length > oldDeckLen && oldDeckLen === 0;
        const drawIdx = lastActionPlayerIndex ?? previousGameData.currentPlayerIndex ?? currentGameDataState.currentPlayerIndex ?? 0;
        const isMyDraw = currentGameDataState.turnOrder &&
          currentGameDataState.turnOrder[drawIdx] === myPlayerId;

        if (deckCresceu && typeof animarReembaralhar === "function") {
          animarReembaralhar(newDeck.length);
        } else if (deckDiminuiu && !isMyDraw && isAnimationsEnabled()) {
          const turnOrder = currentGameDataState.turnOrder || [];
          const currentIdx = drawIdx;
          const playerId = turnOrder[currentIdx];
          const myIdx = turnOrder.indexOf(myPlayerId);
          const numTeams = currentGameDataState.numTeams || 2;
          const player = currentGameDataState.players?.[playerId];
          const teamId = player ? player.teamId : 'team2';

          let direcao = 'top', subIdx = 0, totalLado = 1;
          if (myIdx >= 0 && currentIdx >= 0 && typeof getPosicaoParaJogador === 'function') {
            direcao = getPosicaoParaJogador(currentIdx, myIdx, turnOrder.length, numTeams, teamId, myTeamId);
            const sub = typeof getSubPosicao === 'function' ? getSubPosicao(currentIdx, myIdx, turnOrder.length) : { subIndex: 0, totalNoLado: 1 };
            subIdx = sub.subIndex; totalLado = sub.totalNoLado;
          }
          const destino = typeof getOrigemPorDirecao === 'function' ? getOrigemPorDirecao(direcao, null, subIdx, totalLado) : { x: window.innerWidth / 2, y: -20 };

          const deck = document.getElementById('deck-pile');
          if (deck) {
            const deckRect = deck.getBoundingClientRect();
            const fantasma = document.createElement('div');
            Object.assign(fantasma.style, {
              position: 'fixed', top: `${deckRect.top}px`, left: `${deckRect.left}px`,
              width: `${deckRect.width}px`, height: `${deckRect.height}px`,
              zIndex: '9998', pointerEvents: 'none', transition: 'all 0.75s cubic-bezier(0.25, 1, 0.5, 1)',
              opacity: '1', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', margin: '0',
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)', border: '2px solid white',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            });
            fantasma.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:7px;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:1px 3px;border-radius:3px;">ROW 5</span>`;
            document.body.appendChild(fantasma);
            requestAnimationFrame(() => { fantasma.style.top = `${destino.y}px`; fantasma.style.left = `${destino.x}px`; });
            fantasma.addEventListener('transitionend', () => fantasma.remove(), { once: true });
            setTimeout(() => { if (document.body.contains(fantasma)) fantasma.remove(); }, 850);
          }
        }
        updateGameInfo(currentGameDataState);
      } else {
        updateGameInfo(currentGameDataState);
      }
    };
    gameRef.child("deck").on("value", pileListener);
    gameRef.child("discardPile").on("value", pileListener);

    gameRef.child("teams").on("value", (snapshot) => {
      const newTeams = snapshot.val();
      if (!newTeams) return;
      if (!isInitialLoad && previousGameData.teams) {
        Object.values(newTeams).forEach((team) => {
          const oldTeam = previousGameData.teams[team.id];
          if (
            oldTeam &&
            (team.sequencesCompleted || 0) > (oldTeam.sequencesCompleted || 0)
          ) {
          }
        });
      }
      currentGameDataState.teams = newTeams;
      if (previousGameData)
        previousGameData.teams = JSON.parse(JSON.stringify(newTeams));

      if (currentGameDataState.gameState === "team-selection") {
        renderTeamSelectionUI(currentGameDataState);
        if (amITheHost) hostCleanupGhostPlayers(currentGameDataState);
      } else {
        updateGameInfo(currentGameDataState);
      }
    });

    gameRef.child("players").on("value", (snapshot) => {
      const newPlayers = snapshot.val();
      if (!newPlayers || !newPlayers[myPlayerId]) {
        if (isLeavingIntentionally) return;

        if (!isReconnecting && !amITheHost) {
          database.ref(`games/${currentGameId}`).once("value", (gameSnap) => {
            const gameData = gameSnap.val();
            if (!gameData) return;

            const myDeviceId = getDeviceId();
            const banned = gameData.bannedDeviceIds || [];
            const isBanned = Array.isArray(banned) ? banned.includes(myDeviceId) : Object.values(banned).includes(myDeviceId);

            if (gameData.gameState === "playing" && !isBanned) {
              if (isSpectator) return;
              gameRef.off();
              isSpectator = true;
              myPlayerId = null;
              if (currentUser) {
                database.ref(`games/${currentGameId}/spectators/${currentUser.uid}`).set({
                  username: userProfile?.username || myPlayerName,
                  avatar: selectedAvatarId,
                  joinedAt: firebase.database.ServerValue.TIMESTAMP,
                });
                database.ref(`games/${currentGameId}/spectators/${currentUser.uid}`).onDisconnect().remove();
              }
              applySpectatorRestrictions();
              showToast(translate("spectator.nowSpectating"), { icon: "info", timer: 3000 });
              listenToGameUpdatesAsSpectator(currentGameId);
              return;
            }
            Swal.fire({
              title: translate("kickedTitle"),
              text: translate("kickedText"),
              icon: "error",
              confirmButtonText: "OK",
              allowOutsideClick: false,
            }).then(() => {
              localStorage.removeItem("sequenceGameData");
              window.location.href = window.location.pathname;
            });
            gameRef.off();
          });
          return;
        }
      }

      if (!newPlayers) return;

      if (previousGameData && previousGameData.players) {
        handlePlayerConnectionChanges(
          { players: newPlayers },
          previousGameData,
        );
      }

      const playerList = Object.values(newPlayers);
      const activeHost = playerList.find((p) => p && p.host === true && p.online === true);

      if (!activeHost) {
        const hostPlayer = playerList.find((p) => p && p.host === true);
        const hostDisconnectedAt = hostPlayer?.disconnectedAt || 0;
        const elapsed = Date.now() - hostDisconnectedAt;

        if (elapsed < RECONNECTION_GRACE_PERIOD_MS) {
          if (!hostTransferTimeout) {
            const remaining = RECONNECTION_GRACE_PERIOD_MS - elapsed;
            hostTransferTimeout = setTimeout(() => {
              hostTransferTimeout = null;
              attemptHostTransfer(currentGameId);
            }, remaining);
          }
        } else {
          if (hostTransferTimeout) { clearTimeout(hostTransferTimeout); hostTransferTimeout = null; }
          attemptHostTransfer(currentGameId);
        }
      } else {
        if (hostTransferTimeout) { clearTimeout(hostTransferTimeout); hostTransferTimeout = null; }
        if (amITheHost && activeHost.id !== myPlayerId) {
          amITheHost = false;
          if (afkCheckInterval) { clearInterval(afkCheckInterval); afkCheckInterval = null; }
          showToast(translate("hostReclaimed"), { icon: "info", timer: 3000 });
        }
      }

      currentGameDataState.players = newPlayers;
      previousGameData.players = JSON.parse(JSON.stringify(newPlayers));

      if (currentGameDataState.gameState === "team-selection") {
        renderTeamSelectionUI(currentGameDataState);
        if (amITheHost) hostCleanupGhostPlayers(currentGameDataState);
      }

      if (currentGameDataState.gameState === "playing") {
        updateGameInfo(currentGameDataState);
      }
    });

    gameRef.child("rematchVotes").on("value", (snapshot) => {
      const votes = snapshot.val();
      currentGameDataState.rematchVotes = votes || {};

      const isSmallScreen = window.innerWidth < 500;
      const position = isSmallScreen ? "top" : "center";

      if (currentGameDataState.gameState === "finished") {
        const myVote = votes ? votes[myPlayerId] : null;

        if (!myVote) {
          if (
            !Swal.isVisible() &&
            !document.querySelector(".swal2-container")
          ) {
            promptRematchVote(currentGameDataState);
          }
        } else {
          const isWaitingModalOpen =
            Swal.isVisible() &&
            Swal.getTitle() &&
            Swal.getTitle().innerText === translate("waitingForOthers");

          if (!isWaitingModalOpen) {
            Swal.fire({
              title: translate("waitingForOthers"),
              text: translate("waitingForRematchVotes"),
              icon: "info",
              allowEscapeKey: false,
              allowOutsideClick: false,
              showConfirmButton: false,
              toast: false,
              position: position,
              customClass: {
                container: 'swal-vote'
              },
              didOpen: () => {
                Swal.showLoading();
              },
            });
          }
        }
      }

      if (
        !amITheHost ||
        !votes ||
        currentGameDataState.gameState !== "finished" ||
        isResettingGame
      )
        return;

      const totalPlayers = Object.keys(
        currentGameDataState.players || {},
      ).length;
      const totalVotes = Object.keys(votes).length;
      const hasRejection = Object.values(votes).some((v) => v === "no");

      if (hasRejection) {
        database.ref("games/" + currentGameId).update({
          gameState: "ended",
          gameMessage: { key: "rematchRejected" },
        });
        return;
      }

      if (totalVotes === totalPlayers) {
        const allYes = Object.values(votes).every((v) => v === "yes");
        if (allYes) {
          isResettingGame = true;
          const doReset = () => {
            if (currentGameDataState.isAutoGenerated) {
              resetAndRestartAutoGeneratedGame()
                .catch(() => { isResettingGame = false; });
            } else {
              resetForRematchSelection()
                .catch(() => { isResettingGame = false; });
            }
          };


          showInterstitialAd('rematch-game', () => {
            if (document.startViewTransition) {
              document.startViewTransition(doReset);
            } else {
              doReset();
            }
          });
        }
      }
    });

    gameRef.child("isPrivate").on("value", (snapshot) => {
      const isPrivate = snapshot.val();
      const wasPrivate = currentGameDataState?.isPrivate;
      if (currentGameDataState) currentGameDataState.isPrivate = isPrivate;

      updatePrivacyToggleUI(isPrivate);

      const privateRoomTooltip = translate("privateRoomTooltip");
      const gameIdDisplay = isPrivate
        ? `${currentGameId} <i class="fas fa-lock" title="${privateRoomTooltip}"></i>`
        : currentGameId;
      $(".game-id-text").html(gameIdDisplay);

      if (!amITheHost && !isInitialLoad && wasPrivate !== undefined && wasPrivate !== isPrivate) {
        const msgKey = isPrivate ? "roomMadePrivate" : "roomMadePublic";
        showToast(translate(msgKey), { icon: "info", timer: 3000 });
      }
    });

    isInitialLoad = false;
  });
}

function checkAndSkipStuckTurn(gameData) {
  if (!gameData || gameData.gameState !== 'playing' || !gameData.turnOrder) return;
  
  const currentPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
  if (!gameData.players) return;

  const currentPlayer = gameData.players[currentPlayerId];
  
  if (!currentPlayer || currentPlayer.online === false) {
    if (currentPlayer && currentPlayer.isBot) {
      const botDelay = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500;
      setTimeout(() => executeBotTurnAsHost(gameData, currentPlayer), botDelay);
    } else {
      endTurnAndAdvance(true); 
    }
  }
}

function handleGameFinished() {
  if (amITheHost) {
    incrementAnalytics({
      games_finished: 1,
      games_finished_online: 1,
    });
  }

  incrementGamesPlayedCount();

  database.ref("games/" + currentGameId).once("value", (snapshot) => {
    const finalGameData = snapshot.val();
    if (!finalGameData) return;

    const winnerTeamId = finalGameData.winner;
    const myTeamId = finalGameData.players[myPlayerId]?.teamId;
    const hasOnlyBots = Object.values(finalGameData.players).every(
      (p) => p.id === myPlayerId || p.isBot
    );

    if (typeof updateUserStats === "function" && currentUser && userProfile) {
      let result = "draw";
      if (winnerTeamId === myTeamId) result = "win";
      else if (winnerTeamId && winnerTeamId !== myTeamId) result = "loss";
      const isTeamGame = finalGameData.playerCount / finalGameData.numTeams > 1;

      let opponentPoints = null;
      if (!isTeamGame) {
        const opponents = Object.values(finalGameData.players).filter(
          (p) => p.id !== myPlayerId && !p.isBot && p.uid
        );
        if (opponents.length > 0) {
          const maxOpponentPoints = Math.max(...opponents.map((p) => p.rankingPoints || 0));
          opponentPoints = maxOpponentPoints;
        }
      }

      const mySequences = finalGameData.teams && finalGameData.teams[myTeamId]
        ? (finalGameData.teams[myTeamId].sequencesCompleted || 0)
        : 0;

      updateUserStats(result, hasOnlyBots, isTeamGame, opponentPoints, mySequences);
    }

    if (typeof updateWinLossHistory === "function") {
      let result = "draw";
      if (winnerTeamId === myTeamId) result = "win";
      else if (winnerTeamId && winnerTeamId !== myTeamId) result = "loss";
      updateWinLossHistory(result);
    }

    if (typeof dispararCelebracao === "function") {
      let meuResultado = "draw";
      if (winnerTeamId === myTeamId) meuResultado = "win";
      else if (winnerTeamId && winnerTeamId !== myTeamId) meuResultado = "loss";
      
      const minhaCor = finalGameData.teams && finalGameData.teams[myTeamId]
        ? finalGameData.teams[myTeamId].color
        : "blue";

      setTimeout(() => {
        dispararCelebracao(meuResultado, minhaCor);
        if (meuResultado === "win") playFeedback("winner");
        else if (meuResultado === "loss") playFeedback("defeat");
        else playFeedback("draw");
      }, 3000);
    }

    const isTeamGame = finalGameData.playerCount / finalGameData.numTeams > 1;
    Object.values(finalGameData.players).forEach((player) => {
      if (player.isBot) {
        const botTeamId = player.teamId;
        const humanPlayerName =
          Object.values(finalGameData.players).find((p) => !p.isBot)?.name ||
          translate("general.youPlural");
        setTimeout(
          () => {
            if (winnerTeamId && botTeamId === winnerTeamId) {
              triggerBotChatMessage(player.id, "gameWin", isTeamGame, {}, 0.8);
            } else {
              triggerBotChatMessage(
                player.id,
                "gameLoss",
                isTeamGame,
                { playerName: humanPlayerName },
                0.8,
              );
            }
          },
          500 + Math.random() * 2500,
        );
      }
    });
  });

  $("#board .card-slot").css("pointer-events", "none");
  $("#deck-pile").addClass("disabled");

  database.ref("games/" + currentGameId).once("value", (snapshot) => {
    const finalGameData = snapshot.val();
    if (finalGameData) {
      saveSessionHistory(currentGameId, finalGameData);
      setTimeout(() => promptRematchVote(finalGameData), 3000);
    }
  });
}

function handlePlayerConnectionChanges(gameData, previousGameData) {
  if (
    currentGameDataState.gameState === "finished" ||
    currentGameDataState.gameState === "ended"
  ) {
    return;
  }

  if (!previousGameData || !previousGameData.players) {
    return;
  }

  for (const playerId in gameData.players) {
    if (playerId === myPlayerId) {
      continue;
    }

    const currentPlayerState = gameData.players[playerId];
    const previousPlayerState = previousGameData.players[playerId];

    if (!previousPlayerState) {
      continue;
    }

    const justDisconnected =
      previousPlayerState.online === true &&
      currentPlayerState.online === false;

    const justReconnected =
      previousPlayerState.online === false &&
      currentPlayerState.online === true;

    if (justDisconnected) {
      const playerName = currentPlayerState.name;
      showToast(translate("playerDisconnected", { playerName: playerName }), {
        icon: "warning",
        timer: 4000,
      });
    }

    if (justReconnected) {
      const playerName = currentPlayerState.name;
      if (currentPlayerState.isBot) {
          showToast(translate("botTookOverToast", { playerName: playerName }), {
            icon: "info",
            timer: 4000,
          });
      } else {
          showToast(translate("playerReconnected", { playerName: playerName }), {
            icon: "success",
            timer: 3000,
          });
      }
    }
  }
}

function manageTurnState(gameData) {
  clearTimeout(drawTimer);
  clearInterval(drawCountdownInterval);
  clearInterval(turnInterval);

  const isMyTurn =
    gameData.turnOrder &&
    gameData.turnOrder[gameData.currentPlayerIndex] === myPlayerId;

  if (gameData.gameState === "playing" && isMyTurn) {
    const myData = gameData.players?.[myPlayerId];

    if (!myData.hand || myData.hand.length === 0) {
      console.warn("Mão vazia detectada no turno. Recuperando...");
      forceEmergencyDraw();
      return;
    }

    if (gameData.turnState === "drawing") {
      if (gameData.deck && gameData.deck.length > 0) {
        $("#board .card-slot").css("pointer-events", "none");
        $("#player-hand").addClass("disabled");
        if (gameData.settings?.autoDraw) {
          $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
        } else {
          $("#deck-pile").removeClass("disabled").addClass("awaiting-draw");
          drawTimer = setTimeout(() => endTurnAndAdvance(true), 5000);
          startDrawCountdown(5);
        }
      } else {
        $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
        endTurnAndAdvance(false);
      }
    } else {
      const myPlayer = gameData.players[myPlayerId];
      if (
        !canPlayerPlay(myPlayer, gameData.boardState) &&
        (!gameData.deck || gameData.deck.length === 0)
      ) {
        showToast(translate("noValidMovesDeckEmpty"), {
          icon: "info",
          timer: 4000,
        });
        setTimeout(endTurnAndAdvance, 1500);
      } else {
        $("#player-hand").removeClass("disabled");
      }
      $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
    }
  } else {
    $("#board .card-slot").css("pointer-events", "none");
    $("#player-hand").addClass("disabled");
    $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
    clearHighlights();
  }

  $("#turn-timer-container").hide();

  const settings = gameData.settings || {};

  if (settings.useTurnTimer && gameData.gameState === "playing") {
    $("#turn-timer-container").css("display", "flex");
    const turnStart = gameData.turnStartTimestamp || Date.now();
    const durationMs = settings.turnDuration * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - turnStart;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

      const $timerVal = $("#turn-timer-value");
      $timerVal.text(remaining + "s");

      if (remaining <= 5) $timerVal.css("color", "#e74c3c");
      else if (remaining <= 10) $timerVal.css("color", "#f1c40f");
      else $timerVal.css("color", "#fff");

      if (remaining <= 3) {
        $(".timer-badge").addClass("timer-urgent");
      } else {
        $(".timer-badge").removeClass("timer-urgent");
      }

      if (remaining === 0) {
        clearInterval(turnInterval);
        handleTurnTimeout(gameData);
      }
    };

    updateTimer();
    turnInterval = setInterval(updateTimer, 1000);
  }
}

function forceEmergencyDraw() {
  if (!currentGameId || !myPlayerId) return;

  database
    .ref(`games/${currentGameId}`)
    .transaction((gameData) => {
      if (!gameData) return;
      const player = gameData.players[myPlayerId];
      if (!player) return;

      if (player.hand && player.hand.length > 0) return;

      if (
        (!gameData.deck || gameData.deck.length === 0) &&
        gameData.discardPile &&
        gameData.discardPile.length > 0
      ) {
        reshuffleDiscardPile(gameData);
      }

      const cardsToDeal = CARDS_PER_PLAYER[gameData.playerCount] || 6;

      player.hand = [];
      if (gameData.deck) {
        for (let i = 0; i < cardsToDeal; i++) {
          if (gameData.deck.length > 0) {
            player.hand.push(gameData.deck.pop());
          }
        }
      }

      if (player.hand.length === 0) return;

      return gameData;
    })
    .then((result) => {
      if (result.committed) {
        showToast(translate("handRestored"), {
          icon: "success",
        });
      }
    })
    .catch((error) => {
      console.error("Erro no forceEmergencyDraw:", error);
    });
}

function handleTurnTimeout(gameData) {
  const currentPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
  const isMyTurn = currentPlayerId === myPlayerId;
  const isPlayerOffline = gameData.players[currentPlayerId].online === false;

  if (
    isMyTurn ||
    (amITheHost && isPlayerOffline) ||
    (amITheHost && gameData.players[currentPlayerId].isBot)
  ) {
    if (isMyTurn) {
      showToast(translate("turnSkippedTimeout"), { icon: "warning" });
    }

    incrementAnalytics({ turns_skipped: 1 });
    endTurnAndAdvance(true);
  }
}

function updateChatNotification(gameData) {
  const chatData = gameData.chat || {};
  const currentMessageCount = Object.keys(chatData).length;

  if (isInitialLoad) {
    lastMessageCount = currentMessageCount;
    return;
  }

  if (
    currentMessageCount > lastMessageCount &&
    !$("#chat-container").hasClass("show")
  ) {
    $("#show-chat-btn").addClass("has-new-message");
    $(".mobile-chat-btn").addClass("has-new-message");

    if (!isChatMuted && !hasPlayedNewMessageSound) {
      playFeedback("newMessage");
      hasPlayedNewMessageSound = true;
    }
  }
  lastMessageCount = currentMessageCount;
}

function renderTeamSelectionUI(gameData) {
  const { players, teams, gameId, capacity } = gameData;
  const $modal = $("#team-selection-modal");
  const $teamsContainer = $modal.find("#teams-container");
  const $startGameContainer = $modal.find("#start-game-container").empty();

  const myPlayer = players[myPlayerId];
  if (!myPlayer) return;

  $modal.css("display", "flex").show();
  $modal.find(".game-id-text").text(gameId);

  const onlinePlayersCount = Object.values(players || {}).filter(
    (p) => p && p.online === true,
  ).length;
  $modal
    .find(".player-count-info")
    .html(
      translate("lobby.playersInRoom", {
        current: onlinePlayersCount,
        capacity: capacity || DEFAULT_MAX_PLAYERS,
      }),
    );

  $modal
    .find(".player-count-info")
    .append(
      `<br><small style="font-weight:normal; opacity:0.8;">${translate("lobbyChatHint")}</small>`,
    );

  const isHost = myPlayer && myPlayer.host;

  const unassignedPlayers = Object.values(players).filter(
    (p) => !p.teamId && p.online,
  );
  let unassignedHtml = "";

  if (unassignedPlayers.length > 0) {
    unassignedHtml = `
        <div class="unassigned-container">
            <div class="unassigned-title">${translate("unassignedPlayers")}</div>
            <ul class="unassigned-list">`;

    unassignedPlayers.forEach((p) => {
      let avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${p.avatar || 1}`;

      let kickBtn = "";
      if (isHost && p.id !== myPlayerId) {
        kickBtn = `<button class="kick-player-btn" data-player-id="${p.id}" title="${translate("kickPlayer")}"><i class="fas fa-ban"></i></button>`;
      }

      unassignedHtml += `
            <li class="unassigned-player">
                <img class="player-avatar" src="${avatarSrc}" style="width:25px; height:25px;">
                <span>${p.name}</span>
                ${kickBtn}
            </li>`;
    });
    unassignedHtml += `</ul></div>`;
  }

  let teamsHtml = unassignedHtml;

  teamsHtml += '<div class="teams-container">';

  Object.entries(teams).forEach(([teamId, teamData]) => {
    const teamMembers = teamData.members || [];
    const teamName = translate(`teamNames.${teamData.color}`);
    const isMyCurrentTeam = myPlayer.teamId === teamId;

    const readyCount = teamMembers.filter(
      (mid) => players[mid] && players[mid].isReady,
    ).length;
    const allTeamReady =
      teamMembers.length > 0 && readyCount === teamMembers.length;

    let teamClasses = `team-box ${teamData.color}`;
    if (isMyCurrentTeam) teamClasses += " selected-team";
    if (
      !isMyCurrentTeam &&
      teamMembers.length < DEFAULT_MAX_PLAYERS_PER_TEAM &&
      !myPlayer.isReady
    )
      teamClasses += " joinable";

    teamsHtml += `<div class="${teamClasses}" data-team-id="${teamId}" ${isMyCurrentTeam ? `style="border-color: ${teamData.color};"` : ""}>
                    <h3>${translate("lobby.teamLabel", { teamName: teamName.toUpperCase() })} 
                        <small style="font-size:0.6em; display:block; color:#666;">(${readyCount}/${teamMembers.length} ${translate("ready")})</small>
                    </h3>
                    <ul class="team-players">`;

    teamMembers.forEach((playerId) => {
      const player = players[playerId];
      if (player) {
        let avatarSrc;
        if (player.isBot && player.useBotAvatar) {
          const teamColor = teamData.color || "blue";
          const botIdx = player.botAvatarIndex || 1;
          avatarSrc = `${baseURL}/assets/img/avatars/bot-${teamColor}-${botIdx}.webp`;
        } else {
          const seed = player.avatar || 1;
          avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
        }

        const isReadyIcon = player.isReady
          ? `<i class="fas fa-check-circle" style="color:#27ae60; margin-left:5px;" title="${translate("ready")}"></i>`
          : player.isBot
            ? `<i class="fas fa-robot" style="color:#7f8c8d; margin-left:5px;"></i>`
            : `<i class="far fa-clock" style="color:#95a5a6; margin-left:5px;" title="${translate("notReady")}"></i>`;

        const offlineStyle = player.online
          ? ""
          : "style='opacity: 0.5; filter: grayscale(100%);'";

        const rankBadge = (!player.isBot && player.rank)
          ? (() => { const r = getPlayerRank(player.rankingPoints || 0); return ` ${getRankBadgeSvg(r, 20)}`; })()
          : "";

        teamsHtml += `<li ${offlineStyle}>
                        <div style="display:flex; align-items:center;">
                            <img class="player-avatar" src="${avatarSrc}">
                            <span class="player-name">${player.name}${rankBadge}</span>
                            ${isReadyIcon}
                        </div>`;

        if (isHost) {
          if (player.isBot) {
            teamsHtml += `<button class="remove-bot-btn" data-bot-id="${playerId}"><i class="fas fa-user-xmark"></i></button>`;
          } else if (playerId !== myPlayerId) {
            teamsHtml += `<button class="unassign-player-btn" data-player-id="${playerId}" title="${translate("removeFromTeam")}">
                            <i class="fas fa-user-minus"></i>
                          </button>`;

            teamsHtml += `<button class="kick-player-btn" data-player-id="${playerId}" title="${translate("kickPlayer")}">
                            <i class="fas fa-ban"></i>
                          </button>`;
          }
        }
        teamsHtml += `</li>`;
      }
    });

    if (isHost && teamMembers.length < DEFAULT_MAX_PLAYERS_PER_TEAM) {
      teamsHtml += `<li class="add-bot-slot"><button class="add-bot-btn" data-team-id="${teamId}">${translate("lobby.addBot")}</button></li>`;
    }

    teamsHtml += `</ul>`;

    if (isMyCurrentTeam) {
      if (myPlayer.isReady) {
        teamsHtml += `<button class="leave-team-btn" disabled style="opacity:0.6; cursor:not-allowed; background-color:#7f8c8d; border-color:#7f8c8d;">
                        <i class="fas fa-lock"></i> ${translate("ready")}
                      </button>`;
      } else {
        teamsHtml += `<button class="leave-team-btn">${translate("lobby.leaveTeam")}</button>`;
      }
    }
    teamsHtml += `</div>`;
  });
  teamsHtml += "</div>";

  $teamsContainer.html(teamsHtml);

  $teamsContainer
    .off("click")
    .on("click", ".joinable", function () {
      selectTeam($(this).data("team-id"));
    })
    .on("click", ".leave-team-btn", function () {
      selectTeam(null);
    })
    .on("click", ".add-bot-btn", function (e) {
      e.stopPropagation();
      hostAddBotToTeam($(this).data("team-id"));
    })
    .on("click", ".remove-bot-btn", function (e) {
      e.stopPropagation();
      hostRemoveBot($(this).data("bot-id"));
    })
    .on("click", ".kick-player-btn", function (e) {
      e.stopPropagation();
      hostKickPlayer($(this).data("player-id"));
    })
    .on("click", ".unassign-player-btn", function (e) {
      e.stopPropagation();
      hostUnassignPlayer($(this).data("player-id"));
    });

  if (myPlayer.teamId) {
    const btnClass = myPlayer.isReady
      ? "btn-cancel-ready"
      : "btn-confirm-ready";

    const btnText = myPlayer.isReady
      ? translate("cancelReady")
      : translate("markReady");

    const readyBtn = $(
      `<button id="toggle-ready-btn" class="${btnClass}">${btnText}</button>`,
    );
    readyBtn.on("click", toggleReady);
    $startGameContainer.append(readyBtn);
  }

  const $hostControls = $("#host-controls-container");
  if (isHost) {
    $hostControls.css("display", "flex");
    if ($("#host-settings-btn").length === 0) {
      const settingsBtn = $(
        `<button id="host-settings-btn"><i class="fas fa-sliders-h"></i> ${translate("hostSettingsTitle")}</button>`,
      );
      $hostControls.prepend(settingsBtn);
    }

    if ($("#invite-players-btn").length === 0) {
      const inviteBtn = $(
        `<button id="invite-players-btn"><i class="fas fa-user-plus"></i> ${translate("lobby.invitePlayersTitle")}</button>`,
      );
      $hostControls.prepend(inviteBtn);
    }

    $("#invite-players-btn")
      .html(`<i class="fas fa-user-plus"></i> ${translate("lobby.invitePlayersTitle")}`)
      .off("click")
      .on("click", openInvitePlayersModal);

    $("#host-settings-btn")
      .html(
        `<i class="fas fa-sliders-h"></i> ${translate("hostSettingsTitle")}`,
      )
      .off("click")
      .on("click", () =>
        openHostSettingsModal(
          gameData.settings,
          gameData.isPrivate,
          gameData.password,
        ),
      );

    const playersInTeams = Object.values(players).filter(
      (p) => p.teamId && p.online,
    );
    const allHumansReady = playersInTeams.every((p) => p.isBot || p.isReady);
    const activePlayersObj = {};
    playersInTeams.forEach((p) => (activePlayersObj[p.id] = p));

    const gameConfig = getGameConfiguration(activePlayersObj, teams);

    let helpText = "";
    let canStart = false;

    const hostInTeam = myPlayer && myPlayer.teamId;

    if (!hostInTeam) {
      helpText = translate("hostMustJoinTeam");
    } else if (!gameConfig.canStart) {
      helpText = translate("invalidConfiguration");
    } else if (!allHumansReady) {
      helpText = translate("cantStartNotReady");
    } else {
      canStart = true;
    }

    const $startBtn = $("<button>")
      .attr("id", "start-game-btn")
      .html(translate("startMatch"))
      .prop("disabled", !canStart)
      .on("click", () => {
        const allOnline = Object.values(players).filter((p) => p && p.online && p.name);
        const excluded = allOnline.filter((p) => !p.teamId);
        if (excluded.length > 0) {
          const names = excluded.map((p) => p.name).join(", ");
          const key = excluded.length === 1 ? "playersWillBeSpectators" : "playersWillBeSpectatorsPlural";
          Swal.fire({
            title: translate("startMatch") + "?",
            html: translate(key, { playerNames: names, count: excluded.length }),
            icon: "question",
            showCancelButton: true,
            confirmButtonText: translate("startMatch"),
            cancelButtonText: translate("cancel"),
          }).then((result) => {
            if (result.isConfirmed) hostStartGameFiltered(playersInTeams);
          });
        } else {
          hostStartGameFiltered(playersInTeams);
        }
      });

    if (helpText) {
      $startGameContainer.prepend(
        `<div style="color: orange; font-size:0.9em; font-weight:bold; text-align:center;">${helpText}</div>`,
      );
    }
    $startGameContainer.append($startBtn);
  } else {
    $hostControls.hide();
    $startGameContainer.append(
      `<div style="margin-top:10px;">${translate("waitingForHost")}</div>`,
    );
  }
}

function openHostSettingsModal(
  currentSettings,
  isPrivateCurrent,
  currentPassword,
  hideInfoText = false,
) {
  const s = currentSettings || {
    reshuffleOnEmpty: true,
    autoDraw: false,
    useTurnTimer: false,
    turnDuration: 30,
    timeoutPenalty: "skip",
  };
  const isPrivate = isPrivateCurrent === true;
  const password = currentPassword || "";

  const htmlContent = `
      <div class="host-settings-container">
          ${!hideInfoText ? `<p class="host-settings-info">
            <i class="fas fa-info-circle"></i> ${translate("hostSettings.canChangeAnytime")}
          </p>` : ''}
          
          <div class="host-settings-item">
              <label><i class="fas fa-lock"></i> ${translate("hostSettings.privateRoom")}</label>
              <label class="switch">
                  <input type="checkbox" id="set-privacy" ${isPrivate ? "checked" : ""}>
                  <span class="slider round"></span>
              </label>
          </div>

          <div id="password-config-container" style="display: ${isPrivate ? "block" : "none"};">
              <label style="font-size:0.9em; display:block; margin-bottom:5px;">
                  ${translate("privateRoom.setPassLabel")}
              </label>
              <input type="number" id="set-password" class="swal2-input pin-input" 
                     value="${isPrivate ? password : ""}" 
                     placeholder="0000" 
                     maxlength="4" 
                     oninput="if(this.value.length > 4) this.value = this.value.slice(0, 4);">
          </div>

          <hr class="host-settings-separator">

          <div class="host-settings-item">
              <label><i class="fas fa-random"></i> ${translate("hostSettings.reshuffle")}</label>
              <label class="switch">
                  <input type="checkbox" id="set-reshuffle" ${s.reshuffleOnEmpty ? "checked" : ""}>
                  <span class="slider round"></span>
              </label>
          </div>

          <hr class="host-settings-separator">

          <div class="host-settings-item">
              <label><i class="fas fa-hand-holding-magic"></i> ${translate("hostSettings.autoDraw")}</label>
              <label class="switch">
                  <input type="checkbox" id="set-autodraw" ${s.autoDraw ? 'checked' : ''}>
                  <span class="slider round"></span>
              </label>
          </div>

          <hr class="host-settings-separator">

          <div class="host-settings-item">
              <label><i class="fas fa-stopwatch"></i> ${translate("hostSettings.timer")}</label>
              <label class="switch">
                  <input type="checkbox" id="set-timer" ${s.useTurnTimer ? "checked" : ""} onchange="document.getElementById('timer-options').style.display = this.checked ? 'block' : 'none'">
                  <span class="slider round"></span>
              </label>
          </div>

          <div id="timer-options" style="display: ${s.useTurnTimer ? "block" : "none"};">
              <div>
                  <label class="timer-input-label">${translate("hostSettings.timeLimit")}</label>
                  <input type="number" id="set-duration" class="swal2-input timer-input" value="${s.turnDuration}" min="10" max="120">
              </div>
          </div>

      </div>
  `;

  Swal.fire({
    title: translate("hostSettingsTitle"),
    html: htmlContent,
    showCancelButton: true,
    confirmButtonText: translate("saveSettings"),
    cancelButtonText: translate("cancel"),
    customClass: {
      popup: "swal2-modal-config-popup",
    },
    didOpen: () => {
      const checkbox = document.getElementById("set-privacy");
      const passContainer = document.getElementById(
        "password-config-container",
      );
      checkbox.addEventListener("change", (e) => {
        passContainer.style.display = e.target.checked ? "block" : "none";
      });
    },
    preConfirm: () => {
      const isPrivateChecked = document.getElementById("set-privacy").checked;
      const passwordInput = document.getElementById("set-password").value;

      if (isPrivateChecked) {
        if (!passwordInput || passwordInput.length !== 4) {
          Swal.showValidationMessage(translate("privateRoom.errorLength"));
          return false;
        }
      }

      currentGameDataState.isPrivate = isPrivateChecked;
      currentGameDataState.password = isPrivateChecked ? passwordInput : null;
      return {
        settings: {
          reshuffleOnEmpty: document.getElementById("set-reshuffle").checked,
          autoDraw: document.getElementById('set-autodraw').checked, 
          useTurnTimer: document.getElementById("set-timer").checked,
          turnDuration:
            parseInt(document.getElementById("set-duration").value) || 30,
          timeoutPenalty: "skip",
        },
        isPrivate: isPrivateChecked,
        password: isPrivateChecked ? passwordInput : null,
      };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const updates = {};
      updates[`games/${currentGameId}/settings`] = result.value.settings;

      if (result.value.isPrivate !== isPrivate) {
        updates[`games/${currentGameId}/isPrivate`] = result.value.isPrivate;
        updates[`games/${currentGameId}/password`] = result.value.password;
        const msgKey = result.value.isPrivate
          ? "roomMadePrivate"
          : "roomMadePublic";
        showToast(translate(msgKey), { icon: "info" });
      } else if (result.value.password !== password) {
        updates[`games/${currentGameId}/password`] = result.value.password;
      }

      database
        .ref()
        .update(updates)
        .then(() => {
          showToast(translate("settingsUpdated"), { icon: "success" });
        });
    }
  });
}

function hostKickPlayer(playerIdToKick) {
  const player = currentGameDataState.players
    ? currentGameDataState.players[playerIdToKick]
    : null;
  const playerName = player ? player.name : "Jogador";

  Swal.fire({
    title: translate("kickConfirmTitle", { playerName: playerName }),
    text: translate("kickConfirmText"),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: `<i class="fas fa-ban"></i> ${translate(
      "kickConfirmBtn",
    )}`,
    cancelButtonText: translate("cancel"),
  }).then((result) => {
    if (result.isConfirmed) {
      isKickingPlayer = true;

      database
        .ref("games/" + currentGameId)
        .transaction((gameData) => {
          if (!gameData) return;
          if (gameData.players && gameData.players[playerIdToKick]) {
            const targetPlayer = gameData.players[playerIdToKick];

            if (targetPlayer.deviceId) {
              let bannedList = gameData.bannedDeviceIds || [];
              if (
                typeof bannedList === "object" &&
                !Array.isArray(bannedList)
              ) {
                bannedList = Object.values(bannedList);
              }

              if (!bannedList.includes(targetPlayer.deviceId)) {
                bannedList.push(targetPlayer.deviceId);
              }
              gameData.bannedDeviceIds = bannedList;
            }

            delete gameData.players[playerIdToKick];

            if (gameData.teams) {
              Object.keys(gameData.teams).forEach((teamId) => {
                const team = gameData.teams[teamId];
                if (team.members) {
                  let membersList = team.members;
                  if (
                    typeof membersList === "object" &&
                    !Array.isArray(membersList)
                  ) {
                    membersList = Object.values(membersList);
                  }

                  team.members = membersList.filter(
                    (id) => id !== playerIdToKick,
                  );
                }
              });
            }
          }
          return gameData;
        })
        .then((result) => {
          isKickingPlayer = false;
          if (result.committed) {
            showToast(
              translate("playerKickedSuccess", { playerName: playerName }),
              { icon: "success" },
            );
          } else {
            console.warn("Transação de kick não comitada (conflito de dados).");
          }
        })
        .catch((error) => {
          isKickingPlayer = false;
          console.error("ERRO DETALHADO AO EXPULSAR:", error);
          showToast(translate("errorGeneric"), { icon: "error" });
        });
    }
  });
}

function toggleRoomPrivacy(isPrivate) {
  database
    .ref(`games/${currentGameId}`)
    .transaction((gameData) => {
      if (gameData) {
        gameData.isPrivate = isPrivate;
        gameData.gameMessage = {
          key: isPrivate ? "roomMadePrivate" : "roomMadePublic",
        };
      }
      return gameData;
    })
    .catch((error) => {
      showToast(translate("privacyChangeError"), { icon: "error" });
    });
}

function updatePrivacyToggleUI(isPrivate) {
  const $publicLabel = $("#privacy-public-label");
  const $privateLabel = $("#privacy-private-label");

  if (isPrivate) {
    $privateLabel.addClass("selected");
    $publicLabel.removeClass("selected");
  } else {
    $publicLabel.addClass("selected");
    $privateLabel.removeClass("selected");
  }

  $("#privacy-toggle-checkbox").prop("checked", isPrivate);
}

async function hostCleanupGhostPlayers(gameData, removeOfflinePlayers = false) {
  if (isKickingPlayer) return false;

  const myPlayer = gameData.players ? gameData.players[myPlayerId] : null;

  if (!myPlayer || !myPlayer.host || gameData.gameState !== "team-selection") {
    return false;
  }

  const updates = {};
  let hasChanges = false;

  if (gameData.players) {
    const playerKeys = Object.keys(gameData.players);
    playerKeys.forEach((playerKey) => {
      const player = gameData.players[playerKey];
      const shouldRemove =
        !player.id ||
        (removeOfflinePlayers &&
          player.id !== myPlayerId &&
          player.online === false);

      if (shouldRemove) {
        updates[`/players/${playerKey}`] = null;
        hasChanges = true;
      }
    });
  }

  if (gameData.teams) {
    Object.entries(gameData.teams).forEach(([teamId, teamData]) => {
      if (teamData.members && Array.isArray(teamData.members)) {
        const cleanMembers = teamData.members.filter((memberId) => {
          const playerExists = gameData.players && gameData.players[memberId];
          const isBeingRemoved = updates[`/players/${memberId}`] === null;
          return playerExists && !isBeingRemoved;
        });

        if (cleanMembers.length !== teamData.members.length) {
          updates[`/teams/${teamId}/members`] = cleanMembers;
          hasChanges = true;
        }
      }
    });
  }

  if (hasChanges) {
    if (Object.keys(updates).length > 0) {
      try {
        const playersRemovedCount = Object.values(updates).filter(
          (v) => v === null,
        ).length;
        if (playersRemovedCount > 0) {
          showToast(
            translate("cleaningRoomInfo", { count: playersRemovedCount }),
            { icon: "info", timer: 2500 },
          );
        }
        await database.ref(`games/${currentGameId}`).update(updates);
        return true;
      } catch (error) {
        console.warn("Conflito na limpeza automática (ignorado):", error);
        return false;
      }
    }
  }

  return false;
}

async function selectTeam(teamId) {
  if (currentGameDataState.players[myPlayerId]?.isReady) {
    return showToast(translate("mustUnready"), { icon: "warning" });
  }

  await hostCleanupGhostPlayers(currentGameDataState);

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData || !gameData.players || !gameData.players[myPlayerId]) return;

      const myPlayer = gameData.players[myPlayerId];
      const currentTeamId = myPlayer.teamId;

      if (currentTeamId === teamId) return;

      if (teamId === null) {
        if (currentTeamId) {
          const oldTeam = gameData.teams[currentTeamId];
          if (oldTeam && oldTeam.members) {
            oldTeam.members = oldTeam.members.filter(
              (pid) => pid !== myPlayerId,
            );
          }
        }
        myPlayer.teamId = null;
        return gameData;
      }

      if (!gameData.teams[teamId]) {
        gameData.teams[teamId] = {
          id: teamId,
          color: TEAM_COLORS[teamId],
          members: [],
          sequencesCompleted: 0,
        };
      }

      const playersPerTeam = 6;
      const targetTeam = gameData.teams[teamId];

      if ((targetTeam.members || []).length >= playersPerTeam) {
        const teamName = translate(`teamNames.${targetTeam.color}`);
        showToast(translate("teamFull", { teamName: teamName }), {
          icon: "warning",
        });
        return;
      }

      if (currentTeamId) {
        const oldTeam = gameData.teams[currentTeamId];
        if (oldTeam && oldTeam.members) {
          oldTeam.members = oldTeam.members.filter((pid) => pid !== myPlayerId);
        }
      }

      myPlayer.teamId = teamId;
      if (!targetTeam.members) targetTeam.members = [];
      targetTeam.members.push(myPlayerId);

      return gameData;
    })
    .catch((error) => {
      showToast(translate("errors.selectTeam"), { icon: "error" });
    });
}

function toggleReady() {
  if (!currentGameId || !myPlayerId) return;

  const isCurrentlyReady =
    currentGameDataState.players[myPlayerId].isReady || false;

  database
    .ref(`games/${currentGameId}/players/${myPlayerId}/isReady`)
    .set(!isCurrentlyReady)
    .catch((err) => showToast(translate("errors.readyToggle"), { icon: "error" }));
}

function hostUnassignPlayer(playerIdToUnassign) {
  database.ref("games/" + currentGameId).transaction((gameData) => {
    if (!gameData || !gameData.players[playerIdToUnassign]) return;

    const player = gameData.players[playerIdToUnassign];
    const oldTeamId = player.teamId;

    player.teamId = null;
    player.isReady = false;

    if (
      oldTeamId &&
      gameData.teams[oldTeamId] &&
      gameData.teams[oldTeamId].members
    ) {
      gameData.teams[oldTeamId].members = gameData.teams[
        oldTeamId
      ].members.filter((id) => id !== playerIdToUnassign);
    }

    return gameData;
  });
}

async function hostAddBotToTeam(teamId) {
  await hostCleanupGhostPlayers(currentGameDataState);

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (Object.keys(gameData.players).length >= gameData.playerCount) {
        return;
      }

      const existingNames = Object.values(gameData.players)
        .filter((p) => p && p.name)
        .map((p) => p.name.toLowerCase());

      const availableBots = BOT_NAMES.filter(
        (bot) => !existingNames.includes(bot.name.toLowerCase()),
      );

      if (availableBots.length === 0) {
        return;
      }

      const botInfo =
        availableBots[Math.floor(Math.random() * availableBots.length)];
      const botId = `bot_${Date.now()}`;

      gameData.players[botId] = {
        id: botId,
        name: botInfo.name,
        avatar: botInfo.avatar,
        isBot: true,
        useBotAvatar: false,
        online: true,
        hand: [],
        teamId: teamId,
      };

      if (!gameData.teams[teamId].members) {
        gameData.teams[teamId].members = [];
      }
      gameData.teams[teamId].members.push(botId);

      const currentPlayers = Object.keys(gameData.players).length;
      gameData.gameMessage = {
        key: "botJoined",
        params: {
          botName: botInfo.name,
          current: currentPlayers,
          capacity: gameData.capacity,
        },
      };

      return gameData;
    })
    .catch((error) => {
      showToast(translate("errors.addBot"), { icon: "error" });
    });
}

function hostRemoveBot(botIdToRemove) {
  isKickingPlayer = true;

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      const botToRemove = gameData.players[botIdToRemove];

      if (!botToRemove || !botToRemove.isBot) {
        return;
      }

      const teamId = botToRemove.teamId;

      delete gameData.players[botIdToRemove];

      if (teamId && gameData.teams[teamId]) {
        const team = gameData.teams[teamId];
        if (team.members) {
          let membersList = team.members;
          if (typeof membersList === "object" && !Array.isArray(membersList)) {
            membersList = Object.values(membersList);
          }

          team.members = membersList.filter((id) => id !== botIdToRemove);
        }
      }

      const currentPlayers = Object.keys(gameData.players).length;
      gameData.gameMessage = {
        key: "botRemoved",
        params: {
          botName: botToRemove.name,
          current: currentPlayers,
          capacity: gameData.capacity,
        },
      };

      return gameData;
    })
    .then((result) => {
      isKickingPlayer = false;

      if (result.committed) {
        showToast(translate("botRemovedSuccess"), {
          icon: "success",
          timer: 1000,
        });
      } else {
        console.warn("Falha ao remover bot (transação não comitada).");
      }
    })
    .catch((error) => {
      isKickingPlayer = false;
      console.error("Erro ao remover bot:", error);
      showToast(translate("errors.removeBot"), { icon: "error" });
    });
}

function executeBotTurnAsHost(currentGameData, botPlayer) {
  const updates = {};
  const botId = botPlayer.id;
  let botHand = [...(botPlayer.hand || [])];
  let currentDeck = [...(currentGameData.deck || [])];
  let currentDiscard = [...(currentGameData.discardPile || [])];

  const settings = currentGameData.settings || { reshuffleOnEmpty: true };

  if (settings.reshuffleOnEmpty && currentDeck.length === 0) {
    const tempGameData = {
        deck: currentDeck,
        discardPile: currentDiscard
    };

    const shuffled = reshuffleDiscardPile(tempGameData);

    if (shuffled) {
        currentDeck = tempGameData.deck;
        currentDiscard = tempGameData.discardPile;
        
        if (tempGameData.gameMessage) {
          updates["/gameMessage"] = tempGameData.gameMessage;
        }
    }
  }

  const deadCards = botHand.filter((card) =>
    isCardDead(card, currentGameData.boardState),
  );
  if (deadCards.length > 0 && currentDeck.length > 0) {
    let cardToDiscard = deadCards[0];
    if (deadCards.length > 1) {
      cardToDiscard = deadCards.sort(
        (a, b) => evaluateCardPotential(a, {}) - evaluateCardPotential(b, {}),
      )[0];
    }
    const cardIndex = botHand.indexOf(cardToDiscard);
    if (cardIndex > -1) {
      botHand.splice(cardIndex, 1);
      currentDiscard.push(cardToDiscard);
      const newCard = currentDeck.pop();
      botHand.push(newCard);

      const botName = botPlayer.name;
      updates["/gameMessage"] = {
        key: "botExchangedDeadCard",
        params: { botName },
      };
    }
  }

  const updatedGameData = {
    ...currentGameData,
    deck: currentDeck,
    discardPile: currentDiscard,
  };
  const updatedBotPlayer = { ...botPlayer, hand: botHand };
  const move = getStrategicMove(updatedGameData, updatedBotPlayer);

  if (updatedGameData.botIntentions) {
    updates["/botIntentions"] = updatedGameData.botIntentions;
  }

  const isTeamGame = currentGameData.playerCount / currentGameData.numTeams > 1;
  if (move && move.reason) {
    const opponentName =
      Object.values(currentGameData.players).find((p) => !p.isBot)?.name ||
      translate("general.opponent");

    if (move.reason.toLowerCase().includes("block")) {
      triggerBotChatMessage(
        botPlayer.id,
        "blockedOpponent",
        isTeamGame,
        { playerName: opponentName },
        0.5,
      );
    } else if (
      move.reason.toLowerCase().includes("trap") ||
      (move.score > 1000 && move.score < 40000)
    ) {
      triggerBotChatMessage(botPlayer.id, "goodMove", isTeamGame, {}, 0.35);
    }
  }

  if (!move) {
    updates["/currentPlayerIndex"] =
      (currentGameData.currentPlayerIndex + 1) % currentGameData.playerCount;
    updates["/turnCounter"] = (currentGameData.turnCounter || 0) + 1;
    updates["/gameMessage"] = {
      key: "botSkipped",
      params: { botName: botPlayer.name },
    };
    updates["/deck"] = currentDeck;
    updates["/discardPile"] = currentDiscard;
    database.ref("games/" + currentGameId).update(updates);
    return;
  }

  const cardIndexToPlay = botHand.indexOf(move.card);
  if (cardIndexToPlay > -1) botHand.splice(cardIndexToPlay, 1);

  currentDiscard.push(move.card);

  if (move.isRemoval) {
    updates[`/boardState/${move.slotKey}`] = null;
  } else {
    updates[`/boardState/${move.slotKey}`] = botPlayer.teamId;
  }

  const tempBoardState = { ...currentGameData.boardState };
  if (move.isRemoval) {
    delete tempBoardState[move.slotKey];
  } else {
    tempBoardState[move.slotKey] = botPlayer.teamId;
  }

  const allNewSequences = findAllValidNewSequences(
    tempBoardState,
    currentGameData.lockedChips,
    move.row,
    move.col,
    botPlayer.teamId,
  );
  let sequencesToProcess = [];
  if (allNewSequences.length === 1) {
    sequencesToProcess.push(allNewSequences[0]);
  } else if (allNewSequences.length >= 2) {
    const firstDirection = getSequenceDirection(allNewSequences[0]);
    const secondDirection = getSequenceDirection(allNewSequences[1]);
    if (firstDirection !== secondDirection && firstDirection !== "unknown") {
      sequencesToProcess.push(allNewSequences[0], allNewSequences[1]);
    } else {
      allNewSequences.sort((a, b) => {
        const distA = getDistanceFromCenter(a);
        const distB = getDistanceFromCenter(b);
        if (distB > distA) return 1;
        if (distA > distB) return -1;
        const tieBreakerA = a[0].row + a[0].col;
        const tieBreakerB = b[0].row + b[0].col;
        return tieBreakerA - tieBreakerB;
      });
      sequencesToProcess.push(allNewSequences[0]);
    }
  }

  if (sequencesToProcess.length > 0 && !move.isRemoval) {
    if (sequencesToProcess.length > 1) {
      triggerBotChatMessage(
        botPlayer.id,
        "madeDoubleSequence",
        isTeamGame,
        {},
        0.9,
      );
    } else {
      triggerBotChatMessage(botPlayer.id, "madeSequence", isTeamGame, {}, 0.9);
    }

    const team = currentGameData.teams[botPlayer.teamId];
    const newSequenceCount =
      (team.sequencesCompleted || 0) + sequencesToProcess.length;
    updates[`/teams/${botPlayer.teamId}/sequencesCompleted`] = newSequenceCount;
    for (const sequence of sequencesToProcess) {
      sequence.forEach((chip) => {
        if (BOARD_LAYOUT[chip.row][chip.col] !== "F") {
          updates[`/lockedChips/${chip.row}_${chip.col}`] = true;
        }
      });
    }
    const sequencesNeeded = SEQUENCES_TO_WIN[currentGameData.numTeams] || 1;
    if (newSequenceCount >= sequencesNeeded) {
      updates["/winner"] = botPlayer.teamId;
      updates["/gameState"] = "finished";
      updates["/gameEndedAt"] = firebase.database.ServerValue.TIMESTAMP;
      const readableCardName = getHumanReadableCardName(move.card);
      const messageKey =
        currentGameData.playerCount / currentGameData.numTeams === 1
          ? "soloWin"
          : "teamWin";
      updates["/gameMessage"] = {
        key: messageKey,
        params: {
          playerName: botPlayer.name.toUpperCase(),
          teamName: translate(`teamNames.${team.color}`).toUpperCase(),
          cardName: readableCardName,
          color: team.color,
        },
      };
    }
  }

  if (!updates["/winner"] && currentDeck.length > 0) {
    const newCard = currentDeck.pop();
    botHand.push(newCard);
  } else if (!updates["/winner"] && currentDeck.length === 0) {
  }

  updates[`/players/${botId}/hand`] = botHand;
  updates["/deck"] = currentDeck;
  updates["/discardPile"] = currentDiscard;
  updates["/turnState"] = "playing";
  updates["/cardExchangedThisTurn"] = false;
  updates["/currentPlayerIndex"] =
    (currentGameData.currentPlayerIndex + 1) % currentGameData.playerCount;
  updates["/turnCounter"] = (currentGameData.turnCounter || 0) + 1;

  if (!updates["/winner"]) {
    const nextPlayerName =
      currentGameData.players[
        currentGameData.turnOrder[updates["/currentPlayerIndex"]]
      ].name;
    updates["/gameMessage"] = {
      key: "waitingForPlayer",
      params: { playerName: nextPlayerName },
    };
  }

  database.ref("games/" + currentGameId).update(updates);
}

function triggerBotChatMessage(
  botId,
  trigger,
  isTeamGame,
  params = {},
  chance = 0.4,
) {
  if (Math.random() > chance || !currentGameId) {
    return;
  }

  const bot = previousGameData.players[botId];
  if (!bot || !bot.isBot) {
    return;
  }

  const messageOptions = translate(`botChat.${trigger}`);
  if (!messageOptions) return;

  let messages;
  if (messageOptions.solo && messageOptions.team) {
    messages = isTeamGame ? messageOptions.team : messageOptions.solo;
  } else {
    messages = messageOptions;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  let messageText = messages[Math.floor(Math.random() * messages.length)];

  for (const param in params) {
    messageText = messageText.replace(
      new RegExp(`{${param}}`, "g"),
      params[param],
    );
  }

  const typingDelay = 1000 + Math.random() * 1500;

  setTimeout(() => {
    const messageData = {
      playerId: botId,
      playerName: bot.name,
      text: messageText,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    database.ref(`games/${currentGameId}/chat`).push(messageData);
  }, typingDelay);
}

async function hostStartGameFiltered(validPlayersArray) {
  mostrarLoading();

  try {
    const allowedIds = validPlayersArray.map((p) => p.id);

    database
      .ref("games/" + currentGameId)
      .transaction((gameData) => {
        if (!gameData) return;
        if (
          gameData.gameState !== "team-selection" ||
          !gameData.players[myPlayerId]?.host
        ) {
          return;
        }
        const cleanedPlayers = {};
        let turnOrder = [];

        const excludedPlayers = [];
        Object.keys(gameData.players).forEach((id) => {
          if (!allowedIds.includes(id) && gameData.players[id] && gameData.players[id].name) {
            excludedPlayers.push(gameData.players[id]);
          }
        });

        allowedIds.forEach((id) => {
          if (gameData.players[id]) {
            cleanedPlayers[id] = gameData.players[id];
            cleanedPlayers[id].hand = [];
            cleanedPlayers[id].isReady = null;
          }
        });

        gameData.players = cleanedPlayers;

        if (excludedPlayers.length > 0) {
          if (!gameData.spectators) gameData.spectators = {};
          excludedPlayers.forEach((p) => {
            const specId = p.deviceId || `spec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            gameData.spectators[specId] = {
              username: p.name,
              avatar: p.avatar || 1,
              joinedAt: Date.now(),
            };
          });
        }

        Object.keys(gameData.teams).forEach((tid) => {
          const currentMembers = gameData.teams[tid].members || [];

          gameData.teams[tid].members = currentMembers.filter((pid) =>
            allowedIds.includes(pid),
          );
        });

        const gameConfig = getGameConfiguration(
          gameData.players,
          gameData.teams,
        );
        if (!gameConfig.canStart) return;

        gameData.playerCount = gameConfig.playerCount;
        gameData.numTeams = gameConfig.numTeams;
        gameData.gameState = "playing";
        gameData.gameStartedAt = firebase.database.ServerValue.TIMESTAMP;
        gameData.rematchVotes = {};

        const cardsToDeal = CARDS_PER_PLAYER[gameData.playerCount];
        Object.keys(gameData.players).forEach((playerId) => {
          const newHand = [];
          for (let i = 0; i < cardsToDeal; i++) {
            if (gameData.deck && gameData.deck.length > 0) {
              newHand.push(gameData.deck.pop());
            }
          }
          gameData.players[playerId].hand = newHand;
        });

        const playersPerTeam = gameData.playerCount / gameData.numTeams;
        const sortedTeams = Object.values(gameData.teams)
          .filter((team) => (team.members || []).length > 0)
          .sort((a, b) => a.id.localeCompare(b.id));

        for (let i = 0; i < playersPerTeam; i++) {
          for (const team of sortedTeams) {
            if (team.members[i]) {
              turnOrder.push(team.members[i]);
            }
          }
        }
        gameData.turnOrder = turnOrder;
        gameData.currentPlayerIndex = 0;

        const firstPlayerName = gameData.players[gameData.turnOrder[0]].name;
        gameData.gameMessage = {
          key: "gameStarted",
          params: { playerName: firstPlayerName },
        };

        return gameData;
      })
      .then((result) => {
        if (result.committed) {
          const gameData = result.snapshot.val();
          const modeKey = `${gameData.playerCount}_${gameData.numTeams}`;
          incrementAnalytics({
            games_started_total: 1,
            games_started_online_manual: 1,
            [`online_game_mode_${modeKey}`]: 1,
          });
          logGameEvent("game_starts", currentGameId, "manual_host");
        } else {
          esconderLoading();
        }
      })
      .catch((err) => {
        esconderLoading();
        showToast(translate("errors.startGame"), { icon: "error" });
      });
  } catch (error) {
    esconderLoading();
    console.error(error);
  }
}

function endGameOnDeckEmpty() {
  database.ref("games/" + currentGameId).transaction((gameData) => {
    if (!gameData || gameData.winner != null) return;

    let maxSequences = -1;
    let winningTeams = [];

    Object.values(gameData.teams).forEach((team) => {
      const sequences = team.sequencesCompleted || 0;
      if (sequences > maxSequences) {
        maxSequences = sequences;
        winningTeams = [team.id];
      } else if (sequences === maxSequences && maxSequences > 0) {
        winningTeams.push(team.id);
      }
    });

    gameData.gameState = "finished";
    gameData.gameEndedAt = Date.now();

    if (maxSequences <= 0 || winningTeams.length === 0) {
      gameData.gameMessage = { key: "deckEmptyDraw" };
      gameData.winner = null;
    } else if (winningTeams.length === 1) {
      const winnerId = winningTeams[0];
      gameData.winner = winnerId;
      const winningTeam = gameData.teams[winnerId];
      const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

      if (isSoloGame) {
        const winnerPlayerId = winningTeam.members[0];
        const winnerPlayer = gameData.players[winnerPlayerId];
        gameData.gameMessage = {
          key: "deckEmptySoloWin",
          params: {
            playerName: winnerPlayer.name.toUpperCase(),
            color: winningTeam.color,
          },
        };
      } else {
        const winnerColor = translate(
          `teamNames.${winningTeam.color}`,
        ).toUpperCase();
        gameData.gameMessage = {
          key: "deckEmptyTeamWin",
          params: { teamName: winnerColor, color: winningTeam.color },
        };
      }
    } else {
      gameData.winner = null;
      gameData.gameMessage = { key: "deckEmptyDraw" };
    }

    return gameData;
  });
}

function celebrateSequenceForCells(lockedKeys, isMySequence) {
  if (!lockedKeys || lockedKeys.length === 0) return;

  const elements = [];
  lockedKeys.forEach(key => {
    const [r, c] = key.split("_");
    const slot = document.querySelector(`.card-slot[data-row="${r}"][data-col="${c}"]`);
    if (slot) {
      const chip = slot.querySelector('.chip');
      if (chip) elements.push(chip);
    }
  });

  if (elements.length === 0) return;

  if (isMySequence && typeof dispararCelebracao === "function") {
    playFeedback("sequenceSuccess");
    dispararCelebracao('sequencia', null, elements, true);
  } else {
    playFeedback("sequenceSuccess");
    dispararCelebracao('sequencia', null, elements, true, true);
  }
}

function processPendingSequence(finishedSlotKey) {
  if (pendingSequenceCells.length === 0) return;

  const stillAnimating = pendingSequenceCells.some(key => animatingCells.has(key));
  if (!stillAnimating) {
    const cellsToProcess = [...pendingSequenceCells];
    const isMine = pendingSequenceIsMine;
    pendingSequenceCells = [];
    pendingSequenceIsMine = false;
    renderBoard(currentGameDataState);
    celebrateSequenceForCells(cellsToProcess, isMine);
  }
}

function renderAll(gameData, newCard = null) {
  const isHumanTurnOnline =
    gameData.turnOrder &&
    gameData.players &&
    gameData.turnOrder[gameData.currentPlayerIndex] === myPlayerId;

  renderBoard(gameData);

  if (myPlayerId && gameData.players && gameData.players[myPlayerId]) {
    renderPlayerHand(
      gameData.players[myPlayerId].hand,
      gameData.gameState,
      newCard,
      gameData,
      isHumanTurnOnline,
    );
  }
  updateGameInfo(gameData);
  if (!isLocalGame) {
    renderChat(gameData.chat, gameData.players, gameData.teams);
  }
  esconderLoading();
}

function initializeBoard() {
  const $board = $("#board").empty();

  BOARD_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((cardCode, colIndex) => {
      const $slot = $("<div>").addClass(`card-slot`).attr({
        "data-row": rowIndex,
        "data-col": colIndex,
        "data-card": cardCode,
      });

      if (cardCode === "F") {
        $slot.addClass("joker");
        const logoHtml = `<img src="assets/img/logo.webp" class="board-corner-logo" alt="Row 5">`;
        $slot.append(logoHtml);
      } else {
        let value = cardCode.slice(0, -1);
        if (value === "T") value = "10";

        const suit = cardCode.slice(-1);

        const iconClass = suitIcons[suit];
        const colorClass = suitColors[suit];

        const cardHtml = `
            <span class="card-value ${colorClass}">${value}</span>
            <i class="far ${iconClass} card-suit ${colorClass}"></i>
            <i class="fas ${iconClass} card-suit-small ${colorClass}"></i>
        `;
        $slot.append(cardHtml);
      }

      const clickHandler = isLocalGame
        ? onBoardSlotClickLocal
        : onBoardSlotClick;
      $slot.on("click", clickHandler).css("pointer-events", "none");

      $board.append($slot);
    });
  });
}

function renderBoard(gameData) {
  const { boardState, teams, lockedChips } = gameData;
  const $boardSlots = $("#board .card-slot");

  if ($boardSlots.length === 0) {
    initializeBoard();
  }

  $("#board .card-slot").each(function () {
    const $slot = $(this);
    const rowIndex = $slot.data("row");
    const colIndex = $slot.data("col");
    const slotKey = `${rowIndex}_${colIndex}`;

    if (animatingCells.has(slotKey)) return;

    $slot.find(".chip").remove();

    const chipOwnerTeamId = boardState ? boardState[slotKey] : null;

    if (chipOwnerTeamId && chipOwnerTeamId !== "F" && teams[chipOwnerTeamId]) {
      const chipColor = teams[chipOwnerTeamId].color;
      const $chip = $("<div>").addClass("chip").addClass(`chip-${chipColor}`);

      if (lockedChips && lockedChips[slotKey] && !pendingSequenceCells.includes(slotKey)) {
        $chip.addClass("locked");
      }

      $slot.append($chip);
    }
  });
}

function renderPlayerHand(
  hand,
  gameState,
  newlyDrawnCard = null,
  gameData = {},
  isMyTurn = false,
  force = false,
) {
  if (handAnimationLocked && !force) return;

  const $hand = $("#player-hand");
  const boardState = gameData.boardState || {};

  if (
    gameState !== "playing" ||
    !isMyTurn ||
    gameData.turnState === "drawing"
  ) {
    $hand.addClass("disabled");
  } else {
    $hand.removeClass("disabled");
  }

  const handWithIndices = (hand || []).map((card, index) => ({
    card,
    originalIndex: index,
  }));

  const nonJacks = handWithIndices.filter((item) => !item.card.includes("J"));
  const jacks = handWithIndices.filter((item) => item.card.includes("J"));
  const suitOrder = { C: 1, D: 2, H: 3, S: 4 };
  const valueOrder = {
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    T: 10,
    Q: 12,
    K: 13,
    A: 14,
  };
  nonJacks.sort((a, b) => {
    const suitA = a.card.slice(-1);
    const suitB = b.card.slice(-1);
    const valueA = a.card.slice(0, -1);
    const valueB = b.card.slice(0, -1);
    const suitComparison = suitOrder[suitA] - suitOrder[suitB];
    if (suitComparison !== 0) return suitComparison;
    return valueOrder[valueA] - valueOrder[valueB];
  });
  jacks.sort((a, b) => a.card.localeCompare(b.card));

  const finalHandOrder = [...nonJacks, ...jacks];
  const existingCardElements = new Map();

  $hand.children().each(function () {
    const $el = $(this);
    const key = `${$el.data("card")}-${$el.data("index")}`;
    existingCardElements.set(key, $el);
  });

  const finalDomElements = [];
  const handKeys = new Set();

  finalHandOrder.forEach((item) => {
    const { card, originalIndex } = item;
    const key = `${card}-${originalIndex}`;
    handKeys.add(key);

    const isNew = newlyDrawnCard
      ? hand.lastIndexOf(newlyDrawnCard) === originalIndex
      : false;
    const isDead = isCardDead(card, boardState);

    let $cardElement = existingCardElements.get(key);

    if ($cardElement) {
      $cardElement.toggleClass("dead-card", isDead);
      if (isDead) $cardElement.attr("data-dead-label", translate("deadCardLabel"));
      else $cardElement.removeAttr("data-dead-label");
    } else {
      const clickHandler = isLocalGame ? onHandCardClickLocal : onHandCardClick;
      $cardElement = $("<div>")
        .addClass(`card-in-hand`)
        .attr("data-card", card)
        .data("card", card)
        .data("index", originalIndex)
        .on("click", (e) =>
          clickHandler(card, originalIndex, $(e.currentTarget)),
        );

      let value = card.slice(0, -1);
      if (value === "T") value = "10";

      if (value === "J") {
        $cardElement.addClass("jack");
      }

      const suit = card.slice(-1);

      const iconClass = suitIcons[suit];
      const colorClass = suitColors[suit];

      const cardInnerHtml = `
        <span class="card-value ${colorClass}">${value}</span>
        <i class="far ${iconClass} card-suit ${colorClass}"></i>
      `;
      $cardElement.append(cardInnerHtml);

      $cardElement.toggleClass("dead-card", isDead);
      if (isDead) $cardElement.attr("data-dead-label", translate("deadCardLabel"));
    }
    finalDomElements.push($cardElement);
  });

  if (isAnimationsEnabled()) {
    const positions = new Map();
    $hand.children().each(function () {
      const rect = this.getBoundingClientRect();
      positions.set(this, { left: rect.left, top: rect.top });
    });

    existingCardElements.forEach(($el, key) => {
      if (!handKeys.has(key)) {
        $el.detach();
      }
    });

    $hand.children().detach();
    $hand.append(finalDomElements);

    $hand.children().each(function () {
      const oldPos = positions.get(this);
      if (!oldPos) return;
      const newRect = this.getBoundingClientRect();
      const dx = oldPos.left - newRect.left;
      const dy = oldPos.top - newRect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      this.style.transform = `translate(${dx}px, ${dy}px)`;
      this.style.transition = 'none';
      const el = this;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
          el.style.transform = '';
        });
      });
    });
  } else {
    existingCardElements.forEach(($el, key) => {
      if (!handKeys.has(key)) {
        $el.detach();
      }
    });

    $hand.children().detach();
    $hand.append(finalDomElements);

    if (newlyDrawnCard) {
      const newCardIndex = finalDomElements.findIndex(($el) => {
        const idx = $el.data("index");
        return hand.lastIndexOf(newlyDrawnCard) === idx;
      });
      if (newCardIndex >= 0) {
        finalDomElements[newCardIndex].addClass("newly-drawn");
        setTimeout(() => finalDomElements[newCardIndex].removeClass("newly-drawn"), 2000);
      }
    }
  }
}

function updateGameInfo(gameData) {
  const {
    players,
    teams,
    turnOrder,
    currentPlayerIndex,
    gameMessage,
    playerCount,
    numTeams,
    turnState,
  } = gameData;

  if (players) {
    const totalPlayers = Object.values(players).filter(p => p && p.name).length;
    $(".players-count-num").text(totalPlayers);
  }

  if (players && players[myPlayerId]) {
    myTeamId = players[myPlayerId].teamId;
  }

  if (myTeamId && teams && teams[myTeamId] && typeof initChipStack === "function") {
    const stack = document.getElementById('chip-stack');
    if (stack && stack.style.display === 'none') {
      initChipStack(teams[myTeamId].color);
    }
  }

  $("#team-info").empty();

  if (
    playerCount &&
    numTeams &&
    myTeamId &&
    teams &&
    teams[myTeamId] &&
    players
  ) {
    const myTeam = teams[myTeamId];
    let teamInfoHtml = "";

    const sequencesNeeded = SEQUENCES_TO_WIN[numTeams] || 1;
    const sequencesInfo = `${translate("sequences")}: <strong>${
      myTeam.sequencesCompleted
    }</strong> ${translate("of")} <strong>${sequencesNeeded}</strong>`;

    if (myTeam.members.length > 1) {
      const teammates = myTeam.members
        .filter((pid) => pid !== myPlayerId)
        .map((pid) => (players[pid] ? `<strong>${players[pid].name}</strong>` : ""))
        .join(", ");

      teamInfoHtml = sequencesInfo;

      if (teammates) {
        teamInfoHtml += `<br><span style="font-size: 0.9em">${translate(
          "teammates",
        )}: ${teammates}</span>`;
      }
    } else {
      teamInfoHtml = sequencesInfo;
    }
    $("#team-info").html(teamInfoHtml);
  }

  let finalMessage = translate("welcome");

  if (gameData.gameState === "playing" && turnOrder && turnOrder.length > 0) {
    const currentPlayerId = turnOrder[currentPlayerIndex];
    const currentPlayer = players[currentPlayerId];
    const nextIndex = (currentPlayerIndex + 1) % turnOrder.length;
    const nextPlayerId = turnOrder[nextIndex];
    const nextPlayer = players[nextPlayerId];

    let nextPlayerHtml = "";

    if (nextPlayer) {
      const nextTeamColor = teams[nextPlayer.teamId]?.color || "black";

      if (nextPlayer.id === myPlayerId) {
        const labelText = translate("youAreNextLabel");

        nextPlayerHtml = `<div class="text-info-next ">
                                <span class="text-team-${nextTeamColor}">${labelText}</span>
                              </div>`;
      } else {
        const labelText = translate("nextPlayerLabel");

        nextPlayerHtml = `<div class="text-info-next">
                                ${labelText} <span class="text-team-${nextTeamColor}" style="font-weight: bold;">${nextPlayer.name}</span>
                              </div>`;
      }
    }

    if (currentPlayer && teams[currentPlayer.teamId]) {
      let avatarSrc;
      let avatarAlt;
      if (currentPlayer.isBot && currentPlayer.useBotAvatar) {
        const teamColor = teams[currentPlayer.teamId]?.color || "blue";
        const botIdx = currentPlayer.botAvatarIndex || 1;
        avatarSrc = `${baseURL}/assets/img/avatars/bot-${teamColor}-${botIdx}.webp`;
        avatarAlt = `Bot Avatar (${teamColor} team)`;
      } else {
        const seed = currentPlayer.avatar || 1;
        avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
        avatarAlt = `Avatar do jogador ${
          currentPlayer.name || currentPlayer.id
        }`;
      }

      const turnOfText = translate("turnOf");

      const turnRankBadge = (!currentPlayer.isBot && currentPlayer.rank)
        ? (() => { const r = getPlayerRank(currentPlayer.rankingPoints || 0); return ` ${getRankBadgeSvg(r, 20)}`; })()
        : "";

      const playerTurnHtml = `
          <div style="display:flex; flex-direction:column; align-items:center;">
            <div style="display:flex; align-items:center;">
                <img src="${avatarSrc}" alt="${avatarAlt}" class="player-avatar"> 
                ${turnOfText} ${currentPlayer.name}${turnRankBadge}
            </div>
            ${nextPlayerHtml}
          </div>
      `;

      $("#current-player-text")
        .html(playerTurnHtml)
        .removeAttr("style")
        .removeClass("text-team-blue text-team-red text-team-green")
        .addClass(`text-team-${teams[currentPlayer.teamId].color}`);

      const isMyTurn = currentPlayerId === myPlayerId;
      if (isMyTurn) {
        let instruction = "";

        if (turnState === "drawing") {
          instruction  = translate("yourTurnToDraw");
        } else if (turnState === "playing") {
          instruction  = translate("yourTurn");
        }

        finalMessage = instruction;

        if (gameMessage && gameMessage.key === "playerReclaimed" && gameMessage.params) {
            
            const eventText = translate(gameMessage.key, gameMessage.params);
            
            if (gameMessage.params.playerName === myPlayerName) {
                finalMessage = `<div style="color: #27ae60; margin-bottom: 5px; font-weight:bold;">
                                  <i class="fas fa-wifi"></i> ${translate("onlineAgain")}
                                </div>
                                ${instruction}`;
            } else {
                finalMessage = `<div style="color: #e67e22; margin-bottom: 8px; font-weight: bold; animation: flash 1s;">
                                  <i class="fas fa-user-check"></i> ${eventText}
                                </div>
                                ${instruction}`;
            }
        }
      } else {
        finalMessage = translate(gameMessage.key, gameMessage.params);
        if (
          amITheHost &&
          currentPlayer.online === false &&
          !currentPlayer.isBot &&
          !isLocalGame
        ) {
          finalMessage += `
            <div class="skip-container" style="margin-top: 15px; border-top: 1px dashed rgba(0,0,0,0.2); padding-top: 10px;">
                <p style="font-size: 0.9em; color: #d35400; margin-bottom: 10px; font-weight: bold; text-align: center;">
                    <i class="fas fa-plug-circle-xmark"></i> ${translate("hostActionNeeded")}
                </p>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="forceSkipTurn()" class="action-btn" style="background-color: #e67e22; border: none; color: white; padding: 8px 12px; font-size: 0.8em; border-radius: 5px; cursor: pointer; flex: 1;">
                        <i class="fas fa-forward"></i> ${translate("skipTurnBtn")}
                    </button>
                    
                    <button onclick="forceBotTakeover()" class="action-btn" style="background-color: #3498db; border: none; color: white; padding: 8px 12px; font-size: 0.8em; border-radius: 5px; cursor: pointer; flex: 1;">
                        <i class="fas fa-robot"></i> ${translate("activateBotBtn")}
                    </button>
                </div>
            </div>
          `;
        }
      }
    } else {
      $("#current-player-text").html(translate("waiting"));
    }
  } else if (gameData.gameMessage) {
    if (typeof gameData.gameMessage === "object" && gameData.gameMessage.key) {
      finalMessage = translate(
        gameData.gameMessage.key,
        gameData.gameMessage.params,
      );
    } else {
      finalMessage = gameData.gameMessage;
    }
  }

  const myPlayer = gameData.players[myPlayerId];
  if (myPlayer && myPlayer.isBot && myPlayer.isTempBot) {
      const btnText = translate("reclaimControl");
      
      finalMessage += `
        <div style="margin-top: 15px; text-align: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
           <p style="font-size: 0.9em; color: #e74c3c; margin-bottom: 5px;">${translate("botPlayingForYou")}</p>
           <button id="reclaim-control-btn" class="action-btn" style="background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; animation: pulse 1.5s infinite; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <i class="fas fa-user-check"></i> ${btnText}
           </button>
        </div>
      `;
  }

  if (
    gameData.turnState !== "drawing" ||
    (gameData.turnOrder &&
      gameData.turnOrder[gameData.currentPlayerIndex] !== myPlayerId)
  ) {
    $("#game-message").html(finalMessage);
  }

  const deckSize = gameData.deck ? gameData.deck.length : 0;

  if (deckSize > 0) {
    $("#deck-pile").removeClass("deck-empty");
    const isMyTurnDrawing = gameData.turnState === "drawing" &&
      gameData.turnOrder &&
      gameData.turnOrder[gameData.currentPlayerIndex] === myPlayerId;
    if (isMyTurnDrawing) {
      $("#deck-pile").removeClass("disabled");
    } else {
      $("#deck-pile").addClass("disabled");
    }
  } else {
    $("#deck-pile").addClass("disabled").addClass("deck-empty");
  }
  atualizarEspessuraDeck(deckSize, gameData.playerCount || 2);

  const discardPile = gameData.discardPile || [];
  const $discardPileDiv = $("#discard-pile");

  if ($discardPileDiv[0] && $discardPileDiv[0].hasAttribute('data-animating')) {
    const observer = new MutationObserver(() => {
      if (!$discardPileDiv[0].hasAttribute('data-animating')) {
        observer.disconnect();
        renderDiscardPile($discardPileDiv, discardPile);
      }
    });
    observer.observe($discardPileDiv[0], { attributes: true, attributeFilter: ['data-animating'] });
    setTimeout(() => { observer.disconnect(); renderDiscardPile($discardPileDiv, discardPile); }, 800);
  } else {
    renderDiscardPile($discardPileDiv, discardPile);
  }
}

function renderDiscardPile($discardPileDiv, discardPile) {
  const lastDiscardedCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const currentCard = $discardPileDiv.attr("data-card") || null;

  if (lastDiscardedCard === currentCard && lastDiscardedCard !== null) {
    atualizarEspessuraDiscard($discardPileDiv, discardPile.length);
    return;
  }

  $discardPileDiv
    .empty()
    .removeAttr("class")
    .removeAttr("style")
    .attr("id", "discard-pile");

  if (lastDiscardedCard) {
    $discardPileDiv.addClass("card-in-hand");
    $discardPileDiv.attr("data-card", lastDiscardedCard);

    let value = lastDiscardedCard.slice(0, -1);
    if (value === "T") value = "10";

    const suit = lastDiscardedCard.slice(-1);
    const iconClass = suitIcons[suit];
    const colorClass = suitColors[suit];

    const cardHtml = `
          <span class="card-value ${colorClass}">${value}</span>
          <i class="far ${iconClass} card-suit ${colorClass}"></i>
      `;
    $discardPileDiv.append(cardHtml);
    atualizarEspessuraDiscard($discardPileDiv, discardPile.length);
  } else {
    $discardPileDiv.removeAttr("data-card");
  }
}

function atualizarEspessuraDiscard($discardPileDiv, count) {
  $discardPileDiv.removeClass("discard-single discard-very-thin discard-thin discard-medium discard-thick discard-full");
  if (count <= 0) return;
  if (count === 1) {
    $discardPileDiv.addClass("discard-single");
    return;
  }

  const ratio = count / 104;

  if (ratio < 0.1) {
    $discardPileDiv.addClass("discard-very-thin");
  } else if (ratio < 0.3) {
    $discardPileDiv.addClass("discard-thin");
  } else if (ratio < 0.5) {
    $discardPileDiv.addClass("discard-medium");
  } else if (ratio < 0.75) {
    $discardPileDiv.addClass("discard-thick");
  } else {
    $discardPileDiv.addClass("discard-full");
  }
}

function atualizarEspessuraDeck(deckSize, playerCount) {
  const $deck = $("#deck-pile");
  $deck.removeClass("deck-single deck-very-thin deck-thin deck-medium deck-thick");

  if (deckSize <= 0) return;

  if (deckSize === 1) {
    $deck.addClass("deck-single");
    return;
  }

  const ratio = deckSize / 104;

  if (ratio < 0.1) {
    $deck.addClass("deck-very-thin");
  } else if (ratio < 0.3) {
    $deck.addClass("deck-thin");
  } else if (ratio < 0.5) {
    $deck.addClass("deck-medium");
  } else if (ratio < 0.75) {
    $deck.addClass("deck-thick");
  }

  const label = deckSize === 1 ? translate("card") : translate("cards");
  $deck.attr("title", `${translate("buyCard")} (${deckSize} ${label})`);
}

$(document).on("click", "#reclaim-control-btn", function() {
  if (!currentGameId || !myPlayerId) return;

  const $btn = $(this);
  $btn.prop("disabled", true).html(`<i class="fas fa-spinner fa-spin"></i> ${translate("btnProcessing")}`);

  database.ref(`games/${currentGameId}/players/${myPlayerId}`).update({
      isBot: false,
      isTempBot: null,
      online: true
  }).then(() => {
      showToast(translate("controlReclaimed"), { icon: "success" });
  }).catch((err) => {
      console.error(err);
      $btn.prop("disabled", false).html(`<i class="fas fa-user-check"></i> ${translate("btnTryAgain")}`);
  });
});

function startDrawCountdown(seconds) {
  let remainingTime = seconds;
  const $gameMessage = $("#game-message");
  const baseText = translate("drawCardCountdown");

  $gameMessage.html(`${baseText} (${remainingTime}s)`);

  drawCountdownInterval = setInterval(() => {
    remainingTime--;
    if (remainingTime > 0) {
      $gameMessage.html(`${baseText} (${remainingTime}s)`);
    } else {
      clearInterval(drawCountdownInterval);
    }
  }, 1000);
}

function promptRematchVote(gameData) {
  if (isSpectator) return;

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "top" : "center";

  if (gameData.rematchVotes && gameData.rematchVotes[myPlayerId]) {
    if (
      !Swal.isVisible() ||
      Swal.getTitle().innerText !== translate("waitingForOthers")
    ) {
      Swal.fire({
        title: translate("waitingForOthers"),
        text: translate("waitingForRematchVotes"),
        icon: "info",
        allowEscapeKey: false,
        allowOutsideClick: false,
        backdrop: true,
        returnFocus: false,
        showConfirmButton: false,
        position: position,
        customClass: {
          container: 'swal-vote'
        }
      });
    }
    return;
  }

  const currentPlayerTeamId = gameData.players[myPlayerId]?.teamId;
  const isMyTeamWinning =
    gameData.winner != null && gameData.winner === currentPlayerTeamId;

  let winTitle, winHtml, winIcon, confirmText, cancelText;
  cancelText = translate("rematchNo");

  if (gameData.winner == null) {
    winTitle = translate("gameEndDrawTitle");
    winHtml = translate("gameEndDrawText");
    winIcon = "info";
    confirmText = translate("rematchYes");
  } else if (isMyTeamWinning) {
    winTitle = translate("youWonTitle");
    winIcon = "success";
    const myWinningTeam = gameData.teams[currentPlayerTeamId];
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (!myWinningTeam) {
      winHtml = translate("youWonTitle");
    } else {
      if (isSoloGame) {
        winHtml = translate("youWonSoloText", { color: myWinningTeam.color });
      } else {
        winHtml = translate("youWonText", { color: myWinningTeam.color });
      }
    }

    confirmText = translate("rematchYes");
  } else {
    winTitle = translate("youLostTitle");
    winIcon = "info";
    const winningTeam = gameData.teams[gameData.winner];
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (!winningTeam) {
      winHtml = translate("youLostTitle");
    } else if (isSoloGame) {
      const winnerPlayerId = winningTeam.members[0];
      const winnerPlayer = gameData.players[winnerPlayerId];
      winHtml = translate("youLostSoloText", {
        playerName: winnerPlayer.name.toUpperCase(),
        color: winningTeam.color,
      });
    } else {
      const winnerColorName =
        translate(`teamNames.${winningTeam.color}`);
      winHtml = translate("youLostText", {
        teamName: winnerColorName.toUpperCase(),
        color: winningTeam.color,
      });
    }
    confirmText = translate("rematchYesLost");
  }

  let addFriendHtml = "";
  if (currentUser && userProfile && typeof sendFriendRequest === "function") {
    const otherPlayers = Object.values(gameData.players).filter(
      (p) => !p.isBot && p.id !== myPlayerId && p.uid
    );
    if (otherPlayers.length > 0) {
      addFriendHtml = `<div class="endgame-friends-section">`;
      otherPlayers.forEach((p) => {
        const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${p.avatar || 1}`;
        addFriendHtml += `<button class="endgame-add-friend-btn" data-uid="${p.uid}" data-username="${p.name}" data-avatar="${p.avatar || 1}">
          <img src="${avatarSrc}" class="endgame-friend-avatar">
          <span>${p.name}</span>
          <i class="fas fa-user-plus"></i>
        </button>`;
      });
      addFriendHtml += `</div>`;
    }
  }

  Swal.fire({
    title: winTitle,
    html: `${winHtml}${addFriendHtml}<br>${translate("rematchQuestion")}`,
    icon: winIcon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    allowEscapeKey: false,
    allowOutsideClick: false,
    backdrop: true,
    toast: false,
    position: position,
    customClass: {
      container: 'swal-vote'
    },
    didOpen: () => {
      $(".endgame-add-friend-btn").on("click", function () {
        const uid = $(this).data("uid");
        const username = $(this).data("username");
        const avatar = $(this).data("avatar");
        sendFriendRequest(uid, username, avatar);
        $(this).prop("disabled", true).find("i").removeClass("fa-user-plus").addClass("fa-check");
      });
    }
  }).then((result) => {
    if (typeof pararTodasAnimacoesFade === "function") pararTodasAnimacoesFade();
    if (result.isConfirmed) {
      castRematchVote("yes");
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      castRematchVote("no");
    }
  });
}

function castRematchVote(vote) {
  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "top" : "center";

  Swal.fire({
    title: translate("waitingForOthers"),
    text: translate("waitingForRematchVotes"),
    icon: "info",
    allowEscapeKey: false,
    allowOutsideClick: false,
    showConfirmButton: false,
    toast: false,
    position: position,
    customClass: {
      container: 'swal-vote'
    },
    didOpen: () => {
      Swal.showLoading();
    },
  });

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (!gameData.rematchVotes) gameData.rematchVotes = {};

      gameData.rematchVotes[myPlayerId] = vote;

      const myPlayer = gameData.players[myPlayerId];
      if (myPlayer && myPlayer.host) {
        Object.values(gameData.players).forEach((player) => {
          if (player.isBot) {
            gameData.rematchVotes[player.id] = vote;
          }
        });
      }

      return gameData;
    })
    .then(() => {})
    .catch((error) => {
      Swal.close();
      showToast(translate("rematchVoteError"), { icon: "error" });
    });
}

function resetForRematchSelection() {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (gameData.gameState !== "finished") return;

      const previousFirstPlayer = gameData.turnOrder ? gameData.turnOrder[0] : null;

      let newTeams = {};
      for (const teamId in TEAM_COLORS) {
        newTeams[teamId] = {
          id: teamId,
          color: TEAM_COLORS[teamId],
          members: [],
          sequencesCompleted: 0,
        };
      }
      gameData.teams = newTeams;

      gameData.gameState = "team-selection";
      gameData.winner = null;
      gameData.boardState = { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" };
      gameData.lockedChips = {};
      gameData.deck = createAndShuffleDeck();
      gameData.discardPile = [];
      gameData.currentPlayerIndex = 0;
      gameData.turnState = "playing";
      gameData.cardExchangedThisTurn = false;
      gameData.playerCount = null;
      gameData.numTeams = null;
      gameData.previousFirstPlayer = previousFirstPlayer;

      if (gameData.players) {
        Object.values(gameData.players).forEach((player) => {
          player.hand = [];
          player.teamId = null;
        });
      }

      gameData.gameMessage = { key: "rematchAccepted" };
      gameData.rematchVotes = {};
      gameData.botIntentions = {};

      return gameData;
    })
    .then((result) => {
      if (result.committed) {
        incrementAnalytics({
          rematches_accepted_online: 1
        });
        logGameEvent("rematches", currentGameId, "manual_host");

        Swal.close();
        $("#game-container").hide();
        $("#team-selection-modal").css("display", "flex").show();

        const gameData = result.snapshot.val();
        renderTeamSelectionUI(gameData);
      }
      setTimeout(() => { isResettingGame = false; }, 2000);
    })
    .catch((error) => {
      console.error("Erro no reset:", error);
      showToast(translate("rematchResetError"), {
        icon: "error",
      });
      isResettingGame = false;
    });
}

function resetAndRestartAutoGeneratedGame() {
  if (!currentGameId) return;

  const proceedWithReset = () => {
    database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (gameData.gameState !== "finished") return; 

      gameData.gameState = "playing";
      gameData.gameStartedAt = firebase.database.ServerValue.TIMESTAMP;
      gameData.gameEndedAt = null;
      gameData.winner = null;
      gameData.boardState = { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" };
      gameData.lockedChips = {};
      gameData.deck = createAndShuffleDeck();
      gameData.discardPile = [];
      gameData.turnState = "playing";
      gameData.rematchVotes = {};
      gameData.botIntentions = {};
      gameData.cardExchangedThisTurn = false;

      if (gameData.teams) {
        Object.values(gameData.teams).forEach((team) => {
          team.sequencesCompleted = 0;
        });
      }

      const cardsToDeal = CARDS_PER_PLAYER[gameData.playerCount] || 7;
      if (gameData.players) {
        Object.values(gameData.players).forEach((player) => {
          player.hand = [];
          for (let i = 0; i < cardsToDeal; i++) {
            if (gameData.deck.length > 0) {
              player.hand.push(gameData.deck.pop());
            }
          }
        });
      }

      if (gameData.turnOrder && gameData.turnOrder.length > 0) {
        const firstPlayer = gameData.turnOrder.shift();
        gameData.turnOrder.push(firstPlayer);
      }

      gameData.currentPlayerIndex = 0;
      gameData.cardExchangedThisTurn = false;

      const firstPlayerId = gameData.turnOrder[0];
      const firstPlayerName = gameData.players[firstPlayerId]
        ? gameData.players[firstPlayerId].name
        : "Jogador";

      gameData.gameMessage = {
        key: "rematchStarted",
        params: { playerName: firstPlayerName },
      };

      return gameData;
    })
    .then((result) => {
      if (result.committed) {
        const gameData = result.snapshot.val();
        const modeKey = `${gameData.playerCount}_${gameData.numTeams}`;

        incrementAnalytics({
          games_started_total: 1,
          games_started_online_random_created: 1,
          rematches_accepted_online: 1,
          [`online_game_mode_${modeKey}`]: 1,
        });
        logGameEvent("rematches", currentGameId, "auto_bot");
        setupGameUI(currentGameId, { keepLobbyPresence: true });
      }
      setTimeout(() => { isResettingGame = false; }, 2000);
    })
    .catch((error) => {
      console.error("Erro na revanche:", error);
      showToast(translate("autoRematchError"), { icon: "error" });
      isResettingGame = false;
    });
  };

  showInterstitialAd('restart-bot-game', proceedWithReset);
}

function saveSessionHistory(gameId, gameData) {
  if (!gameId || !gameData || !gameData.teams) return;
  if (!amITheHost) return;

  const historyRef = database.ref(`games/${gameId}/sessionHistory`);
  const countRef = database.ref(`games/${gameId}/sessionGameCount`);

  countRef.transaction((count) => {
    return (count || 0) + 1;
  }, (error, committed, snapshot) => {
    if (error || !committed) return;

    const gameNumber = snapshot.val();
    const winnerTeamId = gameData.winner;
    const teams = gameData.teams;
    const players = gameData.players;

    const startTime = gameData.gameStartedAt || 0;
    const endTime = gameData.gameEndedAt || Date.now();
    const duration = startTime ? Math.round((endTime - startTime) / 1000) : null;

    const entry = {
      result: winnerTeamId ? "win" : "draw",
      timestamp: Date.now(),
      startedAt: startTime || null,
      duration: duration,
      teams: {}
    };

    Object.entries(teams).forEach(([teamId, team]) => {
      const members = (team.members || []).map(pid => {
        const p = players[pid];
        return p ? p.name : pid;
      });

      const sequences = team.sequencesCompleted || 0;

      if (winnerTeamId && teamId === String(winnerTeamId)) {
        entry.teams[teamId] = { color: team.color, members, result: "win", sequences };
      } else {
        entry.teams[teamId] = { color: team.color, members, result: winnerTeamId ? "loss" : "draw", sequences };
      }
    });

    historyRef.child(`game${gameNumber}`).set(entry);
    updateSessionHistoryButton(gameNumber);
  });
}

function updateSessionHistoryButton(count) {
  const $btn = $(".session-history-btn");
  if (count >= 1) {
    $btn.show();
  }
}

function loadSessionHistoryBadge() {
  if (!currentGameId) return;
  database.ref(`games/${currentGameId}/sessionGameCount`).on("value", (snap) => {
    const count = snap.val() || 0;
    updateSessionHistoryButton(count);
  });
}

function showSessionHistory() {
  if (!currentGameId) return;

  database.ref(`games/${currentGameId}/sessionHistory`).once("value", (snap) => {
    const history = snap.val();
    if (!history) {
      showToast(translate("sessionHistory.noHistory"), { icon: "info" });
      return;
    }

    const games = Object.entries(history).sort((a, b) => {
      const numA = parseInt(a[0].replace("game", ""));
      const numB = parseInt(b[0].replace("game", ""));
      return numA - numB;
    });

    let timelineHtml = '<div class="session-timeline">';
    const scoreboard = {};

    games.forEach(([key, game], index) => {
      const gameNum = index + 1;
      const durationSec = game.duration;
      const durationLabel = durationSec ? `${Math.floor(durationSec / 60)}m${(durationSec % 60).toString().padStart(2, '0')}s` : '';

      if (game.result === "draw") {
        timelineHtml += `
          <div class="session-game-entry draw">
            <div class="session-game-num">${translate("sessionHistory.game")} ${gameNum} ${durationLabel ? `<span class="session-game-duration">${durationLabel}</span>` : ''}</div>
            <div class="session-game-detail">
              <span class="session-game-result"><i class="fas fa-handshake"></i> ${translate("sessionHistory.draw")}</span>
            </div>
          </div>`;
      } else {
        const winnerTeam = Object.values(game.teams).find(t => t.result === "win");
        const winnerColor = winnerTeam ? winnerTeam.color : "";
        const winnerMembers = winnerTeam ? winnerTeam.members.join(", ") : "";

        timelineHtml += `
          <div class="session-game-entry win">
            <div class="session-game-num">${translate("sessionHistory.game")} ${gameNum} ${durationLabel ? `<span class="session-game-duration">${durationLabel}</span>` : ''}</div>
            <div class="session-game-detail">
              <span class="session-game-result team-color-${winnerColor}"><i class="fas fa-trophy"></i> ${translate(`teamNames.${winnerColor}`)}</span>
              <span class="session-game-members">${winnerMembers}</span>
            </div>
          </div>`;
      }

      if (game.teams) {
        Object.values(game.teams).forEach(team => {
          const teamSequences = team.sequences || 0;

          (team.members || []).forEach(name => {
            if (!scoreboard[name]) scoreboard[name] = { wins: 0, losses: 0, draws: 0, sequences: 0 };
            if (game.result === "draw") {
              scoreboard[name].draws++;
            } else if (team.result === "win") {
              scoreboard[name].wins++;
            } else {
              scoreboard[name].losses++;
            }
            scoreboard[name].sequences += teamSequences;
          });
        });
      }
    });

    timelineHtml += '</div>';

    if (currentGameDataState && currentGameDataState.players) {
      Object.values(currentGameDataState.players).forEach(player => {
        if (player && player.name && !scoreboard[player.name]) {
          scoreboard[player.name] = { wins: 0, losses: 0, draws: 0, sequences: 0 };
        }
      });
    }

    const sortedPlayers = Object.entries(scoreboard).sort((a, b) => {
      const isTeamGame = currentGameDataState && currentGameDataState.numTeams && currentGameDataState.playerCount
        ? (currentGameDataState.playerCount / currentGameDataState.numTeams > 1)
        : false;
      const winPts = isTeamGame ? 2 : 3;
      const ptsA = a[1].wins * winPts + a[1].draws;
      const ptsB = b[1].wins * winPts + b[1].draws;
      if (ptsB !== ptsA) return ptsB - ptsA;
      return a[1].losses - b[1].losses;
    });

    const isTeamGame = currentGameDataState && currentGameDataState.numTeams && currentGameDataState.playerCount
      ? (currentGameDataState.playerCount / currentGameDataState.numTeams > 1)
      : false;
    const winPts = isTeamGame ? 2 : 3;

    let scoreboardHtml = `
      <h4 class="session-scoreboard-title"><i class="fas fa-medal"></i> ${translate("sessionHistory.scoreboard")}</h4>
      <table class="session-scoreboard-table">
        <thead>
          <tr>
            <th>${translate("ranking.player")}</th>
            <th>${translate("sessionHistory.wins")}</th>
            <th>${translate("sessionHistory.losses")}</th>
            <th>${translate("sessionHistory.draws")}</th>
            <th><i class="fas fa-link"></i></th>
            <th>${translate("sessionHistory.pointsAbbr")}</th>
          </tr>
        </thead>
        <tbody>`;

    sortedPlayers.forEach(([name, stats]) => {
      const pts = stats.wins * winPts + stats.draws;
      scoreboardHtml += `
        <tr>
          <td>${name}</td>
          <td class="text-success">${stats.wins}</td>
          <td class="text-danger">${stats.losses}</td>
          <td>${stats.draws}</td>
          <td>${stats.sequences}</td>
          <td><strong>${pts}</strong></td>
        </tr>`;
    });

    scoreboardHtml += '</tbody></table>';

    Swal.fire({
      title: `<i class="fas fa-clock-rotate-left"></i> ${translate("sessionHistory.title")}`,
      html: `<div class="session-history-modal">${timelineHtml}${scoreboardHtml}</div>`,
      showConfirmButton: true,
      confirmButtonText: translate("close"),
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
    });
  });
}

function clearHighlights() {
  $("#board .card-slot").removeClass("highlighted-slot highlighted-removal");
  $("#board .card-slot").css("pointer-events", "none");
}

function highlightPlayableSlots(card, gameData) {
  clearHighlights();
  const { boardState = {}, lockedChips = {}, players = {} } = gameData || {};
  const myTeamId = players[myPlayerId]?.teamId;
  if (!myTeamId) return;

  if (activeHint && activeHint.card === card) {
    const slotKey = `${activeHint.row}_${activeHint.col}`;
    
    if (activeHint.isRemoval) {
        $(`.card-slot[data-row='${activeHint.row}'][data-col='${activeHint.col}']`)
          .addClass("highlighted-removal");
    } else {
        $(`.card-slot[data-row='${activeHint.row}'][data-col='${activeHint.col}']`)
          .addClass("highlighted-slot");
    }
    
    return; 
  }

  const isOneEyedJack = card === "JS" || card === "JH";
  const isTwoEyedJack = card === "JD" || card === "JC";

  if (isOneEyedJack) {
    Object.keys(boardState).forEach((slotKey) => {
      const ownerTeamId = boardState[slotKey];
      if (
        ownerTeamId &&
        ownerTeamId !== myTeamId &&
        ownerTeamId !== "F" &&
        !lockedChips[slotKey]
      ) {
        const [row, col] = slotKey.split("_");
        $(`.card-slot[data-row='${row}'][data-col='${col}']`).addClass(
          "highlighted-removal",
        );
      }
    });
  } else if (isTwoEyedJack) {
    BOARD_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const slotKey = `${rowIndex}_${colIndex}`;
        if (!boardState[slotKey]) {
          $(
            `.card-slot[data-row='${rowIndex}'][data-col='${colIndex}']`,
          ).addClass("highlighted-slot");
        }
      });
    });
  } else {
    BOARD_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((boardCard, colIndex) => {
        if (boardCard === card) {
          const slotKey = `${rowIndex}_${colIndex}`;
          if (!boardState[slotKey]) {
            $(
              `.card-slot[data-row='${rowIndex}'][data-col='${colIndex}']`,
            ).addClass("highlighted-slot");
          }
        }
      });
    });
  }
}

function onBoardSlotClick(event) {
  if (isSpectator) return;
  const $slot = $(event.currentTarget);
  if (!$slot.hasClass("highlighted-slot") && !$slot.hasClass("highlighted-removal")) return;
  const row = $slot.data("row");
  const col = $slot.data("col");
  const cardToBePlayed = selectedHandCard ? selectedHandCard.card : null;
  const cardElement = selectedHandCard?.element?.[0] || selectedHandCard?.element;
  const cardRect = cardElement ? cardElement.getBoundingClientRect() : null;

  const isRemovalMove = cardToBePlayed === "JS" || cardToBePlayed === "JH";
  const animSlotKey = `${row}_${col}`;
  const localHandBeforePlay = [...(currentGameDataState.players?.[myPlayerId]?.hand || [])];
  const localCardIdx = localHandBeforePlay.indexOf(cardToBePlayed);
  if (localCardIdx > -1) localHandBeforePlay.splice(localCardIdx, 1);

  if (!isRemovalMove && isAnimationsEnabled()) {
    animatingCells.add(animSlotKey);
  }

  myLastDiscardTimestamp = Date.now();
  if (isAnimationsEnabled()) {
    handAnimationLocked = true;
  }

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (!gameData.boardState) {
        gameData.boardState = {
          "0_0": "F",
          "0_9": "F",
          "9_0": "F",
          "9_9": "F",
        };
      }
      if (!gameData.lockedChips) {
        gameData.lockedChips = {};
      }
      if (!gameData.turnOrder || gameData.turnOrder.length === 0) return;

      const currentPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];

      if (
        gameData.winner != null ||
        gameData.gameState !== "playing" ||
        currentPlayerId !== myPlayerId ||
        !selectedHandCard
      )
        return;

      const myPlayer = gameData.players[myPlayerId];
      const myTeam = gameData.teams[myPlayer.teamId];
      const { card: selectedCard, index: selectedIndex } = selectedHandCard;
      const boardCard = $slot.data("card");
      const targetSlotOwnerTeamId = gameData.boardState[`${row}_${col}`];

      const isTwoEyedJack = selectedCard === "JD" || selectedCard === "JC";
      const isOneEyedJack = selectedCard === "JS" || selectedCard === "JH";

      let isValidMove = false;
      let isRemoval = false;

      if (isTwoEyedJack && !targetSlotOwnerTeamId) {
        isValidMove = true;
      } else if (isOneEyedJack) {
        if (
          targetSlotOwnerTeamId &&
          targetSlotOwnerTeamId !== myTeam.id &&
          targetSlotOwnerTeamId !== "F" &&
          !gameData.lockedChips[`${row}_${col}`]
        ) {
          isValidMove = true;
          isRemoval = true;
        }
      } else {
        if (selectedCard === boardCard && !targetSlotOwnerTeamId) {
          isValidMove = true;
        }
      }

      if (isValidMove) {
        if (myPlayer.hand[selectedIndex] !== selectedCard) {
          return;
        }
        myPlayer.hand.splice(selectedIndex, 1);

        if (!gameData.discardPile) gameData.discardPile = [];
        gameData.discardPile.push(selectedCard);
        const targetCardCode = BOARD_LAYOUT[row][col];
        let messageWasSet = false;

        if (isRemoval) {
          delete gameData.boardState[`${row}_${col}`];

          gameData.lastMove = {
            playerId: myPlayerId,
            card: selectedCard,
            moveType: "remove",
            targetCard: targetCardCode,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          };
        } else {
          gameData.boardState[`${row}_${col}`] = myTeam.id;

          if (isTwoEyedJack) {
            gameData.lastMove = {
              playerId: myPlayerId,
              card: selectedCard,
              moveType: "place_jack",
              targetCard: targetCardCode,
              timestamp: firebase.database.ServerValue.TIMESTAMP,
            };
          } else {
            gameData.lastMove = {
              playerId: myPlayerId,
              card: selectedCard,
              moveType: "place_normal",
              timestamp: firebase.database.ServerValue.TIMESTAMP,
            };
          }

          const allNewSequences = findAllValidNewSequences(
            gameData.boardState,
            gameData.lockedChips,
            row,
            col,
            myTeam.id,
          );

          let sequencesToProcess = [];

          if (allNewSequences.length === 1) {
            sequencesToProcess.push(allNewSequences[0]);
          } else if (allNewSequences.length >= 2) {
            const firstDirection = getSequenceDirection(allNewSequences[0]);
            const secondDirection = getSequenceDirection(allNewSequences[1]);

            if (
              firstDirection !== secondDirection &&
              firstDirection !== "unknown"
            ) {
              sequencesToProcess.push(allNewSequences[0]);
              sequencesToProcess.push(allNewSequences[1]);
            } else {
              allNewSequences.sort((a, b) => {
                const distA = getDistanceFromCenter(a);
                const distB = getDistanceFromCenter(b);
                if (distB > distA) return 1;
                if (distA > distB) return -1;
                const tieBreakerA = a[0].row + a[0].col;
                const tieBreakerB = b[0].row + b[0].col;
                return tieBreakerA - tieBreakerB;
              });
              sequencesToProcess.push(allNewSequences[0]);
            }
          }

          if (sequencesToProcess.length > 0) {
            gameData.lastMove.madeSequence = true;
            if (sequencesToProcess.length > 1) {
              gameData.lastMove.madeDoubleSequence = true;
            }

            for (const sequence of sequencesToProcess) {
              myTeam.sequencesCompleted = (myTeam.sequencesCompleted || 0) + 1;
              const isCanto = (r, c) =>
                (r === 0 || r === 9) && (c === 0 || c === 9);
              sequence.forEach((chip) => {
                if (!isCanto(chip.row, chip.col)) {
                  gameData.lockedChips[`${chip.row}_${chip.col}`] = true;
                }
              });
            }

            const sequencesNeeded = SEQUENCES_TO_WIN[gameData.numTeams] || 1;
            const isSoloGame = gameData.playerCount / gameData.numTeams === 1;
            const readableCardName = getHumanReadableCardName(selectedCard);

            if (myTeam.sequencesCompleted >= sequencesNeeded) {
              gameData.winner = myTeam.id;
              gameData.gameState = "finished";
              gameData.gameEndedAt = Date.now();
              const messageKey = isSoloGame ? "soloWin" : "teamWin";
              gameData.gameMessage = {
                key: messageKey,
                params: {
                  playerName: myPlayer.name.toUpperCase(),
                  teamName: translate(
                    `teamNames.${myTeam.color}`,
                  ).toUpperCase(),
                  cardName: readableCardName,
                  color: myTeam.color,
                },
              };
            } else {
              const messageKey =
                sequencesToProcess.length > 1
                  ? isSoloGame
                    ? "soloDoubleSequence"
                    : "teamDoubleSequence"
                  : isSoloGame
                    ? "soloSequence"
                    : "teamSequence";

              gameData.gameMessage = {
                key: messageKey,
                params: {
                  playerName: myPlayer.name.toUpperCase(),
                  teamName: translate(
                    `teamNames.${myTeam.color}`,
                  ).toUpperCase(),
                  cardName: readableCardName,
                  color: myTeam.color,
                },
              };
            }
            messageWasSet = true;
          }
        }

        if (gameData.winner == null) {
          const settings = gameData.settings || {};

          if (settings.autoDraw) {
              
            if (settings.reshuffleOnEmpty && (!gameData.deck || gameData.deck.length === 0)) {
              reshuffleDiscardPile(gameData);
            }

            drawCardFromDeck(gameData, myPlayer);

            let nextPlayerIndex = gameData.currentPlayerIndex;
            let playersChecked = 0;

            do {
                nextPlayerIndex = (nextPlayerIndex + 1) % gameData.playerCount;
                playersChecked++;
                break;

            } while (playersChecked < gameData.playerCount);

            gameData.currentPlayerIndex = nextPlayerIndex;
            gameData.turnState = "playing";
            gameData.cardExchangedThisTurn = false;
            gameData.turnCounter = (gameData.turnCounter || 0) + 1;

            const nextPlayerName = gameData.players[gameData.turnOrder[nextPlayerIndex]].name;
            
            if (!gameData.gameMessage || gameData.gameMessage.key !== "deckReshuffled") {
                gameData.gameMessage = {
                    key: "waitingForPlayer",
                    params: { playerName: nextPlayerName },
                };
            }

          } else {
              gameData.turnState = "drawing";
              if (!messageWasSet) {
                gameData.gameMessage = { key: "waiting" };
              }
          }
        }
      }
      return gameData;
    })
    .then((result) => {
      if (result.committed && cardToBePlayed) {
        if (cardToBePlayed === "JS" || cardToBePlayed === "JH") {
          incrementAnalytics({ jacks_played_one_eyed: 1 });
        } else if (cardToBePlayed === "JD" || cardToBePlayed === "JC") {
          incrementAnalytics({ jacks_played_two_eyed: 1 });
        }

        const isRemoval = cardToBePlayed === "JS" || cardToBePlayed === "JH";

        if (cardElement) {
          cardElement.style.opacity = '0';
          cardElement.style.pointerEvents = 'none';
        }

        if (typeof animarDescarte === "function" && cardRect) {
          animarDescarte(null, cardRect, cardToBePlayed);
        }

        const chipDelay = 300;

        if (!isRemoval && typeof animarJogadaComPilha === "function") {
          const slotEl = $slot[0];
          const teamColor = myTeamId ? getTeamColor(myTeamId) : "blue";
          setTimeout(() => animarJogadaComPilha(slotEl, teamColor, () => {
            animatingCells.delete(animSlotKey);
            renderBoard(currentGameDataState);
            processPendingSequence(animSlotKey);
          }), chipDelay);
        } else if (!isRemoval) {
          animatingCells.delete(animSlotKey);
          renderBoard(currentGameDataState);
        }

        if (isRemoval && typeof animarRemocaoFicha === "function") {
          const slotEl = $slot[0];
          const removedTeamId = previousGameData?.boardState?.[`${row}_${col}`];
          const removedColor = removedTeamId && currentGameDataState.teams?.[removedTeamId]
            ? currentGameDataState.teams[removedTeamId].color : "red";
          const numTeams = currentGameDataState.numTeams || 2;
          setTimeout(() => animarRemocaoFicha(slotEl, removedColor, removedTeamId, numTeams), chipDelay);
        }

        setTimeout(() => {
          if (handAnimationLocked) {
            handAnimationLocked = false;
            const currentHand = currentGameDataState.players?.[myPlayerId]?.hand || [];
            const isMyTurnNow = currentGameDataState.turnOrder &&
              currentGameDataState.turnOrder[currentGameDataState.currentPlayerIndex] === myPlayerId;
            renderPlayerHand(currentHand, currentGameDataState.gameState, null, currentGameDataState, isMyTurnNow);
          }
        }, 2500);

      } else if (!result.committed) {
        animatingCells.delete(animSlotKey);
        myLastDiscardTimestamp = 0;
        handAnimationLocked = false;
      }

      selectedHandCard = null;
      $(".card-in-hand").removeClass("selected");
      clearHighlights();

      database.ref("games/" + currentGameId).once("value", (snapshot) => {
        const gameData = snapshot.val();
        if (!gameData) return;

        const boardStateBeforeMove = previousGameData.boardState;
        if (!boardStateBeforeMove) return;

        const isTeamGame = gameData.playerCount / gameData.numTeams > 1;
        const opponentBots = Object.values(gameData.players).filter(
          (p) => p.isBot && p.teamId !== myTeamId,
        );

        if (opponentBots.length > 0) {
          const blockedBot = wasMoveABlock(
            boardStateBeforeMove,
            row,
            col,
            opponentBots,
          );

          if (blockedBot) {
            triggerBotChatMessage(
              blockedBot.id,
              "gotBlocked",
              isTeamGame,
              { playerName: myPlayerName },
              0.5,
            );
          }
        }
      });
    })
    .catch((error) => {
      showToast(translate("errors.playMove"), {
        icon: "error",
      });
      animatingCells.delete(animSlotKey);
      myLastDiscardTimestamp = 0;
      handAnimationLocked = false;
      selectedHandCard = null;
      $(".card-in-hand").removeClass("selected");
      clearHighlights();
    });
}

function drawCardFromDeck(gameData, player) {
  if (!gameData.deck || gameData.deck.length === 0) return null;

  const newCard = gameData.deck.pop();
  
  if (!player.hand) {
      player.hand = [];
  }
  
  player.hand.push(newCard);
  
  return newCard;
}

function wasMoveABlock(previousBoardState, row, col, opponentBots) {
  if (!previousBoardState) return null;

  const axes = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];

  const countConsecutive = (board, teamId, startR, startC, dR, dC) => {
    let count = 0;
    let r = startR + dR;
    let c = startC + dC;
    while (r >= 0 && r < 10 && c >= 0 && c < 10) {
      const slotKey = `${r}_${c}`;
      const owner = board[slotKey];
      const isCorner = BOARD_LAYOUT[r][c] === "F";

      if (owner === teamId || (isCorner && owner)) {
        count++;
      } else {
        break;
      }
      r += dR;
      c += dC;
    }
    return count;
  };

  for (const bot of opponentBots) {
    const botTeamId = bot.teamId;
    if (!botTeamId) continue;

    for (const axis of axes) {
      const count1 = countConsecutive(
        previousBoardState,
        botTeamId,
        row,
        col,
        axis.r,
        axis.c,
      );
      const count2 = countConsecutive(
        previousBoardState,
        botTeamId,
        row,
        col,
        -axis.r,
        -axis.c,
      );
      const potentialLength = count1 + count2 + 1;

      if (potentialLength >= 4) {
        return bot;
      }
    }
  }
  return null;
}

function onHandCardClick(card, index, $element) {
  if ($element.parent().hasClass("disabled")) {
    return;
  }
  database.ref("games/" + currentGameId).once("value", (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) return;
    if (
      gameData.cardExchangedThisTurn === true &&
      isCardDead(card, gameData.boardState)
    ) {
      showToast(translate("alreadyExchangedCard"), {
        icon: "warning",
        title: translate("alreadyExchangedTitle"),
      });
      return;
    }

    const canExchange = gameData.deck && gameData.deck.length > 0;
    if (canExchange && isCardDead(card, gameData.boardState)) {
      Swal.fire({
        title: translate("deadCardTitle"),
        html: translate("deadCardBody", {
          cardName: getHumanReadableCardName(card),
        }),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: `<i class='fas fa-right-left'></i> ${translate(
          "deadCardConfirm",
        )}`,
        cancelButtonText: `<i class='fas fa-times'></i> ${translate(
          "deadCardCancel",
        )}`,
        toast: true,
        position: "center",
        customClass: {
          confirmButton: "swal2-button-full",
          cancelButton: "swal2-button-full",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          exchangeDeadCard(card, index);
        }
      });
    } else {
      if (selectedHandCard && selectedHandCard.element) {
        selectedHandCard.element.removeClass("selected");
      }
      selectedHandCard = { card, index, element: $element };
      $element.addClass("selected");
      highlightPlayableSlots(card, gameData);
      $("#board .card-slot.highlighted-slot, #board .card-slot.highlighted-removal").css("pointer-events", "auto");
      const isOneEyedJack = card === "JS" || card === "JH";
      const isTwoEyedJack = card === "JD" || card === "JC";
      let message = "";
      if (isOneEyedJack) {
        message = translate("oneEyedJackInfo");
      } else if (isTwoEyedJack) {
        message = translate("twoEyedJackInfo");
      } else {
        const cardName = getHumanReadableCardName(card);
        message = translate("cardSelectedInfo", { cardName: cardName });
      }
      $("#game-message").html(message);
    }
  });
}

function exchangeDeadCard(cardToExchange, cardIndex) {
  const cardEl = $(`.card-in-hand[data-card="${cardToExchange}"]`)[0];
  const cardRect = cardEl ? cardEl.getBoundingClientRect() : null;

  if (isAnimationsEnabled()) {
    handAnimationLocked = true;

    if (cardEl) {
      cardEl.style.opacity = '0';
      cardEl.style.pointerEvents = 'none';
    }

    if (typeof animarDescarte === "function" && cardRect) {
      animarDescarte(null, cardRect, cardToExchange);
    }
  }

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (gameData) {
        if (gameData.cardExchangedThisTurn === true) {
          return;
        }

        const myPlayer = gameData.players[myPlayerId];
        if (!myPlayer || !myPlayer.hand) return;
        if (myPlayer.hand[cardIndex] !== cardToExchange) return;

        const settings = gameData.settings || { reshuffleOnEmpty: true };

        if (
          settings.reshuffleOnEmpty &&
          (!gameData.deck || gameData.deck.length === 0) &&
          gameData.discardPile &&
          gameData.discardPile.length > 0
        ) {
          reshuffleDiscardPile(gameData);
        }
        if (!gameData.deck || gameData.deck.length === 0) {
          return;
        }
        myPlayer.hand.splice(cardIndex, 1);
        if (!gameData.discardPile) gameData.discardPile = [];
        gameData.discardPile.push(cardToExchange);

        const newCard = gameData.deck.pop();
        myPlayer.hand.push(newCard);

        gameData.cardExchangedThisTurn = true;
        incrementAnalytics({ dead_cards_exchanged: 1 });

        if (
          !gameData.gameMessage ||
          gameData.gameMessage.key !== "deckReshuffled"
        ) {
          gameData.gameMessage = {
            key: "deadCardExchanged",
            params: { playerName: myPlayerName },
          };
        }
      }
      return gameData;
    })
    .then((result) => {
      if (!result.committed) {
        handAnimationLocked = false;
        showToast(translate("exchangeFailed"), {
          icon: "warning",
          title: translate("exchangeFailedTitle"),
        });
      } else {
        showToast(translate("exchangeSuccess"), { icon: "success" });
      }
    })
    .catch((error) => {
      handAnimationLocked = false;
      showToast(translate("errors.exchangeCardNetwork"), {
        icon: "error",
      });
    });
}

function canPlayerPlay(player, boardState) {
  if (!player || !player.hand) return false;
  const handCards = player.hand;
  if (handCards.length === 0) return false;

  return !handCards.every((card) => isCardDead(card, boardState));
}

function findAllValidNewSequences(
  boardState,
  lockedChips,
  startRow,
  startCol,
  teamId,
) {
  const foundSequences = [];
  const safeLockedChips = lockedChips || {};
  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];

  const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);

  const isValid = (r, c) => {
    if (r < 0 || r > 9 || c < 0 || c > 9) return false;
    const k = `${r}_${c}`;
    return boardState[k] === teamId || isCanto(r, c);
  };

  const uniqueSequences = new Set();

  for (const dir of directions) {
    let line = [{ row: startRow, col: startCol }];
    for (let i = 1; i < 10; i++) {
      const r = startRow + dir.r * i;
      const c = startCol + dir.c * i;
      if (isValid(r, c)) line.push({ row: r, col: c });
      else break;
    }
    for (let i = 1; i < 10; i++) {
      const r = startRow - dir.r * i;
      const c = startCol - dir.c * i;
      if (isValid(r, c)) line.unshift({ row: r, col: c });
      else break;
    }

    if (line.length < 5) continue;

    for (let i = 0; i <= line.length - 5; i++) {
      const subSeq = line.slice(i, i + 5);

      if (
        !subSeq.some((chip) => chip.row === startRow && chip.col === startCol)
      ) {
        continue;
      }

      let lockedNonCantoChips = 0;
      for (const { row, col } of subSeq) {
        if (isCanto(row, col)) continue;
        if (safeLockedChips[`${row}_${col}`]) {
          lockedNonCantoChips++;
        }
      }

      if (lockedNonCantoChips <= 1) {
        const sortedSeq = [...subSeq].sort(
          (a, b) => a.row - b.row || a.col - b.col,
        );
        const seqKey = sortedSeq.map((c) => `${c.row},${c.col}`).join("-");

        if (!uniqueSequences.has(seqKey)) {
          foundSequences.push(subSeq);
          uniqueSequences.add(seqKey);
        }
      }
    }
  }
  return foundSequences;
}

function getDistanceFromCenter(sequence) {
  if (!sequence || sequence.length === 0) return 0;

  const centerX = 4.5;
  const centerY = 4.5;
  const avgRow =
    sequence.reduce((sum, chip) => sum + chip.row, 0) / sequence.length;
  const avgCol =
    sequence.reduce((sum, chip) => sum + chip.col, 0) / sequence.length;

  return Math.pow(avgRow - centerY, 2) + Math.pow(avgCol - centerX, 2);
}

function getSequenceDirection(sequence) {
  if (!sequence || sequence.length < 2) return "unknown";

  const deltaRow = sequence[1].row - sequence[0].row;
  const deltaCol = sequence[1].col - sequence[0].col;

  if (deltaRow === 0 && deltaCol === 1) return "horizontal";
  if (deltaRow === 1 && deltaCol === 0) return "vertical";
  if (deltaRow === 1 && deltaCol === 1) return "diagonal-down";
  if (deltaRow === -1 && deltaCol === 1) return "diagonal-up";

  return "unknown";
}

function renderChat(chatData, players, teams) {
  const $chatMessages = $("#chat-messages");
  const isScrolledToBottom =
    $chatMessages[0].scrollHeight - $chatMessages[0].clientHeight <=
    $chatMessages[0].scrollTop + 1;
  $chatMessages.empty();
  if (chatData) {
    Object.values(chatData).forEach((msg) => {
      const isSpectatorMsg = msg.isSpectator === true;
      const senderPlayer = players[msg.playerId];
      const senderTeam = senderPlayer ? teams[senderPlayer.teamId] : null;
      const senderColor = isSpectatorMsg ? "spectator" : (senderTeam ? senderTeam.color : "#FFFFFF");
      const $messageDiv = $("<div>").addClass("chat-message");
      const timestamp = new Date(msg.timestamp);
      const formattedTime = timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const isMyMsg = msg.playerId === myPlayerId || (isSpectator && msg.playerId === `spectator_${currentUser?.uid || "anon"}`);

      if (isMyMsg) {
        $messageDiv.addClass("my-message");
        if (isSpectatorMsg) $messageDiv.addClass("spectator");
        const $textSpan = $("<span>").text(msg.text);
        const $timestampSpan = $("<span>")
          .addClass("message-timestamp")
          .text(formattedTime);
        $messageDiv.append($textSpan, $timestampSpan);
      } else {
        $messageDiv.addClass(`other-message ${senderColor}`);
        const $senderSpan = $("<span>")
          .addClass(`message-sender ${senderColor}`)
          .text(isSpectatorMsg ? `👁 ${msg.playerName}` : msg.playerName);
        const $textSpan = $("<span>").text(msg.text);
        const $timestampSpan = $("<span>")
          .addClass(`message-timestamp ${senderColor}`)
          .text(formattedTime);
        $messageDiv.append($senderSpan, $textSpan, $timestampSpan);
      }
      $chatMessages.append($messageDiv);
    });
  }
  if (isScrolledToBottom) {
    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
  }
}

function isCardDead(cardCode, boardState) {
  if (cardCode.includes("J") || !boardState) {
    return false;
  }
  const cardLocations = [];
  BOARD_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((boardCard, colIndex) => {
      if (boardCard === cardCode) {
        cardLocations.push({ row: rowIndex, col: colIndex });
      }
    });
  });
  if (cardLocations.length === 0) {
    return false;
  }
  const isDead = cardLocations.every((location) => {
    const slotKey = `${location.row}_${location.col}`;
    return boardState[slotKey] && boardState[slotKey] !== "F";
  });
  return isDead;
}

function createAndShuffleDeck() {
  const SUITS = ["S", "H", "D", "C"];
  const VALUES = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "T",
    "J",
    "Q",
    "K",
  ];
  let deck = [];
  for (let i = 0; i < 2; i++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push(value + suit);
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function reshuffleDiscardPile(gameData) {
  if (!gameData.discardPile || gameData.discardPile.length === 0) return false;

  let newDeck = [...gameData.discardPile];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }

  gameData.deck = newDeck;
  gameData.discardPile = [];

  gameData.gameMessage = { key: "deckReshuffled" };

  incrementAnalytics({ deck_reshuffles: 1 });

  return true;
}

function getHumanReadableCardName(cardCode) {
  const value = cardCode.slice(0, -1);
  const suit = cardCode.slice(-1);

  const readableValue = translate(`humanCardNames.${value}`);
  const readableSuit = translate(`humanSuitNames.${suit}`);

  return translate("ofSuit", { suit: readableSuit }).replace(
    /^de\s/,
    `${readableValue} de `,
  );
}

function showToast(message, options = {}) {
  const { timer = 3000, title = "", icon } = options;

  Swal.fire({
    toast: true,
    position: "top-end",
    title: title,
    html: message,
    icon: icon,
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    allowEscapeKey: false,
    customClass: {
      container: "swal2-container-toast"
    },
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

function setupPresenceSystem() {
  if (!myPlayerId || !currentGameId || isSpectator) return;

  const playerRef = database.ref(`games/${currentGameId}/players/${myPlayerId}`);

  if (window._heartbeatInterval) clearInterval(window._heartbeatInterval);
  window._heartbeatInterval = setInterval(() => {
    if (currentGameId && myPlayerId) {
      database.ref(`games/${currentGameId}/players/${myPlayerId}/lastHeartbeat`).set(Date.now());
    }
  }, 2 * 60 * 1000);
  database.ref(`games/${currentGameId}/players/${myPlayerId}/lastHeartbeat`).set(Date.now());

  playerRef.once("value", (snap) => {
    if (!snap.exists() || !snap.val()?.name) return;

    const playerStatusRef = database.ref(
      `games/${currentGameId}/players/${myPlayerId}/online`,
    );
    const playerDisconnectRef = database.ref(
      `games/${currentGameId}/players/${myPlayerId}/disconnectedAt`,
    );
    const globalOnlineCountRef = database.ref("stats/total_online_players");
    const connectedRef = database.ref(".info/connected");

    connectedRef.off();

    connectedRef.on("value", (snapshot) => {
      if (snapshot.val() === true) {
        playerStatusRef.onDisconnect().set(false);
        playerDisconnectRef
          .onDisconnect()
          .set(firebase.database.ServerValue.TIMESTAMP);

        globalOnlineCountRef
          .onDisconnect()
          .set(firebase.database.ServerValue.increment(-1));

        playerStatusRef.set(true);
        playerDisconnectRef.set(null);
        globalOnlineCountRef.set(firebase.database.ServerValue.increment(1));

        playerRef.once("value", (playerSnap) => {
          const playerData = playerSnap.val();
          if (playerData && playerData.host === true && !amITheHost) {
            amITheHost = true;
            wasHostBeforeDisconnect = false;
            if (afkCheckInterval) clearInterval(afkCheckInterval);
            afkCheckInterval = setInterval(hostMonitorAfkPlayers, 5000);
          } else if (!amITheHost) {
            reclaimHost(currentGameId);
          }
        });
      } else {
        if (amITheHost) {
          wasHostBeforeDisconnect = true;
        }
      }
    });
  });
}


function joinLobbyPresence() {
  const name = $("#player-name-input").val().trim();
  if (!name) return;

  const deviceId = getDeviceId();
  lobbyPresenceRef = database.ref(`lobby_players/${deviceId}`);

  const playerData = {
    name: name,
    avatar: selectedAvatarId,
    deviceId: deviceId,
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
  };

  lobbyPresenceRef.set(playerData);
  lobbyPresenceRef.onDisconnect().remove();

  lobbyInvitesRef = database.ref(`game_invites/${deviceId}`);
  lobbyInvitesRef.on("child_added", (snapshot) => {
    const invite = snapshot.val();
    if (!invite || !invite.gameId) return;
    showInviteNotification(invite, snapshot.key);
  });
}

function leaveLobbyPresence() {
  if (lobbyInvitesRef) {
    lobbyInvitesRef.off();
    lobbyInvitesRef = null;
  }
  if (lobbyPresenceRef) {
    lobbyPresenceRef.remove();
    lobbyPresenceRef = null;
  }
}

function updateLobbyPresenceName() {
  if (!lobbyPresenceRef) return;
  const name = $("#player-name-input").val().trim();
  if (name) {
    lobbyPresenceRef.update({ name: name, avatar: selectedAvatarId });
  }
}

function showInviteNotification(invite, inviteKey) {
  const identifier = currentUser ? currentUser.uid : getDeviceId();

  const isExpired = invite.timestamp && (Date.now() - invite.timestamp > 10 * 60 * 1000);

  if (isExpired) {
    database.ref(`game_invites/${identifier}/${inviteKey}`).remove();
    return;
  }

  const isPlayTogether = invite.type === "play_together";

  if (isPlayTogether && invite.fromUid) {
    database.ref(`users/${invite.fromUid}/status`).once("value", (statusSnap) => {
      const inviterStatus = statusSnap.val();
      if (inviterStatus === "offline") {
        database.ref(`game_invites/${identifier}/${inviteKey}`).remove();
        return;
      }
      showInviteNotificationUI(invite, inviteKey, identifier, isPlayTogether);
    });
  } else {
    showInviteNotificationUI(invite, inviteKey, identifier, isPlayTogether);
  }
}

function showInviteNotificationUI(invite, inviteKey, identifier, isPlayTogether) {
  playFeedback("newMessage");

  const title = isPlayTogether ? translate("friends.playTogetherTitle") : translate("lobby.inviteReceived");
  const text = isPlayTogether
    ? translate("friends.playTogetherText", { hostName: invite.hostName })
    : translate("lobby.inviteText", { hostName: invite.hostName, gameId: invite.gameId });

  Swal.fire({
    title: title,
    html: text,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: translate("lobby.acceptInvite"),
    cancelButtonText: translate("lobby.declineInvite"),
    timer: 20000,
    timerProgressBar: true,
  }).then((result) => {
    database.ref(`game_invites/${identifier}/${inviteKey}`).remove();

    if (result.isConfirmed) {
      incrementAnalytics({ lobby_invites_accepted: 1 });
      if (typeof isLocalGame !== 'undefined' && isLocalGame && typeof saveLocalGame === 'function') {
        saveLocalGame();
      }
      myPlayerName = $("#player-name-input").val().trim() || (userProfile ? userProfile.username : translate("defaultPlayerName"));
      saveLobbySettings();

      if (isPlayTogether) {
        incrementAnalytics({ friend_play_together_accepted: 1 });
        database.ref(`lobby_players/${invite.fromUid}`).once("value", (snap) => {
          if (snap.exists()) {
            leaveLobbyPresence();
            mostrarLoading();
            const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
            initializeGameInFirebase(gameId);
          } else {
            database.ref(`users/${invite.fromUid}/currentGameId`).once("value", (gameSnap) => {
              const existingGameId = gameSnap.val();
              if (existingGameId) {
                leaveLobbyPresence();
                mostrarLoading();
                joinGame(existingGameId, myPlayerName);
              } else {
                showToast(translate("friends.inviteExpired"), { icon: "warning" });
              }
            });
          }
        });
      } else {
        leaveLobbyPresence();
        mostrarLoading();
        joinGame(invite.gameId, myPlayerName);
      }
    } else {
      incrementAnalytics({ lobby_invites_declined: 1 });
      if (invite.gameId) {
        database.ref(`lobby_players/${identifier}/declined/${invite.gameId}`).set(true);
      }
    }
  });
}

function sendInviteToLobbyPlayer(targetDeviceId, gameId) {
  const inviteData = {
    gameId: gameId,
    hostName: myPlayerName,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  };

  database.ref(`game_invites/${targetDeviceId}`).push(inviteData);

  showToast(translate("lobby.inviteSent"), { icon: "success", timer: 2000 });
  incrementAnalytics({ lobby_invites_sent: 1 });
}

function viewOnlinePlayersFromLobby() {
  const lobbyRef = database.ref("lobby_players");
  const gamesRef = database.ref("games");

  Promise.all([
    lobbyRef.once("value"),
    gamesRef.once("value")
  ]).then(([lobbySnap, gamesSnap]) => {
    const lobbyPlayers = lobbySnap.val() || {};
    const allGames = gamesSnap.val() || {};
    const myDeviceId = getDeviceId();
    const myUid = currentUser ? currentUser.uid : null;
    const myName = ($("#player-name-input").val() || "").trim().toLowerCase();

    let lobbyHtml = "";
    let lobbyCount = 0;

    Object.entries(lobbyPlayers).forEach(([deviceId, player]) => {
      if (deviceId === myDeviceId) return;
      if (myUid && deviceId === myUid) return;
      if (!player || !player.name) return;
      if (myName && player.name.toLowerCase() === myName) return;

      const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${player.avatar || 1}`;
      lobbyHtml += `<li class="modal-list-item">
        <div class="modal-list-item-info">
          <img src="${avatarSrc}">
          <span>${player.name}</span>
        </div>
        <button class="invite-modal-btn lobby-invite-btn" data-device-id="${deviceId}"><i class="fas fa-paper-plane"></i> ${translate("lobby.inviteBtn")}</button>
      </li>`;
      lobbyCount++;
    });

    let roomsHtml = "";
    let roomsCount = 0;

    Object.entries(allGames).forEach(([gameId, game]) => {
      if (!game || game.isPrivate || game.isOffline) return;
      if (game.gameState === "finished" || game.gameState === "ended") return;
      if (!game.players) return;

      const HEARTBEAT_TIMEOUT = 5 * 60 * 1000;
      const now = Date.now();
      const isPlayerActive = (p) => p && p.online && !p.isBot && (!p.lastHeartbeat || (now - p.lastHeartbeat) < HEARTBEAT_TIMEOUT);

      const humanOnline = Object.values(game.players).filter(isPlayerActive).length;
      if (humanOnline === 0) return;

      const playerNames = Object.values(game.players).filter(p => p && p.online).map(p => p.name).join(", ");
      const playerCount = Object.values(game.players).filter(p => p && p.online).length;
      const isPlaying = game.gameState === "playing";
      const btnText = isPlaying ? translate("lobby.watchGame") : translate("lobby.joinRoom");
      const btnIcon = isPlaying ? "fa-eye" : "fa-door-open";

      roomsHtml += `<li class="modal-list-item">
        <div class="modal-list-item-info">
          <i class="fas fa-cards" style="font-size:1.2em;color:var(--color-secondary);"></i>
          <span><strong>${playerNames}</strong> <small>(${playerCount}p - ${isPlaying ? translate("lobby.roomPlaying") : translate("lobby.roomWaiting")})</small></span>
        </div>
        <button class="invite-modal-btn lobby-join-room-btn" data-game-id="${gameId}" data-spectator="${isPlaying}"><i class="fas ${btnIcon}"></i> ${btnText}</button>
      </li>`;
      roomsCount++;
    });

    let content = "";

    if (roomsCount > 0) {
      content += `<h4 class="modal-section-title"><span><i class="fas fa-cards"></i> ${translate("lobby.availableRooms")}</span></h4>`;
      content += `<ul class="modal-list">${roomsHtml}</ul>`;
      if (lobbyCount > 0) content += `<hr class="modal-separator">`;
    }

    if (lobbyCount > 0) {
      content += `<h4 class="modal-section-title"><span><i class="fas fa-users"></i> ${translate("lobby.playersInLobbyTitle")}</span></h4>`;
      content += `<ul class="modal-list">${lobbyHtml}</ul>`;
    }

    if (lobbyCount === 0 && roomsCount === 0) {
      content = `<p class="modal-empty-text">${translate("lobby.noPlayersOnline")}</p>`;
    }

    Swal.fire({
      title: `<i class="fas fa-globe"></i> ${translate("lobbyTitle")}`,
      html: `<div style="max-height:350px;overflow-y:auto;">${content}</div>`,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
      didOpen: () => {
        $(".lobby-invite-btn").on("click", function () {
          const targetDeviceId = $(this).data("device-id");
          const $btn = $(this);

          myPlayerName = $("#player-name-input").val().trim();
          if (!myPlayerName) {
            showToast(translate("lobby.enterNamePromptRandom"), { title: translate("oops"), icon: "warning" });
            return;
          }

          const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
          const deck = createAndShuffleDeck();
          let teams = {};
          for (const teamId in TEAM_COLORS) {
            teams[teamId] = { id: teamId, color: TEAM_COLORS[teamId], members: [], sequencesCompleted: 0 };
          }

          const newGame = {
            gameId: gameId,
            settings: { reshuffleOnEmpty: true, autoDraw: false, useTurnTimer: false, turnDuration: 30, timeoutPenalty: "skip" },
            isPrivate: false,
            gameState: "team-selection",
            capacity: DEFAULT_MAX_PLAYERS,
            playerCount: null,
            numTeams: null,
            boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
            lockedChips: {},
            players: {},
            teams: teams,
            deck: deck,
            discardPile: [],
            turnOrder: [],
            currentPlayerIndex: 0,
            turnState: "playing",
            chat: {},
            gameMessage: { key: "waitingForPlayers", params: { current: 1, capacity: DEFAULT_MAX_PLAYERS } },
            winner: null,
            botIntentions: {},
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
          };

          database.ref("games/" + gameId).set(newGame).then(() => {
            myPlayerId = "player1";
            currentGameId = gameId;
            isLocalGame = false;

            database.ref("games/" + gameId + "/players/player1").set({
              id: "player1",
              name: myPlayerName,
              deviceId: getDeviceId(),
              avatar: selectedAvatarId,
              teamId: null,
              hand: [],
              online: true,
              host: true,
            });

            sendInviteToLobbyPlayer(targetDeviceId, gameId);

            $btn.html(`<i class="fas fa-check"></i> ${translate("lobby.inviteSentShort")}`).prop("disabled", true);

            Swal.close();
            leaveLobbyPresence();
            setupGameUI(gameId);
          });
        });

        $(".lobby-join-room-btn").on("click", function () {
          const gameId = $(this).data("game-id");
          const isSpectator = $(this).data("spectator") === true || $(this).data("spectator") === "true";

          myPlayerName = $("#player-name-input").val().trim();
          if (!myPlayerName) {
            showToast(translate("lobby.enterNamePromptRandom"), { title: translate("oops"), icon: "warning" });
            return;
          }

          Swal.close();
          mostrarLoading();

          if (isSpectator) {
            joinGameAsSpectator(gameId);
          } else {
            joinGame(gameId, myPlayerName);
          }
        });
      },
    });
  });
}



function openInvitePlayersModal() {
  const lobbyRef = database.ref("lobby_players");
  lobbyRef.once("value", (snapshot) => {
    const lobbyPlayers = snapshot.val() || {};
    const myDeviceId = getDeviceId();
    const myUid = currentUser ? currentUser.uid : null;
    const gamePlayers = currentGameDataState?.players || {};
    const gameDeviceIds = Object.values(gamePlayers)
      .filter((p) => p && p.deviceId)
      .map((p) => p.deviceId);
    const gamePlayerNames = Object.values(gamePlayers)
      .filter((p) => p && p.name)
      .map((p) => p.name.toLowerCase());
    const gameUids = Object.values(gamePlayers)
      .filter((p) => p && p.uid)
      .map((p) => p.uid);

    const onlineUids = new Set(Object.keys(lobbyPlayers));
    Object.values(lobbyPlayers).forEach((p) => {
      if (p && p.uid) onlineUids.add(p.uid);
    });

    let friendsHtml = "";
    if (currentUser && friendsList) {
      const friendUids = Object.keys(friendsList).filter((fUid) => fUid !== myUid && !gameUids.includes(fUid));

      const friendDataPromises = friendUids.map((fUid) =>
        database.ref(`users/${fUid}`).once("value").then((s) => {
          const data = s.val() || {};
          return { uid: fUid, username: data.username || "???", avatar: data.avatar || 1, status: data.status };
        })
      );

      Promise.all(friendDataPromises).then((friends) => {
        friends.forEach((friend) => {
          if (!friend) return;
          const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${friend.avatar}`;
          let statusIndicator = "";
          if (friend.status === "online") {
            statusIndicator = `<span class="online-dot" title="Online"></span>`;
          } else if (friend.status === "playing") {
            statusIndicator = `<span class="playing-dot" title="${translate("friends.statusPlaying")}"></span>`;
          }
          const inviteBtn = `<button class="invite-modal-btn" data-device-id="${friend.uid}" title="${translate("lobby.inviteBtnTitle")}"><i class="fas fa-paper-plane"></i> ${translate("lobby.inviteBtn")}</button>`;

          friendsHtml += `<li class="modal-list-item">
            <div class="modal-list-item-info">
              <img src="${avatarSrc}">
              <span>${friend.username}${statusIndicator}</span>
            </div>
            ${inviteBtn}
          </li>`;
        });

        renderInvitePlayersModalContent(friendsHtml, lobbyPlayers, myDeviceId, myUid, gameDeviceIds, gamePlayerNames, gameUids);
      });
    } else {
      renderInvitePlayersModalContent(friendsHtml, lobbyPlayers, myDeviceId, myUid, gameDeviceIds, gamePlayerNames, gameUids);
    }

  });
}

function renderInvitePlayersModalContent(friendsHtml, lobbyPlayers, myDeviceId, myUid, gameDeviceIds, gamePlayerNames, gameUids) {
    let lobbyHtml = "";
    let lobbyCount = 0;

    Object.entries(lobbyPlayers).forEach(([deviceId, player]) => {
      if (deviceId === myDeviceId || deviceId === myUid) return;
      if (gameDeviceIds.includes(deviceId)) return;
      if (!player || !player.name) return;
      if (gamePlayerNames.includes(player.name.toLowerCase())) return;
      if (player.uid && gameUids.includes(player.uid)) return;
      if (player.uid && friendsList && friendsList[player.uid]) return;

      const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${player.avatar || 1}`;
      const alreadyInvited = player.invites && Object.values(player.invites).some(
        (inv) => inv.gameId === currentGameId
      );
      const hasDeclined = player.declined && player.declined[currentGameId];

      let inviteBtn;
      if (hasDeclined) {
        inviteBtn = `<button class="invite-modal-btn" disabled title="${translate("lobby.inviteDeclinedTitle")}"><i class="fas fa-ban"></i></button>`;
      } else if (alreadyInvited) {
        inviteBtn = `<button class="invite-modal-btn" disabled title="${translate("lobby.invitePendingTitle")}"><i class="fas fa-check"></i> ${translate("lobby.inviteSentShort")}</button>`;
      } else {
        inviteBtn = `<button class="invite-modal-btn" data-device-id="${deviceId}" title="${translate("lobby.inviteBtnTitle")}"><i class="fas fa-paper-plane"></i> ${translate("lobby.inviteBtn")}</button>`;
      }

      lobbyHtml += `<li class="modal-list-item">
        <div class="modal-list-item-info">
          <img src="${avatarSrc}">
          <span>${player.name}</span>
        </div>
        ${inviteBtn}
      </li>`;
      lobbyCount++;
    });

    let content = "";

    if (friendsHtml) {
      content += `<h4 class="modal-section-title"><span>${translate("friends.myFriends")}</span></h4>`;
      content += `<ul class="modal-list">${friendsHtml}</ul>`;
      if (lobbyCount > 0) content += `<hr class="modal-separator">`;
    }

    if (lobbyCount > 0) {
      content += `<h4 class="modal-section-title"><span>${translate("lobby.playersInLobbyTitle")}</span></h4>`;
      content += `<ul class="modal-list">${lobbyHtml}</ul>`;
    }

    if (!friendsHtml && lobbyCount === 0) {
      content = `<p class="modal-empty-text">${translate("lobby.noPlayersOnline")}</p>`;
    }

    const gameUrl = window.location.href.split("?")[0] + "?game=" + currentGameId;
    const isPrivate = currentGameDataState.isPrivate;
    const password = currentGameDataState.password;
    const shareUrl = isPrivate && password ? `${gameUrl}&secret=${password}` : gameUrl;

    const shareButtons = `<div class="invite-share-actions">
      <button id="invite-copy-link" class="auth-btn-primary"><i class="fas fa-copy"></i> ${translate("lobby.copyLink")}</button>
      ${navigator.share ? `<button id="invite-share-link" class="auth-btn-secondary"><i class="fas fa-share-nodes"></i> ${translate("lobby.shareLink")}</button>` : ""}
    </div>`;

    Swal.fire({
      title: translate("lobby.invitePlayersTitle"),
      html: `${shareButtons}<hr class="modal-separator"><div style="max-height:250px;overflow-y:auto;">${content}</div>`,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
      didOpen: () => {
        $("#invite-copy-link").on("click", () => {
          navigator.clipboard.writeText(shareUrl);
          $("#invite-copy-link").html(`<i class="fas fa-check"></i> ${translate("lobby.linkCopiedShort")}`);
          setTimeout(() => $("#invite-copy-link").html(`<i class="fas fa-copy"></i> ${translate("lobby.copyLink")}`), 2000);
        });

        $("#invite-share-link").on("click", () => {
          navigator.share({ title: "Row 5 Online", text: translate("lobby.shareText"), url: shareUrl });
        });

        $(Swal.getPopup()).find(".invite-modal-btn:not([disabled])").on("click", function () {
          const targetDeviceId = $(this).data("device-id");
          sendInviteToLobbyPlayer(targetDeviceId, currentGameId);
          $(this).prop("disabled", true).css("opacity", "0.5").html(`<i class="fas fa-check"></i> ${translate("lobby.inviteSentShort")}`);
        });
      },
    });
}

$("#help-btn").on("click", function () {
  rules(true);
});

$(".help-btn").on("click", function () {
  rules(false);
});

function rules(comecandoOpen) {
  const R = translations[currentLanguage].rulesContent;
  const rulesHtml = `
    <div class="modal-config-container">
      <div class="config-accordion-section ${comecandoOpen ? 'open' : ''}">
        <div class="config-accordion-header">
          <span><i class="fas fa-door-open"></i> ${R.startingTitleRaw || R.starting}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${R.startingP1}</p>
          <p>${R.startingP2}</p>
          <ul>${R.startingList}</ul>
          <p>${R.startingP3}</p>
          <p>${R.startingP4}</p>
        </div>
      </div>

      <div class="config-accordion-section ${!comecandoOpen ? 'open' : ''}">
        <div class="config-accordion-header">
          <span><i class="fas fa-bullseye"></i> ${R.objectiveTitleRaw || R.objective}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${R.objectiveP1}</p>
          <ul>${R.objectiveList}</ul>
          <p>${R.objectiveP2}</p>
          <p>${R.objectiveP3}</p>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-magic"></i> ${R.specialCardsTitleRaw || R.specialCards}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${R.specialCardsP1}</p>
          <ul>${R.specialCardsList}</ul>
          <p>${R.specialCardsP2}</p>
          <p>${R.specialCardsP3}</p>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-hand-pointer"></i> ${R.yourTurnTitleRaw || R.yourTurn}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <ol>${R.yourTurnList}</ol>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-flag-checkered"></i> ${R.endingTitleRaw || R.ending}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${R.endingP1}</p>
          <p>${R.endingP2}</p>
          <p>${R.endingP3}</p>
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    title: translate("rulesTitle"),
    html: rulesHtml,
    showConfirmButton: true,
    showCloseButton: true,
    confirmButtonText: translate("understood"),
    allowEscapeKey: false,
    position: "center",
    customClass: {
      popup: "swal2-rules-popup",
      content: "swal-ai-content-reset",
    },
    didOpen: () => {
      $(".config-accordion-header").on("click", function () {
        const $section = $(this).closest(".config-accordion-section");
        const wasOpen = $section.hasClass("open");
        $(".config-accordion-section").removeClass("open");
        if (!wasOpen) $section.addClass("open");
      });
    },
  });
}

function contactSupportOpen(backSettings = true) {
  Swal.fire({
    title: translate("supportModal.title"),
    html: `
      <div style="text-align:left;">
        <label class="modal-label">${translate("supportModal.subjectLabel")}</label>
        <select id="swal-support-subject" class="swal2-select" style="width:100%;margin-bottom:16px !important;padding:8px;font-size:14px;text-align:left;font-weight:normal;">
          <option value="question">${translate("supportModal.subjectQuestion")}</option>
          <option value="suggestion">${translate("supportModal.subjectSuggestion")}</option>
          <option value="account">${translate("supportModal.subjectAccount")}</option>
          <option value="other">${translate("supportModal.subjectOther")}</option>
        </select>
        <label class="modal-label">${translate("supportModal.nameLabel")}</label>
        <input id="swal-support-name" type="text" class="swal2-input" placeholder="${translate("supportModal.namePlaceholder")}" style="width:100%;margin:0 0 16px 0 !important;" value="${myPlayerName || ""}">
        <label class="modal-label">${translate("supportModal.messageLabel")}</label>
        <textarea id="swal-support-message" class="swal2-textarea" maxlength="2000" placeholder="${translate("supportModal.messagePlaceholder")}" style="width:100%;min-height:100px;margin:0 0 16px 0  !important;"></textarea>
        <label class="modal-label">${translate("supportModal.emailLabel")}</label>
        <input id="swal-support-email" type="email" class="swal2-input" placeholder="${translate("supportModal.emailPlaceholder")}" style="width:100%;margin:0  !important;">
      </div>`,
    showCancelButton: true,
    confirmButtonText: translate("supportModal.send"),
    cancelButtonText: translate("cancel"),
    allowEscapeKey: false,
    preConfirm: () => {
      const subject = document.getElementById("swal-support-subject").value;
      const name = document.getElementById("swal-support-name").value.trim();
      const message = document.getElementById("swal-support-message").value.trim();
      const email = document.getElementById("swal-support-email").value.trim();

      if (!message || message.length < 10) {
        Swal.showValidationMessage(translate("supportModal.validation"));
        return false;
      }

      const ticket = {
        subject: subject,
        message: message,
        playerName: name || myPlayerName || "Anônimo",
        email: email || null,
        deviceId: getDeviceId(),
        uid: currentUser?.uid || null,
        language: currentLanguage || "pt",
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        status: "open",
        responded: false,
      };

      return database.ref("support_tickets").push(ticket);
    },
  }).then((result) => {
    if (result.isConfirmed) {
      showToast(translate("supportModal.success"), {
        icon: "success",
        title: translate("supportModal.thanks"),
      });
      incrementAnalytics({ support_tickets_sent: 1 });
    } else if (backSettings) {
      modalConfigOpen();
    }
  });
}

function reportBugOpen(backSettings = true) {
  const inGame = !!(currentGameId || (isLocalGame && localGameData?.gameState === 'playing'));
  const text = inGame ? translate("reportBugModalText") : translate("reportBugModalTextLobby");

  Swal.fire({
    title: translate("reportBugModalTitle"),
    text: text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: translate("reportBugModalConfirm"),
    cancelButtonText: translate("reportBugModalCancel"),
    allowEscapeKey: false,
  }).then((result) => {
    if (result.isConfirmed) {
      promptBugReport();
    } else if (backSettings) {
      modalConfigOpen();
    }
  });
}

function promptBugReport() {
  Swal.fire({
    title: translate("promptBugTitle"),
    input: "textarea",
    inputPlaceholder: translate("promptBugPlaceholder"),
    inputAttributes: {
      "aria-label": translate("promptBugAriaLabel"),
      maxlength: "2000",
    },
    showCancelButton: true,
    confirmButtonText: translate("promptBugConfirm"),
    cancelButtonText: translate("promptBugCancel"),
    allowEscapeKey: false,
    preConfirm: (description) => {
      if (!description || description.trim().length < 10) {
        Swal.showValidationMessage(translate("promptBugValidation"));
        return false;
      }

      const report = {
        description: description.trim(),
        gameId: currentGameId || "lobby",
        playerName: myPlayerName || "Anônimo",
        gameState: currentGameDataState?.gameState || null,
        turnState: currentGameDataState?.turnState || null,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        platform: navigator.platform,
        deviceId: getDeviceId(),
        uid: currentUser?.uid || null,
        language: currentLanguage || "pt",
        gameSnapshot: null,
      };

      if (isLocalGame && typeof localGameData !== 'undefined' && localGameData.gameState === 'playing') {
        report.gameSnapshot = JSON.parse(JSON.stringify(localGameData));
      } else if (currentGameId && currentGameDataState?.gameState === 'playing') {
        report.gameSnapshot = JSON.parse(JSON.stringify(currentGameDataState));
      }

      return database.ref("bug_reports").push(report);
    },
  })
    .then((result) => {
      if (result.isConfirmed) {
        incrementAnalytics({ bug_reports_sent: 1 });
        showToast(translate("promptBugSuccess"), {
          icon: "success",
          title: translate("promptBugThanks"),
        });
      } else {
        modalConfigOpen();
      }
    })
    .catch((error) => {
      console.error("Erro ao enviar bug:", error);
      Swal.showValidationMessage(
        translate("promptBugFailure", { error: error.message || "Connection error" }),
      );
    });
}

function iAocumentationOpen() {
  const AI = translations[currentLanguage].aiDocsContent;

  const aiInfoHtml = `
    <div class="modal-config-container">
      <p class="ai-intro" style="text-align:center;margin-bottom:10px;">${AI.intro}</p>
      
      <div class="config-accordion-section open">
        <div class="config-accordion-header">
          <span><i class="fas fa-brain"></i> ${AI.decisionHierarchyTitle}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${AI.decisionHierarchyIntro}</p>
          <ol>${AI.decisionHierarchyList}</ol>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-user-secret"></i> ${AI.playerAdaptationTitle}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${AI.playerAdaptationIntro}</p>
          <ul>${AI.playerAdaptationList}</ul>
        </div>
      </div>
      
      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-chess-knight"></i> ${AI.predictiveThinkingTitle}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${AI.predictiveThinkingP1}</p>
          <div class="ai-quote">
            <i class="fas fa-quote-left"></i>
            <span>${AI.predictiveThinkingP2}</span>
          </div>
          <p>${AI.predictiveThinkingP3}</p>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-microchip"></i> ${AI.otherIntelligencesTitle}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <ul>${AI.otherIntelligencesList}</ul>
        </div>
      </div>

      <div class="ai-footer">
        <p>${AI.outro}</p>
      </div>
    </div>
  `;

  Swal.fire({
    title: translate("aiDocsTitle"),
    html: aiInfoHtml,
    showCloseButton: true,
    showConfirmButton: true,
    confirmButtonText: translate("understood"),
    allowEscapeKey: false,
    position: "center",
    customClass: {
      popup: "swal2-rules-popup",
      content: "swal-ai-content-reset",
    },
    didOpen: () => {
      $(".config-accordion-header").on("click", function () {
        const $section = $(this).closest(".config-accordion-section");
        const wasOpen = $section.hasClass("open");
        $(".config-accordion-section").removeClass("open");
        if (!wasOpen) $section.addClass("open");
      });
    },
  }).then((result) => {
    if (result.isConfirmed) {
      modalConfigOpen();
    }
  });
}

function strategyTipsOpen() {
  const title = translate("landing.tips.title");
  const tips = translations[currentLanguage].tipsData || [];

  let accordionHtml = `<div class="modal-config-container">`;
  tips.forEach((tip, i) => {
    accordionHtml += `
      <div class="config-accordion-section ${i === 0 ? 'open' : ''}">
        <div class="config-accordion-header">
          <span><i class="fas ${tip.icon}"></i> ${tip.title}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body rules-body">
          <p>${tip.body}</p>
        </div>
      </div>`;
  });
  accordionHtml += `</div>`;

  Swal.fire({
    title: `<i class="fas fa-lightbulb-on"></i> ${title}`,
    html: accordionHtml,
    showConfirmButton: true,
    confirmButtonText: translate("understood"),
    allowEscapeKey: false,
    showCloseButton: true,
    customClass: {
      popup: "swal2-rules-popup",
      actions: "swal2-rules-actions",
      container: "swal2-rules-container",
    },
    didOpen: () => {
      $(".config-accordion-header").on("click", function () {
        const $section = $(this).closest(".config-accordion-section");
        const wasOpen = $section.hasClass("open");
        $(".config-accordion-section").removeClass("open");
        if (!wasOpen) $section.addClass("open");
      });
    },
  }).then((result) => {
    if (result.isConfirmed) {
      modalConfigOpen();
    }
  });
}

const CURRENT_VOTE_VERSION = "v2";

function openFeatureVotingModal(
  triggerSource = "manual",
  backSettings = false,
) {
  if (localStorage.getItem("hasVotedFeature_v2")) {
    return Swal.fire({
      text: translate("alreadyVoted"),
      icon: "info",
      confirmButtonText: "OK",
    }).then(() => {
      if (backSettings) {
        modalConfigOpen();
      }
    });
  }

  const options = {
    music: translate("features.music"),
    custom_sounds: translate("features.custom_sounds"),
    themes: translate("features.themes"),
    tournaments: translate("features.tournaments"),
    emotes: translate("features.emotes"),
    history: translate("features.history"),
    achievements: translate("features.achievements"),
    friend_chat: translate("features.friend_chat"),
    rank_filter: translate("features.rank_filter"),
  };

  let inputOptionsHtml = `
      <div id="feature-vote-counter" class="feature-vote-counter">
          ${translate("selectedCount", { current: 0, max: 3 })}
      </div>
      <div class="feature-voting-options">
  `;

  for (const [key, label] of Object.entries(options)) {
    inputOptionsHtml += `
          <label class="feature-option" id="label-${key}">
              <input type="checkbox" value="${key}">
              <span>${label}</span>
          </label>
      `;
  }
  inputOptionsHtml += "</div>";

  Swal.fire({
    title: translate("featureVotingTitle"),
    html: `<p style="margin-bottom:15px; font-size:0.9em;">${translate("featureVotingText")}</p> ${inputOptionsHtml}`,
    showCancelButton: true,
    confirmButtonText: translate("voteConfirm"),
    cancelButtonText: translate("cancel"),
    didOpen: () => {
      const popup = Swal.getPopup();
      const optionsElements = popup.querySelectorAll(".feature-option");
      const counterEl = popup.querySelector("#feature-vote-counter");

      optionsElements.forEach((option) => {
        const checkbox = option.querySelector("input");

        option.addEventListener("click", (e) => {
          e.preventDefault();

          const currentlyChecked = popup.querySelectorAll(
            ".feature-voting-options input:checked",
          );
          const count = currentlyChecked.length;
          const isChecking = !checkbox.checked;

          let newCount = count;

          if (isChecking) {
            if (count >= 3) {
              Swal.showValidationMessage(translate("maxVotes3"));
              return;
            } else {
              checkbox.checked = true;
              option.classList.add("selected");
              Swal.resetValidationMessage();
              newCount = count + 1;
            }
          } else {
            checkbox.checked = false;
            option.classList.remove("selected");
            Swal.resetValidationMessage();
            newCount = count - 1;
          }

          counterEl.innerText = translate("selectedCount", {
            current: newCount,
            max: 3,
          });
        });
      });
    },
    preConfirm: () => {
      const selectedCheckboxes = document.querySelectorAll(
        ".feature-voting-options input:checked",
      );
      const selectedValues = Array.from(selectedCheckboxes).map(
        (cb) => cb.value,
      );

      if (selectedValues.length === 0) {
        Swal.showValidationMessage(translate("selectAtLeastOne"));
        return false;
      }
      return selectedValues;
    },
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.setItem("voteIgnoredCount_v1", "0");
      submitFeatureVote(result.value, triggerSource, backSettings);
    } else {
      handleVoteIgnored(triggerSource);
      if (backSettings) {
        modalConfigOpen();
      }
    }
  });
}

function handleVoteIgnored(triggerSource) {
  const VERSION = CURRENT_VOTE_VERSION;
  const now = Date.now();

  let ignoredCount = parseInt(
    localStorage.getItem(`voteIgnoredCount_${VERSION}`) || "0",
  );

  ignoredCount++;
  localStorage.setItem(`voteIgnoredCount_${VERSION}`, ignoredCount.toString());

  let nextDelay = 0;

  if (ignoredCount === 1) {
    nextDelay = 24 * 60 * 60 * 1000;
  } else if (ignoredCount === 2) {
    nextDelay = 7 * 24 * 60 * 60 * 1000;
  } else {
    nextDelay = 365 * 24 * 60 * 60 * 1000;
  }

  localStorage.setItem(
    `nextVoteAttempt_${VERSION}`,
    (now + nextDelay).toString(),
  );

  localStorage.removeItem("pendingSmartPrompt");

  incrementPromptMetric(`vote_rejected_${VERSION}_${triggerSource}`);
}

function submitFeatureVote(
  selectedFeatures,
  triggerSource,
  backSettings = false,
) {
  const votePromises = selectedFeatures.map((featureKey) => {
    return database
      .ref(`feature_votes/${CURRENT_VOTE_VERSION}/${featureKey}`)
      .set(firebase.database.ServerValue.increment(1));
  });

  votePromises.push(
    database
      .ref(`feature_votes/${CURRENT_VOTE_VERSION}/total_voters`)
      .set(firebase.database.ServerValue.increment(1)),
  );

  Promise.all(votePromises)
    .then(() => {
      localStorage.setItem(`hasVotedFeature_${CURRENT_VOTE_VERSION}`, "true");
      incrementPromptMetric(
        `vote_submitted_${CURRENT_VOTE_VERSION}_${triggerSource}`,
      );

      Swal.fire({
        title: translate("voteSuccess"),
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        if (backSettings) modalConfigOpen();
      });
    })
    .catch((error) => {
      console.error("Erro ao votar:", error);
      showToast(translate("voteError"), { icon: "error" });
      if (backSettings) modalConfigOpen();
    });
}

function openReviewModal(triggerSource = "manual", backSettings = false) {
  const lastReview = localStorage.getItem("lastReviewTimestamp");
  const now = Date.now();
  const COOLDOWN_DAYS = 30;
  const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  if (lastReview && now - parseInt(lastReview) < COOLDOWN_MS) {
    Swal.fire({
      icon: "info",
      text: translate("reviewAlreadySent"),
      confirmButtonText: "OK",
    }).then(() => {
      if (backSettings) {
        modalConfigOpen();
      }
    });

    return;
  }

  let abGroup = localStorage.getItem("reviewABGroup");
  if (!abGroup) {
    abGroup = Math.random() < 0.5 ? "soft" : "full";
    localStorage.setItem("reviewABGroup", abGroup);
  }

  if (triggerSource === "manual") abGroup = "full";

  const starsHtml = `
      <div class="review-stars-container" id="star-container">
          <i class="far fa-star review-star" data-value="1"></i>
          <i class="far fa-star review-star" data-value="2"></i>
          <i class="far fa-star review-star" data-value="3"></i>
          <i class="far fa-star review-star" data-value="4"></i>
          <i class="far fa-star review-star" data-value="5"></i>
      </div>
  `;

  let contentHtml = `<p>${translate("reviewLabel")}</p>${starsHtml}`;

  if (abGroup === "full") {
    contentHtml += `
          <div id="review-details">
              <p id="review-dynamic-label" class="review-label-dynamic"></p>
              <input type="text" id="review-name" class="swal2-input" placeholder="${translate("reviewNamePlaceholder")}" style="margin: 0 0 10px 0; width: 100%;">
              <textarea id="review-comment" class="swal2-textarea" style="height: 80px !important; margin: 0 !important;" maxlength="500"></textarea>
          </div>
      `;
  } else {
    contentHtml += `
      <p style="font-size:0.8em; margin-top:10px;">
        ${translate("reviewSoftHint")}
      </p>
    `;
  }

  let selectedRating = 5;

  Swal.fire({
    title: translate("reviewTitle"),
    html: contentHtml,
    showCancelButton: true,
    confirmButtonText: translate("sendReview"),
    cancelButtonText: translate("cancel"),
    didOpen: () => {
      const container = document.getElementById("star-container");
      const stars = container.querySelectorAll(".review-star");

      const detailsDiv = document.getElementById("review-details");
      const labelEl = document.getElementById("review-dynamic-label");
      const commentEl = document.getElementById("review-comment");

      const updateStarVisuals = (rating) => {
        stars.forEach((s) => {
          const val = parseInt(s.getAttribute("data-value"));
          if (val <= rating) {
            s.classList.remove("far");
            s.classList.add("fas");
            s.classList.add("selected");
          } else {
            s.classList.remove("fas");
            s.classList.remove("selected");
            s.classList.add("far");
          }
        });

        if (abGroup === "full" && detailsDiv) {
          detailsDiv.style.display = "flex";

          if (rating <= 2) {
            labelEl.innerText = translate("reviewLabel12");
            commentEl.placeholder = translate("reviewPlaceholder12");
          } else if (rating === 3) {
            labelEl.innerText = translate("reviewLabel3");
            commentEl.placeholder = translate("reviewPlaceholder3");
          } else {
            labelEl.innerText = translate("reviewLabel45");
            commentEl.placeholder = translate("reviewPlaceholder45");
          }
        }
      };

      let softSubmitted = false;

      stars.forEach((star) => {
        star.addEventListener("click", () => {
          selectedRating = parseInt(star.getAttribute("data-value"));
          updateStarVisuals(selectedRating);

          if (abGroup === "soft" && !softSubmitted) {
            softSubmitted = true;
            setTimeout(() => {
              Swal.clickConfirm();
            }, 300);
          }
        });
      });

      updateStarVisuals(selectedRating);
    },
    preConfirm: () => {
      if (selectedRating < 1 || selectedRating > 5) {
        Swal.showValidationMessage("Selecione as estrelas!");
        return false;
      }

      const nameEl = document.getElementById("review-name");
      const commentEl = document.getElementById("review-comment");

      return {
        stars: selectedRating,
        name: nameEl ? nameEl.value.trim() : "",
        comment: commentEl ? commentEl.value.trim() : "",
        abGroup: abGroup,
        trigger: triggerSource,
      };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.setItem("reviewIgnoredCount", "0");
      submitReview(result.value);
    } else {
      if (backSettings) {
        modalConfigOpen();
      }
      handleReviewIgnored(triggerSource);
    }
  });
}

function handleReviewIgnored(triggerSource) {
  const now = Date.now();
  let ignoredCount = parseInt(
    localStorage.getItem("reviewIgnoredCount") || "0",
  );
  ignoredCount++;

  localStorage.setItem("reviewIgnoredCount", ignoredCount.toString());

  let nextDelay = 0;
  if (ignoredCount === 1) {
    nextDelay = 24 * 60 * 60 * 1000;
  } else if (ignoredCount === 2) {
    nextDelay = 7 * 24 * 60 * 60 * 1000;
  } else {
    nextDelay = 365 * 24 * 60 * 60 * 1000;
  }

  localStorage.setItem("nextReviewAttempt", (now + nextDelay).toString());
  localStorage.removeItem("pendingSmartPrompt");
  incrementPromptMetric(`review_rejected_${triggerSource}`);
}

function submitReview(data) {
  const reviewData = {
    stars: data.stars,
    playerName: data.name || "Anônimo",
    comment: data.comment,
    language: currentLanguage,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    userAgent: navigator.userAgent,
    version:
      typeof CURRENT_VERSION !== "undefined" ? CURRENT_VERSION : "Unknown",
    abGroup: data.abGroup,
    trigger: data.trigger,
  };

  const operations = [
    database.ref("game_reviews").push(reviewData),

    database
      .ref("metrics/ui_prompts/reviews_submitted")
      .set(firebase.database.ServerValue.increment(1)),
  ];

  Promise.all(operations)
    .then(() => {
      localStorage.setItem("lastReviewTimestamp", Date.now().toString());

      Swal.fire({
        title: translate("reviewSuccess"),
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        if (data.trigger === "manual") {
          modalConfigOpen();
        }
      });
    })
    .catch((error) => {
      console.error("Erro ao enviar review:", error);
      showToast(translate("voteError"), { icon: "error" });
    });
}

$(".config-btn").on("click", () => modalConfigOpen());
$(".players-list-btn").on("click", openPlayersListModal);

let _configOpenSection = 0;

function modalConfigOpen(openSection) {
  if (typeof openSection === 'number') _configOpenSection = openSection;
  else if (typeof openSection !== 'number') openSection = _configOpenSection || 0;
  Swal.fire({
    title: `<i class='fas fa-cogs'></i> ${translate("settings")}`,
    html: `
    <div class="modal-config-container">

      ${amITheHost && currentGameId && !isLocalGame ? `
      <div class="modal-config-item full-width" style="border-bottom: 2px solid rgba(0,0,0,0.1); padding-bottom: 10px; margin-bottom: 5px;">
        <label><i class="fas fa-sliders-h"></i> ${translate("hostSettingsTitle")}</label>
        <button class="open-host-settings-btn">
          <span class="config-text">${translate("settingsModal.hostSettingsBtn")}</span>
        </button>
      </div>
      ` : ''}

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-sliders"></i> ${translate("settingsModal.sectionPreferences")}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body">
          <div class="modal-config-item">
            <label><i class="fas fa-language"></i> ${translate("language")}</label>
            <div class="language-selector-modal">
              <button class="lang-btn-modal ${currentLanguage === "pt" ? "active" : ""}" data-lang="pt">
                <img src="https://flagcdn.com/80x60/br.webp" alt="PT" width="80" height="60" /> PT
              </button>
              <button class="lang-btn-modal ${currentLanguage === "en" ? "active" : ""}" data-lang="en">
                <img src="https://flagcdn.com/80x60/us.webp" alt="EN" width="80" height="60" /> EN
              </button>
              <button class="lang-btn-modal ${currentLanguage === "es" ? "active" : ""}" data-lang="es">
                <img src="https://flagcdn.com/80x60/es.webp" alt="ES" width="80" height="60" /> ES
              </button>
            </div>
          </div>

          <div class="modal-config-item">
            <label>
                <i id="label-theme-icon" class="fas fa-moon"></i> 
                ${translate("settingsModal.themeLabel")}
            </label>
            <button class="toggle-dark-mode-btn">
              <span class="config-text"></span>
          </div>

          <div class="modal-config-item vibration-config-item">
            <label><i class="fas fa-mobile-screen-button"></i> ${translate("settingsModal.vibrationLabel")}</label>
            <button class="toggle-vibrate-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
                <i id="label-sound-icon" class="fas fa-volume-high"></i> 
                ${translate("settingsModal.soundLabel")}
            </label>
            <button class="toggle-sound-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
                <i id="label-chat-mute-icon" class="fas fa-comment"></i> 
                ${translate("settingsModal.chatNotifLabel")}
            </label>
            <button class="toggle-chat-mute-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
                <i id="label-card-icon" class="fas fa-spade"></i> 
                ${translate("settingsModal.cardStyleLabel")}
            </label>
            <button class="toggle-card-style-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
              <i class="fas fa-sparkles"></i> 
              ${translate("settingsModal.animationsLabel")}
            </label>
            <button class="toggle-animations-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
              <i class="fas fa-bell"></i> 
              ${translate("settingsModal.notificationsLabel")}
            </label>
            <button class="toggle-notifications-btn">
              <span class="config-text"></span>
            </button>
          </div>

        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-gamepad"></i> ${translate("settingsModal.sectionGame")}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body">
          <div class="modal-config-item">
            <label>
              <i class="fas fa-forward"></i> 
              ${translate("settingsModal.autoDrawLabel")}
            </label>
            <button class="toggle-auto-draw-btn">
              <span class="config-text"></span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
              <i class="fas fa-shuffle"></i> 
              ${translate("settingsModal.reshuffleLabel")}
            </label>
            <button class="toggle-reshuffle-btn">
              <span class="config-text"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-ellipsis"></i> ${translate("settingsModal.sectionMore")}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body">
          <div class="modal-config-item">
            <label>
              <i class="fas fa-lightbulb-on"></i> 
              ${translate("settingsModal.tipsLabel")}
            </label>
            <button class="game-tips-btn" title="${translate("settingsModal.tipsTitle")}">
              <span class="config-text">${translate("landing.tips.title")}</span>
            </button>
          </div>

          <div class="modal-config-item">
            <label>
              <i class="fas fa-robot"></i>
              ${translate("settingsModal.aiLabel")}
            </label>
            <button class="ai-info-btn" title="${translate("settingsModal.aiInfoTitle")}">
              <span class="config-text">${translate("aiInfo")}</span>
            </button>
          </div>

          <div class="modal-config-item">
            <label><i class="fas fa-poll"></i> ${translate("settingsModal.voteLabel")}</label>
            <button class="feature-vote-btn">
              <span class="config-text">${translate("settingsModal.voteBtn")}</span>
            </button>
          </div>

          <div class="modal-config-item">
            <label><i class="fas fa-star"></i> ${translate("settingsModal.reviewLabel")}</label>
            <button class="game-review-btn">
              <span class="config-text">${translate("settingsModal.reviewBtn")}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="config-accordion-section">
        <div class="config-accordion-header">
          <span><i class="fas fa-envelope"></i> ${translate("settingsModal.sectionContact")}</span>
          <i class="fas fa-chevron-down config-accordion-arrow"></i>
        </div>
        <div class="config-accordion-body">
          <div class="modal-config-item">
            <label><i class="fas fa-bug"></i> ${translate("settingsModal.bugLabel")}</label>
            <button class="report-bug-btn" title="${translate("settingsModal.bugReportTitle")}">
              <span class="config-text">${translate("reportBug")}</span>
            </button>
          </div>

          <div class="modal-config-item">
            <label><i class="fas fa-headset"></i> ${translate("settingsModal.supportLabel")}</label>
            <button class="contact-support-btn" title="${translate("settingsModal.supportTitle")}">
              <span class="config-text">${translate("settingsModal.supportBtn")}</span>
            </button>
          </div>

          <div class="modal-config-item config-standalone-btn">
            <label><i class="fas fa-history"></i> ${translate("settingsModal.changelogLabel")}</label>
            <button class="changelog-btn">
              <span class="config-text">v${CURRENT_VERSION}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
    showConfirmButton: true,
    showCloseButton: true,
    confirmButtonText: `<i class='fas fa-times'></i> ${translate("close")}`,
    customClass: {
      popup: "swal2-modal-config-popup",
      actions: "center",
    },
    didOpen: () => {
      const $sections = $(".config-accordion-section");
      $sections.eq(openSection).addClass("open");

      $(".config-accordion-header").on("click", function () {
        const $section = $(this).closest(".config-accordion-section");
        const wasOpen = $section.hasClass("open");
        $sections.removeClass("open");
        if (!wasOpen) {
          $section.addClass("open");
          _configOpenSection = $sections.index($section);
        } else {
          _configOpenSection = 0;
        }
      });

      updateSoundButtonUI();
      updateVibrationButtonUI();
      updateChatMuteButtonUI();
      updateDarkModeUI();
      updateCardStyleUI();

      $(".toggle-sound-btn").on("click", () => {
        isMuted = !isMuted;
        localStorage.setItem(MUTE_STORAGE_KEY, isMuted);
        updateSoundButtonUI();
        updateChatMuteButtonUI();

        if (!isMuted) {
          playFeedback("uiClick");
        }
      });

      $(".toggle-chat-mute-btn").on("click", () => {
        isChatMuted = !isChatMuted;
        localStorage.setItem(CHAT_MUTE_STORAGE_KEY, isChatMuted);
        updateChatMuteButtonUI();

        if (!isChatMuted) {
          playFeedback("newMessage");
          $("#show-chat-btn").removeClass("has-new-message");
          $(".mobile-chat-btn").removeClass("has-new-message");
        }
      });

      if (isVibrationAvailable()) {
        $(".toggle-vibrate-btn").on("click", () => {
          isVibratingOff = !isVibratingOff;
          localStorage.setItem(VIBRATION_STORAGE_KEY, isVibratingOff);
          updateVibrationButtonUI();
          if (!isVibratingOff) {
            playFeedback("cliqueConfig");
          }
        });
      } else {
        $(".vibration-config-item").hide();
      }

      $(".lang-btn-modal").on("click", function () {
        const newLang = $(this).data("lang");
        if (newLang !== currentLanguage) {
          currentLanguage = newLang;
          localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
          if (currentUser) {
            database.ref(`users/${currentUser.uid}/language`).set(newLang);
          }
          $(".lang-btn-modal").removeClass("active");
          $(this).addClass("active");
          applyTranslations();
          Swal.close();
          setTimeout(modalConfigOpen, 100);
        }
      });

      $(".toggle-dark-mode-btn").on("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("sequenceDarkMode", isDark);
        updateDarkModeUI();
      });

      $(".toggle-card-style-btn").on("click", () => {
        const currentStyle = localStorage.getItem("sequenceCardStyle") || "outline";
        const currentIndex = CARD_STYLES.findIndex(s => s.key === currentStyle);
        const nextIndex = (currentIndex + 1) % CARD_STYLES.length;
        const nextStyle = CARD_STYLES[nextIndex];

        localStorage.setItem("sequenceCardStyle", nextStyle.key);
        applyCardStyle(nextStyle);
        updateCardStyleUI();
      });

      const autoDrawEnabled = localStorage.getItem("sequenceAutoDrawOffline") === "true";
      const $autoDrawBtn = $(".toggle-auto-draw-btn");
      $autoDrawBtn.find(".config-text").text(autoDrawEnabled ? translate("on") : translate("off"));
      $autoDrawBtn.toggleClass("active", autoDrawEnabled);
      $autoDrawBtn.on("click", () => {
        const current = localStorage.getItem("sequenceAutoDrawOffline") === "true";
        const newVal = !current;
        localStorage.setItem("sequenceAutoDrawOffline", String(newVal));
        $autoDrawBtn.find(".config-text").text(newVal ? translate("on") : translate("off"));
        $autoDrawBtn.toggleClass("active", newVal);
        if (localGameData?.settings) {
          localGameData.settings.autoDraw = newVal;
          if (isLocalGame) saveLocalGame();
        }
      });

      const reshuffleEnabled = localStorage.getItem("sequenceReshuffleOffline") !== "false";
      const $reshuffleBtn = $(".toggle-reshuffle-btn");
      $reshuffleBtn.find(".config-text").text(reshuffleEnabled ? translate("on") : translate("off"));
      $reshuffleBtn.toggleClass("active", reshuffleEnabled);
      $reshuffleBtn.on("click", () => {
        const current = localStorage.getItem("sequenceReshuffleOffline") !== "false";
        const newVal = !current;
        localStorage.setItem("sequenceReshuffleOffline", String(newVal));
        $reshuffleBtn.find(".config-text").text(newVal ? translate("on") : translate("off"));
        $reshuffleBtn.toggleClass("active", newVal);
        if (localGameData?.settings) {
          localGameData.settings.reshuffleOnEmpty = newVal;
          if (isLocalGame) saveLocalGame();
        }
      });

      const animationsEnabled = localStorage.getItem("sequenceAnimationsOff") !== "true";
      const $animationsBtn = $(".toggle-animations-btn");
      $animationsBtn.find(".config-text").text(animationsEnabled ? translate("on") : translate("off"));
      $animationsBtn.toggleClass("active", animationsEnabled);
      $animationsBtn.on("click", () => {
        const current = localStorage.getItem("sequenceAnimationsOff") !== "true";
        const newVal = !current;
        localStorage.setItem("sequenceAnimationsOff", String(!newVal));
        $animationsBtn.find(".config-text").text(newVal ? translate("on") : translate("off"));
        $animationsBtn.toggleClass("active", newVal);
      });

      const $notifBtn = $(".toggle-notifications-btn");
      const notifGranted = Notification.permission === "granted";
      $notifBtn.find(".config-text").text(notifGranted ? translate("on") : translate("off"));
      $notifBtn.toggleClass("active", notifGranted);
      if (!("Notification" in window) || !firebase.messaging) {
        $notifBtn.closest(".modal-config-item").hide();
      }
      $notifBtn.on("click", () => {
        if (Notification.permission === "granted") {
          const messaging = firebase.messaging();
          messaging.getToken({ vapidKey: VAPID_KEY }).then((token) => {
            if (token) {
              if (currentUser) {
                database.ref(`users/${currentUser.uid}/fcmTokens/${token}`).remove();
              } else {
                database.ref(`device_tokens/${getDeviceId()}/${token}`).remove();
              }
            }
            showToast(translate("auth.pushDisabled"), { icon: "info" });
            $notifBtn.find(".config-text").text(translate("off"));
            $notifBtn.removeClass("active");
          }).catch(() => {});
        } else {
          requestPushPermission();
          setTimeout(() => {
            const granted = Notification.permission === "granted";
            $notifBtn.find(".config-text").text(granted ? translate("on") : translate("off"));
            $notifBtn.toggleClass("active", granted);
          }, 1000);
        }
      });

      $(".game-tips-btn").on("click", strategyTipsOpen);
      $(".ai-info-btn").on("click", iAocumentationOpen);
      $(".feature-vote-btn").on("click", () =>
        openFeatureVotingModal("manual", true),
      );
      $(".game-review-btn").on("click", () => openReviewModal("manual", true));
      $(".report-bug-btn").on("click", reportBugOpen);
      $(".contact-support-btn").on("click", contactSupportOpen);
      $(".changelog-btn").on("click", () => openChangelogModal(true));
      $(".open-host-settings-btn").on("click", () => {
        Swal.close();
        openHostSettingsModal(
          currentGameDataState.settings,
          currentGameDataState.isPrivate,
          currentGameDataState.password,
          true,
        );
      });
    },
    didClose: () => {
      setTimeout(() => {
        tryShowPendingPrompt();
      }, 500);
    },
  });
}

$(function () {
  const $chatContainer = $(".chat-btn-container");
  const storageKey = "chatBtnPosition";
  const savedPosition = localStorage.getItem(storageKey);
  if (savedPosition) {
    const pos = JSON.parse(savedPosition);
    $chatContainer.css({
      left: pos.left + "px",
      top: pos.top + "px",
      right: "auto",
      bottom: "auto",
      position: "fixed",
    });
  }

  let isDragging = false;
  let hasDragged = false;
  let startX, startY;

  $chatContainer.on("mousedown touchstart", function (e) {
    isDragging = true;
    hasDragged = false;

    const startEvent = e.type === "touchstart" ? e.originalEvent.touches[0] : e;
    startX = startEvent.clientX;
    startY = startEvent.clientY;
  });

  $(document).on("mousemove touchmove", function (e) {
    if (!isDragging) return;

    const moveEvent = e.type === "touchmove" ? e.originalEvent.touches[0] : e;

    if (
      Math.abs(moveEvent.clientX - startX) > 5 ||
      Math.abs(moveEvent.clientY - startY) > 5
    ) {
      hasDragged = true;
    }

    if (hasDragged) {
      e.preventDefault();
      $chatContainer.addClass("dragging");

      const x = moveEvent.clientX;
      const y = moveEvent.clientY;

      $chatContainer.css({
        left: x - $chatContainer.outerWidth() / 2 + "px",
        top: y - $chatContainer.outerHeight() / 2 + "px",
        right: "auto",
        bottom: "auto",
        position: "fixed",
      });
    }
  });

  $(document).on("mouseup touchend", function () {
    if (isDragging) {
      if (hasDragged) {
        const offset = $chatContainer.offset();
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            left: offset.left,
            top: offset.top,
          }),
        );
      }

      setTimeout(() => {
        isDragging = false;
        hasDragged = false;
        $chatContainer.removeClass("dragging");
      }, 100);
    }
  });

  $("#show-chat-btn").on("click", function (e) {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    $("#chat-container").addClass("show");
    $(this).removeClass("has-new-message");
  });

  let resizeTimer;

  $(window).on("resize", function () {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(function () {
      localStorage.removeItem(storageKey);

      $chatContainer.css({
        left: "",
        top: "",
        right: "",
        bottom: "",
        position: "",
      });
    }, 250);
  });

  $(".mobile-chat-btn").on("click", function () {
    $("#chat-container").addClass("show");
    $(this).removeClass("has-new-message");
    $("#show-chat-btn").removeClass("has-new-message");
  });
});


window.forceSkipTurn = function () {
  if (!amITheHost || isLocalGame) return;

  selectedHandCard = null;
  $(".card-in-hand").removeClass("selected");
  clearHighlights();

  showToast(translate("skipOfflinePlayer"), { icon: "info" });
  endTurnAndAdvance(true);
};

window.forceBotTakeover = function() {
  if (!amITheHost || !currentGameId) return;

  const currentPlayerId = currentGameDataState.turnOrder[currentGameDataState.currentPlayerIndex];
  const player = currentGameDataState.players[currentPlayerId];

  if (!player) return;

  Swal.fire({
      title: translate("activateBotBtn") + "?",
      text: translate("botTakeoverConfirm", { playerName: player.name }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: translate("botTakeoverActivateBtn"),
      cancelButtonText: translate("cancel")
  }).then((result) => {
      if (result.isConfirmed) {
          database.ref(`games/${currentGameId}`).transaction((gameData) => {
              if (!gameData || !gameData.players[currentPlayerId]) return;

              const p = gameData.players[currentPlayerId];

              p.isBot = true;
              p.isTempBot = true; 
              p.online = true;
              p.disconnectedAt = null;

              gameData.gameMessage = {
                  key: "botTakeoverManual",
                  params: { playerName: p.name }
              };

              return gameData;
          }).then((result) => {
            if (result.committed) {
                const updatedGameData = result.snapshot.val();
                const currentPId = updatedGameData.turnOrder[updatedGameData.currentPlayerIndex];
                
                if (currentPId === currentPlayerId) {
                    const botPlayer = updatedGameData.players[currentPlayerId];
                    setTimeout(() => {
                        executeBotTurnAsHost(updatedGameData, botPlayer);
                    }, 2500);
                }
            }
        });
      }
  });
};

function incrementGamesPlayedCount() {
  let count = parseInt(localStorage.getItem("gamesPlayedCount") || "0");
  count++;
  localStorage.setItem("gamesPlayedCount", count.toString());

  checkSmartPrompts("game_finished");
}

function checkSmartPrompts(triggerType) {
  if (isDevEnv) return;
  let pending = null;
  try {
    pending = JSON.parse(localStorage.getItem("pendingSmartPrompt"));
  } catch {}

  if (pending && pending.type === "review") return;

  const now = Date.now();

  const gamesPlayed = parseInt(localStorage.getItem("gamesPlayedCount") || "0");
  const lastReview = localStorage.getItem("lastReviewTimestamp");
  const hasVoted = localStorage.getItem(`hasVotedFeature_${CURRENT_VOTE_VERSION}`);

  const ignoredCount = parseInt(
    localStorage.getItem("reviewIgnoredCount") || "0",
  );
  const nextAttempt = parseInt(
    localStorage.getItem("nextReviewAttempt") || "0",
  );

  const voteIgnored = parseInt(
    localStorage.getItem(`voteIgnoredCount_${CURRENT_VOTE_VERSION}`) || "0",
  );
  const nextVoteAttempt = parseInt(
    localStorage.getItem(`nextVoteAttempt_${CURRENT_VOTE_VERSION}`) || "0",
  );

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const timeSinceReview = lastReview ? now - parseInt(lastReview) : Infinity;

  const isEligibleForReview =
    ignoredCount < 3 &&
    now >= nextAttempt &&
    gamesPlayed >= 2 &&
    (!lastReview || timeSinceReview > thirtyDays);

  if (isEligibleForReview) {
    localStorage.setItem(
      "pendingSmartPrompt",
      JSON.stringify({
        type: "review",
        trigger: triggerType,
      }),
    );
    tryShowPendingPrompt();
    return;
  }

  if (
    !hasVoted &&
    gamesPlayed >= 3 &&
    voteIgnored < 3 &&
    now >= nextVoteAttempt
  ) {
    localStorage.setItem(
      "pendingSmartPrompt",
      JSON.stringify({
        type: "vote",
        trigger: triggerType,
      }),
    );
    tryShowPendingPrompt();
  }
}

function tryShowPendingPrompt() {
  if (Swal.isVisible()) return;
  if (currentGameId) return;

  const now = Date.now();
  const lastPrompt = parseInt(
    localStorage.getItem("lastSmartPromptTimestamp") || "0",
  );
  const COOLDOWN_MS = 10 * 60 * 1000;

  if (now - lastPrompt < COOLDOWN_MS) return;

  const pendingRaw = localStorage.getItem("pendingSmartPrompt");
  if (!pendingRaw) return;

  let pending;
  try {
    pending = JSON.parse(pendingRaw);
  } catch {
    localStorage.removeItem("pendingSmartPrompt");
    return;
  }

  localStorage.removeItem("pendingSmartPrompt");

  if (pending.type === "vote") {
    const nextVoteAttempt = parseInt(localStorage.getItem(`nextVoteAttempt_${CURRENT_VOTE_VERSION}`) || "0");
    if (now < nextVoteAttempt) return;
  }

  localStorage.setItem("lastSmartPromptTimestamp", now.toString());

  if (pending.type === "review") {
    openReviewModal(pending.trigger || "auto");
  } else if (pending.type === "vote") {
    openFeatureVotingModal(pending.trigger || "auto");
  }
}

function getDeviceId() {
  let deviceId = localStorage.getItem("sequenceDeviceId");
  if (!deviceId) {
    deviceId =
      "dev_" +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36);
    localStorage.setItem("sequenceDeviceId", deviceId);
  }
  return deviceId;
}

function checkStartupNotifications() {
  if (Swal.isVisible()) {
    const interval = setInterval(() => {
      if (!Swal.isVisible()) {
        clearInterval(interval);
        runNotificationQueue();
      }
    }, 500);
  } else {
    runNotificationQueue();
  }
}

function runNotificationQueue() {
  checkPendingResponses().then(() => checkFriendAcceptedNotifications());
}

function checkPendingResponses() {
  return new Promise((resolve) => {
    const targetId = (currentUser && currentUser.uid) || getDeviceId();
    database.ref(`responses/${targetId}`).orderByChild("read").equalTo(false).once("value", (snapshot) => {
      const responses = snapshot.val();
      if (!responses) { resolve(); return; }

      const entries = Object.entries(responses);
      const first = entries[0];
      if (!first) { resolve(); return; }

      const [responseKey, data] = first;
      const typeLabel = data.type === 'bug' ? translate("responseBugTitle") : translate("responseSupportTitle");
      const typeIcon = data.type === 'bug' ? 'fa-bug' : 'fa-headset';

      Swal.fire({
        title: `<i class="fas ${typeIcon}"></i> ${typeLabel}`,
        html: `<p style="text-align:left;line-height:1.6;">${data.message.replace(/\n/g, '<br>')}</p>`,
        icon: "info",
        confirmButtonText: translate("close"),
        showCloseButton: true,
      }).then(() => {
        database.ref(`responses/${targetId}/${responseKey}/read`).set(true);
        resolve();
      });
    });
  });
}

function checkFriendAcceptedNotifications() {
  return new Promise((resolve) => {
    if (!currentUser) { resolve(); return; }
    const uid = currentUser.uid;

    database.ref(`friend_accepted_notifications/${uid}`).orderByChild("read").equalTo(false).once("value", (snapshot) => {
      const notifications = snapshot.val();
      if (!notifications) { resolve(); return; }

      const entries = Object.entries(notifications);
      if (entries.length === 0) { resolve(); return; }

      let html = "";
      if (entries.length === 1) {
        const username = entries[0][1].fromUsername || "???";
        html = `<p>${translate("friends.acceptedNotifBody", { username })}</p>`;
      } else {
        const names = entries.map(([, d]) => d.fromUsername || "???");
        html = `<ul style="text-align:left;margin:10px 0;padding-left:20px;line-height:1.8;">
          ${names.map(n => `<li><b>${n}</b></li>`).join("")}
        </ul>`;
      }

      Swal.fire({
        title: `<i class="fas fa-user-check"></i> ${translate("friends.acceptedNotifTitle")}`,
        html: html,
        icon: "success",
        confirmButtonText: translate("close"),
        showCloseButton: true,
      }).then(() => {
        const updates = {};
        entries.forEach(([key]) => {
          updates[`friend_accepted_notifications/${uid}/${key}/read`] = true;
        });
        database.ref().update(updates);
        resolve();
      });
    });
  });
}

function checkAndShowUpdateModal() {
  const botPattern = /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Lighthouse|Chrome-Lighthouse/i;
  
  if (botPattern.test(navigator.userAgent) || !window.localStorage) return;

  if (localStorage.getItem("sequence_version_seen") !== CURRENT_VERSION) {
    openChangelogModal();
    localStorage.setItem("sequence_version_seen", CURRENT_VERSION);
  }
}

function openChangelogModal(backSettings = false) {
  const logs = translate("changelog");

  if (!Array.isArray(logs)) return;

  let htmlContent = '<div class="changelog-container">';

  logs.forEach((log) => {
    const highlightClass = log.highlight ? "highlight" : "";
    const badge = log.highlight
    ? `<span class="release-badge">${translate("currentVersionBadge")}</span>`
      : "";

    let listItems = "";
    log.changes.forEach((change) => {
      listItems += `<li>${change}</li>`;
    });

    htmlContent += `
          <div class="release-item ${highlightClass}">
              <div class="release-header">
                  <span class="release-version">v${log.version} ${badge}</span>
                  <span class="release-date">${log.date}</span>
              </div>
              <ul class="release-list">
                  ${listItems}
              </ul>
          </div>
      `;
  });

  htmlContent += "</div>";

  Swal.fire({
    title: translate("changelogTitle"),
    html: htmlContent,
    icon: "info",
    confirmButtonText: translate("understood"),
    showCloseButton: true,
    customClass: {
      popup: "swal2-modal-config-popup",
    },
  }).then(() => {
    if (backSettings) {
      modalConfigOpen();
    }
  });
}

function incrementAnalytics(counters) {
  if (typeof database === "undefined" || !database) return;

  if (isDevEnv) {
    console.log("Analytics (DEV MODE):", counters);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const updates = {};

  for (const key in counters) {
    const value = counters[key];
    updates[`analytics/daily_metrics/${today}/${key}`] =
      firebase.database.ServerValue.increment(value);
    updates[`analytics/total_metrics/${key}`] =
      firebase.database.ServerValue.increment(value);
  }

  database
    .ref()
    .update(updates)
    .catch((err) => console.warn("Analytics error:", err));
}

function trackCountryVisitLobby() {
  if (typeof database === "undefined" || !database) return;
  if (isDevEnv) return;
  if (/bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|semrushbot|lighthouse|headlesschrome|pagespeed|google-inspectiontool|mediapartners-google|adsbot-google|google-adwords|google-ads|googleadsense|apis-google|feedfetcher-google/i.test(navigator.userAgent)) return;

  const updates = {};

  if (!sessionStorage.getItem("metricsTracked_global")) {
    sessionStorage.setItem("metricsTracked_global", "1");
    const lang = currentLanguage || "pt";
    updates[`metrics/language_visits/${lang}`] = firebase.database.ServerValue.increment(1);
    const ua = navigator.userAgent;
    let os = "other";
    if (/Android/i.test(ua)) os = "android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "ios";
    else if (/Windows/i.test(ua)) os = "windows";
    else if (/Mac/i.test(ua)) os = "mac";
    else if (/Linux/i.test(ua)) os = "linux";
    let deviceType = "desktop";
    if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) deviceType = "mobile";
    else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";
    updates[`metrics/device_visits/${os}`] = firebase.database.ServerValue.increment(1);
    updates[`metrics/device_type_visits/${deviceType}`] = firebase.database.ServerValue.increment(1);
  }

  fetch("https://api.country.is/")
    .then(res => res.json())
    .then(data => {
      if (data && data.country) {
        updates[`metrics/country_visits/lobby/${data.country}`] = firebase.database.ServerValue.increment(1);
        updates[`metrics/country_last_seen/${data.country}`] = firebase.database.ServerValue.TIMESTAMP;
      }
      if (Object.keys(updates).length > 0) {
        database.ref().update(updates).catch(() => {});
      }
    })
    .catch(() => {
      if (Object.keys(updates).length > 0) {
        database.ref().update(updates).catch(() => {});
      }
    });
}

function registerPwaInstall() {
  if (typeof database === "undefined" || !database) return;
  const deviceId = getDeviceId();
  const alreadyRegistered = localStorage.getItem("sequencePwaInstallRegistered");
  if (alreadyRegistered) return;

  database.ref(`stats/pwa_installs/${deviceId}`).once("value", (snapshot) => {
    if (snapshot.exists()) {
      localStorage.setItem("sequencePwaInstallRegistered", "true");
      return;
    }
    const platform = navigator.userAgent.includes("Android") ? "android" : 
                navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad") ? "ios" : 
                navigator.userAgent.includes("Windows") ? "windows" :
                navigator.userAgent.includes("Mac") ? "mac" : 
                navigator.userAgent.includes("Linux") ? "linux" : "outro";
    const updates = {};
    updates[`stats/pwa_installs/${deviceId}`] = {
      installedAt: firebase.database.ServerValue.TIMESTAMP,
      platform: platform
    };
    updates[`stats/pwa_install_count`] = firebase.database.ServerValue.increment(1);
    updates[`stats/pwa_platforms/${platform}`] = firebase.database.ServerValue.increment(1);
    database.ref().update(updates).then(() => {
      localStorage.setItem("sequencePwaInstallRegistered", "true");
      incrementAnalytics({ pwa_installs: 1 });
    });
  });
}

function checkExistingPwaInstall() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  if (isStandalone) {
    registerPwaInstall();
  }
}

function incrementPromptMetric(metricKey) {
  if (isDevEnv) return;
  database
    .ref(`metrics/ui_prompts/${metricKey}`)
    .set(firebase.database.ServerValue.increment(1));
}

function logGameEvent(category, gameId, type) {
  if (typeof database === "undefined" || !database) return;

  if (isDevEnv) {
    console.log("Log (DEV MODE):", category, gameId, type);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const logData = {
    gameId: gameId,
    type: type,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    humanTime: now.toLocaleTimeString("pt-BR") + `.${now.getMilliseconds()}`,
  };

  database
    .ref(`analytics_logs/${today}/${category}`)
    .push(logData)
    .catch((err) => console.warn("Log falhou (sem impacto no jogo):", err));
}
