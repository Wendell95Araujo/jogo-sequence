if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../../sw.js").catch(function (err) {
    console.error("Falha ao registrar sw.js:", err);
  });
}

let countInstallApp = 0;

if ("serviceWorker" in navigator && "PushManager" in window) {
  window.addEventListener("beforeinstallprompt", (e) => {
    $("#installApp").css("display", "flex").show();
    e.preventDefault();
    let deferredPrompt = e;
    const installButton = document.getElementById("installAppButton");
    if (installButton !== null) {
      buttonAppInstall();
      $("#installAppButton").on("click", function () {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("Instalação do app aceita pelo usuário.");
          } else {
            console.info("Usuário dispensou a instalação do app.");
          }
          deferredPrompt = null;
        });
        countInstallApp++;
        $("#installApp").hide();
      });
    }
    if (countInstallApp > 0) {
      $("#installApp").hide();
    }
  });
}

function buttonAppInstall() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const $button = $("#installAppButton");
  const $linkMobile = $("#linkMobile");
  const $linkDesktop = $("#linkDesktop");
  const isMobile = /android|iPhone|iPad|iPod|mobile/i.test(userAgent);

  if (isMobile) {
    $linkDesktop.css("display", "none");
  } else {
    $linkMobile.css("display", "none");
  }

  if (/android/i.test(userAgent)) {
    $button.html(
      '<i class="fab fa-android"></i> Baixar aplicativo Android <i class="fab fa-android"></i>'
    );
  } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    $button.html(
      '<i class="fab fa-apple"></i> Baixar aplicativo para iOS <i class="fab fa-apple"></i>'
    );
  } else if (/windows/i.test(userAgent)) {
    $button.html(
      '<i class="fab fa-windows"></i> Baixar aplicativo para Windows <i class="fab fa-windows"></i>'
    );
  } else {
    $button.html(
      '<i class="far fa-mobile"></i> Baixar aplicativo <i class="far fa-mobile"></i>'
    );
  }
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
const TEAM_NAMES = { red: "vermelha", blue: "azul", green: "verde" };
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
const RECONNECTION_GRACE_PERIOD_MS = 30000;
const drawOrDefeatSound = new Audio(
  `${window.location.origin}/assets/sounds/drawOrDefeat.wav`
);
const madeSequenceSound = new Audio(
  `${window.location.origin}/assets/sounds/madeSequence.wav`
);
const myTurnSound = new Audio(
  `${window.location.origin}/assets/sounds/myTurn.mp3`
);
const newChatSound = new Audio(
  `${window.location.origin}/assets/sounds/newChat.mp3`
);
const winnerSound = new Audio(
  `${window.location.origin}/assets/sounds/winner.wav`
);
const MUTE_STORAGE_KEY = "sequenceGameMuted";
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
let hasPlayedNewChatSound = false;
let isMuted = false;
let isReconnecting = false;
let amITheHost = false;
let selectedAvatarId = 1;

function initializeAvatarSelector() {
  const panel = $("#avatar-dropdown-panel");
  const selectedDisplayImg = $("#avatar-dropdown-selected img");
  const seed = selectedAvatarId;

  panel.empty();
  selectedDisplayImg.attr(
    "src",
    `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`
  );
  selectedDisplayImg.attr("data-avatar-id", selectedAvatarId);

  for (let i = 1; i <= TOTAL_AVATARS; i++) {
    const avatarImg = $("<img>")
      .addClass("avatar-option")
      .attr("src", `https://api.dicebear.com/8.x/adventurer/svg?seed=${i}`)
      .attr("data-avatar-id", i);

    if (i === selectedAvatarId) {
      avatarImg.addClass("selected-avatar");
    }

    panel.append(avatarImg);
  }
}

$("#avatar-dropdown-selected").on("click", function (event) {
  event.stopPropagation();
  $("#avatar-dropdown-container").toggleClass("open");
});

$("#avatar-dropdown-panel").on("click", ".avatar-option", function () {
  selectedAvatarId = parseInt($(this).attr("data-avatar-id"));
  $("#avatar-dropdown-selected img").attr("src", $(this).attr("src"));
  $("#avatar-dropdown-panel .avatar-option").removeClass("selected-avatar");
  $(this).addClass("selected-avatar");
  localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatarId);
  $("#avatar-dropdown-container").removeClass("open");
});

// 3. Fechar o dropdown se clicar em qualquer outro lugar da página
$(document).on("click", function () {
  if ($("#avatar-dropdown-container").hasClass("open")) {
    $("#avatar-dropdown-container").removeClass("open");
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
    $createRoom.addClass("offline-disabled");
    $idRomInput.prop("disabled", true);
    $enterRoom.addClass("offline-disabled");
    $findRandom.addClass("offline-disabled");
    $onlineLabel.css("opacity", 0.6);
    $bugReportBtn.hide();
    $("#server-info").hide();

    if (options.isConnecting) {
      $("#connection-status").text("Conectando...").css("color", "yellow");
      $("#connection-status-info").text("Tentando conectar ao servidor...");
    } else {
      $("#connection-status").text("Modo Offline").css("color", "orange");
      $("#connection-status-info").text(
        "Sem conexão. Apenas o modo de prática está disponível."
      );
      showToast(
        options.toastMessage ||
          "Sem conexão. Apenas o modo de prática está disponível.",
        { icon: "warning" }
      );
    }
  } else {
    $createRoom.removeClass("offline-disabled");
    $idRomInput.prop("disabled", false);
    $enterRoom.removeClass("offline-disabled");
    $findRandom.removeClass("offline-disabled");
    $onlineLabel.css("opacity", 1);
    $bugReportBtn.show();

    $("#connection-status").text("Online").css("color", "lightgreen");
    $("#connection-status-info").text("Conectado ao servidor.");

    if (options.toastMessage) {
      showToast(options.toastMessage, { icon: "success", timer: 3000 });
    }
  }
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

      const toastMessage = isInitial ? null : "Você está online novamente!";
      setOnlineMode(true, { toastMessage: toastMessage });
      updateLobbyInfo();
      runDailyCleanupIfNeeded();
    }
  };

  database.ref(".info/connected").on("value", connectionListener);

  window.firebaseConnectionTimeout = setTimeout(() => {
    database.ref(".info/connected").off("value", connectionListener);
    const toastMessage = isInitial
      ? "Sem conexão. Apenas o modo de prática está disponível."
      : "Falha ao reconectar. Verifique sua conexão.";
    setOnlineMode(false, { toastMessage: toastMessage });
  }, 7000);
}

function initializeApp() {
  loadLobbySettings();
  mostrarLoading();
  if (!navigator.onLine) {
    setOnlineMode(false, {
      toastMessage:
        "Você está offline. Apenas o modo de prática está disponível.",
    });
    checkUrlForGame();
    initializeSoundState();
    return;
  }

  attemptToConnect(true);
  checkUrlForGame();
  initializeSoundState();
}

window.addEventListener("offline", () => {
  if (window.firebaseConnectionTimeout) {
    clearTimeout(window.firebaseConnectionTimeout);
  }
  database.ref(".info/connected").off();
  setOnlineMode(false, { toastMessage: "Conexão perdida. Você está offline." });
});

window.addEventListener("online", () => {
  attemptToConnect(false);
});

initializeApp();

function updateSoundButtonIcon() {
  const $icons = $(".toggle-sound-btn i");
  if (isMuted) {
    $icons.removeClass("fa-volume-high").addClass("fa-volume-xmark");
    $(".toggle-sound-btn").attr("title", "Ativar som");
  } else {
    $icons.removeClass("fa-volume-xmark").addClass("fa-volume-high");
    $(".toggle-sound-btn").attr("title", "Desativar som");
  }
}

$(".toggle-sound-btn").on("click", function () {
  isMuted = !isMuted;
  localStorage.setItem(MUTE_STORAGE_KEY, isMuted);
  updateSoundButtonIcon();
  if (!isMuted) playAudio(myTurnSound);
  showToast(isMuted ? "Som desativado" : "Som ativado", {
    icon: "info",
    timer: 1500,
  });
});

initializeSoundState();

function initializeSoundState() {
  const savedMuteState = localStorage.getItem(MUTE_STORAGE_KEY);
  isMuted = savedMuteState === "true";
  updateSoundButtonIcon();
}

function playAudio(audioElement, varyPitch = false) {
  if (isMuted) return;

  if (varyPitch) {
    audioElement.playbackRate = 0.95 + Math.random() * 0.1;
  } else {
    audioElement.playbackRate = 1;
  }

  audioElement.currentTime = 0;
  audioElement.play().catch((error) => {
    console.error("A reprodução de áudio foi impedida pelo navegador:", error);
  });
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
    let playerDisplayText = "";
    if (simulatedOnlinePlayers === 0) {
      playerDisplayText = "Nenhum jogador online no momento.";
    } else if (simulatedOnlinePlayers === 1) {
      playerDisplayText = `<b>1</b> jogador online no momento.`;
    } else {
      playerDisplayText = `<b>${simulatedOnlinePlayers}</b> jogadores online no momento.`;
    }

    $playerCountSpan.html(playerDisplayText);

    const $activeGamesSpan = $("#active-games-count");
    let activeGameText = "";
    if (simulatedActiveGames === 0) {
      activeGameText = "Nenhuma partida em andamento no momento.";
    } else if (simulatedActiveGames === 1) {
      activeGameText = `<b>1</b> partida em andamento no momento.`;
    } else {
      activeGameText = `<b>${simulatedActiveGames}</b> partidas em andamento no momento.`;
    }
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
          gameData.gameMessage =
            "Fim de jogo! Ninguém pode mais jogar. Empate!";
          gameData.winner = null;
        } else if (winningTeams.length === 1) {
          const winnerId = winningTeams[0];
          gameData.winner = winnerId;
          const winningTeamName =
            TEAM_NAMES[gameData.teams[winnerId].color].toUpperCase();
          gameData.gameMessage = `Fim de jogo! A EQUIPE ${winningTeamName} venceu com mais sequências!`;
        } else {
          gameData.winner = null;
          gameData.gameMessage =
            "Fim de jogo! Empate entre as equipes com mais sequências!";
        }
      } else {
        gameData.currentPlayerIndex = nextPlayerIndex;
        gameData.turnState = "playing";
        gameData.cardExchangedThisTurn = false;
        const nextPlayerName =
          gameData.players[gameData.turnOrder[nextPlayerIndex]].name;
        gameData.gameMessage = `Aguardando ${nextPlayerName}...`;
      }

      return gameData;
    })
    .catch((error) => {
      console.error("Falha na transação em endTurnAndAdvance:", error);
    });
}

$("#show-chat-btn").on("click", function () {
  $("#chat-container").addClass("show");
  $(this).removeClass("has-new-message");
  hasPlayedNewChatSound = false;
});

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
    showToast("Por favor, digite seu nome!", {
      title: "Oops...",
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
    showToast("Por favor, digite seu nome!", {
      title: "Oops...",
      icon: "warning",
    });
    return;
  }
  const gameId = $("#game-id-input").val().toUpperCase();
  if (!gameId) {
    showToast("Por favor, insira o Código da sala!", {
      title: "Oops...",
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
    showToast("Pode compartilhar o link copiado!", {
      icon: "success",
      title: "Link copiado!",
    });
  });
});

$("#find-random-game-btn").on("click", function () {
  isLocalGame = false;
  myPlayerName = $("#player-name-input").val().trim();
  if (!myPlayerName) {
    showToast("Por favor, digite seu nome antes de procurar um jogo!", {
      title: "Oops...",
      icon: "warning",
    });
    return;
  }
  saveLobbySettings();
  mostrarLoading();
  findRandomGame();
});

$(".leave-game-btn").on("click", function () {
  let text;
  let confirmButtonText;

  if (isLocalGame) {
    text =
      "Você está prestes a sair da partida local. Deseja salvar seu progresso antes de sair?";
    confirmButtonText = "<i class='fas fa-save'></i> Salvar e sair";
  } else {
    text =
      "Você está prestes a sair da partida. Tem certeza que deseja continuar?";
    confirmButtonText = "<i class='fas fa-right-from-bracket'></i> Sim, sair";
  }

  Swal.fire({
    title: "Sair da partida?",
    text: text,
    icon: "warning",
    showDenyButton: isLocalGame,
    showCancelButton: !isLocalGame,
    confirmButtonText: confirmButtonText,
    denyButtonText: "<i class='fas fa-right-from-bracket'></i> Sair sem salvar",
    cancelButtonText: "<i class='fas fa-times'></i> Cancelar",
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      confirmButton: "swal2-button-full",
      denyButton: "swal2-button-full",
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
        gameData.players[myPlayerId].online = false;
      }

      const isAnyoneElseOnline = Object.values(gameData.players || {}).some(
        (p) => p.online === true
      );

      if (!isAnyoneElseOnline) {
        const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
        gameData.expirationTimestamp = Date.now() + FIFTEEN_MINUTES_MS;
        gameData.gameMessage =
          "Todos os jogadores saíram. O jogo será encerrado em 15 minutos se ninguém retornar.";
      }

      return gameData;
    })
    .then(() => {
      localStorage.removeItem("sequenceGameData");
      window.history.pushState({}, "", window.location.pathname);
      window.location.reload();
    })
    .catch((error) => {
      console.error("Falha na transação em leaveGame:", error);
      showToast("Erro ao tentar sair da sala. Verifique sua conexão.", {
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
          "alguém";
        showToast(`Entrando no jogo de ${onlinePlayerName}...`, {
          icon: "success",
        });
        joinGame(gameToJoin.gameId, myPlayerName);
      } else {
        showToast("Procurando oponente... Partida encontrada!", {
          icon: "success",
          timer: 2000,
        });

        setTimeout(() => {
          localStorage.removeItem(LOCAL_GAME_KEY);
          checkExistingLocalGame();
          saveLobbySettings();

          isLocalGame = true;
          myPlayerName = $("#player-name-input").val().trim() || "Jogador 1";
          botDifficulty = "expert";

          const isTwoPlayerGame = Math.random() < 0.7;
          const playerCount = isTwoPlayerGame ? 2 : 3;
          const numTeams = isTwoPlayerGame ? 2 : 3;
          const chosenColors = {
            user: "red",
            bots: ["blue", "green"],
          };

          startLocalGame(playerCount, numTeams, chosenColors);
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
    gameMessage: `Aguardando jogadores... (1/12)`,
    winner: null,
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
    const playerCount = Object.values(players || {}).filter(p => p.id).length;
    const teamMembers = {};
    Object.values(teams || {}).forEach(team => {
        if (team.members && team.members.length > 0) {
            teamMembers[team.id] = team.members.length;
        }
    });

    const teamCount = Object.keys(teamMembers).length;
    const teamSizes = Object.values(teamMembers);

    if (teamCount === 0 || teamSizes.length === 0) return { canStart: false };

    const isBalanced = teamSizes.every(size => size === teamSizes[0]);
    if (!isBalanced) return { canStart: false };

    const playersPerTeam = teamSizes[0];
    if (playerCount !== teamCount * playersPerTeam) return { canStart: false };

    const validModes = {
        2: [{ numTeams: 2, playersPerTeam: 1 }],
        3: [{ numTeams: 3, playersPerTeam: 1 }],
        4: [{ numTeams: 2, playersPerTeam: 2 }],
        6: [{ numTeams: 2, playersPerTeam: 3 }, { numTeams: 3, playersPerTeam: 2 }],
        8: [{ numTeams: 2, playersPerTeam: 4 }],
        9: [{ numTeams: 3, playersPerTeam: 3 }],
        10: [{ numTeams: 2, playersPerTeam: 5 }],
        12: [{ numTeams: 2, playersPerTeam: 6 }, { numTeams: 3, playersPerTeam: 4 }],
    };

    if (validModes[playerCount]) {
        for (const mode of validModes[playerCount]) {
            if (mode.numTeams === teamCount && mode.playersPerTeam === playersPerTeam) {
                return {
                    canStart: true,
                    playerCount: playerCount,
                    numTeams: teamCount,
                    playersPerTeam: playersPerTeam
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
        showToast("Sala não encontrada. Verifique o código.", {
          title: "Erro",
          icon: "error",
        });
        return;
      }

      const players = gameData.players || {};

      const isNameTaken = Object.values(players).some(
        (p) => p.name.toLowerCase() === playerName.toLowerCase() && p.online
      );

      if (isNameTaken) {
        esconderLoading();
        showToast(
          `O nome "${playerName}" já está em uso nesta sala. Por favor, escolha outro.`,
          {
            title: "Nome Indisponível",
            icon: "warning",
            timer: 4000,
          }
        );
        return;
      }
      gameRef
        .transaction((gameDataTx) => {
          if (!gameDataTx) return;

          const existingPlayer = Object.values(gameDataTx.players || {}).find(
            (p) => p.name.toLowerCase() === playerName.toLowerCase()
          );

          if (existingPlayer) {
            gameDataTx.players[existingPlayer.id].online = true;
            gameDataTx.players[existingPlayer.id].disconnectedAt = null;
          } else {
            const playerCount = Object.keys(gameDataTx.players || {}).length;
            const capacity = gameDataTx.capacity || 12;
            if (
              playerCount >= capacity &&
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
                gameDataTx.players[disconnectedPlayerId].online = true;
                gameDataTx.players[disconnectedPlayerId].disconnectedAt = null;
                gameDataTx.gameMessage = `${playerName} entrou no jogo no lugar de ${oldPlayerName}.`;
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
            gameDataTx.gameMessage = `${playerName} entrou e reativou o jogo!`;
          }
          return gameDataTx;
        })
        .then((result) => {
          if (!result.committed) {
            esconderLoading();
            showToast(
              "Não foi possível entrar. O jogo pode estar cheio ou não há vagas disponíveis.",
              {
                title: "Aviso",
                icon: "warning",
                timer: 5000,
              }
            );
            return;
          }
          const finalGameData = result.snapshot.val();
          const myData = Object.values(finalGameData.players).find(
            (p) => p.name.toLowerCase() === playerName.toLowerCase() && p.online
          );
          myPlayerId = myData.id;
          myPlayerName = myData.name;
          currentGameId = gameId;
          setupGameUI(gameId);
        })
        .catch((error) => {
          esconderLoading();
          console.error("Falha na transação em joinGame:", error);
          showToast("Ocorreu um erro ao entrar na sala. Tente novamente.", {
            icon: "error",
          });
        });
    })
    .catch((error) => {
      esconderLoading();
      showToast("Erro ao acessar a sala.", {
        title: "Erro de Rede",
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
        gameData.gameMessage = `Escolha de equipes... (${currentPlayers}/${gameData.capacity})`;
      }
      return gameData;
    })
    .then(() => {
      setupGameUI(gameId);
    })
    .catch((error) => {
      console.error("Falha na transação em addPlayerToGame:", error);
      showToast("Erro ao adicionar jogador. A sala pode não existir mais.", {
        icon: "error",
      });
      esconderLoading();
    });
}

function setupGameUI(gameId) {
  mostrarLoading();
  currentGameId = gameId;

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
    $("#help-btn").hide();
    listenToGameUpdates(gameId);
    setupPresenceSystem();
  } else {
    $("#lobby").hide();
    $("#help-btn").hide();
    $(".game-id-text").text("Prática");
    $(".copy-id-btn").hide();
    $(".chat-btn-container").hide();
    $(".persistent-game-info").show();
    $("#game-container").show();
  }
}

function listenToGameUpdates(gameId) {
  isInitialLoad = true;

  database.ref("games/" + gameId).on("value", (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) {
      showToast("O jogo expirou ou foi encerrado.", {
        title: "Jogo Encerrado",
        icon: "warning",
        timer: 5000,
      });
      localStorage.removeItem("sequenceGameData");
      window.history.pushState({}, "", window.location.pathname);
      setTimeout(() => window.location.reload(), 4000);
      return;
    }

    if (
      myPlayerId &&
      gameData.players[myPlayerId] &&
      gameData.players[myPlayerId].host
    ) {
      amITheHost = true;
    }

    if (gameData.gameState === "team-selection") {
      $("#game-container").hide();
      renderTeamSelectionUI(gameData);
      esconderLoading();
      previousGameData = JSON.parse(JSON.stringify(gameData));
      isInitialLoad = false;
      return;
    }

    $("#team-selection-modal").hide();
    $("#game-container").show();

    const newCardForHighlight = detectNewCard(gameData, previousGameData);
    renderAll(gameData, newCardForHighlight);
    updateChatNotification(gameData);
    manageTurnState(gameData);

    const currentPlayer =
      gameData.players[gameData.turnOrder[gameData.currentPlayerIndex]];
    if (
      amITheHost &&
      currentPlayer &&
      currentPlayer.isBot &&
      gameData.gameState === "playing" &&
      gameData.turnState === "playing"
    ) {
      const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
      setTimeout(() => {
        database
          .ref(`games/${gameId}/currentPlayerIndex`)
          .once("value", (idxSnap) => {
            if (idxSnap.val() === gameData.currentPlayerIndex) {
              executeBotTurnAsHost(gameData, currentPlayer);
            }
          });
      }, delay);
    }

    if (myPlayerId && gameData.players && gameData.players[myPlayerId]) {
      myTeamId = gameData.players[myPlayerId].teamId;
    }

    if (!isInitialLoad) {
      handlePlayerConnectionChanges(gameData, previousGameData);

      if (
        gameData.turnOrder &&
        gameData.turnOrder.length > 0 &&
        previousGameData.turnOrder &&
        previousGameData.turnOrder.length > 0
      ) {
        const isMyTurnNow =
          gameData.turnOrder[gameData.currentPlayerIndex] === myPlayerId;
        const wasMyTurnBefore =
          previousGameData.turnOrder[previousGameData.currentPlayerIndex] ===
          myPlayerId;

        if (isMyTurnNow && !wasMyTurnBefore) {
          playAudio(myTurnSound, true);
        }
      }

      handleLastMoveNotification(gameData, previousGameData);

      if (
        gameData.gameState === "finished" &&
        previousGameData.gameState !== "finished"
      ) {
        $("#board .card-slot").css("pointer-events", "none");
        $("#deck-pile").addClass("disabled");
        setTimeout(() => promptRematchVote(gameData), 3000);
      }
    }

    if (isInitialLoad && gameData.gameState === "finished") {
      promptRematchVote(gameData);
    }

    previousGameData = JSON.parse(JSON.stringify(gameData));
    isInitialLoad = false;
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
      showToast(`<b>${playerName}</b> se desconectou do jogo.`, {
        icon: "warning",
        timer: 4000,
      });
    }

    if (justReconnected) {
      const playerName = currentPlayerState.name;
      showToast(`<b>${playerName}</b> se reconectou no jogo!`, {
        icon: "info",
        timer: 3000,
      });
    }
  }
}

function detectNewCard(gameData, previousGameData) {
  if (
    isInitialLoad ||
    !previousGameData.players ||
    !gameData.players[myPlayerId] ||
    previousGameData.gameState !== "playing"
  ) {
    return null;
  }
  const currentHand = gameData.players[myPlayerId].hand || [];
  const previousHand = previousGameData.players?.[myPlayerId]?.hand || [];

  if (currentHand.length <= previousHand.length) {
    return null;
  }

  const currentCounts = {};
  for (const card of currentHand) {
    currentCounts[card] = (currentCounts[card] || 0) + 1;
  }

  const previousCounts = {};
  for (const card of previousHand) {
    previousCounts[card] = (previousCounts[card] || 0) + 1;
  }

  for (const card in currentCounts) {
    if (currentCounts[card] > (previousCounts[card] || 0)) {
      return card;
    }
  }

  return null;
}

function handleLastMoveNotification(gameData, previousGameData) {
  if (
    isInitialLoad ||
    !gameData.lastMove ||
    (previousGameData.lastMove &&
      gameData.lastMove.timestamp === previousGameData.lastMove.timestamp)
  ) {
    return;
  }

  const { playerId, moveType, targetCard, madeSequence } = gameData.lastMove;
  if (playerId === myPlayerId) return;

  const player = gameData.players[playerId];
  if (!player) return;

  let toastMessage = "";
  let toastIcon = "info";

  if (madeSequence) {
    const team = gameData.teams[player.teamId];
    toastIcon = "success";
    if (team.members.length > 1) {
      toastMessage = `A equipe <b style="color: ${tem.color};">${TEAM_NAMES[
        team.color
      ].toUpperCase()}</b> completou uma sequência!`;
    } else {
      toastMessage = `<b style="color: ${tem.color};">${player.name}</b> completou uma sequência!`;
    }
  }

  if (toastMessage) {
    showToast(toastMessage, { timer: 4000, icon: toastIcon });
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
        showToast(
          "Você não tem jogadas válidas e o baralho acabou. Passando a vez...",
          { icon: "info", timer: 4000 }
        );
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
    if (!hasPlayedNewChatSound) {
      playAudio(newChatSound);
      hasPlayedNewChatSound = true;
    }
  }
  lastMessageCount = currentMessageCount;
}

function renderTeamSelectionUI(gameData) {
  const { players, teams, gameId, capacity } = gameData;
  const $modal = $("#team-selection-modal");

  $modal.css("display", "flex").show();
  $modal.find(".game-id-text").text(gameId);
  $("#help-btn").hide();
  const currentPlayers = Object.keys(players).length;
  $modal
    .find(".player-count-info")
    .html(
      `<strong>Jogadores na sala: ${currentPlayers}/${capacity || 12}</strong>`
    );

  const $teamsContainer = $modal.find("#teams-container").empty();
  const $startGameContainer = $modal.find("#start-game-container").empty();
  const myPlayer = players[myPlayerId];
  const isHost = myPlayer && myPlayer.host;

  Object.entries(teams).forEach(([teamId, teamData]) => {
    const teamMembers = teamData.members || [];
    const teamName = TEAM_NAMES[teamData.color];
    const playersPerTeam = 6;

    const $teamBox = $("<div>").addClass(`team-box ${teamData.color}`);
    $teamBox.append($("<h3>").html(`EQUIPE<br>${teamName.toUpperCase()}`));

    const $playerList = $("<ul>").addClass("team-players");

    teamMembers.forEach((playerId) => {
      const player = players[playerId];
      let avatarSrc;
      if (player.isBot) {
        const teamColor = teamData.color || "blue";
        avatarSrc = `/assets/img/avatars/bot-${teamColor}.png`;
      } else {
        const seed = player.avatar || 1;
        avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
      }

      const $avatarImg = $("<img>")
        .addClass("player-avatar")
        .attr("src", avatarSrc);
      const $playerNameSpan = $("<span>")
        .addClass("player-name")
        .text(player.name);

      const $playerListItem = $("<li>").append($avatarImg, $playerNameSpan);

      if (isHost && player.isBot) {
        const $removeBotBtn = $("<button>")
          .addClass("remove-bot-btn")
          .html('<i class="fas fa-user-xmark"></i>')
          .attr("title", "Remover Bot")
          .on("click", (e) => {
            e.stopPropagation();
            hostRemoveBot(playerId);
          });
        $playerListItem.append($removeBotBtn);
      }
      $playerList.append($playerListItem);
    });

    if (
      isHost &&
      teamMembers.length < playersPerTeam &&
      Object.keys(players).length < (capacity || 12)
    ) {
      const $addBotBtn = $("<button>")
        .addClass("add-bot-btn")
        .html('<i class="fas fa-robot"></i> Adicionar Bot')
        .on("click", (e) => {
          e.stopPropagation();
          hostAddBotToTeam(teamId);
        });
      $playerList.append($("<li>").addClass("add-bot-slot").append($addBotBtn));
    }

    $teamBox.append($playerList);

    const isMyCurrentTeam = myPlayer.teamId === teamId;
    const isTeamFull = teamMembers.length >= playersPerTeam;
    const isJoinable = !isMyCurrentTeam && !isTeamFull;

    if (isMyCurrentTeam) {
      $teamBox.addClass("selected-team").css("border-color", teamData.color);

      const $leaveTeamBtn = $("<button>")
        .addClass("leave-team-btn")
        .html('<i class="fas fa-arrow-right-from-bracket"></i> Sair da Equipe')
        .on("click", (e) => {
          e.stopPropagation();
          selectTeam(null);
        });
      $teamBox.append($leaveTeamBtn);
    }

    if (isJoinable) {
      $teamBox.addClass("joinable");
      $teamBox.on("click", () => selectTeam(teamId));
    }

    $teamsContainer.append($teamBox);
  });

  if (isHost) {
    const gameConfig = getGameConfiguration(players, teams);
    const $startBtn = $("<button>")
      .attr("id", "start-game-btn")
      .text("Começar a Partida")
      .prop("disabled", !gameConfig.canStart)
      .on("click", hostStartGame);

    $startGameContainer.html(
      !gameConfig.canStart
        ? "<span>Para iniciar, forme uma configuração válida (Ex: 2, 3, 4, 6, 8, 9, 10 ou 12 jogadores em equipes balanceadas).</span>"
        : ""
    );
    $startGameContainer.append($startBtn);
  } else {
    $startGameContainer.html(
      "<span>Aguardando o anfitrião iniciar a partida...</span>"
    );
  }
}

function selectTeam(teamId) {
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
        showToast(`A equipe ${TEAM_NAMES[targetTeam.color]} está cheia!`, {
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
      console.error("Falha na transação em selectTeam:", error);
      showToast("Erro ao selecionar equipe. Tente novamente.", {
        icon: "error",
      });
    });
}

function hostAddBotToTeam(teamId) {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;

      if (Object.keys(gameData.players).length >= gameData.playerCount) {
        console.warn("Tentativa de adicionar bot a um jogo cheio.");
        return;
      }

      const existingNames = Object.values(gameData.players).map((p) =>
        p.name.toLowerCase()
      );
      const availableBotNames = BOT_NAMES.filter(
        (name) => !existingNames.includes(name.toLowerCase())
      );

      if (availableBotNames.length === 0) {
        console.warn("Não há mais nomes de bot disponíveis.");
        return;
      }

      const botName =
        availableBotNames[Math.floor(Math.random() * availableBotNames.length)];
      const botId = `bot_${Date.now()}`;

      gameData.players[botId] = {
        id: botId,
        name: botName,
        isBot: true,
        online: true,
        hand: [],
        teamId: teamId,
      };

      if (!gameData.teams[teamId].members) {
        gameData.teams[teamId].members = [];
      }
      gameData.teams[teamId].members.push(botId);

      const currentPlayers = Object.keys(gameData.players).length;
      gameData.gameMessage = `${botName} entrou no jogo! (${currentPlayers}/${gameData.playerCount})`;

      return gameData;
    })
    .catch((error) => {
      console.error("Erro ao adicionar bot:", error);
      showToast("Não foi possível adicionar o bot.", { icon: "error" });
    });
}

function hostRemoveBot(botIdToRemove) {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;

      const botToRemove = gameData.players[botIdToRemove];
      if (!botToRemove || !botToRemove.isBot) {
        console.warn("Tentativa de remover um jogador que não é um bot.");
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
      gameData.gameMessage = `${botToRemove.name} foi removido do jogo. (${currentPlayers}/${gameData.playerCount})`;

      return gameData;
    })
    .catch((error) => {
      console.error("Erro ao remover bot:", error);
      showToast("Não foi possível remover o bot.", { icon: "error" });
    });
}

function executeBotTurnAsHost(currentGameData, botPlayer) {
  let move = getStrategicMove(currentGameData, botPlayer);

  if (!move) {
    move = getRandomMove(currentGameData, botPlayer);
  }

  const updates = {};
  const botId = botPlayer.id;

  if (!move) {
    updates["/currentPlayerIndex"] =
      (currentGameData.currentPlayerIndex + 1) % currentGameData.playerCount;
    updates[
      "/gameMessage"
    ] = `${botPlayer.name} não tinha jogadas e passou a vez.`;
    database.ref("games/" + currentGameId).update(updates);
    return;
  }

  const botHand = [...botPlayer.hand];
  const cardIndex = botHand.indexOf(move.card);
  if (cardIndex > -1) botHand.splice(cardIndex, 1);

  updates[`/players/${botId}/hand`] = botHand;
  updates[`/discardPile`] = [...(currentGameData.discardPile || []), move.card];

  if (move.isRemoval) {
    updates[`/boardState/${move.slotKey}`] = null;
  } else {
    updates[`/boardState/${move.slotKey}`] = botPlayer.teamId;
  }

  const tempBoardState = {
    ...currentGameData.boardState,
    [move.slotKey]: botPlayer.teamId,
  };
  if (move.isRemoval) delete tempBoardState[move.slotKey];

  const newSequence = checkForSequence(
    tempBoardState,
    currentGameData.lockedChips,
    move.row,
    move.col,
    botPlayer.teamId
  );
  let madeSequence = false;

  if (newSequence && !move.isRemoval) {
    playAudio(madeSequenceSound);
    madeSequence = true;
    const team = currentGameData.teams[botPlayer.teamId];
    team.sequencesCompleted = (team.sequencesCompleted || 0) + 1;
    updates[`/teams/${botPlayer.teamId}/sequencesCompleted`] =
      team.sequencesCompleted;

    const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
    newSequence.forEach((chip) => {
      if (!isCanto(chip.row, chip.col)) {
        updates[`/lockedChips/${chip.row}_${chip.col}`] = true;
      }
    });

    const sequencesNeeded = SEQUENCES_TO_WIN[currentGameData.numTeams] || 1;
    if (team.sequencesCompleted >= sequencesNeeded) {
      updates["/winner"] = botPlayer.teamId;
      updates["/gameState"] = "finished";
    }
  }

  const deck = [...(currentGameData.deck || [])];
  if (deck.length > 0) {
    const newCard = deck.pop();
    botHand.push(newCard);
    updates[`/players/${botId}/hand`] = botHand;
    updates["/deck"] = deck;
  }

  updates["/turnState"] = "playing";
  updates["/cardExchangedThisTurn"] = false;
  updates["/currentPlayerIndex"] =
    (currentGameData.currentPlayerIndex + 1) % currentGameData.playerCount;
  const nextPlayerName =
    currentGameData.players[
      currentGameData.turnOrder[updates["/currentPlayerIndex"]]
    ].name;
  updates["/gameMessage"] = `Aguardando ${nextPlayerName}...`;

  database.ref("games/" + currentGameId).update(updates);
}

function hostStartGame() {
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

      const gameConfig = getGameConfiguration(gameData.players, gameData.teams);

      if (!gameConfig.canStart) {
        console.warn("Host tentou iniciar partida em estado inválido.");
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

      for (let i = 0; i < playersPerTeam; i++) {
        for (const team of populatedTeams) {
          if (team.members[i]) {
            newTurnOrder.push(team.members[i]);
          }
        }
      }

      gameData.turnOrder = newTurnOrder;

      gameData.currentPlayerIndex = 0;
      
      if (gameData.rematchVotes && Object.keys(gameData.rematchVotes).length > 0) {
        const firstPlayer = gameData.turnOrder.shift(); 
        gameData.turnOrder.push(firstPlayer);
      }

      gameData.currentPlayerIndex = 0;
      const firstPlayerName = gameData.players[gameData.turnOrder[0]].name;
      gameData.gameMessage = `O jogo começou! Vez de ${firstPlayerName}.`;

      gameData.rematchVotes = {};

      return gameData;
    })
    .catch((error) => {
      console.error("Falha na transação em hostStartGame:", error);
      showToast("Erro ao iniciar a partida. Verifique sua conexão.", {
        icon: "error",
      });
    });
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
      gameData.gameMessage = "Fim de jogo! O baralho acabou. Jogo empatado!";
      gameData.winner = null;
    } else if (winningTeams.length === 1) {
      const winnerId = winningTeams[0];
      gameData.winner = winnerId;
      const winningTeam = gameData.teams[winnerId];
      const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

      if (isSoloGame) {
        const winnerPlayerId = winningTeam.members[0];
        const winnerPlayer = gameData.players[winnerPlayerId];
        const winnerName = winnerPlayer
          ? winnerPlayer.name.toUpperCase()
          : "JOGADOR";
        gameData.gameMessage = `Fim de jogo! O baralho acabou. <b style="color: ${winningTeam.color};">${winnerName}</b> venceu com mais sequências!`;
      } else {
        const winnerColor = TEAM_NAMES[winningTeam.color].toUpperCase();
        gameData.gameMessage = `Fim de jogo! O baralho acabou. A EQUIPE <b style="color: ${winningTeam.color};">${winnerColor}</b> venceu com mais sequências!`;
      }
    } else {
      gameData.winner = null;
      gameData.gameMessage = "Fim de jogo! O baralho acabou. Jogo empatado!";
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

function renderBoard(gameData) {
  const { boardState, teams, lockedChips } = gameData;
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
        `url('${window.location.origin}/assets/img/cards/${cardCode}.png')`
      );

      const slotKey = `${rowIndex}_${colIndex}`;
      const chipOwnerTeamId = boardState ? boardState[slotKey] : null;

      if (
        chipOwnerTeamId &&
        chipOwnerTeamId !== "F" &&
        teams[chipOwnerTeamId]
      ) {
        const chipColor = teams[chipOwnerTeamId].color;
        const $chip = $("<div>").addClass("chip").addClass(`chip-${chipColor}`);

        if (lockedChips && lockedChips[slotKey]) {
          $chip.addClass("locked");
        }

        $slot.append($chip);
      }
      const clickHandler = isLocalGame
        ? onBoardSlotClickLocal
        : onBoardSlotClick;
      $slot.on("click", clickHandler);
      $board.append($slot);
    });
  });
}

function renderPlayerHand(
  hand,
  gameState,
  newlyDrawnCard = null,
  gameData = {},
  isMyTurn = false
) {
  const $hand = $("#player-hand").empty();
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

  if (hand) {
    const indexOfNewest = newlyDrawnCard
      ? hand.lastIndexOf(newlyDrawnCard)
      : -1;

    const handWithIndices = hand.map((card, index) => ({
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

    finalHandOrder.forEach((item) => {
      const { card, originalIndex } = item;
      const clickHandler = isLocalGame ? onHandCardClickLocal : onHandCardClick;
      const isNew = originalIndex === indexOfNewest;
      const isDead = isCardDead(card, boardState);

      const $cardElement = $("<div>")
        .addClass(`card-in-hand ${card.includes("J") ? "jack" : ""}`)
        .css(
          "background-image",
          `url('${window.location.origin}/assets/img/cards/${card}.png')`
        )
        .data("card", card)
        .on("click", (e) =>
          clickHandler(card, originalIndex, $(e.currentTarget))
        );

      if (isNew) $cardElement.addClass("newly-drawn");
      if (isDead) $cardElement.addClass("dead-card");

      $hand.append($cardElement);
    });
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

  $("#team-info").empty();

  if (playerCount && numTeams && myTeamId && teams && teams[myTeamId] && players) {
    const myTeam = teams[myTeamId];
    let teamInfoHtml = "";

    const sequencesNeeded = SEQUENCES_TO_WIN[numTeams] || 1;
    const sequencesInfo = `Sequências: ${myTeam.sequencesCompleted} de ${sequencesNeeded}`;

    if (myTeam.members.length > 1) {
      const teammates = myTeam.members
        .filter((pid) => pid !== myPlayerId)
        .map((pid) => (players[pid] ? players[pid].name : ""))
        .join(", ");

      teamInfoHtml = `Equipe: <b style="color:${myTeam.color};">${TEAM_NAMES[
        myTeam.color
      ].toUpperCase()}</b>`;
      if (teammates) {
        teamInfoHtml += ` <br>parceiro${
          myTeam.members.length > 2 ? "s" : ""
        }: ${teammates}`;
      }
      teamInfoHtml += ` | ${sequencesInfo}`;
    } else {
      teamInfoHtml = sequencesInfo;
    }
    $("#team-info").html(teamInfoHtml);
  }

  let finalMessage = gameMessage;

  if (gameData.gameState === "playing" && turnOrder && turnOrder.length > 0) {
    const currentPlayerId = turnOrder[currentPlayerIndex];
    const currentPlayer = players[currentPlayerId];

    if (currentPlayer && teams[currentPlayer.teamId]) {
      let avatarSrc;
      if (currentPlayer.isBot) {
        const teamColor = teams[currentPlayer.teamId]?.color || "blue";
        avatarSrc = `/assets/img/avatars/bot-${teamColor}.png`;
      } else {
        const seed = currentPlayer.avatar || 1;
        avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
      }
      const playerTurnHtml = `<img src="${avatarSrc}" class="player-avatar"> Vez de ${currentPlayer.name}`;
      $("#current-player-text")
        .html(playerTurnHtml)
        .css("color", teams[currentPlayer.teamId].color);

      const isMyTurn = currentPlayerId === myPlayerId;
      if (isMyTurn) {
        if (turnState === "drawing") {
          finalMessage = "Compre uma carta para finalizar seu turno.";
        } else if (turnState === "playing") {
          finalMessage = "Sua vez! Selecione uma carta para jogar.";
        }
      } else {
        const nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
        const nextPlayer = players[turnOrder[nextPlayerIndex]];

        if (turnState === "drawing") {
          finalMessage = `Aguardando ${currentPlayer.name} comprar uma carta...`;
        } else {
          if (nextPlayer && nextPlayer.id === myPlayerId) {
            finalMessage = `Aguardando ${currentPlayer.name}... <b>Você é o próximo!</b>`;
          } else if (nextPlayer) {
            finalMessage = `Aguardando ${currentPlayer.name}... Próximo a jogar: <b>${nextPlayer.name}</b>`;
          } else {
            finalMessage = `Aguardando ${currentPlayer.name}...`;
          }
        }
      }
    } else {
      $("#current-player-text").text("Aguardando...");
    }
  } else {
    $("#current-player-text").text("Aguardando...");
  }

  if (
    gameData.turnState !== "drawing" ||
    (gameData.turnOrder && gameData.turnOrder[gameData.currentPlayerIndex] !== myPlayerId)
  ) {
    $("#game-message").html(finalMessage);
  }

  const deckSize = gameData.deck ? gameData.deck.length : 0;
  $("#deck-count").text(`${deckSize} cartas`);
  if (deckSize === 0) {
    $("#deck-pile").addClass("disabled");
  }

  const discardPile = gameData.discardPile || [];
  const $discardPileDiv = $("#discard-pile");
  if (discardPile.length > 0) {
    const lastDiscardedCard = discardPile[discardPile.length - 1];
    const isJack = lastDiscardedCard.includes("J");
    $discardPileDiv
      .css(
        "background-image",
        `url('${window.location.origin}/assets/img/cards/${lastDiscardedCard}.png')`
      )
      .css("border-style", "solid");
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

  $gameMessage.html(`Compre uma carta (${remainingTime}s)`);

  drawCountdownInterval = setInterval(() => {
    remainingTime--;
    if (remainingTime > 0) {
      $gameMessage.html(`Compre uma carta (${remainingTime}s)`);
    } else {
      clearInterval(drawCountdownInterval);
    }
  }, 1000);
}

function promptRematchVote(gameData) {
  if (gameData.rematchVotes && gameData.rematchVotes[myPlayerId]) {
    Swal.fire({
      title: "Aguardando outros jogadores...",
      text: "Esperando os outros jogadores votarem na revanche.",
      icon: "info",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      toast: true,
      position: "center",
    });
    return;
  }

  let winTitle;
  let winHtml;
  let winIcon;
  let confirmText;

  const isMyTeamWinning =
    gameData.winner != null && gameData.winner === myTeamId;

  if (gameData.winner == null) {
    playAudio(drawOrDefeatSound);
    winTitle = "Empate!";
    winHtml = "A partida terminou em <b>EMPATE</b>!";
    winIcon = "info";
    confirmText = "<i class='fas fa-rotate-right'></i> Jogar novamente";
  } else if (isMyTeamWinning) {
    playAudio(winnerSound);
    winTitle = "Você Venceu!";
    winIcon = "success";
    const myWinningTeam = gameData.teams[myTeamId];
    const winnerColorStyle = `style="color: ${myWinningTeam.color};"`;
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (isSoloGame) {
      winHtml = `<b ${winnerColorStyle}>VOCÊ</b> VENCEU O JOGO!`;
    } else {
      winHtml = `A <b ${winnerColorStyle}>SUA EQUIPE</b> VENCEU!`;
    }

    confirmText = "<i class='fas fa-rotate-right'></i> Sim, vamos!";
  } else {
    playAudio(drawOrDefeatSound);
    winTitle = "Você Perdeu!";
    winIcon = "info";
    const winningTeam = gameData.teams[gameData.winner];
    const winnerColorStyle = `style="color: ${winningTeam.color};"`;
    const isSoloGame = gameData.playerCount / gameData.numTeams === 1;

    if (isSoloGame) {
      const winnerPlayerId = winningTeam.members[0];
      const winnerPlayer = gameData.players[winnerPlayerId];
      const winnerName = winnerPlayer ? winnerPlayer.name : "Jogador";
      winHtml = `<b ${winnerColorStyle}>${winnerName.toUpperCase()}</b> VENCEU O JOGO!`;
    } else {
      const winnerColorName =
        TEAM_NAMES[winningTeam.color] || winningTeam.color;
      winHtml = `A EQUIPE <b ${winnerColorStyle}>${winnerColorName.toUpperCase()}</b> VENCEU!`;
    }

    confirmText = "<i class='fas fa-rotate-right'></i> Quero revanche!";
  }

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "bottom" : "center";

  Swal.fire({
    title: winTitle,
    html: `${winHtml}<br><br>Desejam jogar uma revanche?`,
    icon: winIcon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "<i class='fas fa-right-from-bracket'></i> Não, sair.",
    allowOutsideClick: false,
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
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;
      if (!gameData.rematchVotes) gameData.rematchVotes = {};
      gameData.rematchVotes[myPlayerId] = vote;
      return gameData;
    })
    .then(() => {
      database.ref("games/" + currentGameId).once("value", (snapshot) => {
        const updatedGameData = snapshot.val();
        if (!updatedGameData) return;

        const humanPlayersCount = Object.values(updatedGameData.players).filter(
          (p) => !p.isBot
        ).length;
        const votesCount = Object.keys(updatedGameData.rematchVotes).length;

        if (votesCount === humanPlayersCount) {
          const allVotedYes = Object.values(updatedGameData.rematchVotes).every(
            (v) => v === "yes"
          );

          if (allVotedYes) {
            resetForRematchSelection();
          } else {
            database
              .ref("games/" + currentGameId)
              .transaction((game) => {
                if (game) {
                  game.gameState = "ended";
                  game.gameMessage =
                    "A partida foi finalizada, pois nem todos concordaram em jogar novamente.";
                }
                return game;
              })
              .then(() => {
                Swal.fire({
                  title: "Partida Finalizada",
                  text: "Nem todos votaram para jogar novamente. Voltando para a tela inicial...",
                  icon: "info",
                  timer: 4000,
                  timerProgressBar: true,
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
      console.error("Falha na transação em castRematchVote:", error);
      showToast("Seu voto não pôde ser registrado. Tente novamente.", {
        icon: "error",
      });
    });
}

function resetForRematchSelection() {
  database
    .ref("games/" + currentGameId)
    .transaction((gameData) => {
      if (!gameData) return;

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
      });

      Object.values(gameData.teams).forEach((team) => {
        team.sequencesCompleted = 0;
      });

      gameData.gameMessage =
        "Revanche aceita! Por favor, escolham suas equipes novamente.";

      return gameData;
    })
    .catch((error) => {
      console.error("Falha na transação em resetForRematchSelection:", error);
      showToast(
        "Erro ao reiniciar para a revanche. A sala pode ser recarregada.",
        { icon: "error" }
      );
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

          const newSequence = checkForSequence(
            gameData.boardState,
            gameData.lockedChips,
            row,
            col,
            myTeam.id
          );

          if (newSequence) {
            playAudio(madeSequenceSound);
            myTeam.sequencesCompleted = (myTeam.sequencesCompleted || 0) + 1;

            const isCanto = (r, c) =>
              (r === 0 || r === 9) && (c === 0 || c === 9);
            newSequence.forEach((chip) => {
              if (!isCanto(chip.row, chip.col)) {
                gameData.lockedChips[`${chip.row}_${chip.col}`] = true;
              }
            });

            if (gameData.lastMove) {
              gameData.lastMove.madeSequence = true;
            }

            const sequencesNeeded = SEQUENCES_TO_WIN[gameData.numTeams] || 1;
            const isSoloGame = gameData.playerCount / gameData.numTeams === 1;
            const readableCardName = getHumanReadableCardName(selectedCard);

            if (myTeam.sequencesCompleted >= sequencesNeeded) {
              gameData.winner = myTeam.id;
              gameData.gameState = "finished";
              if (isSoloGame) {
                gameData.gameMessage = `<b style="color: ${
                  myTeam.color
                };">${myPlayer.name.toUpperCase()}</b> venceu com o <b>${readableCardName}</b>!`;
              } else {
                gameData.gameMessage = `A EQUIPE <b style="color: ${
                  myTeam.color
                };">${TEAM_NAMES[
                  myTeam.color
                ].toUpperCase()}</b> venceu com o <b>${readableCardName}</b>!`;
              }
            } else {
              if (isSoloGame) {
                gameData.gameMessage = `<b style="color: ${
                  myTeam.color
                };">${myPlayer.name.toUpperCase()}</b> completou uma sequência com o <b>${readableCardName}</b>!`;
              } else {
                gameData.gameMessage = `A EQUIPE <b style="color: ${
                  myTeam.color
                };">${TEAM_NAMES[
                  myTeam.color
                ].toUpperCase()}</b> completou uma sequência com o <b>${readableCardName}</b>!`;
              }
            }
            messageWasSet = true;
          }
        }

        if (gameData.winner == null) {
          gameData.turnState = "drawing";
          if (!messageWasSet) {
            gameData.gameMessage = `Aguardando...`;
          }
        }
      }
      return gameData;
    })
    .then(() => {
      selectedHandCard = null;
      $(".card-in-hand").removeClass("selected");
      clearHighlights();
    })
    .catch((error) => {
      console.error("Falha na transação em onBoardSlotClick:", error);
      showToast("Sua jogada não pôde ser registrada. Tente novamente.", {
        icon: "error",
      });
      selectedHandCard = null;
      $(".card-in-hand").removeClass("selected");
      clearHighlights();
    });
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
      showToast("Você já trocou uma carta neste turno.", {
        icon: "warning",
        title: "Aviso",
      });
      return;
    }

    const canExchange = gameData.deck && gameData.deck.length > 0;
    if (canExchange && isCardDead(card, gameData.boardState)) {
      Swal.fire({
        title: "Carta Morta!",
        html: `Ambos os espaços para <b>${getHumanReadableCardName(
          card
        )}</b> estão ocupados. <br>Deseja trocá-la por uma nova carta? Sua vez continuará.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "<i class='fas fa-right-left'></i> Sim, trocar!",
        cancelButtonText: "<i class='fas fa-times'></i> Não, cancelar",
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
        message = `Valete de um olho: Remove fichas.`;
      } else if (isTwoEyedJack) {
        message = `Valete de dois olhos: Adiciona fichas.`;
      } else {
        const cardName = getHumanReadableCardName(card);
        message = `${cardName} selecionada.`;
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
        gameData.gameMessage = `${myPlayerName} trocou uma carta morta e continua sua jogada.`;
      }
      return gameData;
    })
    .then((result) => {
      if (!result.committed) {
        showToast(
          "Não foi possível trocar a carta. Verifique se o baralho não está vazio ou se você já não trocou uma carta neste turno.",
          { icon: "warning", title: "Aviso" }
        );
      } else {
        showToast("Carta trocada com sucesso!", { icon: "success" });
      }
    })
    .catch((error) => {
      console.error("Falha na transação em exchangeDeadCard:", error);
      showToast("Não foi possível trocar a carta devido a um erro de rede.", {
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
function checkForSequence(boardState, lockedChips, startRow, startCol, teamId) {
  const candidates = findAllValidNewSequences(
    boardState,
    lockedChips,
    startRow,
    startCol,
    teamId
  );

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);

  candidates.sort((seqA, seqB) => {
    const aIsCorner = seqA.some((c) => isCanto(c.row, c.col));
    const bIsCorner = seqB.some((c) => isCanto(c.row, c.col));
    if (aIsCorner && !bIsCorner) return -1;
    if (!aIsCorner && bIsCorner) return 1;

    const getEdgeDistance = (seq) => {
      return Math.min(
        ...seq.map((c) => Math.min(c.row, 9 - c.row, c.col, 9 - c.col))
      );
    };

    const distA = getEdgeDistance(seqA);
    const distB = getEdgeDistance(seqB);

    if (distA < distB) return -1;
    if (distB < distA) return 1;

    return 0;
  });

  return candidates[0];
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
  const valueNames = {
    A: "Ás",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    T: "10",
    J: "Valete",
    Q: "Dama",
    K: "Rei",
  };
  const suitNames = { H: "Copas", D: "Ouros", C: "Paus", S: "Espadas" };
  const value = cardCode.slice(0, -1);
  const suit = cardCode.slice(-1);
  const readableValue = valueNames[value] || value;
  const readableSuit = suitNames[suit] || suit;
  return `${readableValue} de ${readableSuit}`;
}

function showToast(message, options = {}) {
  const { timer = 3000, title = "", icon } = options;

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "bottom-end" : "top-end";

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
  } catch (error) {
    console.error("Erro durante a limpeza de jogos expirados:", error);
  }
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
  } catch (error) {
    console.error("Erro ao verificar a necessidade de limpeza diária:", error);
  }
}

$("#help-btn").on("click", function () {
  rules(true);
});

$(".help-btn").on("click", function () {
  rules(false);
});

function rules(comecandoOpen) {
  const rulesHtml = `
    <div class="swal2-rules-content">
      <div id="topo" class="swal2-rules-sections">
        <strong>Seções:</strong>
        <a href="#sec-comecando">Começando</a>
        <a href="#sec-objetivo">Objetivo</a>
        <a href="#sec-cartas">Cartas Especiais</a>
        <a href="#sec-sua-vez">Sua Vez</a>
        <a href="#sec-final">Final</a>
      </div>

      <details id="sec-comecando" ${comecandoOpen ? "open" : ""}>
        <summary><strong><i class="fas fa-door-open"></i> Começando</strong></summary>
        <p><strong>1. Digite seu nome:</strong> Insira um nome no campo acima para entrar no lobby do jogo.</p>
        <p><strong>2. Escolha como jogar:</strong></p>
        <ul>
          <li><strong>Criar sala:</strong> Cria uma sala flexível para até 12 jogadores. O modo de jogo é definido quando o anfitrião inicia a partida.</li>
          <li><strong>Entrar com código:</strong> Insira o código de uma sala já criada.</li>
          <li><strong>Partida aleatória:</strong> Clique para entrar em uma sala com vagas disponíveis.</li>
        </ul>
        <p><strong>3. Convidar amigos:</strong> Após criar ou entrar em uma sala, copie o link da sala e envie para seus amigos. Você também pode usar o botão <em>"Copiar"</em>.</p>
        <p><strong>4. Modo treino:</strong> Jogue sozinho contra bots. Escolha o número de jogadores e a dificuldade, depois clique em <em>"Novo jogo contra bots"</em> ou <em>"Continuar jogo contra bots"</em>.</p>
      </details>
      
      <hr>

      <details id="sec-objetivo" ${!comecandoOpen ? "open" : ""}>
        <summary><strong><i class="fas fa-bullseye"></i> Objetivo</strong></summary>
        <p>O objetivo é formar a quantidade necessária de <strong>sequências</strong> antes das outras equipes ou jogadores:</p>
        <ul>
          <li><strong>2 equipes ou jogadores:</strong> 2 sequências para vencer.</li>
          <li><strong>3 equipes ou jogadores:</strong> 1 sequência para vencer.</li>
        </ul>
        <p>Uma sequência é formada por 5 fichas da mesma cor em linha contínua (horizontal, vertical ou diagonal).</p>
        <p><strong>Observação:</strong> Se uma sequência utilizar um dos cantos do tabuleiro (que são curingas), ela poderá ter apenas 4 fichas da mesma cor, já que os cantos contam como parte da sequência.</p>
      </details>

      <hr>

      <details id="sec-cartas">
        <summary><strong><i class="fas fa-magic"></i> Cartas especiais</strong></summary>
        <p><strong>Valetes:</strong></p>
        <ul>
          <li><strong>Dois olhos</strong> (<i class="fas fa-club black"></i>, <i class="fas fa-diamond red"></i>): Coloque uma ficha em qualquer espaço vazio.</li>
          <li><strong>Um olho</strong> (<i class="fas fa-spade black"></i>, <i class="fas fa-heart red"></i>): Remova uma ficha inimiga (exceto em sequência).</li>
        </ul>
        <p><strong>Cantos livres:</strong> Os quatro cantos do tabuleiro contam como ficha de todas as equipes.</p>
        <p><strong>Carta morta:</strong> Se os dois espaços correspondentes à carta estiverem ocupados, ela é considerada "morta". Você poderá trocá-la por uma nova sem perder a vez.</p>
      </details>

      <hr>

      <details id="sec-sua-vez">
        <summary><strong><i class="fas fa-hand-pointer"></i> Sua vez</strong></summary>
        <ol>
          <li><strong>Selecione uma carta</strong> da sua mão clicando nela.</li>
          <li><strong>Clique em um espaço destacado</strong> no tabuleiro para jogar.</li>
          <li><strong>Comprar nova carta:</strong> Após jogar, você terá 5 segundos para clicar no baralho. Se não clicar, a carta será descartada (exceto se já estiver com o mínimo de cartas permitido).</li>
          <li><strong>Trocar carta morta:</strong> Se uma carta não tiver mais espaços livres no tabuleiro, você poderá trocá-la <strong>uma vez por turno</strong>, sem perder a vez.</li>
        </ol>
      </details>

      <hr>

      <details id="sec-final">
        <summary><strong><i class="fas fa-flag-checkered"></i> Final e revanche</strong></summary>
        <p>O jogo termina quando uma equipe completa a quantidade necessária de sequências.</p>
        <p>Em seguida, inicia-se uma votação para revanche. Todos devem aceitar para que o jogo recomece.</p>
        <p>O menu de escolha de equipes será exibido novamente para reorganizar os jogadores.</p>
      </details>

      <hr>

      <span class="swal2-rules-actions">
        <a href="#topo"><i class="fas fa-up"></i> Voltar ao topo</a>
      </span>

    </div>
  `;

  Swal.fire({
    title: "<i class='fas fa-circle-info'></i> Regras do Jogo",
    html: rulesHtml,
    showConfirmButton: true,
    confirmButtonText: "<i class='fas fa-check'></i> Entendi",
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

$(".report-bug-btn").on("click", function () {
  Swal.fire({
    title: "<i class='fas fa-bug'></i> Reportar um Bug?",
    text: "Isso irá coletar informações anônimas sobre o estado atual do jogo para nos ajudar a corrigi-lo. Deseja continuar?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "<i class='fas fa-bug'></i> Sim, reportar",
    cancelButtonText: "<i class='fas fa-times'></i> Cancelar",
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
    }
  });
});

function promptBugReport() {
  Swal.fire({
    title: "Descreva o Bug",
    input: "textarea",
    inputPlaceholder:
      "Tente ser o mais detalhado possível. O que você estava fazendo quando o erro aconteceu?",
    inputAttributes: {
      "aria-label": "Descreva o bug aqui",
    },
    showCancelButton: true,
    confirmButtonText: "<i class='fas fa-paper-plane'></i> Enviar Relatório",
    cancelButtonText: "<i class='fas fa-times'></i> Cancelar",
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
    preConfirm: (description) => {
      if (!description || description.trim().length < 10) {
        Swal.showValidationMessage(
          `Por favor, forneça uma descrição com pelo menos 10 caracteres.`
        );
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
        showToast(
          "Seu relatório foi enviado com sucesso. Agradecemos sua ajuda!",
          { icon: "success", title: "Obrigado!" }
        );
      }
    })
    .catch((error) => {
      Swal.showValidationMessage(`Falha ao enviar: ${error}`);
    });
}

$(function () {
  const $chatContainer = $(".chat-btn-container");
  const isMobile = window.innerWidth < 500;
  const storageKey = "chatBtnPosition";

  if (!isMobile) return;

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

  $chatContainer.on("touchstart", function (e) {
    isDragging = true;
  });

  $(document).on("touchmove", function (e) {
    if (!isDragging) return;

    const touch = e.originalEvent.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    $chatContainer.css({
      left: x - $chatContainer.outerWidth() / 2 + "px",
      top: y - $chatContainer.outerHeight() / 2 + "px",
      right: "auto",
      bottom: "auto",
      position: "fixed",
    });

    e.preventDefault();
  });

  $(document).on("touchend", function () {
    if (!isDragging) return;
    isDragging = false;

    const offset = $chatContainer.offset();
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        left: offset.left,
        top: offset.top,
      })
    );
  });
});
