const LOCAL_GAME_KEY = "sequenceLocalGameData";
const PLAYER_PROFILE_KEY = "sequencePlayerProfile";
const WIN_LOSS_HISTORY_KEY = "sequenceWinLossHistory";
const BOT_NAMES = [
  { name: "AliceWonder", avatar: 1, gender: "f", points: 907, wins: 381, gamesPlayed: 563 },
  { name: "sakura-chan", avatar: 2, gender: "f", points: 173, wins: 71, gamesPlayed: 117 },
  { name: "HansKR", avatar: 3, gender: "m", points: 2513, wins: 1058, gamesPlayed: 1412 },
  { name: "chen-wei", avatar: 4, gender: "m", points: 421, wins: 176, gamesPlayed: 283 },
  { name: "Giulia_Ve", avatar: 5, gender: "f", points: 1507, wins: 624, gamesPlayed: 883 },
  { name: "sophie22", avatar: 6, gender: "f", points: 63, wins: 26, gamesPlayed: 43 },
  { name: "Priya_Sh", avatar: 7, gender: "f", points: 856, wins: 359, gamesPlayed: 531 },
  { name: "olgaNova", avatar: 8, gender: "f", points: 298, wins: 123, gamesPlayed: 197 },
  { name: "Liam_Dev", avatar: 9, gender: "m", points: 1894, wins: 796, gamesPlayed: 1089 },
  { name: "ahmed97", avatar: 10, gender: "m", points: 118, wins: 49, gamesPlayed: 81 },
  { name: "DiegoMX", avatar: 11, gender: "m", points: 694, wins: 287, gamesPlayed: 437 },
  { name: "isabella-cr", avatar: 12, gender: "f", points: 47, wins: 19, gamesPlayed: 31 },
  { name: "ChloePar", avatar: 13, gender: "f", points: 1198, wins: 503, gamesPlayed: 718 },
  { name: "rafael-sr", avatar: 14, gender: "m", points: 379, wins: 157, gamesPlayed: 251 },
  { name: "Seven_X7", avatar: 15, gender: "m", points: 3187, wins: 1342, gamesPlayed: 1793 },
  { name: "MeiLing", avatar: 16, gender: "f", points: 548, wins: 228, gamesPlayed: 347 },
  { name: "raj_patel", avatar: 17, gender: "m", points: 152, wins: 63, gamesPlayed: 102 },
  { name: "FatimaAz", avatar: 18, gender: "f", points: 462, wins: 192, gamesPlayed: 307 },
  { name: "laura_gm", avatar: 19, gender: "f", points: 78, wins: 33, gamesPlayed: 54 },
  { name: "WilliamJr", avatar: 20, gender: "m", points: 653, wins: 271, gamesPlayed: 413 },
  { name: "layla_hk", avatar: 21, gender: "f", points: 247, wins: 103, gamesPlayed: 166 },
  { name: "Hector-VZ", avatar: 22, gender: "m", points: 1043, wins: 437, gamesPlayed: 641 },
  { name: "joao_br", avatar: 23, gender: "m", points: 31, wins: 13, gamesPlayed: 22 },
  { name: "VilmaRS", avatar: 24, gender: "f", points: 218, wins: 91, gamesPlayed: 148 },
  { name: "levi03", avatar: 25, gender: "m", points: 14, wins: 6, gamesPlayed: 11 },
  { name: "LukaDev", avatar: 26, gender: "m", points: 753, wins: 314, gamesPlayed: 472 },
  { name: "maria_flr", avatar: 27, gender: "f", points: 103, wins: 43, gamesPlayed: 69 },
  { name: "Luigi-BR", avatar: 28, gender: "m", points: 1321, wins: 554, gamesPlayed: 798 },
  { name: "MiguelAr", avatar: 29, gender: "m", points: 487, wins: 203, gamesPlayed: 318 },
  { name: "SarahLee", avatar: 30, gender: "f", points: 336, wins: 139, gamesPlayed: 221 },
  { name: "Sophia_ML", avatar: 31, gender: "f", points: 1623, wins: 681, gamesPlayed: 943 },
  { name: "peter-wk", avatar: 32, gender: "m", points: 89, wins: 37, gamesPlayed: 61 },
  { name: "Valentina_RV", avatar: 33, gender: "f", points: 571, wins: 238, gamesPlayed: 362 },
  { name: "LucasHR", avatar: 34, gender: "m", points: 2187, wins: 918, gamesPlayed: 1273 },
  { name: "Victoria_SK", avatar: 35, gender: "f", points: 267, wins: 111, gamesPlayed: 179 },
  { name: "HelenaCR", avatar: 36, gender: "f", points: 412, wins: 172, gamesPlayed: 274 },
  { name: "bia_star", avatar: 37, gender: "f", points: 143, wins: 59, gamesPlayed: 96 },
  { name: "Sabrina-KM", avatar: 38, gender: "f", points: 812, wins: 341, gamesPlayed: 503 },
  { name: "Pedro_GM", avatar: 39, gender: "m", points: 1742, wins: 731, gamesPlayed: 1017 },
  { name: "JeanPaul", avatar: 40, gender: "m", points: 523, wins: 218, gamesPlayed: 341 },
  { name: "nora_elm", avatar: 41, gender: "f", points: 196, wins: 82, gamesPlayed: 132 },
  { name: "sue-quinn", avatar: 42, gender: "f", points: 38, wins: 16, gamesPlayed: 27 },
  { name: "KaitoJP", avatar: 4, gender: "m", points: 1156, wins: 485, gamesPlayed: 697 },
  { name: "EmmaRose", avatar: 6, gender: "f", points: 728, wins: 304, gamesPlayed: 458 },
  { name: "omar_93", avatar: 10, gender: "m", points: 341, wins: 142, gamesPlayed: 226 },
  { name: "ClaraBN", avatar: 13, gender: "f", points: 587, wins: 245, gamesPlayed: 379 },
  { name: "theo_dk", avatar: 15, gender: "m", points: 92, wins: 38, gamesPlayed: 63 },
  { name: "YukiSan", avatar: 2, gender: "f", points: 1438, wins: 603, gamesPlayed: 847 },
  { name: "Mateo_AR", avatar: 23, gender: "m", points: 267, wins: 111, gamesPlayed: 178 },
  { name: "lina55", avatar: 21, gender: "f", points: 54, wins: 22, gamesPlayed: 37 },
];

const POSITIONAL_WEIGHT_MAP = [
  [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
  [2, 3, 3, 4, 4, 4, 4, 3, 3, 2],
  [2, 3, 4, 5, 5, 5, 5, 4, 3, 2],
  [3, 4, 5, 6, 6, 6, 6, 5, 4, 3],
  [3, 4, 5, 6, 7, 7, 6, 5, 4, 3],
  [3, 4, 5, 6, 7, 7, 6, 5, 4, 3],
  [3, 4, 5, 6, 6, 6, 6, 5, 4, 3],
  [2, 3, 4, 5, 5, 5, 5, 4, 3, 2],
  [2, 3, 3, 4, 4, 4, 4, 3, 3, 2],
  [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
];

let DEBUG_AI = false;
let localCardExchangedThisTurn = false;
let localGameData = {};
let botDifficulty = "hard";
let localDrawTimer = null;
let localNewlyDrawnCard = null;
let SEQUENCE_MAP = [];
let hintsRemaining = 3;

const OFFLINE_SYNC_THROTTLE_MS = 30 * 1000;
const OFFLINE_EXPIRATION_PLAYING_MS = 24 * 60 * 60 * 1000;
const OFFLINE_EXPIRATION_FINISHED_MS = 15 * 60 * 1000;
let lastOfflineSyncTimestamp = 0;
let offlineSyncInterval = null;

function syncOfflineGameToFirebase(immediate = false) {
  if (!navigator.onLine) return;
  if (!isLocalGame || !localGameData || !localGameData.gameState) return;
  if (typeof database === 'undefined') return;

  const now = Date.now();
  if (!immediate && (now - lastOfflineSyncTimestamp) < (OFFLINE_SYNC_THROTTLE_MS - 1000)) return;

  const deviceId = getDeviceId();
  const gameRef = database.ref("games/local-" + deviceId);

  const isFinished = localGameData.gameState === "finished";
  const expiration = isFinished ? OFFLINE_EXPIRATION_FINISHED_MS : OFFLINE_EXPIRATION_PLAYING_MS;

  const payload = {
    ...localGameData,
    gameId: "local-" + deviceId,
    isOffline: true,
    lastSyncAt: now,
    expirationTimestamp: now + expiration,
  };

  lastOfflineSyncTimestamp = now;

  gameRef.set(payload).catch(() => {});
}

function startOfflineSyncInterval() {
  stopOfflineSyncInterval();
  offlineSyncInterval = setInterval(() => {
    syncOfflineGameToFirebase();
  }, OFFLINE_SYNC_THROTTLE_MS);
}

function stopOfflineSyncInterval() {
  if (offlineSyncInterval) {
    clearInterval(offlineSyncInterval);
    offlineSyncInterval = null;
  }
}

function removeOfflineGameFromFirebase() {
  if (!navigator.onLine) return;
  if (typeof database === 'undefined') return;
  const deviceId = getDeviceId();
  const now = Date.now();
  database.ref("games/local-" + deviceId).update({
    expirationTimestamp: now + OFFLINE_EXPIRATION_FINISHED_MS,
    lastSyncAt: now
  }).catch(() => {});
}

function logAI(...args) {
  if (DEBUG_AI) console.log("[AI]", ...args);
}

function checkExistingLocalGame() {
  const savedGameData = localStorage.getItem(LOCAL_GAME_KEY);
  if (savedGameData) {
    $("#join-practice-btn").show();
  } else {
    $("#join-practice-btn").hide();
  }
}

function canPlayerPlay(player, boardState) {
  if (!player || !player.hand) return false;
  const handCards = player.hand;
  if (handCards.length === 0) return false;
  return !handCards.every((card) => isCardDead(card, boardState));
}

function saveLocalGame() {
  if (localGameData && Object.keys(localGameData).length > 0) {
    localStorage.setItem(LOCAL_GAME_KEY, JSON.stringify(localGameData));
    checkExistingLocalGame();
  }
}

function loadAndResumeLocalGame() {
  const savedGameData = localStorage.getItem(LOCAL_GAME_KEY);

  if (savedGameData) {
    isLocalGame = true;
    localGameData = JSON.parse(savedGameData);
    myPlayerId = localGameData.players["player1"].id;
    myPlayerName = localGameData.players["player1"].name;
    myTeamId = localGameData.players[myPlayerId].teamId;
    botDifficulty = localGameData.botDifficulty;

    if (localGameData.botDifficulty === "easy") {
      hintsRemaining = Infinity;
    } else if (localGameData.hintsRemaining != null) {
      hintsRemaining = localGameData.hintsRemaining;
    } else {
      hintsRemaining = 3;
    }

    localGameData.hintsRemaining = hintsRemaining;

    showToast(translate("gameRestored"), { icon: "success" });

    if (typeof findAllValidNewSequences === "function") {
      const boardState = localGameData.boardState;
      const lockedChips = localGameData.lockedChips || {};
      const hasUnlockedSequences = Object.keys(lockedChips).length === 0;

      if (hasUnlockedSequences) {
        Object.keys(localGameData.teams).forEach(teamId => {
          let found = false;
          for (let r = 0; r < 10 && !found; r++) {
            for (let c = 0; c < 10 && !found; c++) {
              if (boardState[`${r}_${c}`] === teamId) {
                const sequences = findAllValidNewSequences(boardState, lockedChips, r, c, teamId);
                if (sequences.length > 0) {
                  sequences.sort((a, b) => {
                    const distA = a.reduce((s, p) => s + Math.abs(p.row - 4.5) + Math.abs(p.col - 4.5), 0);
                    const distB = b.reduce((s, p) => s + Math.abs(p.row - 4.5) + Math.abs(p.col - 4.5), 0);
                    return distA - distB;
                  });
                  const seq = sequences[0];
                  seq.forEach(chip => {
                    const key = `${chip.row}_${chip.col}`;
                    if (!((chip.row === 0 || chip.row === 9) && (chip.col === 0 || chip.col === 9))) {
                      lockedChips[key] = true;
                    }
                  });
                  localGameData.teams[teamId].sequencesCompleted++;
                  found = true;
                }
              }
            }
          }
        });
        localGameData.lockedChips = lockedChips;
        saveLocalGame();
      }
    }

    setupGameUI("local");
    updateHintUI();
    renderAll(localGameData);

    if (typeof initChipStack === "function") {
      const myPlayer = localGameData.players[myPlayerId];
      if (myPlayer) initChipStack(getTeamColor(myPlayer.teamId));
    }

    if (typeof animarFichasExistentes === "function") animarFichasExistentes();
    if (typeof animarMontarPilha === "function") animarMontarPilha(500);

    checkNextTurn();

    syncOfflineGameToFirebase(true);
    startOfflineSyncInterval();

    return true;
  }
  return false;
}

function leaveGameLocal(save) {
  if (!save) {
    localStorage.removeItem("sequenceLocalGameData");
    removeOfflineGameFromFirebase();
  }
  stopOfflineSyncInterval();
  document.documentElement.classList.add('direcao-voltar');
  document.documentElement.classList.remove('direcao-avancar');
  window.location.href = window.location.pathname;
}

function reshuffleDiscardPileLocal() {
  if (localGameData.settings && localGameData.settings.reshuffleOnEmpty === false)
    return false;
  if (!localGameData.discardPile || localGameData.discardPile.length === 0)
    return false;

  let newDeck = [...localGameData.discardPile];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }

  localGameData.deck = newDeck;
  localGameData.discardPile = [];

  showToast(translate("deckReshuffled"), { icon: "info" });

  if (typeof animarReembaralhar === "function") {
    animarReembaralhar(newDeck.length);
  }

  incrementAnalytics({ deck_reshuffles: 1 });

  return true;
}

function exchangeDeadCardLocal(cardToExchange, cardIndex) {
  if (localCardExchangedThisTurn) {
    return showToast(translate("onlyOneExchangePerTurn"), { icon: "warning" });
  }

  if (localGameData.deck.length === 0) {
    const shuffled = reshuffleDiscardPileLocal();
    if (shuffled) saveLocalGame();
  }

  if (localGameData.deck.length === 0) {
    return showToast(translate("deckEmptyNoExchange"), { icon: "warning" });
  }

  const player = localGameData.players[myPlayerId];
  if (player.hand[cardIndex] !== cardToExchange) {
    cardIndex = player.hand.indexOf(cardToExchange);
    if (cardIndex === -1) return;
  }

  clearHints();

  const cardEl = $(`.card-in-hand[data-card="${cardToExchange}"]`)[0];
  const cardRect = cardEl ? cardEl.getBoundingClientRect() : null;

  if (cardEl) {
    cardEl.style.transition = 'width 0.3s ease, margin 0.3s ease, opacity 0.2s ease';
    cardEl.style.opacity = '0';
    cardEl.style.width = '0';
    cardEl.style.minWidth = '0';
    cardEl.style.margin = '0';
    cardEl.style.padding = '0';
    cardEl.style.overflow = 'hidden';
    setTimeout(() => { if (cardEl.parentNode) cardEl.remove(); }, 350);
  }

  player.hand.splice(cardIndex, 1);

  if (!localGameData.discardPile) localGameData.discardPile = [];
  localGameData.discardPile.push(cardToExchange);

  if (typeof animarDescarte === "function" && cardRect) {
    animarDescarte(null, cardRect, cardToExchange);
  }

  const newCard = localGameData.deck.pop();
  player.hand.push(newCard);
  localNewlyDrawnCard = newCard;

  localCardExchangedThisTurn = true;

  incrementAnalytics({ dead_cards_exchanged: 1 });

  setTimeout(() => {
    if (typeof animarCompraCarta === "function") {
      animarCompraCarta(newCard, () => {
        renderPlayerHand(
          player.hand,
          localGameData.gameState,
          localNewlyDrawnCard,
          localGameData,
          true,
        );
        localNewlyDrawnCard = null;
        saveLocalGame();

        if (!isAnimationsEnabled()) {
          showToast(
            translate("cardExchangedSuccessLocal", {
              cardName: getHumanReadableCardName(cardToExchange),
            }),
            { icon: "success" },
          );
        }
      });
    } else {
      renderPlayerHand(
        player.hand,
        localGameData.gameState,
        localNewlyDrawnCard,
        localGameData,
        true,
      );
      localNewlyDrawnCard = null;
      saveLocalGame();
    }
  }, 700);
}

onHandCardClickLocal = function (card, index, $element) {
  if ($element.parent().hasClass("disabled")) return;

  if (activeHint && activeHint.card === card) {
    $(".hint-highlight").removeClass("hint-highlight");
  } else {
    clearHints();
  }

  if ($element.hasClass("newly-drawn")) {
    $element.removeClass("newly-drawn");
  }

  if (
    isCardDead(card, localGameData.boardState) &&
    localGameData.deck.length > 0
  ) {
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
      allowEscapeKey: false,
      toast: true,
      position: "center",
      customClass: {
        confirmButton: "swal2-button-full",
        cancelButton: "swal2-button-full",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        exchangeDeadCardLocal(card, index);
      }
    });
  } else {
    if (selectedHandCard?.element)
      selectedHandCard.element.removeClass("selected");

    selectedHandCard = { card, index, element: $element };
    $element.addClass("selected");
    highlightPlayableSlots(card, localGameData);
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
};

onBoardSlotClickLocal = function (event) {
  if (!selectedHandCard) return;

  const $slot = $(event.currentTarget);
  if (
    !$slot.hasClass("highlighted-slot") &&
    !$slot.hasClass("highlighted-removal")
  )
    return;

  const row = $slot.data("row"),
    col = $slot.data("col");
  const player = localGameData.players[myPlayerId];
  const cardIndexToRemove = selectedHandCard.index;

  if (player.hand[cardIndexToRemove] !== selectedHandCard.card) {
    selectedHandCard = null;
    clearHighlights();
    showToast(translate("stateChangedReselect"), { icon: "warning" });
    return;
  }

  const boardStateBeforeMove = JSON.parse(
    JSON.stringify(localGameData.boardState),
  );

  const { card: selectedCard } = selectedHandCard;
  const cardEl = selectedHandCard.element?.[0] || selectedHandCard.element;
  const cardRect = cardEl ? cardEl.getBoundingClientRect() : null;

  player.hand.splice(cardIndexToRemove, 1);
  if (!localGameData.discardPile) localGameData.discardPile = [];
  localGameData.discardPile.push(selectedHandCard.card);

  const descarteFirst = Math.random() > 0.5;
  const animDelay = 200;

  if (typeof animarDescarte === "function" && cardRect) {
    setTimeout(() => animarDescarte(null, cardRect, selectedCard), descarteFirst ? 0 : animDelay);
  }

  if (selectedCard === "JS" || selectedCard === "JH") {
    incrementAnalytics({ jacks_played_one_eyed: 1 });
  } else if (selectedCard === "JD" || selectedCard === "JC") {
    incrementAnalytics({ jacks_played_two_eyed: 1 });
  }

  clearHints();

  if ($slot.hasClass("highlighted-removal")) {
    const removedTeamId = boardStateBeforeMove[`${row}_${col}`];
    delete localGameData.boardState[`${row}_${col}`];

    if (typeof animarRemocaoFicha === "function") {
      const removedColor = removedTeamId ? getTeamColor(removedTeamId) : "red";
      const numTeams = localGameData.numTeams || 2;
      setTimeout(() => animarRemocaoFicha($slot[0], removedColor, removedTeamId, numTeams), descarteFirst ? animDelay : 0);
    }

    updatePlayerProfile({ isRemoval: true }, boardStateBeforeMove);
  } else {
    localGameData.boardState[`${row}_${col}`] = player.teamId;

    const allNewSequences = findAllValidNewSequences(
      localGameData.boardState,
      localGameData.lockedChips,
      row,
      col,
      player.teamId,
    );

    let sequencesToProcess = [];

    if (allNewSequences.length === 1) {
      sequencesToProcess.push(allNewSequences[0]);
    } else if (allNewSequences.length >= 2) {
      const firstDirection = getSequenceDirection(allNewSequences[0]);
      const secondDirection = getSequenceDirection(allNewSequences[1]);

      if (firstDirection !== secondDirection && firstDirection !== "unknown") {
        sequencesToProcess.push(allNewSequences[0]);
        sequencesToProcess.push(allNewSequences[1]);
        showToast(translate("doubleSequenceToastTitle"), {
          icon: "success",
          timer: 4000,
        });
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
      const team = localGameData.teams[player.teamId];

      for (const sequence of sequencesToProcess) {
        team.sequencesCompleted++;
      }

      if (!isAnimationsEnabled()) {
        const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
        for (const sequence of sequencesToProcess) {
          sequence.forEach((chip) => {
            if (!isCanto(chip.row, chip.col)) {
              localGameData.lockedChips[`${chip.row}_${chip.col}`] = true;
            }
          });
        }
      }
    }

    const onChipArrived = () => {
      renderBoard(localGameData);

      if (sequencesToProcess.length > 0) {
        if (isAnimationsEnabled()) {
          const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
          for (const sequence of sequencesToProcess) {
            sequence.forEach((chip) => {
              if (!isCanto(chip.row, chip.col)) {
                localGameData.lockedChips[`${chip.row}_${chip.col}`] = true;
              }
            });
          }
        }
        saveLocalGame();

        const team = localGameData.teams[player.teamId];
        const sequencesNeeded = SEQUENCES_TO_WIN[localGameData.numTeams] || 1;
        if (team.sequencesCompleted >= sequencesNeeded) {
          endLocalGame(team.id);
        }
        if (typeof dispararCelebracao === "function") {
          playFeedback("sequenceSuccess");
          const lockedElements = [];
          for (const sequence of sequencesToProcess) {
            sequence.forEach((chip) => {
              const el = document.querySelector(
                `.card-slot[data-row="${chip.row}"][data-col="${chip.col}"] .chip`
              );
              if (el) lockedElements.push(el);
            });
          }
          dispararCelebracao('sequencia', null, lockedElements);
        }
      }
    };

    if (typeof animarJogadaComPilha === "function" && isAnimationsEnabled()) {
      const slotEl = $slot[0];
      const teamColor = getTeamColor(player.teamId);
      slotEl.setAttribute('data-animating', 'true');
      setTimeout(() => animarJogadaComPilha(slotEl, teamColor, onChipArrived), descarteFirst ? animDelay : 0);
    } else {
      onChipArrived();
    }

    updatePlayerProfile(
      {
        row,
        col,
        teamId: player.teamId,
        isRemoval: false,
        completedSequence: sequencesToProcess,
      },
      boardStateBeforeMove,
    );
  }

  $("#hint-btn").prop("disabled", true).addClass("disabled");
  selectedHandCard = null;
  $(".card-in-hand").removeClass("selected");
  clearHighlights();
  renderPlayerHand(
    player.hand,
    localGameData.gameState,
    null,
    localGameData,
    true,
  );
  setTimeout(() => updateGameInfo(localGameData), 350);

  if (localGameData.winner) return;

  if (localGameData.deck.length > 0) {
    localGameData.turnState = "drawing";
    $("#board .card-slot").css("pointer-events", "none");
    $("#player-hand").addClass("disabled");

    if (localGameData.settings?.autoDraw) {
      $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
      setTimeout(() => completeDrawingPhase(true), 600);
    } else {
      $("#deck-pile").removeClass("disabled").addClass("awaiting-draw");
      startDrawCountdown(5);
      localDrawTimer = setTimeout(() => {
        completeDrawingPhase(false);
      }, 5000);
    }
  } else {
    $("#deck-pile").addClass("disabled").removeClass("awaiting-draw");
    endTurn();
  }
};

function onDeckClickLocal() {
  $("#deck-pile").removeClass("awaiting-draw");
  completeDrawingPhase(true);
}

function completeDrawingPhase(isPlayerAction) {
  if (localGameData.turnState !== "drawing") {
    return;
  }

  if (localGameData.winner || localGameData.gameState === "finished") {
    return;
  }

  clearTimeout(localDrawTimer);
  clearInterval(drawCountdownInterval);
  $("#deck-pile").removeClass("awaiting-draw");

  if (localGameData.deck.length === 0) {
    const shuffled = reshuffleDiscardPileLocal();
    if (shuffled) {
      saveLocalGame();
    }
  }

  const player = localGameData.players[myPlayerId];

  if (isPlayerAction) {
    if (localGameData.deck.length > 0) {
      const newCard = localGameData.deck.pop();
      player.hand.push(newCard);
      localNewlyDrawnCard = newCard;

      const deckSize = localGameData.deck.length;

      if (typeof animarCompraCarta === "function") {
        animarCompraCarta(newCard, () => endTurn());
      } else {
        endTurn();
      }
    } else {
      endTurn();
    }
  } else {
    const handSize = (player.hand || []).length;
    const minCardsForThisGame = MIN_CARDS_IN_HAND[localGameData.playerCount];
    if (handSize < minCardsForThisGame && localGameData.deck.length > 0) {
      const newCard = localGameData.deck.pop();
      player.hand.push(newCard);
      localNewlyDrawnCard = newCard;
      showToast(translate("cardDrawnToMinimum"), { icon: "info" });
    }
    endTurn();
  }
}

function handlePostMoveChecks(row, col, teamId, isBotMove = false) {
  const team = localGameData.teams[teamId];
  if (!team) return null;
  const allNewSequences = findAllValidNewSequences(
    localGameData.boardState,
    localGameData.lockedChips,
    row,
    col,
    teamId,
  );

  let sequencesToProcess = [];

  if (allNewSequences.length === 1) {
    sequencesToProcess.push(allNewSequences[0]);
  } else if (allNewSequences.length >= 2) {
    const firstDirection = getSequenceDirection(allNewSequences[0]);
    const secondDirection = getSequenceDirection(allNewSequences[1]);

    if (firstDirection !== secondDirection && firstDirection !== "unknown") {
      sequencesToProcess.push(allNewSequences[0]);
      sequencesToProcess.push(allNewSequences[1]);
      if (isBotMove) {
        const botPlayerId =
          localGameData.turnOrder[localGameData.currentPlayerIndex];
        const botName = localGameData.players[botPlayerId].name;
        const botTeamColor = team.color;

        showToast(
          translate("botMadeDoubleSequence", {
            botName: botName,
            color: botTeamColor,
          }),
          {
            icon: "success",
            timer: 4000,
          },
        );
      }
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
    playFeedback("sequenceSuccess");

    for (const sequence of sequencesToProcess) {
      team.sequencesCompleted++;
    }

    if (!isAnimationsEnabled()) {
      const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
      for (const sequence of sequencesToProcess) {
        sequence.forEach((chip) => {
          if (!isCanto(chip.row, chip.col)) {
            localGameData.lockedChips[`${chip.row}_${chip.col}`] = true;
          }
        });
      }
    }

    renderBoard(localGameData);

    if (isAnimationsEnabled()) {
      const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
      for (const sequence of sequencesToProcess) {
        sequence.forEach((chip) => {
          if (!isCanto(chip.row, chip.col)) {
            localGameData.lockedChips[`${chip.row}_${chip.col}`] = true;
          }
        });
      }
    }

    const myPlayer = localGameData.players[myPlayerId];
    if (myPlayer && teamId === myPlayer.teamId && typeof dispararCelebracao === "function") {
      const lockedElements = [];
      for (const sequence of sequencesToProcess) {
        sequence.forEach((chip) => {
          const el = document.querySelector(
            `.card-slot[data-row="${chip.row}"][data-col="${chip.col}"] .chip`
          );
          if (el) lockedElements.push(el);
        });
      }
      if (lockedElements.length > 0) {
        dispararCelebracao('sequencia', null, lockedElements);
      }
    } else if (myPlayer && teamId !== myPlayer.teamId) {
      const gameContainer = document.getElementById('game-container') || document.body;
      gameContainer.classList.add('shake-defeat');
      setTimeout(() => gameContainer.classList.remove('shake-defeat'), 450);
    }

    if (isBotMove && sequencesToProcess.length === 1) {
      let sequenceMessage = "";
      const teamName = translate(`teamColors.${team.color}`);
      if (team.members.length === 1) {
        const player = localGameData.players[team.members[0]];
        sequenceMessage = translate("botPlayerSequence", {
          color: team.color,
          playerName: player.name,
        });
      } else {
        sequenceMessage = translate("botTeamSequence", {
          color: team.color,
          teamName: teamName.toUpperCase(),
        });
      }
      showToast(sequenceMessage, { icon: "success", timer: 4000 });
    }

    const sequencesNeeded = SEQUENCES_TO_WIN[localGameData.numTeams] || 1;
    if (team.sequencesCompleted >= sequencesNeeded) {
      endLocalGame(teamId);
    }

    return sequencesToProcess;
  }

  return null;
}
function endLocalGame(winnerId) {
  incrementAnalytics({ games_finished: 1, games_finished_offline: 1 });

  localGameData.winner = winnerId;
  localGameData.gameState = "finished";

  const winningTeam = localGameData.teams[winnerId];
  const myTeamId = localGameData.players[myPlayerId].teamId;
  const isMyTeamWinning = winnerId === myTeamId;

  updateWinLossHistory(isMyTeamWinning ? "win" : "loss");

  if (typeof updateUserStats === "function") {
    const mySequences = localGameData.teams && localGameData.teams[myTeamId]
      ? (localGameData.teams[myTeamId].sequencesCompleted || 0)
      : 0;
    updateUserStats(isMyTeamWinning ? "win" : "loss", true, false, null, mySequences);
  }

  if (typeof incrementGamesPlayedCount === "function") {
    incrementGamesPlayedCount();
  }

  let winnerMessage;
  let dialogTitle;

  if (isMyTeamWinning) {
    dialogTitle = translate("youWonTitle");

    if (winningTeam.members.length === 1) {
      winnerMessage = translate("youWonSoloText", { color: winningTeam.color });
    } else {
      winnerMessage = translate("youWonText", { color: winningTeam.color });
    }
  } else {
    dialogTitle = translate("youLostTitle");

    if (winningTeam.members.length === 1) {
      const winnerPlayer = localGameData.players[winningTeam.members[0]];
      winnerMessage = translate("youLostSoloText", {
        playerName: winnerPlayer.name.toUpperCase(),
        color: winningTeam.color,
      });
    } else {
      const teamName =
        translate(`teamColors.${winningTeam.color}`);
      winnerMessage = translate("youLostText", {
        teamName: teamName.toUpperCase(),
        color: winningTeam.color,
      });
    }
  }

  localGameData.gameMessage = {
    key: "gameOver",
    params: { message: winnerMessage },
  };

  renderAll(localGameData);
  $("#deck-pile").addClass("disabled");

  syncOfflineGameToFirebase(true);
  stopOfflineSyncInterval();

  setTimeout(() => {
    if (typeof dispararCelebracao === "function") {
      const minhaCor = getTeamColor(myTeamId);
      dispararCelebracao(isMyTeamWinning ? "win" : "loss", minhaCor);
    }
    if (isMyTeamWinning) {
      playFeedback("winner");
    } else {
      playFeedback("defeat");
    }
    promptLocalRematch(winnerMessage, dialogTitle);
  }, 3000);
}

function endLocalGameAsDraw() {
  incrementAnalytics({ games_finished: 1, games_finished_offline: 1 });

  localGameData.gameState = "finished";
  localGameData.winner = null;
  localGameData.gameMessage = { key: "gameEndDrawText" };

  updateWinLossHistory("draw");

  if (typeof updateUserStats === "function") {
    const myTeamIdLocal = localGameData.players[myPlayerId].teamId;
    const mySequencesDraw = localGameData.teams && localGameData.teams[myTeamIdLocal]
      ? (localGameData.teams[myTeamIdLocal].sequencesCompleted || 0)
      : 0;
    updateUserStats("draw", true, false, null, mySequencesDraw);
  }

  renderAll(localGameData);
  $("#deck-pile").addClass("disabled");

  syncOfflineGameToFirebase(true);
  stopOfflineSyncInterval();

  setTimeout(() => {
    if (typeof dispararCelebracao === "function") {
      dispararCelebracao("draw");
    }
    playFeedback("draw");
    promptLocalRematch(
      translate("gameEndDrawText"),
      translate("gameEndDrawTitle"),
    );
  }, 3000);
}

function promptLocalRematch(winnerHtml, title = translate("gameOverTitle")) {
  const isDraw = title === translate("gameEndDrawTitle");
  const youWin = title === translate("youWonTitle");

  const confirmText = isDraw
    ? translate("rematchYes")
    : youWin
      ? translate("rematchYes")
      : translate("rematchYesLost");

  Swal.fire({
    title: title,
    html: `${winnerHtml}<br><br>${translate("rematchQuestion")}`,
    icon: youWin ? "success" : isDraw ? "info" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: translate("rematchNo"),
    allowEscapeKey: false,
    allowOutsideClick: false,
    toast: false,
  }).then((result) => {
    if (typeof pararTodasAnimacoesFade === "function") pararTodasAnimacoesFade();
    if (result.isConfirmed) {
      restartLocalGame();
    } else {
      localStorage.removeItem(LOCAL_GAME_KEY);
      window.location.href = window.location.pathname;
    }
  });
}

function restartLocalGame() {
  const oldData = { ...localGameData };
  const oldBoardState = { ...oldData.boardState };
  const deck = createAndShuffleDeck();
  const cardsToDeal = CARDS_PER_PLAYER[oldData.playerCount];
  const rotatedTurnOrder = [...oldData.turnOrder];
  if (rotatedTurnOrder.length > 0) {
    const firstPlayer = rotatedTurnOrder.shift();
    rotatedTurnOrder.push(firstPlayer);
  }

  let startingHints;
  switch (botDifficulty) {
    case "easy":
      startingHints = Infinity;
      break;
    case "medium":
      startingHints = 5;
      break;
    case "expert":
      startingHints = 1;
      break;
    default:
      startingHints = 3;
      break;
  }

  const chipSlots = Object.keys(oldBoardState).filter(k => oldBoardState[k] && oldBoardState[k] !== "F");

  const doRematchSetup = () => {
    localGameData = {
      ...oldData,
      gameState: "playing",
      boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
      lockedChips: {},
      deck: deck,
      discardPile: [],
      turnOrder: rotatedTurnOrder,
      currentPlayerIndex: 0,
      turnState: "playing",
      winner: null,
      botIntentions: {},
      hintsRemaining: startingHints,
    };

    Object.values(localGameData.players).forEach((p) => {
      p.hand = [];
      for (let i = 0; i < cardsToDeal; i++) {
        if (deck.length > 0) p.hand.push(deck.pop());
      }
    });

    Object.values(localGameData.teams).forEach((t) => {
      t.sequencesCompleted = 0;
    });

    const player = localGameData.players[localGameData.turnOrder[0]];

    localGameData.gameMessage = {
      key: "newGameStarted",
      params: { playerName: player.name },
    };

    hintsRemaining = startingHints;
    updateHintUI();
    saveLocalGame();
    syncOfflineGameToFirebase(true);
    startOfflineSyncInterval();

    if (typeof initChipStack === "function") {
      const myColor = getTeamColor(localGameData.players[myPlayerId]?.teamId);
      const stack = document.getElementById('chip-stack');
      if (stack) {
        const fichas = stack.querySelectorAll('.ficha-stack');
        fichas.forEach((f) => {
          f.className = 'ficha-stack team-' + myColor;
          f.style.display = '';
        });
        chipStackCount = 5;
        salvarChipStackCount();
        if (isAnimationsEnabled()) {
          const fichasArr = Array.from(fichas);
          const ocultas = fichasArr.filter(f => f.style.transform === 'scale(0)' || f.style.display === 'none');
          ocultas.forEach((f, i) => {
            f.style.display = '';
            f.style.transform = 'scale(0)';
            setTimeout(() => {
              f.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
              f.style.transform = 'scale(1)';
              setTimeout(() => { f.style.transition = ''; }, 300);
            }, i * 80);
          });
        }
      }
    }

    renderAll(localGameData);

    if (typeof animarDistribuicao === "function" && isAnimationsEnabled()) {
      animarDistribuicao(cardsToDeal, cardsToDeal * localGameData.playerCount, () => {
        if (typeof animarMontarPilha === "function") animarMontarPilha(0);
        checkNextTurn();
      });
    } else {
      if (typeof animarMontarPilha === "function") animarMontarPilha(0);
      checkNextTurn();
    }
  };

  if (typeof animarRecolherFichas === "function" && isAnimationsEnabled() && chipSlots.length > 0) {
    animarRecolherFichas(doRematchSetup);
  } else {
    doRematchSetup();
  }

  const gameModeKey = `${oldData.playerCount}_${oldData.numTeams}`;

  incrementAnalytics({
    games_started_total: 1,
    games_started_offline: 1,
    rematches_accepted_offline: 1,
    [`game_mode_selected_${gameModeKey}`]: 1,
    [`difficulty_selected_${oldData.botDifficulty}`]: 1,
  });

  logGameEvent("rematches", "offline_session", "local_rematch");
}

function endTurn() {
  localCardExchangedThisTurn = false;
  localGameData.turnState = "playing";

  let nextPlayerIndex = localGameData.currentPlayerIndex;
  let playersChecked = 0;
  let foundNextPlayer = false;

  do {
    nextPlayerIndex = (nextPlayerIndex + 1) % localGameData.playerCount;
    playersChecked++;
    const nextPlayer =
      localGameData.players[localGameData.turnOrder[nextPlayerIndex]];
    if (
      localGameData.deck.length > 0 ||
      canPlayerPlay(nextPlayer, localGameData.boardState)
    ) {
      foundNextPlayer = true;
      break;
    }
  } while (playersChecked < localGameData.playerCount);

  if (!foundNextPlayer && localGameData.deck.length === 0) {
    let maxSequences = -1;
    let winnerId = null;
    let teamsWithMaxSequences = [];

    Object.values(localGameData.teams).forEach((team) => {
      const teamSequences = team.sequencesCompleted || 0;
      if (teamSequences > maxSequences) {
        maxSequences = teamSequences;
        teamsWithMaxSequences = [team.id];
      } else if (teamSequences === maxSequences) {
        teamsWithMaxSequences.push(team.id);
      }
    });

    if (maxSequences > 0 && teamsWithMaxSequences.length === 1) {
      winnerId = teamsWithMaxSequences[0];
      endLocalGame(winnerId);
    } else {
      endLocalGameAsDraw();
    }
    return;
  }

  localGameData.currentPlayerIndex = nextPlayerIndex;

  const nextPlayer = localGameData.players[localGameData.turnOrder[nextPlayerIndex]];
  if (nextPlayer && nextPlayer.isBot) {
    localGameData.gameMessage = { key: "waitingForPlayer", params: { playerName: nextPlayer.name } };
  }

  renderAll(localGameData, localNewlyDrawnCard);
  localNewlyDrawnCard = null;

  checkNextTurn();
  saveLocalGame();
}

function checkNextTurn() {
  if (localGameData.winner) return;

  document.querySelectorAll('[data-animating]').forEach(el => el.removeAttribute('data-animating'));

  const currentPlayer =
    localGameData.players[
      localGameData.turnOrder[localGameData.currentPlayerIndex]
    ];

  if (!currentPlayer) return;

  if (currentPlayer.isBot) {
    $("#hint-btn").prop("disabled", true).addClass("disabled"); 
    let botMessageKey = "waitingForPlayer";
    let botMessageParams = { playerName: currentPlayer.name };
    $("#game-message").html(translate(botMessageKey, botMessageParams));

    const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
    setTimeout(() => {
      try {
        executeBotTurn();
      } catch (e) {
        console.error("Erro no turno do bot:", e);
        if (!localGameData.winner) endTurn();
      }
    }, delay);
  } else {
    if (
      !canPlayerPlay(currentPlayer, localGameData.boardState) &&
      localGameData.deck.length === 0
    ) {
      showToast(translate("noValidMovesSkipping"), { icon: "info" });
      setTimeout(endTurn, 1500);
    } else {
      if (hintsRemaining > 0 || hintsRemaining === Infinity) {
        $("#hint-btn").prop("disabled", false).removeClass("disabled");
      }
      playFeedback("myTurn", true);
      localGameData.gameMessage = { key: "yourTurn" };
      updateGameInfo(localGameData);
      $("#player-hand").removeClass("disabled");
      $("#deck-pile").addClass("disabled");
    }
  }
}

function generateSequenceMap() {
  if (SEQUENCE_MAP.length > 0) return;

  const map = [];
  const size = 10;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 5; c++) {
      const sequence = [];
      for (let i = 0; i < 5; i++) {
        sequence.push(`${r}_${c + i}`);
      }
      map.push(sequence);
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 5; r++) {
      const sequence = [];
      for (let i = 0; i < 5; i++) {
        sequence.push(`${r + i}_${c}`);
      }
      map.push(sequence);
    }
  }

  for (let r = 0; r <= size - 5; r++) {
    for (let c = 0; c <= size - 5; c++) {
      const sequence = [];
      for (let i = 0; i < 5; i++) {
        sequence.push(`${r + i}_${c + i}`);
      }
      map.push(sequence);
    }
  }

  for (let r = 4; r < size; r++) {
    for (let c = 0; c <= size - 5; c++) {
      const sequence = [];
      for (let i = 0; i < 5; i++) {
        sequence.push(`${r - i}_${c + i}`);
      }
      map.push(sequence);
    }
  }

  SEQUENCE_MAP = map;
}

function updateWinLossHistory(result) {
  const history = JSON.parse(localStorage.getItem(WIN_LOSS_HISTORY_KEY)) || {
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
  };

  const resultKey = result === "win" ? "wins" : result === "loss" ? "losses" : "draws";

  if (result === "win") {
    history.wins++;
    history.streak = history.streak >= 0 ? history.streak + 1 : 1;
  } else if (result === "loss") {
    history.losses++;
    history.streak = history.streak <= 0 ? history.streak - 1 : -1;
  } else {
    history.draws++;
  }

  const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;

  if (isLoggedIn) {
    if (!history.byDifficulty) history.byDifficulty = {};
    if (!history.byMode) history.byMode = {};
    if (!history.onlineVsBot) history.onlineVsBot = { wins: 0, losses: 0, draws: 0 };
    if (!history.onlineVsHumans) history.onlineVsHumans = { wins: 0, losses: 0, draws: 0 };

    const gameData = (typeof isLocalGame !== 'undefined' && isLocalGame)
      ? (typeof localGameData !== 'undefined' ? localGameData : null)
      : (typeof currentGameDataState !== 'undefined' ? currentGameDataState : null);

    if (gameData) {
      const modeKey = `${gameData.playerCount || 2}_${gameData.numTeams || 2}`;
      if (!history.byMode[modeKey]) history.byMode[modeKey] = { wins: 0, losses: 0, draws: 0 };
      history.byMode[modeKey][resultKey]++;
    }

    if (typeof isLocalGame !== 'undefined' && isLocalGame && typeof botDifficulty !== 'undefined') {
      if (!history.byDifficulty[botDifficulty]) {
        history.byDifficulty[botDifficulty] = { wins: 0, losses: 0, draws: 0 };
      }
      history.byDifficulty[botDifficulty][resultKey]++;
    }

    if (typeof isLocalGame !== 'undefined' && !isLocalGame && typeof currentGameDataState !== 'undefined') {
      const players = currentGameDataState.players || {};
      const hasBots = Object.values(players).some(p => p.isBot || p.isTempBot);
      if (hasBots) {
        history.onlineVsBot[resultKey]++;
      } else {
        history.onlineVsHumans[resultKey]++;
      }
    }
  }

  history.lastUpdated = Date.now();
  localStorage.setItem(WIN_LOSS_HISTORY_KEY, JSON.stringify(history));

  if (isLoggedIn && typeof database !== 'undefined') {
    database.ref(`users/${currentUser.uid}/detailedHistory`).set(history).catch((err) => {
      console.warn("Erro ao salvar detailedHistory:", err.message);
    });
  }
}

function getPlayerProfile() {
  const profile = localStorage.getItem(PLAYER_PROFILE_KEY);
  return profile
    ? JSON.parse(profile)
    : {
        totalMoves: 0,
        buildMoves: 0,
        blockMoves: 0,
        centerControlMoves: 0,
        jackRemovals: 0,
        lastSequences: [],
      };
}

function updatePlayerProfile(move, boardStateBeforeMove) {
  const profile = getPlayerProfile();
  profile.totalMoves++;

  if (move.isRemoval) {
    profile.jackRemovals++;
  } else {
    const { row, col, teamId } = move;
    const opponentTeamIds = Object.keys(localGameData.teams).filter(
      (id) => id !== teamId,
    );

    let wasBlock = false;
    const directions = [
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: -1 },
    ];
    for (const dir of directions) {
      let opponentChips = 0;
      for (let i = 1; i < 4; i++) {
        const r = row + dir.r * i;
        const c = col + dir.c * i;
        if (opponentTeamIds.includes(boardStateBeforeMove[`${r}_${c}`]))
          opponentChips++;
        else break;
      }
      for (let i = 1; i < 4; i++) {
        const r = row - dir.r * i;
        const c = col - dir.c * i;
        if (opponentTeamIds.includes(boardStateBeforeMove[`${r}_${c}`]))
          opponentChips++;
        else break;
      }
      if (opponentChips >= 3) {
        wasBlock = true;
        break;
      }
    }

    if (wasBlock) {
      profile.blockMoves++;
    } else {
      profile.buildMoves++;
    }

    if (row >= 3 && row <= 6 && col >= 3 && col <= 6) {
      profile.centerControlMoves++;
    }
  }

  if (move.completedSequence && move.completedSequence.length > 0) {
    const chips = move.completedSequence.flat();
    profile.lastSequences.push(
      chips.map((s) => `${s.row}_${s.col}`),
    );
    if (profile.lastSequences.length > 3) profile.lastSequences.shift();
  }

  localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

function executeBotTurn() {
  if (localGameData.winner) return;
  
  const botId = localGameData.turnOrder[localGameData.currentPlayerIndex];
  const bot = localGameData.players[botId];

  if (!bot || !bot.isBot) return;

  if (localGameData.deck.length === 0) {
    const shuffled = reshuffleDiscardPileLocal();
    if (shuffled) saveLocalGame();
  }

  const deadCards = (bot.hand || []).filter((card) =>
    isCardDead(card, localGameData.boardState),
  );
  if (deadCards.length > 0 && localGameData.deck.length > 0) {
    let cardToDiscard = deadCards[0];
    if (deadCards.length > 1) {
      cardToDiscard = deadCards.sort((a, b) => {
        const potentialA = evaluateCardPotential(a, {});
        const potentialB = evaluateCardPotential(b, {});
        return potentialA - potentialB;
      })[0];
    }
    const cardIndex = bot.hand.indexOf(cardToDiscard);
    if (cardIndex > -1) bot.hand.splice(cardIndex, 1);
    if (!localGameData.discardPile) localGameData.discardPile = [];
    localGameData.discardPile.push(cardToDiscard);
    bot.hand.push(localGameData.deck.pop());
    showToast(translate("botExchangedDeadCard", { botName: bot.name }), {
      icon: "info",
    });

    if (typeof animarDescarte === "function" && isAnimationsEnabled()) {
      const numTeams = localGameData.numTeams || 2;
      const turnOrder = localGameData.turnOrder;
      const botIdx = turnOrder.indexOf(bot.id);
      const myIdx = turnOrder.indexOf(myPlayerId);
      const direcao = typeof getPosicaoParaJogador === "function"
        ? getPosicaoParaJogador(botIdx, myIdx, turnOrder.length, numTeams, bot.teamId, myTeamId)
        : 'top';
      const sub = typeof getSubPosicao === "function"
        ? getSubPosicao(botIdx, myIdx, turnOrder.length)
        : { subIndex: 0, totalNoLado: 1 };
      const origem = getOrigemPorDirecao(direcao, null, sub.subIndex, sub.totalNoLado);
      const fakeRect = { top: origem.y, left: origem.x, width: 28, height: 50 };
      animarDescarte(null, fakeRect, cardToDiscard);
    }
  }

  const move = getStrategicMove(localGameData, bot);

  const baseDelay = 1000;
  const complexityDelay = move ? Math.min(move.score / 50, 1500) : 0;
  const randomDelay = Math.random() * 500;
  const totalDelay = baseDelay + complexityDelay + randomDelay;

  setTimeout(() => {
    const descarteDelay = Math.random() > 0.5 ? 0 : 500;
    const fichaDelay = descarteDelay === 0 ? 500 : 0;
    const compraDelay = 1000;
    const endTurnDelay = 1500;

    if (move) {
      const cardIndex = bot.hand.indexOf(move.card);
      if (cardIndex > -1) {
        bot.hand.splice(cardIndex, 1);
      } else {
        if (!localGameData.winner) endTurn();
        return;
      }
      if (!localGameData.discardPile) localGameData.discardPile = [];
      localGameData.discardPile.push(move.card);

      const slotEl = document.querySelector(
        `.card-slot[data-row="${move.row}"][data-col="${move.col}"]`
      );
      const numTeams = localGameData.numTeams || 2;

      if (typeof animarDescarte === "function") {
        setTimeout(() => {
          const turnOrder = localGameData.turnOrder;
          const botIdx = turnOrder.indexOf(bot.id);
          const myIdx = turnOrder.indexOf(myPlayerId);
          const direcao = typeof getPosicaoParaJogador === "function"
            ? getPosicaoParaJogador(botIdx, myIdx, turnOrder.length, numTeams, bot.teamId, myTeamId)
            : 'top';
          const sub = typeof getSubPosicao === "function"
            ? getSubPosicao(botIdx, myIdx, turnOrder.length)
            : { subIndex: 0, totalNoLado: 1 };
          const origem = getOrigemPorDirecao(direcao, null, sub.subIndex, sub.totalNoLado);
          const fakeRect = { top: origem.y, left: origem.x, width: 28, height: 50 };
          animarDescarte(null, fakeRect, move.card);
          setTimeout(() => updateGameInfo(localGameData), 650);
        }, descarteDelay);
      }

      setTimeout(() => {
        if (move.isRemoval) {
          const removedTeamId = localGameData.boardState[move.slotKey] || null;
          delete localGameData.boardState[move.slotKey];

          const myPlayer = localGameData.players[myPlayerId];

          const onRemovalComplete = () => {
            renderBoard(localGameData);
          };

          if (removedTeamId === myPlayer?.teamId && slotEl && typeof animarDevolucaoParaPilha === "function") {
            const myColor = getTeamColor(myPlayer.teamId);
            animarDevolucaoParaPilha(slotEl, myColor, onRemovalComplete);
          } else if (slotEl && typeof animarRemocaoFicha === "function") {
            const removedColor = removedTeamId ? getTeamColor(removedTeamId) : "red";
            animarRemocaoFicha(slotEl, removedColor, removedTeamId, numTeams, bot.id, onRemovalComplete);
          } else {
            onRemovalComplete();
          }
        } else {
          if (localGameData.boardState[move.slotKey]) {
            renderBoard(localGameData);
            return;
          }
          localGameData.boardState[move.slotKey] = bot.teamId;

          const onBotChipArrived = () => {
            renderBoard(localGameData);
            handlePostMoveChecks(move.row, move.col, bot.teamId, true);
          };

          if (typeof animarFichaOponente === "function" && slotEl && isAnimationsEnabled()) {
            const teamColor = getTeamColor(bot.teamId);
            animarFichaOponente(slotEl, teamColor, bot.teamId, numTeams, bot.id, onBotChipArrived);
          } else {
            onBotChipArrived();
          }
        }
      }, fichaDelay);

      setTimeout(() => {
        if (localGameData.winner) return;
        if (localGameData.deck.length > 0) {
          bot.hand.push(localGameData.deck.pop());

          const deckSize = localGameData.deck.length;
          if (deckSize === 0) {
            $("#deck-pile").addClass("disabled").addClass("deck-empty");
          }

          if (typeof animarDescarte === "function" && isAnimationsEnabled()) {
            const deck = document.getElementById('deck-pile');
            const deckRect = deck ? deck.getBoundingClientRect() : null;
            if (deckRect) {
              const turnOrder = localGameData.turnOrder;
              const botIdx = turnOrder.indexOf(bot.id);
              const myIdx = turnOrder.indexOf(myPlayerId);
              const direcao = typeof getPosicaoParaJogador === "function"
                ? getPosicaoParaJogador(botIdx, myIdx, turnOrder.length, numTeams, bot.teamId, myTeamId)
                : 'top';
              const sub = typeof getSubPosicao === "function"
                ? getSubPosicao(botIdx, myIdx, turnOrder.length)
                : { subIndex: 0, totalNoLado: 1 };
              const destino = getOrigemPorDirecao(direcao, null, sub.subIndex, sub.totalNoLado);

              const dx = destino.x - (deckRect.left + deckRect.width / 2);
              const dy = destino.y - (deckRect.top + deckRect.height / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);
              const duration = Math.min(1.0, Math.max(0.55, dist / 800));

              const fantasma = document.createElement('div');
              Object.assign(fantasma.style, {
                position: 'fixed',
                top: `${deckRect.top}px`,
                left: `${deckRect.left}px`,
                width: `${deckRect.width}px`,
                height: `${deckRect.height}px`,
                zIndex: '9998',
                pointerEvents: 'none',
                transition: `all ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`,
                opacity: '1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                margin: '0',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                border: '2px solid white',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              });
              fantasma.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:7px;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:1px 3px;border-radius:3px;">ROW 5</span>`;
              document.body.appendChild(fantasma);
              requestAnimationFrame(() => {
                fantasma.style.top = `${destino.y}px`;
                fantasma.style.left = `${destino.x}px`;
                fantasma.style.transform = 'scale(0.8)';
              });
              fantasma.addEventListener('transitionend', () => fantasma.remove(), { once: true });
              setTimeout(() => { if (document.body.contains(fantasma)) fantasma.remove(); }, (duration * 1000) + 100);
            }
          }
        }
      }, fichaDelay + compraDelay);
      if (move && !move.isRemoval) {
        const bestSequenceFormed = findAllValidNewSequences(
          localGameData.boardState,
          localGameData.lockedChips,
          move.row,
          move.col,
          bot.teamId,
        ).sort((a, b) => b.length - a.length)[0];
        if (bestSequenceFormed) {
          localGameData.botIntentions = localGameData.botIntentions || {};
          localGameData.botIntentions[bot.id] = {
            ...(localGameData.botIntentions[bot.id] || {}),
            line: bestSequenceFormed.map((p) => `${p.row}_${p.col}`),
            lastUpdateTurn: localGameData.currentPlayerIndex,
          };
        }
      }
    } else {
      showToast(translate("botSkippedTurn", { botName: bot.name }), {
        icon: "info",
      });
    }

    if (!localGameData.winner) {
      const endDelay = move ? endTurnDelay : 0;
      setTimeout(() => endTurn(), endDelay);
    }
  }, totalDelay);
}

function analyzeSequence(
  sequence,
  boardState,
  botTeamId,
  opponentTeamIds,
  lockedChips,
) {
  const analysis = {
    myChips: 0,
    myLockedChips: 0,
    opponentChipCounts: {},
    emptySlots: [],
    opponentSlots: {},
    hasCorner: false,
  };

  for (const slotKey of sequence) {
    const [r, c] = slotKey.split("_").map(Number);

    if (BOARD_LAYOUT[r][c] === "F") {
      analysis.hasCorner = true;
      analysis.myChips++;
      opponentTeamIds.forEach((id) => {
        if (!analysis.opponentChipCounts[id])
          analysis.opponentChipCounts[id] = 0;
        analysis.opponentChipCounts[id]++;
      });
      continue;
    }

    const owner = boardState[slotKey];
    if (owner === botTeamId) {
      analysis.myChips++;
      if (lockedChips[slotKey]) {
        analysis.myLockedChips++;
      }
    } else if (opponentTeamIds.includes(owner)) {
      if (!analysis.opponentChipCounts[owner]) {
        analysis.opponentChipCounts[owner] = 0;
      }

      analysis.opponentChipCounts[owner]++;

      if (!analysis.opponentSlots[owner]) {
        analysis.opponentSlots[owner] = [];
      }

      analysis.opponentSlots[owner].push(slotKey);
    } else {
      analysis.emptySlots.push({ slotKey, card: BOARD_LAYOUT[r][c] });
    }
  }
  return analysis;
}

function isLineBlocked(r, c, dir, teamId, boardState, opponentTeamIds) {
  let openEnds = 2;
  let lineLength = 1;

  for (let i = 1; i < 5; i++) {
    const nextR = r + dir.r * i;
    const nextC = c + dir.c * i;
    const slotKey = `${nextR}_${nextC}`;
    if (
      nextR < 0 ||
      nextR > 9 ||
      nextC < 0 ||
      nextC > 9 ||
      opponentTeamIds.includes(boardState[slotKey])
    ) {
      openEnds--;
      break;
    }
    if (boardState[slotKey] === teamId || BOARD_LAYOUT[nextR][nextC] === "F") {
      lineLength++;
    } else {
      break;
    }
  }

  for (let i = 1; i < 5; i++) {
    const nextR = r - dir.r * i;
    const nextC = c - dir.c * i;
    const slotKey = `${nextR}_${nextC}`;
    if (
      nextR < 0 ||
      nextR > 9 ||
      nextC < 0 ||
      nextC > 9 ||
      opponentTeamIds.includes(boardState[slotKey])
    ) {
      openEnds--;
      break;
    }
    if (boardState[slotKey] === teamId || BOARD_LAYOUT[nextR][nextC] === "F") {
      lineLength++;
    } else {
      break;
    }
  }

  return lineLength >= 4 && openEnds < 1;
}

function evaluateCardPotential(card, boardState) {
  if (card.includes("J")) return 100;

  let potentialScore = 0;
  let openSlots = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === card) {
        if (!boardState[`${r}_${c}`]) {
          openSlots++;
          potentialScore += POSITIONAL_WEIGHT_MAP[r][c];
        }
      }
    }
  }

  return openSlots > 0 ? potentialScore : -1;
}

function evaluatePosition(row, col, teamId, boardState) {
  let maxSequence = 0;
  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];
  const tempBoard = { ...boardState, [`${row}_${col}`]: teamId };
  for (const dir of directions) {
    let currentSequence = 1;
    for (let j = -1; j <= 1; j += 2) {
      if (
        (j === -1 && dir.r === 0 && dir.c === 1) ||
        (j === -1 && dir.r === 1 && dir.c === 0)
      )
        continue;
      for (let i = 1; i < 5; i++) {
        const r = row + dir.r * i * j;
        const c = col + dir.c * i * j;
        if (r < 0 || r > 9 || c < 0 || c > 9) break;
        const k = `${r}_${c}`;
        if (tempBoard[k] === teamId || BOARD_LAYOUT[r][c] === "F")
          currentSequence++;
        else break;
      }
    }
    if (currentSequence > maxSequence) maxSequence = currentSequence;
  }
  return maxSequence;
}

function evaluatePositionWithHandPotential(row, col, teamId, boardState, hand) {
  let maxScore = 0;
  let multifunctionalityBonus = 0;

  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];
  const tempBoard = { ...boardState, [`${row}_${col}`]: teamId };
  const twoEyedJack = hand.find((c) => c === "JD" || c === "JC");

  for (const dir of directions) {
    let currentSequence = 1;
    let potentialHandBonus = 0;
    let openEnds = 2;
    let isCornerAdjacent = false;

    for (let j = 1; j >= -1; j -= 2) {
      if (j === -1 && (dir.r === 0 || (dir.r === 1 && dir.c === 0))) continue;
      for (let i = 1; i < 5; i++) {
        const r = row + dir.r * i * j;
        const c = col + dir.c * i * j;
        if (r < 0 || r > 9 || c < 0 || c > 9) {
          openEnds--;
          break;
        }
        const k = `${r}_${c}`;
        const owner = tempBoard[k];
        const cardNeeded = BOARD_LAYOUT[r][c];
        if (cardNeeded === "F") {
          isCornerAdjacent = true;
          currentSequence++;
          continue;
        }
        if (owner === teamId) {
          currentSequence++;
        } else if (!owner) {
          if (hand.includes(cardNeeded) || twoEyedJack) {
            potentialHandBonus += currentSequence * 2;
          }
        } else {
          openEnds--;
          break;
        }
      }
    }

    let score = 0;
    if (currentSequence >= 5) score = 1000;
    else if (currentSequence === 4) score = 100;
    else if (currentSequence === 3) score = 10;
    else score = 1;

    if (currentSequence >= 3) {
      multifunctionalityBonus += score * 0.5;
    }

    if (openEnds === 2 && currentSequence > 1) score *= 1.5;
    if (isCornerAdjacent && currentSequence >= 3) score *= 1.8;
    score += potentialHandBonus;
    if (score > maxScore) maxScore = score;
  }

  let teamworkBonus = 0;
  for (const dir of directions) {
    if (
      boardState[`${row + dir.r}_${col + dir.c}`] === teamId ||
      boardState[`${row - dir.r}_${col - dir.c}`] === teamId
    ) {
      teamworkBonus += 5;
    }
  }

  const positionalBonus = POSITIONAL_WEIGHT_MAP[row][col];

  return maxScore + teamworkBonus + positionalBonus + multifunctionalityBonus;
}

function isSequenceOpenEnded(sequence, boardState) {
  if (!sequence || sequence.length !== 5) return false;

  const [startR, startC] = sequence[0].split("_").map(Number);
  const [secondR, secondC] = sequence[1].split("_").map(Number);
  const [endR, endC] = sequence[4].split("_").map(Number);
  const dirR = secondR - startR;
  const dirC = secondC - startC;
  const prevR = startR - dirR;
  const prevC = startC - dirC;
  const nextR = endR + dirR;
  const nextC = endC + dirC;

  if (
    prevR < 0 ||
    prevR > 9 ||
    prevC < 0 ||
    prevC > 9 ||
    nextR < 0 ||
    nextR > 9 ||
    nextC < 0 ||
    nextC > 9
  ) {
    return false;
  }

  const isPrevEmpty = !boardState[`${prevR}_${prevC}`];
  const isNextEmpty = !boardState[`${nextR}_${nextC}`];

  return isPrevEmpty && isNextEmpty;
}

function getBestOpponentResponse(simulatedGameData, opponentPlayer) {
  if (!opponentPlayer || !opponentPlayer.hand) {
    return null;
  }

  let opponentMoves = [];
  const opponentHand = opponentPlayer.hand || [];
  const opponentTeamId = opponentPlayer.teamId;

  for (const card of opponentHand.filter((c) => !c.includes("J"))) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (
          BOARD_LAYOUT[r][c] === card &&
          !simulatedGameData.boardState[`${r}_${c}`]
        ) {
          const score = evaluatePositionWithHandPotential(
            r,
            c,
            opponentTeamId,
            simulatedGameData.boardState,
            opponentHand,
          );
          opponentMoves.push({ card, r, c, score });
        }
      }
    }
  }

  if (opponentMoves.length === 0) return null;

  opponentMoves.sort((a, b) => b.score - a.score);
  return opponentMoves[0];
}

function getCardsInPlay(gameData) {
  const cards = new Set();
  Object.values(gameData.players).forEach((p) => {
    (p.hand || []).forEach((card) => cards.add(card));
  });
  (gameData.discardPile || []).forEach((card) => cards.add(card));
  return cards;
}

function findOpponentWinningPlays(
  boardState,
  botTeamId,
  opponentId,
  lockedChips,
) {
  const winningPlays = [];

  for (const sequence of SEQUENCE_MAP) {
    const analysis = analyzeSequence(
      sequence,
      boardState,
      botTeamId,
      [opponentId],
      lockedChips,
    );

    if (
      analysis.emptySlots.length === 1 &&
      Object.keys(analysis.opponentChipCounts).length === 1 &&
      analysis.opponentChipCounts[opponentId] === 4 &&
      analysis.myChips === 0
    ) {
      const winningSlot = analysis.emptySlots[0];
      const { row, col } = parseSlotKey(winningSlot.slotKey);

      winningPlays.push({
        winningMove: { row, col },
        threateningChips: (analysis.opponentSlots[opponentId] || []).map(
          (slotKey) => parseSlotKey(slotKey),
        ),
      });
    }
  }
  return winningPlays;
}

function findBestJackRemoval(gameData, opponentWinningPlays, removableChips) {
  if (!removableChips || removableChips.length === 0) {
    return null;
  }

  const lockedChips = gameData.lockedChips || {};
  const threatCounts = {};
  removableChips.forEach((chip) => {
    const key = `${chip.row}_${chip.col}`;
    if (lockedChips[key]) return;
    threatCounts[key] = 0;
  });

  for (const play of opponentWinningPlays) {
    for (const threateningChip of play.threateningChips) {
      const chipKey = `${threateningChip.row}_${threateningChip.col}`;
      const opponentId = gameData.boardState[chipKey];

      if (lockedChips[chipKey]) continue;

      if (isLineDead(threateningChip, gameData.boardState, opponentId)) {
        continue;
      }

      if (threatCounts[chipKey] !== undefined) {
        threatCounts[chipKey]++;
      }
    }
  }

  let bestRemoval = null;
  let maxThreatsNeutralized = 0;

  for (const chipKey in threatCounts) {
    if (threatCounts[chipKey] > maxThreatsNeutralized) {
      maxThreatsNeutralized = threatCounts[chipKey];
      bestRemoval = parseSlotKey(chipKey);
    }
  }

  if (bestRemoval) {
    bestRemoval.threatCount = maxThreatsNeutralized;
  }

  return bestRemoval;
}

function updateBrokenPlans(
  botId,
  sequence,
  boardState,
  opponentTeamIds,
  gameData,
) {
  if (!gameData.botIntentions) {
    gameData.botIntentions = {};
  }

  if (!gameData.botIntentions[botId]) {
    gameData.botIntentions[botId] = {};
  }

  const botIntents = gameData.botIntentions[botId];

  if (!botIntents.brokenPlans) {
    botIntents.brokenPlans = [];
  }

  const sequenceKey = sequence.sort().join("-");

  const existingPlan = botIntents.brokenPlans.find(
    (p) => p.line.sort().join("-") === sequenceKey,
  );

  if (existingPlan) return;

  const opponentChipsInLine = sequence.filter((slotKey) =>
    opponentTeamIds.includes(boardState[slotKey]),
  );

  if (opponentChipsInLine.length > 0) {
    botIntents.brokenPlans.push({
      line: sequence,
      turnBlocked: gameData.currentPlayerIndex,
    });
    if (botIntents.brokenPlans.length > 5) {
      botIntents.brokenPlans.shift();
    }

    gameData.botIntentions[botId] = botIntents;
  }
}

function updateOpponentThreatHistory(botId, newThreats, gameData) {
  if (!gameData.botIntentions) {
    gameData.botIntentions = {};
  }

  const botIntents = gameData.botIntentions[botId] || {
    opponentThreatHistory: [],
  };

  if (!botIntents.opponentThreatHistory) {
    botIntents.opponentThreatHistory = [];
  }

  newThreats.forEach((threat) => {
    const threatKey = `${threat.winningMove.row}_${threat.winningMove.col}`;
    if (!botIntents.opponentThreatHistory.some((h) => h.key === threatKey)) {
      botIntents.opponentThreatHistory.push({
        key: threatKey,
        turn: gameData.currentPlayerIndex,
      });
    }
  });

  while (botIntents.opponentThreatHistory.length > 10) {
    botIntents.opponentThreatHistory.shift();
  }

  gameData.botIntentions[botId] = botIntents;
}

function getStrategicMove(gameData, botPlayer) {
  if (gameData.isHint) {
    logAI("💡 Modo Dica: Forçando estratégia perfeita.");
  } else {
    const difficulty = gameData.botDifficulty || "hard";
    const history = JSON.parse(localStorage.getItem(WIN_LOSS_HISTORY_KEY)) || {
      streak: 0,
    };
    const winStreak = history.streak || 0;

    let strategicChance = { easy: 0.5, medium: 0.75, hard: 0.9, expert: 1.0 }[
      difficulty
    ];

    if (winStreak > 0) strategicChance += winStreak * 0.05;
    if (winStreak < 0) strategicChance += winStreak * 0.08;
    strategicChance = Math.max(0.1, Math.min(1.0, strategicChance));

    let useStrategicMove = Math.random() < strategicChance;

    const errorChance = { easy: 0.2, medium: 0.1, hard: 0.05, expert: 0.01 }[
      difficulty
    ];

    if (useStrategicMove && Math.random() < errorChance) {
      useStrategicMove = false;
    }

    if (!useStrategicMove) {
      logAI("🎲 Dificuldade/Sorte decidiu por uma jogada aleatória.");
      const rndMove = getRandomMove(gameData, botPlayer);
      if (rndMove) rndMove.reasonKey = "botReasons.random";
      return rndMove;
    }
  }

  const playerProfile = getPlayerProfile();
  const botIntentions = gameData.botIntentions || {};

  if (SEQUENCE_MAP.length === 0) {
    generateSequenceMap();
  }

  const botTeamId = botPlayer.teamId;
  const opponentTeamIds = Object.values(gameData.teams)
    .map((t) => t.id)
    .filter((id) => id !== botTeamId);
  const hand = botPlayer.hand || [];
  const boardState = gameData.boardState;
  const lockedChips = gameData.lockedChips || {};
  const oneEyedJack = hand.find((c) => c === "JS" || c === "JH");
  const twoEyedJack = hand.find((c) => c === "JD" || c === "JC");
  let possibleMoves = [];

  const deckSize = gameData.deck ? gameData.deck.length : 0;
  let gamePhase = "midgame";
  if (deckSize > 70) gamePhase = "opening";
  else if (deckSize < 20) gamePhase = "endgame";

  let threatMultiplier = 1.0;
  if (gamePhase === "endgame") threatMultiplier = 1.2;
  else if (gamePhase === "opening") threatMultiplier = 0.9;

  logAI(`Iniciando análise para ${botPlayer.name} | Fase: ${gamePhase}`);

  let playerIsAggressive =
    playerProfile.totalMoves > 10 &&
    playerProfile.blockMoves / playerProfile.totalMoves > 0.4;
  let playerFavorsCenter =
    playerProfile.totalMoves > 10 &&
    playerProfile.centerControlMoves / playerProfile.totalMoves > 0.35;

  const opponent = Object.values(gameData.players).find(
    (p) => p.teamId !== botTeamId && p.id !== botPlayer.id,
  );
  if (opponent && opponent.hand) {
    const opponentHand = opponent.hand || [];
    let threatMap = {};
    for (const card of opponentHand.filter((c) => !c.includes("J"))) {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (BOARD_LAYOUT[r][c] === card && !boardState[`${r}_${c}`]) {
            const tempBoard = { ...boardState, [`${r}_${c}`]: opponent.teamId };
            const newSequences = findAllValidNewSequences(
              tempBoard,
              lockedChips,
              r,
              c,
              opponent.teamId,
            );
            if (newSequences.length >= 2) {
              threatMap[`${r}_${c}`] = (threatMap[`${r}_${c}`] || 0) + 1;
            }
          }
        }
      }
    }
    const doubleThreatSlot = Object.keys(threatMap).find(
      (key) => threatMap[key] > 0,
    );
    if (doubleThreatSlot) {
      const cardNeededToBlock =
        BOARD_LAYOUT[parseSlotKey(doubleThreatSlot).row][
          parseSlotKey(doubleThreatSlot).col
        ];
      if (hand.includes(cardNeededToBlock)) {
        const move = {
          card: cardNeededToBlock,
          ...parseSlotKey(doubleThreatSlot),
          score: 48500,
          reasonKey: "botReasons.blockWinningTrap",
        };
        logAI("PREVISÃO: Bloqueando armadilha iminente do oponente!", move);
        return move;
      }
      if (twoEyedJack) {
        possibleMoves.push({
          card: twoEyedJack,
          ...parseSlotKey(doubleThreatSlot),
          score: 48400,
          reasonKey: "botReasons.blockTrapJack",
        });
      }
    }
  }

  const myIntents = botIntentions[botPlayer.id] || {};
  if (myIntents.brokenPlans && myIntents.brokenPlans.length > 0) {
    for (let i = myIntents.brokenPlans.length - 1; i >= 0; i--) {
      const plan = myIntents.brokenPlans[i];
      const opponentChipsInLine = plan.line.filter((slotKey) =>
        opponentTeamIds.includes(boardState[slotKey]),
      );
      if (opponentChipsInLine.length === 0) {
        logAI("MEMÓRIA LONGA: Plano quebrado agora está livre!", plan.line);
        for (const slotKey of plan.line) {
          const cardNeeded =
            BOARD_LAYOUT[parseSlotKey(slotKey).row][parseSlotKey(slotKey).col];
          if (hand.includes(cardNeeded) && !boardState[slotKey]) {
            possibleMoves.push({
              card: cardNeeded,
              ...parseSlotKey(slotKey),
              score: 44000,
              reasonKey: "botReasons.resumePlan",
            });
          }
        }
        myIntents.brokenPlans.splice(i, 1);
      }
    }
  }

  for (const sequence of SEQUENCE_MAP) {
    const analysis = analyzeSequence(
      sequence,
      boardState,
      botTeamId,
      opponentTeamIds,
      lockedChips,
    );
    if (
      analysis.myChips === 4 &&
      analysis.myLockedChips < 2 &&
      analysis.emptySlots.length === 1
    ) {
      const winningSlot = analysis.emptySlots[0];
      if (hand.includes(winningSlot.card)) {
        const move = {
          card: winningSlot.card,
          ...parseSlotKey(winningSlot.slotKey),
          score: 50000,
          reasonKey: "botReasons.winSequence",
        };
        logAI("🏆 VITÓRIA IMEDIATA!", move);
        return move;
      }
      if (twoEyedJack) {
        possibleMoves.push({
          card: twoEyedJack,
          ...parseSlotKey(winningSlot.slotKey),
          score: 49900,
          reasonKey: "botReasons.winJack",
        });
      }
    }
  }

  for (const opponentId of opponentTeamIds) {
    const opponentWinningPlays = findOpponentWinningPlays(
      boardState,
      botTeamId,
      opponentId,
      lockedChips,
    );
    if (opponentWinningPlays.length > 0) {
      logAI(
        `⚠️ AMEAÇA: Oponente ${opponentId} tem ${opponentWinningPlays.length} jogada(s) para vencer.`,
      );
      updateOpponentThreatHistory(botPlayer.id, opponentWinningPlays, gameData);
      const urgencyBonus = opponentWinningPlays.length * 50;
      for (const play of opponentWinningPlays) {
        const { row, col } = play.winningMove;
        const cardNeededToBlock = BOARD_LAYOUT[row][col];
        if (hand.includes(cardNeededToBlock)) {
          possibleMoves.push({
            card: cardNeededToBlock,
            row,
            col,
            slotKey: `${row}_${col}`,
            score: (48000 + urgencyBonus) * threatMultiplier,
            reasonKey: "botReasons.blockWin",
          });
        }
      }
      const hasNormalBlock = possibleMoves.some(
        (m) => m.score >= 48000 * threatMultiplier,
      );
      if (!hasNormalBlock && oneEyedJack) {
        const allRemovable = [];
        for (let r = 0; r < 10; r++)
          for (let c = 0; c < 10; c++) {
            if (
              boardState[`${r}_${c}`] === opponentId &&
              !lockedChips[`${r}_${c}`]
            )
              allRemovable.push({ row: r, col: c });
          }
        if (allRemovable.length > 0) {
          const bestRemoval = findBestJackRemoval(
            gameData,
            opponentWinningPlays,
            allRemovable,
          );
          if (bestRemoval && bestRemoval.threatCount > 0) {
            const isUrgent = opponentWinningPlays.length >= 2 || bestRemoval.threatCount >= 2;
            if (isUrgent) {
              let density = 0;
              for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  if (
                    boardState[
                      `${bestRemoval.row + dr}_${bestRemoval.col + dc}`
                    ] === opponentId
                  )
                    density++;
                }
              const gravityBonus = bestRemoval.threatCount * 800 + density * 100;
              possibleMoves.push({
                card: oneEyedJack,
                isRemoval: true,
                ...bestRemoval,
                slotKey: `${bestRemoval.row}_${bestRemoval.col}`,
                score: (47000 + gravityBonus + urgencyBonus) * threatMultiplier,
                reasonKey: "botReasons.smartRemoval",
                reasonParams: { count: bestRemoval.threatCount },
              });
            }
          }
        }
      }
    }
  }

  if (possibleMoves.some((m) => m.score >= 47000 * threatMultiplier)) {
    possibleMoves.sort((a, b) => b.score - a.score);
    logAI(
      "🛡️ JOGADA CRÍTICA (Vitória/Bloqueio) selecionada:",
      possibleMoves[0],
    );
    return possibleMoves[0];
  }

  const nonJackHand = hand.filter((c) => !c.includes("J"));
  for (const card of nonJackHand) {
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] === card && !boardState[`${r}_${c}`]) {
          const tempBoard = { ...boardState, [`${r}_${c}`]: botTeamId };
          const newSequences = findAllValidNewSequences(
            tempBoard,
            lockedChips,
            r,
            c,
            botTeamId,
          );
          if (newSequences.length >= 2) {
            let score = 45000;
            if (gamePhase === "opening") score += 500;
            possibleMoves.push({
              card,
              row: r,
              col: c,
              slotKey: `${r}_${c}`,
              score,
              reasonKey: "botReasons.createTrap",
            });
          }
        }
      }
  }

  if (oneEyedJack) {
    for (const sequence of SEQUENCE_MAP) {
      const analysis = analyzeSequence(
        sequence,
        boardState,
        botTeamId,
        opponentTeamIds,
        lockedChips,
      );

      const opponentLockedInLine = sequence.filter(s => {
        const key = `${s.row}_${s.col}`;
        return lockedChips[key] && boardState[key] && opponentTeamIds.includes(boardState[key]);
      }).length;

      if (
        analysis.myChips === 4 &&
        analysis.myLockedChips < 2 &&
        analysis.emptySlots === 0 &&
        opponentLockedInLine < 4 &&
        Object.values(analysis.opponentChipCounts).reduce(
          (a, b) => a + b,
          0,
        ) === 1
      ) {
        const opponentSlotKey = Object.values(analysis.opponentSlots).flat()[0];
        if (opponentSlotKey && !lockedChips[opponentSlotKey]) {
          possibleMoves.push({
            card: oneEyedJack,
            isRemoval: true,
            ...parseSlotKey(opponentSlotKey),
            score: 46000,
            reasonKey: "botReasons.removeBlocker",
          });
        }
      }
    }
  }

  for (const card of nonJackHand) {
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const slotKey = `${r}_${c}`;
        if (BOARD_LAYOUT[r][c] === card && !boardState[slotKey]) {
          let myMoveScore = evaluatePositionWithHandPotential(
            r,
            c,
            botTeamId,
            boardState,
            hand,
          );

          if (
            playerIsAggressive &&
            opponent &&
            evaluatePosition(r, c, opponent.teamId, boardState) >= 4
          ) {
            myMoveScore *= 1.15;
          }
          if (playerFavorsCenter && r >= 3 && r <= 6 && c >= 3 && c <= 6) {
            myMoveScore *= 1.1;
          }

          const simulatedGameData = JSON.parse(JSON.stringify(gameData));
          simulatedGameData.boardState[slotKey] = botTeamId;
          const opponentBestMove = getBestOpponentResponse(
            simulatedGameData,
            opponent,
          );
          let opponentResponseScore = opponentBestMove
            ? opponentBestMove.score
            : 0;
          if (opponentResponseScore > 10000) opponentResponseScore = 1500;

          let memoryBonus = 0;
          const intendedLine = myIntents.line;
          if (intendedLine && intendedLine.includes(slotKey)) {
            memoryBonus += 60;
          }
          if (
            myIntents.opponentThreatHistory &&
            myIntents.opponentThreatHistory.some((h) => h.key === slotKey)
          ) {
            memoryBonus += 40;
          }

          const finalScore = myMoveScore - opponentResponseScore + memoryBonus;

          for (const sequence of SEQUENCE_MAP) {
            if (sequence.includes(slotKey)) {
              updateBrokenPlans(
                botPlayer.id,
                sequence,
                boardState,
                opponentTeamIds,
                gameData,
              );
            }
          }

          possibleMoves.push({
            card,
            row: r,
            col: c,
            slotKey,
            score: finalScore,
            reasonKey: "botReasons.predictive",
          });
        }
      }
  }

  if (possibleMoves.length > 0) {
    possibleMoves.sort((a, b) => b.score - a.score);
    logAI("✅ Jogada final selecionada:", possibleMoves[0]);
    return possibleMoves[0];
  }

  logAI("🤷 Nenhuma jogada estratégica encontrada...");
  const rndMove = getRandomMove(gameData, botPlayer);

  if (rndMove) {
    if (gameData.isHint) {
      rndMove.reasonKey = "botReasons.noStrategyMove";
    } else {
      rndMove.reasonKey = "botReasons.random";
    }
  }
  return rndMove;
}

function parseSlotKey(slotKey) {
  const [row, col] = slotKey.split("_").map(Number);
  return { row, col, slotKey };
}

function isLineDead(chip, boardState, teamId) {
  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];

  for (const dir of directions) {
    let lineChips = [chip];

    for (let i = 1; i < 5; i++) {
      const r = chip.row + dir.r * i;
      const c = chip.col + dir.c * i;
      if (r < 0 || r > 9 || c < 0 || c > 9) break;
      if (boardState[`${r}_${c}`] === teamId || BOARD_LAYOUT[r]?.[c] === "F") {
        lineChips.push({ row: r, col: c });
      } else {
        break;
      }
    }

    for (let i = 1; i < 5; i++) {
      const r = chip.row - dir.r * i;
      const c = chip.col - dir.c * i;
      if (r < 0 || r > 9 || c < 0 || c > 9) break;
      if (boardState[`${r}_${c}`] === teamId || BOARD_LAYOUT[r]?.[c] === "F") {
        lineChips.push({ row: r, col: c });
      } else {
        break;
      }
    }

    if (lineChips.length >= 5) continue;

    const minR = Math.min(...lineChips.map((p) => p.row));
    const maxR = Math.max(...lineChips.map((p) => p.row));
    const minC = Math.min(...lineChips.map((p) => p.col));
    const maxC = Math.max(...lineChips.map((p) => p.col));

    const end1 = { r: minR - dir.r, c: minC - dir.c };
    const end2 = { r: maxR + dir.r, c: maxC + dir.c };

    const isEnd1Blocked =
      end1.r < 0 ||
      end1.r > 9 ||
      end1.c < 0 ||
      end1.c > 9 ||
      boardState[`${end1.r}_${end1.c}`];
    const isEnd2Blocked =
      end2.r < 0 ||
      end2.r > 9 ||
      end2.c < 0 ||
      end2.c > 9 ||
      boardState[`${end2.r}_${end2.c}`];

    if (!isEnd1Blocked || !isEnd2Blocked) {
      return false;
    }
  }

  return true;
}

function getRandomMove(gameData, botPlayer) {
  const hand = [...(botPlayer.hand || [])].sort(() => Math.random() - 0.5);
  for (const card of hand) {
    if (card.includes("J")) continue;
    const possibleSlots = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] === card && !gameData.boardState[`${r}_${c}`]) {
          possibleSlots.push({ row: r, col: c, slotKey: `${r}_${c}` });
        }
      }
    }

    if (possibleSlots.length > 0) {
      return {
        card,
        ...possibleSlots[Math.floor(Math.random() * possibleSlots.length)],
        score: 0,
        reason: "Random Move",
      };
    }
  }

  return null;
}

function promptColorSelection(playerCount, numTeams, newGame = false) {
  const isTeamGame = playerCount / numTeams > 1;
  const coresTraduzidas = translate("teamColors");

  let modalHtml =
    '<div style="display: flex; flex-direction: column; gap: 15px;">';

  const createSelect = (id, label) =>
    `<div class="swal2-input-container">
            <label class="modal-label">${label}:</label>
            <select id="${id}" class="swal2-select">
                ${Object.entries(coresTraduzidas)
                  .map(
                    ([value, name]) =>
                      `<option value="${value}">${name}</option>`,
                  )
                  .join("")}
            </select>
        </div>`;

  const userLabel = isTeamGame
    ? translate("yourTeamColor")
    : translate("yourChipColor");
  modalHtml += createSelect("user-color-select", userLabel);

  if (numTeams === 2) {
    const botLabel = isTeamGame
      ? translate("botTeamColor")
      : translate("botChipColor");
    modalHtml += createSelect("bot-color-select", botLabel);
  }

  modalHtml += "</div>";

  Swal.fire({
    title: translate("selectColorsTitle"),
    html: modalHtml,
    showCancelButton: true,
    confirmButtonText: `<i class='fas fa-play'></i> ${translate("play")}`,
    cancelButtonText: `<i class='fas fa-times'></i> ${translate("cancel")}`,
    allowEscapeKey: false,
    toast: true,
    position: "center",
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
    didOpen: () => {
      if (numTeams === 2) {
        $("#bot-color-select").val("blue");
      }
    },
    preConfirm: () => {
      const userColor = $("#user-color-select").val();
      let botColors = [];

      if (numTeams === 2) {
        const botColor = $("#bot-color-select").val();
        if (userColor === botColor) {
          Swal.showValidationMessage(translate("colorsMustBeDifferent"));
          return false;
        }
        botColors.push(botColor);
      }

      return { user: userColor, bots: botColors };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      if (newGame) {
        localStorage.removeItem(LOCAL_GAME_KEY);
        checkExistingLocalGame();
      }
      saveLobbySettings();
      startLocalGame(playerCount, numTeams, result.value);
    }
  });
}

function startLocalGame(playerCount, numTeams, chosenColors) {
  const availableBots = BOT_NAMES.filter(
    (bot) => bot.name.toLowerCase() !== myPlayerName.toLowerCase(),
  );
  const shuffledBots = availableBots.sort(() => 0.5 - Math.random());
  const selectedBots = shuffledBots.slice(0, playerCount - 1);

  const avatarIndexes = [1, 2, 3, 4, 5, 6];
  for (let i = avatarIndexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [avatarIndexes[i], avatarIndexes[j]] = [avatarIndexes[j], avatarIndexes[i]];
  }

  myPlayerId = "player1";

  let players = {
    [myPlayerId]: {
      id: myPlayerId,
      name: myPlayerName,
      avatar: selectedAvatarId,
      hand: [],
      online: true,
    },
  };

  for (let i = 2; i <= playerCount; i++) {
    const botInfo = selectedBots[i - 2];
    players[`player${i}`] = {
      id: `player${i}`,
      name: botInfo.name,
      avatar: botInfo.avatar,
      hand: [],
      online: true,
      isBot: true,
      useBotAvatar: true,
      botAvatarIndex: avatarIndexes[i - 2],
    };
  }

  let teams = {};

  teams.team1 = {
    id: `team1`,
    color: chosenColors.user,
    members: [],
    sequencesCompleted: 0,
  };

  let botTeamColors = [];
  if (numTeams === 2) {
    botTeamColors = chosenColors.bots;
  } else if (numTeams === 3) {
    const availableColors = ["red", "blue", "green"];
    botTeamColors = availableColors.filter(
      (color) => color !== chosenColors.user,
    );
  }

  for (let i = 0; i < botTeamColors.length; i++) {
    const teamId = `team${i + 2}`;
    teams[teamId] = {
      id: teamId,
      color: botTeamColors[i],
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
    for (let i = 0; i < cardsToDeal; i++)
      if (deck.length > 0) p.hand.push(deck.pop());
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

  let startingHints;
  switch (botDifficulty) {
    case "easy":
      startingHints = Infinity;
      break;
    case "medium":
      startingHints = 5;
      break;
    case "expert":
      startingHints = 1;
      break;
    default:
      startingHints = 3;
      break;
  }

  localGameData = {
    gameId: "local",
    gameState: "playing",
    playerCount,
    numTeams,
    botDifficulty,
    chosenColors,
    boardState: { "0_0": "F", "0_9": "F", "9_0": "F", "9_9": "F" },
    lockedChips: {},
    players,
    teams,
    deck,
    discardPile: [],
    turnOrder,
    currentPlayerIndex: 0,
    turnState: "playing",
    winner: null,
    botIntentions: {},
    hintsRemaining: startingHints,
    settings: {
      autoDraw: localStorage.getItem("sequenceAutoDrawOffline") === "true",
      reshuffleOnEmpty: localStorage.getItem("sequenceReshuffleOffline") !== "false",
    },
    gameMessage: {
      key: "gameStarted",
      params: { playerName: players[turnOrder[0]].name },
    },
  };

  hintsRemaining = startingHints;
  updateHintUI();

  myTeamId = localGameData.players[myPlayerId].teamId;

  saveLocalGame();
  syncOfflineGameToFirebase(true);
  startOfflineSyncInterval();
  window.history.pushState({}, "Sequence Local", "?game=local");

  setupGameUI("local");
  initializeBoard();
  $(".ai-info-btn").show();
  renderAll(localGameData);

  if (typeof initChipStack === "function") {
    const myPlayer = localGameData.players[myPlayerId];
    if (myPlayer) initChipStack(getTeamColor(myPlayer.teamId), true);
  }

  const cardsInHand = CARDS_PER_PLAYER[localGameData.playerCount] || 6;
  const totalCardsDealt = cardsInHand * localGameData.playerCount;
  if (typeof animarDistribuicao === "function") {
    animarDistribuicao(cardsInHand, totalCardsDealt, () => {
      if (typeof animarMontarPilha === "function") animarMontarPilha(0);
      checkNextTurn();
    });
  } else {
    if (typeof animarMontarPilha === "function") animarMontarPilha(0);
    checkNextTurn();
  }

  const gameModeValue = $("#player-count-select").val().replace(".", "_");
  const difficultyValue = $("#difficulty-select").val();

  incrementAnalytics({
    games_started_total: 1,
    games_started_offline: 1,
    [`game_mode_selected_${gameModeValue}`]: 1,
    [`difficulty_selected_${difficultyValue}`]: 1,
  });

  logGameEvent("game_starts", "offline_session", "local_start");
}

$("#start-practice-btn").on("click", function () {
  const savedGameData = localStorage.getItem(LOCAL_GAME_KEY);

  const startNewGameFlow = (newGame = false) => {
    isLocalGame = true;
    myPlayerName =
      $("#player-name-input").val().trim() || translate("defaultPlayerName");

    const gameModeValue = $("#player-count-select").val().replace(".", "_");
    if (!gameModeValue || gameModeValue === "0") {
      return showToast(translate("selectGameMode"), {
        title: translate("oops"),
        icon: "warning",
      });
    }

    botDifficulty = $("#difficulty-select").val();
    if (!botDifficulty || botDifficulty === "0") {
      return showToast(translate("selectDifficulty"), {
        title: translate("oops"),
        icon: "warning",
      });
    }

    const gameMode = gameModeValue.split("_");
    const playerCount = parseInt(gameMode[0]);
    const numTeams = parseInt(gameMode[1]);

    showInterstitialAd('start-practice-game', () => {
      promptColorSelection(playerCount, numTeams, newGame);
    });
  };

  if (savedGameData) {
    Swal.fire({
      title: translate("savedGameFoundTitle"),
      html: translate("savedGameFoundBody"),
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: `<i class='fas fa-rotate-right'></i> ${translate(
        "newGame",
      )}`,
      denyButtonText: `<i class='fas fa-play'></i> ${translate(
        "continueGame",
      )}</i>`,
      cancelButtonText: `<i class='fas fa-times'></i> ${translate("cancel")}`,
      toast: true,
      position: "center",
      customClass: {
        confirmButton: "swal2-button-full",
        cancelButton: "swal2-button-full",
        denyButton: "swal2-confirm swal2-button-full",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        startNewGameFlow(true);
      }
      if (result.isDenied) {
        window.history.pushState({}, "Sequence Local", "?game=local");
        loadAndResumeLocalGame();
      }
    });
  } else {
    startNewGameFlow(true);
  }
});

$("#join-practice-btn").on("click", function () {
  window.history.pushState({}, "Sequence Local", "?game=local");
  saveLobbySettings();
  loadAndResumeLocalGame();
});

$("#hint-btn").on("click", function () {
  if (!isLocalGame) return;
  if (hintsRemaining <= 0) return;

  if (hintsRemaining === Infinity) {
    useHintLogic();
    return;
  }

  Swal.fire({
    title: translate("confirmHintTitle"),
    text: translate("confirmHintText", { count: hintsRemaining }),
    icon: "question",
    showCancelButton: true,
    confirmButtonText: `<i class="fas fa-lightbulb"></i> ${translate("btnUseHint")}`,
    cancelButtonText: translate("cancel"),
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      useHintLogic();
    }
  });
});

function useHintLogic() {
  const myPlayer = localGameData.players[myPlayerId];
  const simulatedBot = {
    id: myPlayer.id,
    teamId: myPlayer.teamId,
    hand: [...myPlayer.hand],
    name: "HumanHelper",
  };

  const tempGameData = {
    ...localGameData,
    botDifficulty: "expert",
    botIntentions: {},
    isHint: true,
  };

  const bestMove = getStrategicMove(tempGameData, simulatedBot);

  if (bestMove) {
    incrementAnalytics({ hints_used: 1 });

    $(".card-in-hand").removeClass("selected");
    selectedHandCard = null;
    clearHighlights();
    clearHints();

    activeHint = bestMove;

    if (hintsRemaining !== Infinity) {
      hintsRemaining--;
    }
    localGameData.hintsRemaining = hintsRemaining;
    saveLocalGame();
    updateHintUI();

    const $card = $(`.card-in-hand[data-card='${bestMove.card}']`).first();

    let cardName;

    if ($card.length) {
      const cardIndex = $card.data("index");

      selectedHandCard = {
        card: bestMove.card,
        index: cardIndex,
        element: $card,
      };

      $card.addClass("selected hint-highlight");

      cardName = getHumanReadableCardName(bestMove.card);
      $("#game-message").html(
        translate("cardSelectedInfo", { cardName: cardName }),
      );

      highlightPlayableSlots(bestMove.card, localGameData);
      $("#board .card-slot.highlighted-slot, #board .card-slot.highlighted-removal").css("pointer-events", "auto");

      const $slot = $(
        `.card-slot[data-row='${bestMove.row}'][data-col='${bestMove.col}']`,
      );
      $slot.addClass("hint-highlight");
    }

    let reasonText = "";
    if (bestMove.reasonKey) {
      reasonText = translate(bestMove.reasonKey, bestMove.reasonParams || {});
    }

    const msg = translate("hintDetail", {
      cardName: cardName,
      reason: reasonText,
    });

    showToast(msg, { icon: "info", timer: 5000 });
  } else {
    showToast("🤔 " + translate("noTipFound"), { icon: "question" });
  }
}

function clearHints() {
  $(".hint-highlight").removeClass("hint-highlight");
  activeHint = null;
}

function updateHintUI() {
  const $badge = $("#hint-count");

  if (hintsRemaining === Infinity) {
    $badge.hide();
  } else {
    $badge.text(hintsRemaining);
    $badge.css("background-color", "#f1c40f");
    $badge.show();
  }

  if (hintsRemaining > 0 || hintsRemaining === Infinity) {
    $("#hint-btn").prop("disabled", false);
  } else {
    $("#hint-btn").prop("disabled", true);
  }

  if (isLocalGame) {
    $("#hint-btn").show();
  } else {
    $("#hint-btn").hide();
  }
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("game") === "local") {
  loadAndResumeLocalGame();
}

checkExistingLocalGame();
