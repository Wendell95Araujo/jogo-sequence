$(document).ready(function () {
  if ("serviceWorker" in navigator) {
    let deferredPrompt;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $("#installApp").css("display", "flex").show();
      buttonAppInstall();
    });

    $("#installAppButton").on("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          $("#installApp").hide();
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
const TEAM_COLORS = { team1: "red", team2: "blue", team3: "green" };
const CARDS_PER_PLAYER = { 2: 7, 3: 6, 4: 6, 6: 5, 8: 4, 9: 4, 10: 3, 12: 3 };
const SEQUENCES_TO_WIN = { 2: 2, 3: 1 };
const MIN_CARDS_IN_HAND = {
  2: 5,
  3: 4,
  4: 4,
  6: 3,
  8: 3,
  9: 3,
  10: 3,
  12: 3,
};
const hostname = window.location.hostname;
const isDevEnv =
  hostname === "localhost" ||
  hostname.startsWith("127.") ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname === "::1";
const baseURL = isDevEnv
  ? `${window.location.origin}/public`
  : window.location.origin;

const RECONNECTION_GRACE_PERIOD_MS = 30000;

const isVibrationAvailable = () => {
  return "vibrate" in navigator;
};

const feedbacks = {
  draw: {
    audio: new Audio(`${baseURL}/assets/sounds/drawOrDefeat.wav`),
    vibration: [250, 150, 250],
  },
  defeat: {
    audio: new Audio(`${baseURL}/assets/sounds/drawOrDefeat.wav`),
    vibration: [500, 200, 200],
  },
  sequenceSuccess: {
    audio: new Audio(`${baseURL}/assets/sounds/madeSequence.wav`),
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
    audio: new Audio(`${baseURL}/assets/sounds/winner.wav`),
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

const MUTE_STORAGE_KEY = "sequenceGameMuted";
const VIBRATION_STORAGE_KEY = "sequenceGameVibrationOff";
const NICKNAME_STORAGE_KEY = "sequenceGameNickname";
const GAMEMODE_STORAGE_KEY = "sequenceGameMode";
const BOT_DIFFICULTY_STORAGE_KEY = "sequenceGameBotDifficulty";
const AVATAR_STORAGE_KEY = "sequenceGameAvatar";
const TOTAL_AVATARS = 42;

let myPlayerId = null;
let myTeamId = null;
let myPlayerName = null;
let currentGameId = null;
let selectedHandCard = null;
let drawTimer = null;
let drawCountdownInterval = null;
let lastMessageCount = 0;
let previousPlayersState = {};
let isLocalGame = false;
let isInitialLoad = true;
let previousGameData = {};
let hasPlayedNewMessageSound = false;
let isMuted = false;
let isVibratingOff = false;
let isReconnecting = false;
let amITheHost = false;
let selectedAvatarId = 1;
let connectionStatus = "connecting";
let currentGameDataState = {};

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
    const avatarImg = $("<img>")
      .addClass("avatar-option")
      .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${i}`)
      .attr("data-avatar-id", i)
      .attr("alt", `Avatar ${i}`);

    if (i === selectedAvatarId) {
      avatarImg.addClass("selected-avatar");
    }

    panel.append(avatarImg);
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

$("#avatar-dropdown-panel").on("click", ".avatar-option", function () {
  selectedAvatarId = parseInt($(this).attr("data-avatar-id"));
  $("#avatar-dropdown-selected img")
    .attr("src", $(this).attr("src"))
    .attr("alt", $(this).attr("alt"));
  $("#avatar-dropdown-panel .avatar-option").removeClass("selected-avatar");
  $(this).addClass("selected-avatar");
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
  const $onlineLabel = $("#online-label");
  const $bugReportBtn = $(".report-bug-btn");

  esconderLoading();

  if (!online) {
    connectionStatus = options.isConnecting ? "connecting" : "offline";
    $createRoom.addClass("offline-disabled");
    $idRomInput.prop("disabled", true);
    $enterRoom.addClass("offline-disabled");
    $findRandom.addClass("offline-disabled");
    $onlineLabel.css("opacity", 0.6);
    $bugReportBtn.hide();
    $("#server-info").hide();

    if (!options.isConnecting) {
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
    $onlineLabel.css("opacity", 1);
    $bugReportBtn.show();

    if (options.toastMessage) {
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
      runDailyCleanupIfNeeded();
    }
  };

  database.ref(".info/connected").on("value", connectionListener);

  window.firebaseConnectionTimeout = setTimeout(() => {
    database.ref(".info/connected").off("value", connectionListener);
    const toastMessage = isInitial
      ? translate("noConnectionPracticeOnly")
      : translate("reconnectFailed");
    setOnlineMode(false, { toastMessage: toastMessage });
  }, 7000);
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
  mostrarLoading();
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
  checkUrlForGame();
  initializeConfigState();
  applyTranslations();
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
  const $labelIcon = $button.siblings("label").find("i");

  if (isMuted) {
    $text.text(translate("off"));
    $button.attr("title", translate("clickToUnmute"));
    $labelIcon
      .removeClass("fa-volume-high")
      .addClass("fa-volume-xmark")
      .removeClass("text-success")
      .addClass("text-muted");
  } else {
    $text.text(translate("on"));
    $button.attr("title", translate("clickToMute"));
    $labelIcon
      .removeClass("fa-volume-xmark")
      .addClass("fa-volume-high")
      .removeClass("text-muted")
      .addClass("text-success");
  }
}

function updateVibrationButtonUI() {
  const $button = $(".toggle-vibrate-btn");
  const $text = $button.find("span");
  const $labelIcon = $button.siblings("label").find("i");

  if (!isVibrationAvailable()) {
    $button.prop("disabled", true);
    $text.text(translate("unavailable"));
    $button.attr("title", translate("vibrationNotSupported"));
    $labelIcon.removeClass("text-success").addClass("text-muted");
    return;
  }

  if (isVibratingOff) {
    $text.text(translate("off"));
    $button.attr("title", translate("clickToEnableVibration"));
    $labelIcon.removeClass("text-success").addClass("text-muted");
  } else {
    $text.text(translate("on"));
    $button.attr("title", translate("clickToDisableVibration"));
    $labelIcon.removeClass("text-muted").addClass("text-success");
  }
}

initializeConfigState();

function initializeConfigState() {
  const savedMuteState = localStorage.getItem(MUTE_STORAGE_KEY);
  const savedVibrateState = localStorage.getItem(VIBRATION_STORAGE_KEY);

  isMuted = savedMuteState === "true";
  isVibratingOff = savedVibrateState === "true";
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
  $loadingDiv.fadeOut(300);
}

mostrarLoading();

function updateLobbyInfo() {
  const gamesRef = database.ref("games");
  gamesRef.on("value", (snapshot) => {
    const allGames = snapshot.val();

    let realGameCount = 0;
    let realOnlinePlayerCount = 0;

    if (allGames) {
      realGameCount = Object.keys(allGames).length;

      Object.values(allGames).forEach((game) => {
        if (game.players) {
          Object.values(game.players).forEach((player) => {
            if (player.online === true) {
              realOnlinePlayerCount++;
            }
          });
        }
      });
    }
    const simulatedActiveGames =
      realGameCount + Math.floor(Math.random() * 8) + 5;
    const basePlayers = simulatedActiveGames * 2;
    const randomAddition = Math.floor(Math.random() * 3) + 4;
    const simulatedOnlinePlayers = Math.max(
      realOnlinePlayerCount,
      basePlayers + randomAddition
    );

    const $playerCountSpan = $("#player-online-count");
    let playerDisplayText = `<i class="fad fa-user-group"></i> <b>${simulatedOnlinePlayers}</b> ${translate(
      "playersOnline"
    )}`;

    $playerCountSpan.html(playerDisplayText);

    const $activeGamesSpan = $("#active-games-count");
    let activeGameText = `<i class="fad fa-cards"></i> <b>${simulatedActiveGames}</b> ${translate(
      "activeGames"
    )}`;

    $activeGamesSpan.html(activeGameText);

    $("#server-info").css("display", "flex").show();
    esconderLoading();
  });
}

updateLobbyInfo();
runDailyCleanupIfNeeded();

function checkUrlForGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameIdFromUrl = urlParams.get("game");
  if (gameIdFromUrl) {
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

  if (isLocalGame) {
    onDeckClickLocal();
  } else {
    clearTimeout(drawTimer);
    endTurnAndAdvance();
  }
});

function endTurnAndAdvance(isTimeout = false) {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData || gameData.gameState === "finished") return;

      if (gameData.turnOrder[gameData.currentPlayerIndex] !== myPlayerId) {
        return;
      }

      const player = gameData.players[myPlayerId];
      const handSize = (player.hand || []).length;
      const minCardsForThisGame = MIN_CARDS_IN_HAND[gameData.playerCount];
      let shouldDraw = false;

      if (isTimeout) {
        if (handSize < minCardsForThisGame) {
          shouldDraw = true;
        }
      } else {
        if (gameData.turnState === "drawing") {
          shouldDraw = true;
        }
      }

      if (shouldDraw && gameData.deck && gameData.deck.length > 0) {
        const newCard = gameData.deck.pop();
        if (!gameData.players[myPlayerId].hand) {
          gameData.players[myPlayerId].hand = [];
        }
        gameData.players[myPlayerId].hand.push(newCard);
      }

      let nextPlayerIndex = gameData.currentPlayerIndex;
      let playersChecked = 0;
      let foundNextPlayer = false;

      do {
        nextPlayerIndex = (nextPlayerIndex + 1) % gameData.playerCount;
        playersChecked++;
        const nextPlayer =
          gameData.players[gameData.turnOrder[nextPlayerIndex]];
        if (
          (gameData.deck && gameData.deck.length > 0) ||
          canPlayerPlay(nextPlayer, gameData.boardState)
        ) {
          foundNextPlayer = true;
          break;
        }
      } while (playersChecked < gameData.playerCount);

      if (!foundNextPlayer && (!gameData.deck || gameData.deck.length === 0)) {
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
        if (maxSequences <= 0 || winningTeams.length === 0) {
          gameData.gameMessage = { key: "noMorePlays" };
          gameData.winner = null;
        } else if (winningTeams.length === 1) {
          const winnerId = winningTeams[0];
          gameData.winner = winnerId;
          const winningTeamName = translate(
            `teamNames.${gameData.teams[winnerId].color}`
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
        const nextPlayerName =
          gameData.players[gameData.turnOrder[nextPlayerIndex]].name;
        gameData.gameMessage = {
          key: "waitingForPlayer",
          params: { playerName: nextPlayerName },
        };
      }

      return gameData;
    })
    .catch((error) => {});
}

$("#hide-chat-btn").on("click", function () {
  $("#chat-container").removeClass("show");
});

function sendChatMessage() {
  const messageText = $("#chat-input").val().trim();
  if (messageText === "" || !currentGameId || !myPlayerId) {
    return;
  }
  const messageData = {
    playerId: myPlayerId,
    playerName: myPlayerName,
    text: messageText,
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
  const gameId = $("#game-id-input").val().toUpperCase();
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

$(".copy-id-btn").on("click", function () {
  const gameCode = window.location.href;
  navigator.clipboard.writeText(gameCode).then(() => {
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
  mostrarLoading();
  findRandomGame();
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
          "leaveGameOnlineConfirm"
        )}`,
    denyButtonText: `<i class='fas fa-right-from-bracket'></i> ${translate(
      "leaveWithoutSaving"
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
  if (!currentGameId || !myPlayerId) {
    window.location.href = window.location.pathname;
    return;
  }

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;

      if (gameData.players && gameData.players[myPlayerId]) {
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
        (p) => p.online === true
      );

      if (!isAnyoneElseOnline) {
        const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
        gameData.expirationTimestamp = Date.now() + FIFTEEN_MINUTES_MS;
        gameData.gameMessage = { key: "everyoneLeft" };
      }

      return gameData;
    })
    .then(() => {
      localStorage.removeItem("sequenceGameData");
      window.history.pushState({}, "", window.location.pathname);
      window.location.reload();
    })
    .catch((error) => {
      showToast(translate("error.leaveGame"), {
        icon: "error",
      });
    });
}

function findRandomGame() {
  const gamesRef = database.ref("games");
  gamesRef
    .orderByChild("gameState")
    .limitToFirst(50)
    .once("value", (snapshot) => {
      esconderLoading();
      const games = snapshot.val();
      let gameToJoin = null;
      myPlayerName = $("#player-name-input").val().trim();

      if (games) {
        gameToJoin = Object.values(games).find((game) => {
          if (game.isPrivate) {
            return false;
          }

          const players = game.players || {};
          const isNameTaken = Object.values(players).some((p) => {
            if (p && p.name) {
              return (
                p.name.toLowerCase() === myPlayerName.toLowerCase() && p.online
              );
            }
            return false;
          });

          if (isNameTaken) {
            return false;
          }

          const isWaitingWithSlots =
            (game.gameState === "waiting" ||
              game.gameState === "team-selection") &&
            Object.keys(players).length < game.playerCount;

          const hasJoinableOfflineSlot =
            game.gameState === "playing" &&
            Object.values(players).some((p) => {
              if (p.online !== false) return false;
              if (!p.disconnectedAt) return true;
              return (
                Date.now() - p.disconnectedAt > RECONNECTION_GRACE_PERIOD_MS
              );
            });

          return isWaitingWithSlots || hasJoinableOfflineSlot;
        });
      }

      if (gameToJoin) {
        const onlinePlayerName =
          Object.values(gameToJoin.players).find((p) => p.online)?.name ||
          translate("general.someone");
        showToast(
          translate("joiningGameOf", { playerName: onlinePlayerName }),
          { icon: "success" }
        );
        joinGame(gameToJoin.gameId, myPlayerName);
      } else {
        showToast(translate("findingOpponent"), { icon: "info", timer: 15000 });

        setTimeout(() => {
          showToast(translate("matchFound"), { icon: "success", timer: 1500 });
        }, 1500);

        setTimeout(() => {
          saveLobbySettings();
          myPlayerName =
            $("#player-name-input").val().trim() ||
            translate("defaultPlayerName");

          const isTwoPlayerGame = Math.random() < 0.7;
          const playerCount = isTwoPlayerGame ? 2 : 3;
          const numTeams = isTwoPlayerGame ? 2 : 3;

          const availableColors = ["red", "blue", "green"];
          const userColor = availableColors.splice(
            Math.floor(Math.random() * availableColors.length),
            1
          )[0];
          const botColors = [];
          for (let i = 1; i < numTeams; i++) {
            botColors.push(
              availableColors.splice(
                Math.floor(Math.random() * availableColors.length),
                1
              )[0]
            );
          }

          const availableBots = BOT_NAMES.filter(
            (bot) => bot.name.toLowerCase() !== myPlayerName.toLowerCase()
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
            id: `team1`,
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
            a.id.localeCompare(b.id)
          );
          for (let i = 0; i < maxMembersPerTeam; i++) {
            sortedTeams.forEach((team) => {
              if (team.members[i]) turnOrder.push(team.members[i]);
            });
          }

          const gameData = {
            gameId: gameId,
            isAutoGenerated: true,
            gameState: "playing",
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
            expirationTimestamp: Date.now() + 24 * 60 * 60 * 1000,
            rematchVotes: {},
            chat: {},
            botIntentions: {},
            botDifficulty: "expert",
          };

          database
            .ref("games/" + gameId)
            .set(gameData)
            .then(() => {
              setupGameUI(gameId);
            });
        }, 1500);
      }
    });
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

  const expirationTimestamp = Date.now() + 24 * 60 * 60 * 1000;
  const newGame = {
    gameId: gameId,
    isPrivate: false,
    gameState: "team-selection",
    capacity: 12,
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
      params: { current: 1, capacity: 12 },
    },
    winner: null,
    botIntentions: {},
    expirationTimestamp: expirationTimestamp,
  };
  database
    .ref("games/" + gameId)
    .set(newGame)
    .then(() => {
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

function joinGame(gameId, playerName) {
  const gameRef = database.ref("games/" + gameId);
  gameRef
    .once("value", (snapshot) => {
      const gameData = snapshot.val();

      if (!gameData) {
        esconderLoading();
        showToast(translate("roomNotFound"), {
          title: translate("error"),
          icon: "error",
        });
        return;
      }

      const players = gameData.players || {};

      const isNameTaken = Object.values(players).some((p) => {
        if (p && p.name) {
          return p.name.toLowerCase() === playerName.toLowerCase() && p.online;
        }
        return false;
      });

      if (isNameTaken) {
        esconderLoading();
        showToast(translate("nameInUse", { playerName: playerName }), {
          title: translate("nameInUseTitle"),
          icon: "warning",
          timer: 4000,
        });
        return;
      }

      gameRef
        .transaction((gameDataTx) => {
          if (!gameDataTx) return;

          const existingPlayer = Object.values(gameDataTx.players || {}).find(
            (p) => {
              if (p && p.name) {
                return p.name.toLowerCase() === playerName.toLowerCase();
              }
              return false;
            }
          );

          if (existingPlayer) {
            gameDataTx.players[existingPlayer.id].online = true;
            gameDataTx.players[existingPlayer.id].disconnectedAt = null;
          } else {
            const onlinePlayerCount = Object.values(
              gameDataTx.players || {}
            ).filter((p) => p.online).length;
            const capacity = gameDataTx.capacity || 12;
            if (
              onlinePlayerCount >= capacity &&
              gameDataTx.gameState !== "playing"
            ) {
              return;
            }
            if (
              gameDataTx.gameState === "waiting" ||
              gameDataTx.gameState === "team-selection"
            ) {
              const newPlayerId = `player${Date.now()}`;
              gameDataTx.players[newPlayerId] = {
                id: newPlayerId,
                name: playerName,
                avatar: selectedAvatarId,
                teamId: null,
                hand: [],
                online: true,
              };
            } else if (gameDataTx.gameState === "playing") {
              const now = Date.now();
              const disconnectedPlayerId = Object.keys(gameDataTx.players).find(
                (pid) => {
                  const player = gameDataTx.players[pid];
                  if (player.online !== false) return false;
                  if (!player.disconnectedAt) return true;
                  return (
                    now - player.disconnectedAt > RECONNECTION_GRACE_PERIOD_MS
                  );
                }
              );
              if (disconnectedPlayerId) {
                const oldPlayerName =
                  gameDataTx.players[disconnectedPlayerId].name;
                gameDataTx.players[disconnectedPlayerId].name = playerName;
                gameDataTx.players[disconnectedPlayerId].avatar =
                  selectedAvatarId;
                gameDataTx.players[disconnectedPlayerId].online = true;
                gameDataTx.players[disconnectedPlayerId].disconnectedAt = null;
                gameDataTx.gameMessage = {
                  key: "playerReplaced",
                  params: { newPlayer: playerName, oldPlayer: oldPlayerName },
                };
              } else {
                return;
              }
            } else {
              return;
            }
          }
          const wasAbandoned =
            Object.values(gameDataTx.players).filter((p) => p.online).length ===
            1;
          if (wasAbandoned) {
            const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
            gameDataTx.expirationTimestamp = Date.now() + TWENTY_FOUR_HOURS_MS;
            gameDataTx.gameMessage = {
              key: "playerReactivated",
              params: { playerName: playerName },
            };
          }
          return gameDataTx;
        })
        .then((result) => {
          if (!result.committed) {
            esconderLoading();
            showToast(translate("joinFailedFull"), {
              title: translate("joinFailedTitle"),
              icon: "warning",
              timer: 5000,
            });
            return;
          }
          const finalGameData = result.snapshot.val();

          const myData = Object.values(finalGameData.players).find((p) => {
            if (p && p.name) {
              return (
                p.name.toLowerCase() === playerName.toLowerCase() && p.online
              );
            }
            return false;
          });

          if (!myData) {
            esconderLoading();
            showToast(translate("joinError"), { icon: "error" });
            return;
          }

          myPlayerId = myData.id;
          myPlayerName = myData.name;
          currentGameId = gameId;
          setupGameUI(gameId);
        })
        .catch((error) => {
          esconderLoading();
          showToast(translate("joinError"), { icon: "error" });
        });
    })
    .catch((error) => {
      esconderLoading();
      showToast(translate("joinError"), {
        title: translate("networkError"),
        icon: "error",
      });
    });
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
      showToast(translate("error.addPlayer"), {
        icon: "error",
      });
      esconderLoading();
    });
}

function setupGameUI(gameId) {
  mostrarLoading();
  currentGameId = gameId;

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
    $("#lobby").hide();
    $(".chat-btn-container").show();
    $(".game-id-text").text(gameId);
    $(".persistent-game-info").show();
    listenToGameUpdates(gameId);
    setupPresenceSystem();
  } else {
    $("#lobby").hide();
    $(".game-id-text").text(translate("practice"));
    $(".copy-id-btn").hide();
    $(".chat-btn-container").hide();
    $(".persistent-game-info").show();
    $("#game-container").show();
  }
}

function listenToGameUpdates(gameId) {
  const gameRef = database.ref("games/" + gameId);
  isInitialLoad = true;

  gameRef.off();

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

    const myInitialPlayer = gameData.players
      ? gameData.players[myPlayerId]
      : null;
    if (myInitialPlayer && myInitialPlayer.host) {
      amITheHost = true;
    }

    if (
      amITheHost &&
      gameData.gameState === "team-selection" &&
      gameData.players
    ) {
      const playersToRemove = [];
      const playerKeys = Object.keys(gameData.players);
      playerKeys.forEach((playerKey) => {
        const player = gameData.players[playerKey];
        if (
          !player.id ||
          (player.id !== myPlayerId && player.online === false)
        ) {
          playersToRemove.push(playerKey);
        }
      });

      if (playersToRemove.length > 0) {
        const updates = {};
        playersToRemove.forEach((pKey) => {
          updates[`/players/${pKey}`] = null;
          delete gameData.players[pKey];
          const playerIdToRemove = originalPlayers[pKey]?.id;
          Object.entries(gameData.teams).forEach(([teamId, teamData]) => {
            if (
              playerIdToRemove &&
              teamData.members &&
              teamData.members.includes(playerIdToRemove)
            ) {
              const newMembers = teamData.members.filter(
                (memberId) => memberId !== playerIdToRemove
              );
              updates[`/teams/${teamId}/members`] = newMembers;
              if (gameData.teams[teamId])
                gameData.teams[teamId].members = newMembers;
            }
          });
        });
        database.ref(`games/${currentGameId}`).update(updates);
      }
    }

    currentGameDataState = gameData;
    previousGameData = JSON.parse(JSON.stringify(gameData));

    if (gameData.gameState === "team-selection") {
      renderTeamSelectionUI(gameData);
    } else {
      $("#team-selection-modal").hide();
      $("#game-container").show();
      renderAll(gameData);
      manageTurnState(gameData);
    }
    esconderLoading();

    const turnListener = (snapshot) => {
      const key = snapshot.key;
      const value = snapshot.val();
      const previousGameState = currentGameDataState.gameState;
      const previousPlayerIndex = previousGameData.currentPlayerIndex;

      currentGameDataState[key] = value;

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

          manageTurnState(currentGameDataState);

          const currentPlayerIndex = fullGameData.currentPlayerIndex;
          const currentPlayer =
            fullGameData.players[fullGameData.turnOrder[currentPlayerIndex]];

          if (amITheHost && currentPlayer && currentPlayer.isBot) {
            const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
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
            true
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
        const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
        setTimeout(() => {
          const latestCurrentPlayerIndex =
            currentGameDataState.currentPlayerIndex;
          if (latestCurrentPlayerIndex === currentPlayerIndex) {
            executeBotTurnAsHost(currentGameDataState, currentPlayer);
          }
        }, delay);
      }

      if (
        key === "gameState" &&
        value === "finished" &&
        previousGameState !== "finished"
      ) {
        handleGameFinished();
      }

      previousGameData[key] = value;
    };

    gameRef.child("boardState").on("value", (snapshot) => {
      if (!snapshot.val()) return;
      currentGameDataState.boardState = snapshot.val();
      renderBoard(currentGameDataState);
    });

    gameRef.child("lockedChips").on("value", (snapshot) => {
      currentGameDataState.lockedChips = snapshot.val() || {};
      renderBoard(currentGameDataState);
    });

    gameRef.child(`players/${myPlayerId}/hand`).on("value", (snapshot) => {
      if (currentGameDataState.gameState === "team-selection") {
        return;
      }
      const newHand = snapshot.val() || [];
      const oldHand = currentGameDataState.players?.[myPlayerId]?.hand || [];

      let newlyDrawnCard = null;

      if (newHand.length > oldHand.length) {
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
      }

      if (
        currentGameDataState.players &&
        currentGameDataState.players[myPlayerId]
      ) {
        currentGameDataState.players[myPlayerId].hand = newHand;
      }

      const isMyTurn =
        currentGameDataState.turnOrder &&
        currentGameDataState.turnOrder[
          currentGameDataState.currentPlayerIndex
        ] === myPlayerId;

      renderPlayerHand(
        newHand,
        currentGameDataState.gameState,
        newlyDrawnCard,
        currentGameDataState,
        isMyTurn
      );
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
        currentGameDataState.teams
      );
    });

    const pileListener = (snapshot) => {
      currentGameDataState[snapshot.key] = snapshot.val() || [];
      updateGameInfo(currentGameDataState);
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
            if (team.id !== myTeamId) playFeedback("sequenceSuccess");
          }
        });
      }
      currentGameDataState.teams = newTeams;
      if (previousGameData)
        previousGameData.teams = JSON.parse(JSON.stringify(newTeams));
      if (currentGameDataState.gameState === "team-selection") {
        renderTeamSelectionUI(currentGameDataState);
      } else {
        updateGameInfo(currentGameDataState);
      }
    });

    gameRef.child("players").on("value", (snapshot) => {
      const newPlayers = snapshot.val();
      if (!newPlayers) return;
      if (previousGameData && previousGameData.players) {
        handlePlayerConnectionChanges(
          { players: newPlayers },
          previousGameData
        );
      }
      currentGameDataState.players = newPlayers;
      previousGameData.players = JSON.parse(JSON.stringify(newPlayers));
      if (currentGameDataState.gameState === "team-selection") {
        renderTeamSelectionUI(currentGameDataState);
      }
    });

    gameRef.child("isPrivate").on("value", (snapshot) => {
      const isPrivate = snapshot.val();
      if (currentGameDataState) currentGameDataState.isPrivate = isPrivate;

      updatePrivacyToggleUI(isPrivate);

      const privateRoomTooltip = translate("privateRoomTooltip");
      const gameIdDisplay = isPrivate
        ? `${currentGameId} <i class="fas fa-lock" title="${privateRoomTooltip}"></i>`
        : currentGameId;
      $(".game-id-text").html(gameIdDisplay);
    });

    isInitialLoad = false;
  });
}

function handleGameFinished() {
  incrementGameCount();
  $("#board .card-slot").css("pointer-events", "none");
  $("#deck-pile").addClass("disabled");

  database.ref("games/" + currentGameId).once("value", (snapshot) => {
    const finalGameData = snapshot.val();
    if (!finalGameData) return;

    const isTeamGame = finalGameData.playerCount / finalGameData.numTeams > 1;
    const winnerTeamId = finalGameData.winner;
    Object.values(finalGameData.players).forEach((player) => {
      if (player.isBot) {
        const botTeamId = player.teamId;
        const humanPlayerName =
          Object.values(finalGameData.players).find((p) => !p.isBot)?.name ||
          translate("general.youPlural");
        setTimeout(() => {
          if (winnerTeamId && botTeamId === winnerTeamId) {
            triggerBotChatMessage(player.id, "gameWin", isTeamGame, {}, 0.8);
          } else {
            triggerBotChatMessage(
              player.id,
              "gameLoss",
              isTeamGame,
              { playerName: humanPlayerName },
              0.8
            );
          }
        }, 500 + Math.random() * 2500);
      }
    });

    setTimeout(() => promptRematchVote(finalGameData), 3000);
  });
}

function handlePlayerConnectionChanges(gameData, previousGameData) {
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
      showToast(translate("playerReconnected", { playerName: playerName }), {
        icon: "info",
        timer: 3000,
      });
    }
  }
}

function manageTurnState(gameData) {
  clearTimeout(drawTimer);
  clearInterval(drawCountdownInterval);

  const isMyTurn =
    gameData.turnOrder &&
    gameData.turnOrder[gameData.currentPlayerIndex] === myPlayerId;

  if (gameData.gameState === "playing" && isMyTurn) {
    if (gameData.turnState === "drawing") {
      if (gameData.deck && gameData.deck.length > 0) {
        $("#board .card-slot").css("pointer-events", "none");
        $("#player-hand").addClass("disabled");
        $("#deck-pile").removeClass("disabled");
        drawTimer = setTimeout(() => endTurnAndAdvance(true), 5000);
        startDrawCountdown(5);
      } else {
        $("#deck-pile").addClass("disabled");
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
        $("#board .card-slot").css("pointer-events", "auto");
        $("#player-hand").removeClass("disabled");
      }
      $("#deck-pile").addClass("disabled");
    }
  } else {
    $("#board .card-slot").css("pointer-events", "none");
    $("#player-hand").addClass("disabled");
    $("#deck-pile").addClass("disabled");
    clearHighlights();
  }
}

function updateChatNotification(gameData) {
  const chatData = gameData.chat || {};
  const currentMessageCount = Object.keys(chatData).length;
  if (
    currentMessageCount > lastMessageCount &&
    !$("#chat-container").hasClass("show")
  ) {
    $("#show-chat-btn").addClass("has-new-message");
    if (!hasPlayedNewMessageSound) {
      playFeedback("newMessage");
      hasPlayedNewMessageSound = true;
    }
  }
  lastMessageCount = currentMessageCount;
}

function renderTeamSelectionUI(gameData) {
  const { players, teams, gameId, capacity, isPrivate } = gameData;
  const $modal = $("#team-selection-modal");
  const $teamsContainer = $modal.find("#teams-container");
  const $startGameContainer = $modal.find("#start-game-container").empty();

  const myPlayer = players[myPlayerId];
  if (!myPlayer) {
    return;
  }

  $modal.css("display", "flex").show();
  $modal.find(".game-id-text").text(gameId);

  const onlinePlayersCount = Object.values(players).filter(
    (p) => p.online
  ).length;
  $modal.find(".player-count-info").html(
    translate("lobby.playersInRoom", {
      current: onlinePlayersCount,
      capacity: capacity || 12,
    })
  );

  const isHost = myPlayer && myPlayer.host;
  let teamsHtml = "";

  Object.entries(teams).forEach(([teamId, teamData]) => {
    const teamMembers = teamData.members || [];
    const teamName = translate(`teamNames.${teamData.color}`);
    const playersPerTeam = 6;
    const isMyCurrentTeam = myPlayer.teamId === teamId;
    const isTeamFull = teamMembers.length >= playersPerTeam;
    const isJoinable = !isMyCurrentTeam && !isTeamFull;

    let teamClasses = `team-box ${teamData.color}`;
    if (isMyCurrentTeam) teamClasses += " selected-team";
    if (isJoinable) teamClasses += " joinable";

    teamsHtml += `<div class="${teamClasses}" data-team-id="${teamId}" ${
      isMyCurrentTeam ? `style="border-color: ${teamData.color};"` : ""
    }>
                    <h3>${translate("lobby.teamLabel", {
                      teamName: teamName.toUpperCase(),
                    })}</h3>
                    <ul class="team-players">`;

    teamMembers.forEach((playerId) => {
      const player = players[playerId];
      if (player && player.online === true) {
        let avatarSrc;
        let avatarAlt;
        if (player.isBot && player.useBotAvatar) {
          const teamColor = teamData.color || "blue";
          avatarSrc = `${baseURL}/assets/img/avatars/bot-${teamColor}.png`;
          avatarAlt = `Bot Avatar (${teamColor} team)`;
        } else {
          const seed = player.avatar || 1;
          avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
          avatarAlt = `Avatar do jogador ${player.name || playerId}`;
        }

        teamsHtml += `<li>
                        <img class="player-avatar" src="${avatarSrc}" alt="${avatarAlt}">
                        <span class="player-name">${player.name}</span>`;

        if (isHost && player.isBot) {
          teamsHtml += `<button class="remove-bot-btn" data-bot-id="${playerId}" title="${translate(
            "lobby.removeBotTitle"
          )}"><i class="fas fa-user-xmark"></i></button>`;
        }
        teamsHtml += `</li>`;
      }
    });

    if (
      isHost &&
      teamMembers.length < playersPerTeam &&
      Object.keys(players).length < (capacity || 12)
    ) {
      teamsHtml += `<li class="add-bot-slot"><button class="add-bot-btn" data-team-id="${teamId}">${translate(
        "lobby.addBot"
      )}</button></li>`;
    }

    teamsHtml += `</ul>`;

    if (isMyCurrentTeam) {
      teamsHtml += `<button class="leave-team-btn">${translate(
        "lobby.leaveTeam"
      )}</button>`;
    }

    teamsHtml += `</div>`;
  });

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
    });

  const $hostControls = $("#host-controls-container");
  if (isHost) {
    $hostControls.show();
    const $privacyToggle = $("#privacy-toggle-checkbox");
    $privacyToggle.off("change").on("change", function () {
      const newPrivacyState = $(this).is(":checked");
      toggleRoomPrivacy(newPrivacyState);
    });

    const gameConfig = getGameConfiguration(players, teams);
    const $startBtn = $("<button>")
      .attr("id", "start-game-btn")
      .html(translate("startMatch"))
      .prop("disabled", !gameConfig.canStart)
      .on("click", hostStartGame);

    $startGameContainer
      .html(
        !gameConfig.canStart
          ? `<span>${translate("invalidConfiguration")}</span>`
          : ""
      )
      .append($startBtn);

    const playersToRemove = Object.values(players)
      .filter((p) => p.online === false && !p.isBot && p.id !== myPlayerId)
      .map((p) => p.id);
    if (playersToRemove.length > 0) {
      const updates = {};
      playersToRemove.forEach((pId) => {
        updates[`/players/${pId}`] = null;
        Object.entries(teams).forEach(([teamId, teamData]) => {
          if (teamData.members && teamData.members.includes(pId)) {
            updates[`/teams/${teamId}/members`] = teamData.members.filter(
              (memberId) => memberId !== pId
            );
          }
        });
      });
      database.ref(`games/${currentGameId}`).update(updates);
    }
  } else {
    $hostControls.hide();
    $startGameContainer.html(`<span>${translate("waitingForHost")}</span>`);
  }
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

async function hostCleanupGhostPlayers(gameData) {
  const myPlayer = gameData.players ? gameData.players[myPlayerId] : null;
  if (
    !myPlayer ||
    !myPlayer.host ||
    gameData.gameState !== "team-selection" ||
    !gameData.players
  ) {
    return false;
  }

  const playersToRemove = [];
  const playerKeys = Object.keys(gameData.players);

  playerKeys.forEach((playerKey) => {
    const player = gameData.players[playerKey];
    if (!player.id || (player.id !== myPlayerId && player.online === false)) {
      playersToRemove.push(playerKey);
    }
  });

  if (playersToRemove.length > 0) {
    showToast(
      translate("cleaningRoomInfo", { count: playersToRemove.length }),
      { icon: "info", timer: 2500 }
    );

    const updates = {};
    playersToRemove.forEach((pKey) => {
      updates[`/players/${pKey}`] = null;
      const playerIdToRemove = gameData.players[pKey]?.id;
      Object.entries(gameData.teams).forEach(([teamId, teamData]) => {
        if (
          playerIdToRemove &&
          teamData.members &&
          teamData.members.includes(playerIdToRemove)
        ) {
          updates[`/teams/${teamId}/members`] = teamData.members.filter(
            (id) => id !== playerIdToRemove
          );
        }
      });
    });

    await database.ref(`games/${currentGameId}`).update(updates);

    return true;
  }

  return false;
}

async function selectTeam(teamId) {
  await hostCleanupGhostPlayers(currentGameDataState);

  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData || !gameData.players[myPlayerId]) return;

      const myPlayer = gameData.players[myPlayerId];
      const currentTeamId = myPlayer.teamId;

      if (currentTeamId === teamId) return;

      if (teamId === null) {
        if (currentTeamId) {
          const oldTeam = gameData.teams[currentTeamId];
          if (oldTeam && oldTeam.members) {
            oldTeam.members = oldTeam.members.filter(
              (pid) => pid !== myPlayerId
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
      showToast(translate("error.selectTeam"), { icon: "error" });
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
        (bot) => !existingNames.includes(bot.name.toLowerCase())
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
      showToast(translate("error.addBot"), { icon: "error" });
    });
}

function hostRemoveBot(botIdToRemove) {
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

      if (teamId && gameData.teams[teamId] && gameData.teams[teamId].members) {
        gameData.teams[teamId].members = gameData.teams[teamId].members.filter(
          (id) => id !== botIdToRemove
        );
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
    .catch((error) => {
      showToast(translate("error.removeBot"), { icon: "error" });
    });
}

function executeBotTurnAsHost(currentGameData, botPlayer) {
  const updates = {};
  const botId = botPlayer.id;
  let botHand = [...(botPlayer.hand || [])];
  let currentDeck = [...(currentGameData.deck || [])];
  let currentDiscard = [...(currentGameData.discardPile || [])];

  const deadCards = botHand.filter((card) =>
    isCardDead(card, currentGameData.boardState)
  );
  if (deadCards.length > 0 && currentDeck.length > 0) {
    let cardToDiscard = deadCards[0];
    if (deadCards.length > 1) {
      cardToDiscard = deadCards.sort(
        (a, b) => evaluateCardPotential(a, {}) - evaluateCardPotential(b, {})
      )[0];
    }
    const cardIndex = botHand.indexOf(cardToDiscard);
    if (cardIndex > -1) {
      botHand.splice(cardIndex, 1);
      currentDiscard.push(cardToDiscard);
      const newCard = currentDeck.pop();
      botHand.push(newCard);

      const botName = botPlayer.name;
      database
        .ref(`games/${currentGameId}/gameMessage`)
        .set({ key: "botExchangedDeadCard", params: { botName } });
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
        0.5
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
    updates["/gameMessage"] = {
      key: "botSkipped",
      params: { botName: botPlayer.name },
    };
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
    botPlayer.teamId
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
        0.9
      );
    } else {
      triggerBotChatMessage(botPlayer.id, "madeSequence", isTeamGame, {}, 0.9);
    }

    const team = currentGameData.teams[botPlayer.teamId];
    updates[`/teams/${botPlayer.teamId}/sequencesCompleted`] =
      (team.sequencesCompleted || 0) + sequencesToProcess.length;
    for (const sequence of sequencesToProcess) {
      sequence.forEach((chip) => {
        if (BOARD_LAYOUT[chip.row][chip.col] !== "F") {
          updates[`/lockedChips/${chip.row}_${chip.col}`] = true;
        }
      });
    }
    const sequencesNeeded = SEQUENCES_TO_WIN[currentGameData.numTeams] || 1;
    if (
      (team.sequencesCompleted || 0) + sequencesToProcess.length >=
      sequencesNeeded
    ) {
      updates["/winner"] = botPlayer.teamId;
      updates["/gameState"] = "finished";
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

  if (currentDeck.length > 0) {
    const newCard = currentDeck.pop();
    botHand.push(newCard);
  }

  updates[`/players/${botId}/hand`] = botHand;
  updates["/deck"] = currentDeck;
  updates["/discardPile"] = currentDiscard;
  updates["/turnState"] = "playing";
  updates["/cardExchangedThisTurn"] = false;
  updates["/currentPlayerIndex"] =
    (currentGameData.currentPlayerIndex + 1) % currentGameData.playerCount;
  const nextPlayerName =
    currentGameData.players[
      currentGameData.turnOrder[updates["/currentPlayerIndex"]]
    ].name;
  updates["/gameMessage"] = {
    key: "waitingForPlayer",
    params: { playerName: nextPlayerName },
  };

  database.ref("games/" + currentGameId).update(updates);
}

function triggerBotChatMessage(
  botId,
  trigger,
  isTeamGame,
  params = {},
  chance = 0.4
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
      params[param]
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

async function hostStartGame() {
  mostrarLoading();

  try {
    const snapshot = await database.ref("games/" + currentGameId).once("value");
    const latestGameData = snapshot.val();

    await hostCleanupGhostPlayers(latestGameData);

    const gameConfig = getGameConfiguration(
      latestGameData.players,
      latestGameData.teams
    );

    if (!gameConfig.canStart) {
      esconderLoading();
      showToast(translate("invalidConfiguration"), {
        icon: "warning",
        timer: 4000,
      });
      return;
    }

    const startGameAction = () => {
      database
        .ref("games/" + currentGameId)
        .transaction((gameData) => {
          if (
            !gameData ||
            gameData.gameState !== "team-selection" ||
            !gameData.players[myPlayerId]?.host
          ) {
            return;
          }

          const onlinePlayers = {};
          Object.values(gameData.players).forEach((player) => {
            if (player.online === true) {
              onlinePlayers[player.id] = player;
            }
          });

          Object.values(gameData.teams).forEach((team) => {
            if (team.members) {
              team.members = team.members.filter(
                (memberId) => onlinePlayers[memberId]
              );
            }
          });

          gameData.players = onlinePlayers;

          const gameConfig = getGameConfiguration(
            gameData.players,
            gameData.teams
          );

          if (!gameConfig.canStart) {
            return;
          }

          gameData.playerCount = gameConfig.playerCount;
          gameData.numTeams = gameConfig.numTeams;

          gameData.gameState = "playing";
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

          const newTurnOrder = [];
          const playersPerTeam = gameData.playerCount / gameData.numTeams;
          const populatedTeams = Object.values(gameData.teams)
            .filter((team) => (team.members || []).length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));

          let rotatedTeams = [...populatedTeams];

          if (
            gameData.rematchVotes &&
            Object.keys(gameData.rematchVotes).length > 0 &&
            rotatedTeams.length > 0
          ) {
            const firstTeam = rotatedTeams.shift();
            rotatedTeams.push(firstTeam);
          }

          for (let i = 0; i < playersPerTeam; i++) {
            for (const team of rotatedTeams) {
              if (team.members[i]) {
                newTurnOrder.push(team.members[i]);
              }
            }
          }

          gameData.turnOrder = newTurnOrder;
          gameData.currentPlayerIndex = 0;

          const firstPlayerName = gameData.players[gameData.turnOrder[0]].name;
          gameData.gameMessage = {
            key: "gameStarted",
            params: { playerName: firstPlayerName },
          };

          const isTeamGame = gameConfig.playersPerTeam > 1;
          Object.values(gameData.players).forEach((player) => {
            if (player.isBot) {
              setTimeout(() => {
                triggerBotChatMessage(
                  player.id,
                  "gameStart",
                  isTeamGame,
                  {},
                  0.6
                );
              }, 500 + Math.random() * 2000);
            }
          });

          gameData.rematchVotes = {};

          return gameData;
        })
        .catch((error) => {
          showToast(translate("error.startGame"), { icon: "error" });
        });
    };
    esconderLoading();
    checkAndShowAd(startGameAction);
  } catch (error) {
    esconderLoading();
    showToast(translate("error.startGame"), { icon: "error" });
  }
}

function endGameOnDeckEmpty() {
  database.ref("games/" + currentGameId).transaction((gameData) => {
    if (!gameData || gameData.winner != null) return gameData;

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
          `teamNames.${winningTeam.color}`
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
      isHumanTurnOnline
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
      const $slot = $("<div>")
        .addClass(`card-slot ${cardCode === "F" ? "joker" : ""}`)
        .attr({
          "data-row": rowIndex,
          "data-col": colIndex,
          "data-card": cardCode,
        });
      $slot.css(
        "background-image",
        `url('${baseURL}/assets/img/cards/${cardCode}.png')`
      );

      const clickHandler = isLocalGame
        ? onBoardSlotClickLocal
        : onBoardSlotClick;
      $slot.on("click", clickHandler);

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

    $slot.find(".chip").remove();

    const chipOwnerTeamId = boardState ? boardState[slotKey] : null;

    if (chipOwnerTeamId && chipOwnerTeamId !== "F" && teams[chipOwnerTeamId]) {
      const chipColor = teams[chipOwnerTeamId].color;
      const $chip = $("<div>").addClass("chip").addClass(`chip-${chipColor}`);

      if (lockedChips && lockedChips[slotKey]) {
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
  isMyTurn = false
) {
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
      $cardElement.toggleClass("newly-drawn", isNew);
      $cardElement.toggleClass("dead-card", isDead);
    } else {
      const clickHandler = isLocalGame ? onHandCardClickLocal : onHandCardClick;
      $cardElement = $("<div>")
        .addClass(`card-in-hand ${card.includes("J") ? "jack" : ""}`)
        .css(
          "background-image",
          `url('${baseURL}/assets/img/cards/${card}.png')`
        )
        .data("card", card)
        .data("index", originalIndex)
        .on("click", (e) =>
          clickHandler(card, originalIndex, $(e.currentTarget))
        );

      $cardElement.toggleClass("newly-drawn", isNew);
      $cardElement.toggleClass("dead-card", isDead);
    }
    finalDomElements.push($cardElement);
  });

  existingCardElements.forEach(($el, key) => {
    if (!handKeys.has(key)) {
      $el.remove();
    }
  });

  $hand.append(finalDomElements);
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
    const sequencesInfo = `${translate("sequences")}: ${
      myTeam.sequencesCompleted
    } ${translate("of")} ${sequencesNeeded}`;

    if (myTeam.members.length > 1) {
      const teammates = myTeam.members
        .filter((pid) => pid !== myPlayerId)
        .map((pid) => (players[pid] ? players[pid].name : ""))
        .join(", ");

      teamInfoHtml = `${translate("team")}: <b style="color:${
        myTeam.color
      };">${translate(`teamNames.${myTeam.color}`).toUpperCase()}</b>`;
      if (teammates) {
        teamInfoHtml += ` <br>${translate("teammates")}: ${teammates}`;
      }
      teamInfoHtml += ` | ${sequencesInfo}`;
    } else {
      teamInfoHtml = sequencesInfo;
    }
    $("#team-info").html(teamInfoHtml);
  }

  let finalMessage = translate("welcome");

  if (gameData.gameState === "playing" && turnOrder && turnOrder.length > 0) {
    const currentPlayerId = turnOrder[currentPlayerIndex];
    const currentPlayer = players[currentPlayerId];

    if (currentPlayer && teams[currentPlayer.teamId]) {
      let avatarSrc;
      let avatarAlt;
      if (currentPlayer.isBot && currentPlayer.useBotAvatar) {
        const teamColor = teams[currentPlayer.teamId]?.color || "blue";
        avatarSrc = `${baseURL}/assets/img/avatars/bot-${teamColor}.png`;
        avatarAlt = `Bot Avatar (${teamColor} team)`;
      } else {
        const seed = currentPlayer.avatar || 1;
        avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
        avatarAlt = `Avatar do jogador ${
          currentPlayer.name || currentPlayer.id
        }`;
      }
      const turnOfText = translate("turnOf") || "Turn of";
      const playerTurnHtml = `<img src="${avatarSrc}" alt="${avatarAlt}" class="player-avatar"> ${turnOfText} ${currentPlayer.name}`;

      $("#current-player-text")
        .html(playerTurnHtml)
        .css("color", teams[currentPlayer.teamId].color);

      const isMyTurn = currentPlayerId === myPlayerId;
      if (isMyTurn) {
        if (turnState === "drawing") {
          finalMessage = translate("yourTurnToDraw");
        } else if (turnState === "playing") {
          finalMessage = translate("yourTurn");
        }
      } else {
        finalMessage = translate(gameMessage.key, gameMessage.params);
      }
    } else {
      $("#current-player-text").html(translate("waiting"));
    }
  } else if (gameData.gameMessage) {
    if (typeof gameData.gameMessage === "object" && gameData.gameMessage.key) {
      finalMessage = translate(
        gameData.gameMessage.key,
        gameData.gameMessage.params
      );
    } else {
      finalMessage = gameData.gameMessage;
    }
  }

  if (
    gameData.turnState !== "drawing" ||
    (gameData.turnOrder &&
      gameData.turnOrder[gameData.currentPlayerIndex] !== myPlayerId)
  ) {
    $("#game-message").html(finalMessage);
  }

  const deckSize = gameData.deck ? gameData.deck.length : 0;
  const $deckContainer = $("#deck-container");
  const $discardContainer = $("#discard-container");

  if (deckSize > 0) {
    $deckContainer.show();
    $discardContainer.removeClass("sem-baralho");
    $("#deck-count").text(`${deckSize} ${translate("cards")}`);
    $("#deck-pile").removeClass("disabled");
  } else {
    $deckContainer.hide();
    $discardContainer.addClass("sem-baralho");
  }

  const discardPile = gameData.discardPile || [];
  const $discardPileDiv = $("#discard-pile");
  if (discardPile.length > 0) {
    const lastDiscardedCard = discardPile[discardPile.length - 1];
    const isJack = lastDiscardedCard.includes("J");
    $discardPileDiv
      .css(
        "background-image",
        `url('${baseURL}/assets/img/cards/${lastDiscardedCard}.png')`
      )
      .css("border-style", "solid");
    $("#discard-container").css("display", "flex");
    if (isJack) {
      $discardPileDiv.addClass("jack");
    } else {
      $discardPileDiv.removeClass("jack");
    }
  } else {
    $discardPileDiv
      .css("background-image", "none")
      .css("border-style", "dashed");
  }
}

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
  const currentPlayerTeamId = gameData.players[myPlayerId]?.teamId;
  const isMyTeamWinning =
    gameData.winner != null && gameData.winner === currentPlayerTeamId;

  if (gameData.rematchVotes && gameData.rematchVotes[myPlayerId]) {
    Swal.fire({
      title: translate("waitingForOthers"),
      text: translate("waitingForRematchVotes"),
      icon: "info",
      allowEscapeKey: false,
      showConfirmButton: false,
      toast: true,
      position: "center",
    });
    return;
  }

  let winTitle, winHtml, winIcon, confirmText, cancelText;
  cancelText = translate("rematchNo");

  if (gameData.winner == null) {
    playFeedback("draw");
    winTitle = translate("gameEndDrawTitle");
    winHtml = translate("gameEndDrawText");
    winIcon = "info";
    confirmText = translate("rematchYes");
  } else if (isMyTeamWinning) {
    playFeedback("winner");
    winTitle = translate("youWonTitle");
    winIcon = "success";
    const myWinningTeam = gameData.teams[currentPlayerTeamId];
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (!myWinningTeam) {
      console.error(
        "Erro crítico: Não foi possível encontrar o time vencedor do jogador.",
        gameData
      );
      winHtml = "Você venceu!";
    } else {
      winHtml = translate(isSoloGame ? "youWonSoloText" : "youWonText", {
        color: myWinningTeam.color,
      });
    }

    confirmText = translate("rematchYes");
  } else {
    playFeedback("defeat");
    winTitle = translate("youLostTitle");
    winIcon = "info";
    const winningTeam = gameData.teams[gameData.winner];
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (!winningTeam) {
      console.error(
        "Erro crítico: Não foi possível encontrar o time vencedor.",
        gameData
      );
      winHtml = "Você perdeu.";
    } else if (isSoloGame) {
      const winnerPlayerId = winningTeam.members[0];
      const winnerPlayer = gameData.players[winnerPlayerId];
      winHtml = translate("youLostSoloText", {
        playerName: winnerPlayer.name.toUpperCase(),
        color: winningTeam.color,
      });
    } else {
      const winnerColorName =
        translate(`teamNames.${winningTeam.color}`) || winningTeam.color;
      winHtml = translate("youLostText", {
        teamName: winnerColorName.toUpperCase(),
        color: winningTeam.color,
      });
    }
    confirmText = translate("rematchYesLost");
  }

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "bottom" : "center";

  Swal.fire({
    title: winTitle,
    html: `${winHtml}<br><br>${translate("rematchQuestion")}`,
    icon: winIcon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    allowEscapeKey: false,
    toast: true,
    position: position,
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
  }).then((result) => {
    const vote = result.isConfirmed ? "yes" : "no";
    castRematchVote(vote);
  });
}

function castRematchVote(vote) {
  Swal.fire({
    title: translate("waitingForOthers"),
    text: translate("waitingForRematchVotes"),
    icon: "info",
    allowEscapeKey: false,
    showConfirmButton: false,
    toast: true,
    position: "center",
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
    .then(() => {
      database.ref("games/" + currentGameId).once("value", (snapshot) => {
        const updatedGameData = snapshot.val();
        if (!updatedGameData) return;

        const totalPlayersCount = Object.keys(updatedGameData.players).length;
        const votesCount = Object.keys(updatedGameData.rematchVotes).length;
        const hostId = Object.keys(updatedGameData.players).find(
          (p) => updatedGameData.players[p].host
        );
        const hostVote = hostId ? updatedGameData.rematchVotes[hostId] : null;

        if (votesCount === totalPlayersCount || hostVote === "no") {
          const allVotedYes = Object.values(updatedGameData.rematchVotes).every(
            (v) => v === "yes"
          );

          if (allVotedYes) {
            if (amITheHost) {
              if (updatedGameData.isAutoGenerated) {
                checkAndShowAd(resetAndRestartAutoGeneratedGame);
              } else {
                checkAndShowAd(resetForRematchSelection);
              }
            }
          } else {
            database
              .ref("games/" + currentGameId)
              .transaction((game) => {
                if (game) {
                  game.gameState = "ended";
                  game.gameMessage = { key: "rematchRejected" };
                }
                return game;
              })
              .then(() => {
                Swal.fire({
                  title: translate("matchFinished"),
                  text: translate("rematchRejectedInfo"),
                  icon: "info",
                  timer: 4000,
                  timerProgressBar: true,
                  allowEscapeKey: false,
                  toast: true,
                  position: "center",
                }).then(() => {
                  localStorage.removeItem("sequenceGameData");
                  window.history.pushState({}, "", window.location.pathname);
                  window.location.reload();
                });
              });
          }
        }
      });
    })
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
      gameData.currentPlayerIndex = 0;
      gameData.turnState = "playing";
      gameData.playerCount = null;
      gameData.numTeams = null;

      Object.values(gameData.players).forEach((player) => {
        player.hand = [];
        player.teamId = null;
      });

      gameData.gameMessage = { key: "rematchAccepted" };
      gameData.rematchVotes = {};
      gameData.botIntentions = {};

      return gameData;
    })
    .catch((error) => {
      showToast(translate("rematchResetError"), {
        icon: "error",
      });
    });
}

function resetAndRestartAutoGeneratedGame() {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;

      gameData.gameState = "playing";
      gameData.winner = null;
      gameData.boardState = { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" };
      gameData.lockedChips = {};
      gameData.deck = createAndShuffleDeck();
      gameData.discardPile = [];
      gameData.turnState = "playing";
      gameData.rematchVotes = {};
      gameData.botIntentions = {};
      Object.values(gameData.teams).forEach((team) => {
        team.sequencesCompleted = 0;
      });

      const cardsToDeal = CARDS_PER_PLAYER[gameData.playerCount];
      Object.values(gameData.players).forEach((player) => {
        player.hand = [];
        for (let i = 0; i < cardsToDeal; i++) {
          if (gameData.deck.length > 0) {
            player.hand.push(gameData.deck.pop());
          }
        }
      });

      if (gameData.turnOrder && gameData.turnOrder.length > 0) {
        const firstPlayer = gameData.turnOrder.shift();
        gameData.turnOrder.push(firstPlayer);
      }
      gameData.currentPlayerIndex = 0;

      const firstPlayerName = gameData.players[gameData.turnOrder[0]].name;
      gameData.gameMessage = {
        key: "rematchStarted",
        params: { playerName: firstPlayerName },
      };

      return gameData;
    })
    .catch((error) => {
      showToast(translate("autoRematchError"), { icon: "error" });
    });
}

function clearHighlights() {
  $("#board .card-slot").removeClass("highlighted-slot highlighted-removal");
}

function highlightPlayableSlots(card, gameData) {
  clearHighlights();
  const { boardState = {}, lockedChips = {}, players = {} } = gameData || {};
  const myTeamId = players[myPlayerId]?.teamId;
  if (!myTeamId) return;

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
          "highlighted-removal"
        );
      }
    });
  } else if (isTwoEyedJack) {
    BOARD_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const slotKey = `${rowIndex}_${colIndex}`;
        if (!boardState[slotKey]) {
          $(
            `.card-slot[data-row='${rowIndex}'][data-col='${colIndex}']`
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
              `.card-slot[data-row='${rowIndex}'][data-col='${colIndex}']`
            ).addClass("highlighted-slot");
          }
        }
      });
    });
  }
}

function onBoardSlotClick(event) {
  const $slot = $(event.currentTarget);
  const row = $slot.data("row");
  const col = $slot.data("col");
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
            myTeam.id
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
              const messageKey = isSoloGame ? "soloWin" : "teamWin";
              gameData.gameMessage = {
                key: messageKey,
                params: {
                  playerName: myPlayer.name.toUpperCase(),
                  teamName: translate(
                    `teamNames.${myTeam.color}`
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
                    `teamNames.${myTeam.color}`
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
          gameData.turnState = "drawing";
          if (!messageWasSet) {
            gameData.gameMessage = { key: "waiting" };
          }
        }
      }
      return gameData;
    })
    .then(() => {
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
          (p) => p.isBot && p.teamId !== myTeamId
        );

        if (opponentBots.length > 0) {
          const blockedBot = wasMoveABlock(
            boardStateBeforeMove,
            row,
            col,
            opponentBots
          );

          if (blockedBot) {
            triggerBotChatMessage(
              blockedBot.id,
              "gotBlocked",
              isTeamGame,
              { playerName: myPlayerName },
              0.5
            );
          }
        }
      });
    })
    .catch((error) => {
      showToast(translate("error.playMove"), {
        icon: "error",
      });
      selectedHandCard = null;
      $(".card-in-hand").removeClass("selected");
      clearHighlights();
    });
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
        axis.c
      );
      const count2 = countConsecutive(
        previousBoardState,
        botTeamId,
        row,
        col,
        -axis.r,
        -axis.c
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
          "deadCardConfirm"
        )}`,
        cancelButtonText: `<i class='fas fa-times'></i> ${translate(
          "deadCardCancel"
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
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (gameData) {
        if (gameData.cardExchangedThisTurn === true) {
          return;
        }

        const myPlayer = gameData.players[myPlayerId];
        if (!myPlayer || !myPlayer.hand) {
          return;
        }
        if (myPlayer.hand[cardIndex] !== cardToExchange) {
          return;
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
        gameData.gameMessage = {
          key: "deadCardExchanged",
          params: { playerName: myPlayerName },
        };
      }
      return gameData;
    })
    .then((result) => {
      if (!result.committed) {
        showToast(translate("exchangeFailed"), {
          icon: "warning",
          title: translate("exchangeFailedTitle"),
        });
      } else {
        showToast(translate("exchangeSuccess"), { icon: "success" });
      }
    })
    .catch((error) => {
      showToast(translate("error.exchangeCardNetwork"), {
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
  teamId
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
          (a, b) => a.row - b.row || a.col - b.col
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
      const senderPlayer = players[msg.playerId];
      const senderTeam = senderPlayer ? teams[senderPlayer.teamId] : null;
      const senderColor = senderTeam ? senderTeam.color : "#FFFFFF";
      const $messageDiv = $("<div>").addClass("chat-message");
      const timestamp = new Date(msg.timestamp);
      const formattedTime = timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (msg.playerId === myPlayerId) {
        $messageDiv.addClass("my-message");
        const $textSpan = $("<span>").text(msg.text);
        const $timestampSpan = $("<span>")
          .addClass("message-timestamp")
          .text(formattedTime);
        $messageDiv.append($textSpan, $timestampSpan);
      } else {
        $messageDiv.addClass(`other-message ${senderColor}`);
        const $senderSpan = $("<span>")
          .addClass(`message-sender ${senderColor}`)
          .text(msg.playerName);
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

function getHumanReadableCardName(cardCode) {
  const value = cardCode.slice(0, -1);
  const suit = cardCode.slice(-1);

  const readableValue = translate(`humanCardNames.${value}`) || value;
  const readableSuit = translate(`humanSuitNames.${suit}`) || suit;

  return translate("ofSuit", { suit: readableSuit }).replace(
    /^de\s/,
    `${readableValue} de `
  );
}

function showToast(message, options = {}) {
  const { timer = 3000, title = "", icon } = options;

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "bottom" : "top-end";

  Swal.fire({
    toast: true,
    position: position,
    title: title,
    html: message,
    icon: icon,
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    allowEscapeKey: false,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

function setupPresenceSystem() {
  if (!myPlayerId || !currentGameId) return;

  const myPlayerRef = database.ref(
    `games/${currentGameId}/players/${myPlayerId}`
  );
  const presenceRef = database.ref(".info/connected");

  presenceRef.on("value", (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }
    myPlayerRef
      .onDisconnect()
      .update({
        online: false,
        disconnectedAt: firebase.database.ServerValue.TIMESTAMP,
      })
      .then(() => {
        myPlayerRef.update({
          online: true,
          disconnectedAt: null,
        });
      });
  });
}

async function cleanupExpiredGames() {
  const gamesRef = database.ref("games");
  try {
    const snapshot = await gamesRef.once("value");
    const games = snapshot.val();
    if (!games) return;
    const promises = [];
    const now = Date.now();
    Object.keys(games).forEach((gameId) => {
      const game = games[gameId];
      if (game.expirationTimestamp && now > game.expirationTimestamp) {
        promises.push(database.ref("games/" + gameId).remove());
      }
    });
    await Promise.all(promises);
  } catch (error) {}
}

async function runDailyCleanupIfNeeded() {
  const META_PATH = "meta/lastCleanupTimestamp";
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  try {
    const snapshot = await database.ref(META_PATH).once("value");
    const lastCleanup = snapshot.val();
    if (!lastCleanup || Date.now() - lastCleanup > TWENTY_FOUR_HOURS_MS) {
      await cleanupExpiredGames();
      await database.ref(META_PATH).set(Date.now());
    }
  } catch (error) {}
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
    <div class="swal2-rules-content">
      <div id="topo" class="swal2-rules-sections">
        <strong>${R.sections}</strong>
        <a href="#sec-comecando">${R.starting}</a>
        <a href="#sec-objetivo">${R.objective}</a>
        <a href="#sec-cartas">${R.specialCards}</a>
        <a href="#sec-sua-vez">${R.yourTurn}</a>
        <a href="#sec-final">${R.ending}</a>
      </div>

      <details id="sec-comecando" ${comecandoOpen ? "open" : ""}>
        <summary>${R.startingTitle}</summary>
        <p>${R.startingP1}</p>
        <p>${R.startingP2}</p>
        <ul>${R.startingList}</ul>
        <p>${R.startingP3}</p>
        <p>${R.startingP4}</p>
      </details>
      
      <hr>

      <details id="sec-objetivo" ${!comecandoOpen ? "open" : ""}>
        <summary>${R.objectiveTitle}</summary>
        <p>${R.objectiveP1}</p>
        <ul>${R.objectiveList}</ul>
        <p>${R.objectiveP2}</p>
        <p>${R.objectiveP3}</p>
      </details>

      <hr>

      <details id="sec-cartas">
        <summary>${R.specialCardsTitle}</summary>
        <p>${R.specialCardsP1}</p>
        <ul>${R.specialCardsList}</ul>
        <p>${R.specialCardsP2}</p>
        <p>${R.specialCardsP3}</p>
      </details>

      <hr>

      <details id="sec-sua-vez">
        <summary>${R.yourTurnTitle}</summary>
        <ol>${R.yourTurnList}</ol>
      </details>

      <hr>

      <details id="sec-final">
        <summary>${R.endingTitle}</summary>
        <p>${R.endingP1}</p>
        <p>${R.endingP2}</p>
        <p>${R.endingP3}</p>
      </details>

      <hr>

      <span class="swal2-rules-actions">
        <a href="#topo"><i class="fas fa-up"></i> ${R.backToTop}</a>
      </span>

    </div>
  `;

  Swal.fire({
    title: translate("rulesTitle"),
    html: rulesHtml,
    showConfirmButton: true,
    confirmButtonText: translate("understood"),
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      popup: "swal2-rules-popup",
      actions: "swal2-rules-actions",
      container: "swal2-rules-container",
    },
  });
}

function reportBugOpen() {
  Swal.fire({
    title: translate("reportBugModalTitle"),
    text: translate("reportBugModalText"),
    icon: "question",
    showCancelButton: true,
    confirmButtonText: translate("reportBugModalConfirm"),
    cancelButtonText: translate("reportBugModalCancel"),
    allowEscapeKey: false,
    toast: true,
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
    position: "center",
  }).then((result) => {
    if (result.isConfirmed) {
      promptBugReport();
    } else {
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
    },
    showCancelButton: true,
    confirmButtonText: translate("promptBugConfirm"),
    cancelButtonText: translate("promptBugCancel"),
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
    preConfirm: (description) => {
      if (!description || description.trim().length < 10) {
        Swal.showValidationMessage(translate("promptBugValidation"));
        return false;
      }

      return database
        .ref("games/" + currentGameId)
        .once("value")
        .then((snapshot) => {
          const gameData = snapshot.val();
          const report = {
            description: description,
            gameId: currentGameId,
            playerId: myPlayerId,
            playerName: myPlayerName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            userAgent: navigator.userAgent,
            gameStateSnapshot: gameData,
          };
          return database.ref("bug_reports").push(report);
        });
    },
  })
    .then((result) => {
      if (result.isConfirmed) {
        showToast(translate("promptBugSuccess"), {
          icon: "success",
          title: translate("promptBugThanks"),
        });
      } else {
        modalConfigOpen();
      }
    })
    .catch((error) => {
      Swal.showValidationMessage(
        translate("promptBugFailure", { error: error })
      );
    });
}

function iAocumentationOpen() {
  const AI = translations[currentLanguage].aiDocsContent;
  const aiInfoHtml = `
    <div class="swal2-rules-content">
      <div id="topo" class="swal2-rules-sections">
        <strong>${AI.sections}</strong>
        <a href="#sec-hierarquia">${AI.decisionHierarchy}</a>
        <a href="#sec-adaptacao">${AI.playerAdaptation}</a>
        <a href="#sec-previsao">${AI.predictiveThinking}</a>
        <a href="#sec-outras-ia">${AI.otherIntelligences}</a>
      </div>

      <p style="margin: 15px 0;">${AI.intro}</p>
      
      <hr>

      <details id="sec-hierarquia" open>
        <summary>${AI.decisionHierarchyTitle}</summary>
        <p style="margin-top: 10px;">${AI.decisionHierarchyIntro}</p>
        <ol>${AI.decisionHierarchyList}</ol>
      </details>

      <hr>

      <details id="sec-adaptacao">
        <summary>${AI.playerAdaptationTitle}</summary>
        <p style="margin-top: 10px;">${AI.playerAdaptationIntro}</p>
        <ul>${AI.playerAdaptationList}</ul>
      </details>
      
      <hr>

      <details id="sec-previsao">
        <summary>${AI.predictiveThinkingTitle}</summary>
        <p style="margin-top: 10px;">${AI.predictiveThinkingP1}</p>
        <p style="font-style: italic; margin-left: 15px;">"${AI.predictiveThinkingP2}"</p>
        <p>${AI.predictiveThinkingP3}</p>
      </details>

      <hr>
      
      <details id="sec-outras-ia">
        <summary>${AI.otherIntelligencesTitle}</summary>
        <ul style="margin-top: 10px;">${AI.otherIntelligencesList}</ul>
      </details>

      <hr>

      <p style="margin-top: 20px; font-size: 12px; text-align: center;">
        ${AI.outro}
      </p>

      <span class="swal2-rules-actions">
        <a href="#topo"><i class="fas fa-up"></i> ${AI.backToTop}</a>
      </span>
    </div>
  `;

  Swal.fire({
    title: translate("aiDocsTitle"),
    html: aiInfoHtml,
    showConfirmButton: true,
    confirmButtonText: translate("understood"),
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      popup: "swal2-rules-popup",
      actions: "swal2-rules-actions",
      container: "swal2-rules-container",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      modalConfigOpen();
    }
  });
}

$(".config-btn").on("click", modalConfigOpen);

function modalConfigOpen() {
  Swal.fire({
    title: `<i class='fas fa-cogs'></i> ${translate("settings")}`,
    html: `
    <div class="modal-config-container">
      <div class="modal-config-item">
        <label><i class="fas fa-volume-high"></i> ${translate("sound")}</label>
        <button class="toggle-sound-btn">
          <span class="config-text"></span>
        </button>
      </div>

      <div class="modal-config-item vibration-config-item">
        <label><i class="fas fa-mobile-screen-button"></i> ${translate(
          "vibration"
        )}</label>
        <button class="toggle-vibrate-btn">
          <span class="config-text"></span>
        </button>
      </div>
      
      <div class="modal-config-item">
        <label><i class="fas fa-language"></i> ${translate("language")}</label>
        <div class="language-selector">
          <button class="lang-btn ${
            currentLanguage === "pt" ? "active" : ""
          }" data-lang="pt">
            <img src="https://flagcdn.com/w20/br.png" alt="Português" width="20" height="15" />
          </button>
          <button class="lang-btn ${
            currentLanguage === "en" ? "active" : ""
          }" data-lang="en">
            <img src="https://flagcdn.com/w20/us.png" alt="English" width="20" height="15" />
          </button>
          <button class="lang-btn ${
            currentLanguage === "es" ? "active" : ""
          }" data-lang="es">
            <img src="https://flagcdn.com/w20/es.png" alt="Español" width="20" height="15" />
          </button>
        </div>
      </div>

      <div class="modal-config-item">
        <label>${translate("settingsModal.aiLabel")}</label>
        <button class="ai-info-btn" title=${translate(
          "settingsModal.aiInfoTitle"
        )}>
          <span class="config-text">${translate("aiInfo")}</span>
        </button>
      </div>

      <div class="modal-config-item">
        <label>${translate("settingsModal.bugLabel")}</label>
        <button class="report-bug-btn" title=${translate(
          "settingsModal.bugReportTitle"
        )}>
          <span class="config-text">${translate("reportBug")}</span>
        </button>
      </div>
    </div>
  `,
    showConfirmButton: true,
    toast: true,
    position: "center",
    confirmButtonText: `<i class='fas fa-times'></i> ${translate("close")}`,
    customClass: {
      popup: "swal2-modal-config-popup",
      actions: "center",
    },
    didOpen: () => {
      updateSoundButtonUI();
      updateVibrationButtonUI();

      $(".toggle-sound-btn").on("click", () => {
        isMuted = !isMuted;
        localStorage.setItem(MUTE_STORAGE_KEY, isMuted);
        updateSoundButtonUI();

        if (!isMuted) {
          playFeedback("uiClick");
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

      $(".lang-btn").on("click", function () {
        const newLang = $(this).data("lang");
        if (newLang !== currentLanguage) {
          currentLanguage = newLang;
          localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
          $(".lang-btn").removeClass("active");
          $(this).addClass("active");
          applyTranslations();
          Swal.close();
          setTimeout(modalConfigOpen, 100);
        }
      });

      $(".report-bug-btn").on("click", reportBugOpen);
      $(".ai-info-btn").on("click", iAocumentationOpen);
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
          })
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
});
