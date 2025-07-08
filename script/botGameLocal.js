const coresDisponiveis = { red: "Vermelha", blue: "Azul", green: "Verde" };
const DEBUG_AI = true;
const LOCAL_GAME_KEY = "sequenceLocalGameData";
const PLAYER_PROFILE_KEY = "sequencePlayerProfile";
const WIN_LOSS_HISTORY_KEY = "sequenceWinLossHistory";
const BOT_NAMES = [
  "Alice",
  "Andreza",
  "Beatriz",
  "Bernardo",
  "Bia",
  "Bruno",
  "Davi",
  "Eduardo",
  "Gael",
  "Gabriel",
  "Guilherme",
  "Heitor",
  "Helena",
  "Heloísa",
  "Ilza",
  "Isa",
  "Isabella",
  "João",
  "Jéssica",
  "Júlia",
  "Laisa",
  "Laura",
  "Layla",
  "Levi",
  "Lívia",
  "Luiz",
  "Luan",
  "Maria",
  "Miguel",
  "Pedro",
  "Rafaela",
  "Rafael",
  "Ricardo",
  "Roberto",
  "Ronaldo",
  "Samuel",
  "Sophia",
  "Theo",
  "Thiago",
  "Valentina",
  "Vitoria",
  "Vitor",
  "Warley",
  "Wendell",
  "Wesley",
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

let localGameData = {};
let botDifficulty = "hard";
let localDrawTimer = null;
let localNewlyDrawnCard = null;
let SEQUENCE_MAP = [];

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

    showToast("Jogo anterior restaurado!", { icon: "success" });
    setupGameUI("local");
    renderAll(localGameData);
    checkNextTurn();
    return true;
  }
  return false;
}

function leaveGameLocal(save) {
  if (!save) localStorage.removeItem("sequenceLocalGameData");
  window.location.href = window.location.pathname;
}

function exchangeDeadCardLocal(cardToExchange, cardIndex) {
  if (localGameData.deck.length === 0) {
    return showToast("O baralho está vazio, não é possível trocar.", {
      icon: "warning",
    });
  }

  const player = localGameData.players[myPlayerId];
  if (player.hand[cardIndex] !== cardToExchange) {
    cardIndex = player.hand.indexOf(cardToExchange);
    if (cardIndex === -1) return;
  }

  player.hand.splice(cardIndex, 1);

  if (!localGameData.discardPile) localGameData.discardPile = [];
  localGameData.discardPile.push(cardToExchange);

  const newCard = localGameData.deck.pop();
  player.hand.push(newCard);
  localNewlyDrawnCard = newCard;

  showToast(
    `Você trocou ${getHumanReadableCardName(
      cardToExchange
    )} por uma nova carta!`,
    { icon: "success" }
  );
  renderPlayerHand(
    player.hand,
    localGameData.gameState,
    localNewlyDrawnCard,
    localGameData,
    true
  );
  localNewlyDrawnCard = null;
  saveLocalGame();
}

onHandCardClickLocal = function (card, index, $element) {
  if ($element.parent().hasClass("disabled")) return;

  if ($element.hasClass("newly-drawn")) {
    $element.removeClass("newly-drawn");
  }

  if (
    isCardDead(card, localGameData.boardState) &&
    localGameData.deck.length > 0
  ) {
    Swal.fire({
      title: "Carta Morta!",
      html: `Todos os espaços para <b>${getHumanReadableCardName(
        card
      )}</b> estão ocupados.<br>Deseja trocá-la por uma nova carta do baralho?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "<i class='fas fa-right-left'></i> Sim, trocar!",
      cancelButtonText: "<i class='fas fa-times'></i> Não",
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
    showToast("Estado do jogo mudou. Por favor, selecione a carta novamente.", {
      icon: "warning",
    });
    return;
  }

  const boardStateBeforeMove = JSON.parse(
    JSON.stringify(localGameData.boardState)
  );

  player.hand.splice(cardIndexToRemove, 1);

  if (!localGameData.discardPile) localGameData.discardPile = [];
  localGameData.discardPile.push(selectedHandCard.card);

  if ($slot.hasClass("highlighted-removal")) {
    delete localGameData.boardState[`${row}_${col}`];
    updatePlayerProfile({ isRemoval: true }, boardStateBeforeMove);
  } else {
    localGameData.boardState[`${row}_${col}`] = player.teamId;
    const completedSequence = handlePostMoveChecks(
      row,
      col,
      player.teamId,
      false
    );
    updatePlayerProfile(
      {
        row,
        col,
        teamId: player.teamId,
        isRemoval: false,
        completedSequence: completedSequence,
      },
      boardStateBeforeMove
    );
  }

  selectedHandCard = null;
  clearHighlights();
  renderBoard(localGameData);
  renderPlayerHand(
    player.hand,
    localGameData.gameState,
    null,
    localGameData,
    true
  );
  updateGameInfo(localGameData);

  if (localGameData.winner) return;

  if (localGameData.deck.length > 0) {
    localGameData.turnState = "drawing";

    $("#board .card-slot").css("pointer-events", "none");
    $("#player-hand").addClass("disabled");
    $("#deck-pile").removeClass("disabled");
    startDrawCountdown(5);

    localDrawTimer = setTimeout(() => {
      completeDrawingPhase(false);
    }, 5000);
  } else {
    $("#deck-pile").addClass("disabled");
    endTurn();
  }
};

function onDeckClickLocal() {
  completeDrawingPhase(true);
}

function completeDrawingPhase(isPlayerAction) {
  if (localGameData.turnState !== "drawing") {
    return;
  }

  clearTimeout(localDrawTimer);
  clearInterval(drawCountdownInterval);

  const player = localGameData.players[myPlayerId];
  if (isPlayerAction) {
    if (localGameData.deck.length > 0) {
      const newCard = localGameData.deck.pop();
      player.hand.push(newCard);
      localNewlyDrawnCard = newCard;
    }
  } else {
    const handSize = (player.hand || []).length;
    const minCardsForThisGame = MIN_CARDS_IN_HAND[localGameData.playerCount];
    if (handSize < minCardsForThisGame && localGameData.deck.length > 0) {
      const newCard = localGameData.deck.pop();
      player.hand.push(newCard);
      localNewlyDrawnCard = newCard;
      showToast("Carta comprada para atingir o mínimo.", { icon: "info" });
    }
  }

  endTurn();
}

function handlePostMoveChecks(row, col, teamId, isBotMove = false) {
  const team = localGameData.teams[teamId];
  if (!team) return null;
  const newSequence = checkForSequence(
    localGameData.boardState,
    localGameData.lockedChips,
    row,
    col,
    teamId
  );
  if (newSequence) {
    playAudio(sequenceSuccessSound);
    triggerVibration("sequenceSuccess");
    team.sequencesCompleted++;
    const isCanto = (r, c) => (r === 0 || r === 9) && (c === 0 || c === 9);
    newSequence.forEach((chip) => {
      if (!isCanto(chip.row, chip.col)) {
        localGameData.lockedChips[`${chip.row}_${chip.col}`] = true;
      }
    });
    if (isBotMove) {
      let sequenceMessage = "";
      if (team.members.length === 1) {
        const player = localGameData.players[team.members[0]];
        sequenceMessage = `<b style="color: ${team.color};">${player.name}</b> fez uma sequência!`;
      } else {
        sequenceMessage = `A equipe <b style="color: ${
          team.color
        };">${TEAM_NAMES[team.color].toUpperCase()}</b> fez uma sequência!`;
      }
      showToast(sequenceMessage, { icon: "success", timer: 4000 });
    }

    const sequencesNeeded = SEQUENCES_TO_WIN[localGameData.numTeams] || 1;
    if (team.sequencesCompleted >= sequencesNeeded) {
      endLocalGame(teamId);
    }
    return newSequence;
  }
  return null;
}

function endLocalGame(winnerId) {
  localGameData.winner = winnerId;
  localGameData.gameState = "finished";

  const winningTeam = localGameData.teams[winnerId];
  const myTeamId = localGameData.players[myPlayerId].teamId;
  const isMyTeamWinning = winnerId === myTeamId;

  updateWinLossHistory(isMyTeamWinning ? "win" : "loss");

  let winnerMessage;
  let dialogTitle;

  if (isMyTeamWinning) {
    dialogTitle = "Você Venceu!";
    const winnerColorStyle = `style="color: ${winningTeam.color};"`;
    if (winningTeam.members.length === 1) {
      winnerMessage = `<b ${winnerColorStyle}>VOCÊ</b> VENCEU!`;
    } else {
      winnerMessage = `A <b ${winnerColorStyle}>SUA EQUIPE</b> VENCEU!`;
    }
  } else {
    dialogTitle = "Você Perdeu!";
    const winnerColorStyle = `style="color: ${winningTeam.color};"`;
    if (winningTeam.members.length === 1) {
      const winnerPlayer = localGameData.players[winningTeam.members[0]];
      winnerMessage = `<b ${winnerColorStyle}>${winnerPlayer.name.toUpperCase()}</b> VENCEU!`;
    } else {
      winnerMessage = `A EQUIPE <b ${winnerColorStyle}>${TEAM_NAMES[
        winningTeam.color
      ].toUpperCase()}</b> VENCEU!`;
    }
  }

  localGameData.gameMessage = `FIM DE JOGO! ${winnerMessage}`;

  renderAll(localGameData);
  $("#deck-pile").addClass("disabled");

  setTimeout(() => {
    if (isMyTeamWinning) {
      playAudio(winnerSound);
      triggerVibration("victory");
    } else {
      playAudio(drawOrDefeatSound);
      triggerVibration("defeat");
    }
    promptLocalRematch(winnerMessage, dialogTitle);
  }, 3000);
}

function endLocalGameAsDraw() {
  localGameData.gameState = "finished";
  localGameData.winner = null;
  localGameData.gameMessage = "FIM DE JOGO! Empate!";

  updateWinLossHistory("draw");

  renderAll(localGameData);
  $("#deck-pile").addClass("disabled");

  setTimeout(() => {
    playAudio(drawOrDefeatSound);
    triggerVibration("draw");
    promptLocalRematch("O jogo terminou em <b>EMPATE</b>!", "Empate!");
  }, 3000);
}

function promptLocalRematch(winnerHtml, title = "Fim de Jogo!") {
  const isDraw = title === "O jogo terminou em <b>EMPATE</b>!";
  const youWin = title === "Você Venceu!";

  const confirmText = isDraw
    ? "<i class='fas fa-rotate-right'></i> Jogar novamente"
    : youWin
    ? "<i class='fas fa-rotate-right'></i> Sim, vamos!"
    : "<i class='fas fa-rotate-right'></i> Quero revanche!";

  const isSmallScreen = window.innerWidth < 500;
  const position = isSmallScreen ? "bottom" : "center";

  Swal.fire({
    title: title,
    html: `${winnerHtml}<br><br>Deseja jogar novamente?`,
    icon: youWin ? "success" : isDraw ? "info" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "<i class='fas fa-right-from-bracket'></i> Não, sair",
    allowEscapeKey: false,
    toast: true,
    position: position,
    customClass: {
      confirmButton: "swal2-button-full",
      cancelButton: "swal2-button-full",
    },
  }).then((result) => {
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
  const deck = createAndShuffleDeck();
  const cardsToDeal = CARDS_PER_PLAYER[oldData.playerCount];
  const rotatedTurnOrder = [...oldData.turnOrder];
  if (rotatedTurnOrder.length > 0) {
    const firstPlayer = rotatedTurnOrder.shift();
    rotatedTurnOrder.push(firstPlayer);
  }

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

  localGameData.gameMessage = `Nova partida! Vez de ${player.name}.`;

  saveLocalGame();
  renderAll(localGameData);
  checkNextTurn();
}

function endTurn() {
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
  renderAll(localGameData, localNewlyDrawnCard);
  localNewlyDrawnCard = null;

  checkNextTurn();
  saveLocalGame();
}

function checkNextTurn() {
  if (localGameData.winner) return;

  const currentPlayer =
    localGameData.players[
      localGameData.turnOrder[localGameData.currentPlayerIndex]
    ];

  const nextPlayerIndex =
    (localGameData.currentPlayerIndex + 1) % localGameData.playerCount;
  const nextPlayer =
    localGameData.players[localGameData.turnOrder[nextPlayerIndex]];

  if (currentPlayer.isBot) {
    let botMessage = `Aguardando ${currentPlayer.name}...`;
    if (nextPlayer && nextPlayer.id === myPlayerId) {
      botMessage += " <b>Você é o próximo!</b>";
    } else if (nextPlayer) {
      botMessage += ` Próximo a jogar: <b>${nextPlayer.name}</b>`;
    }
    $("#game-message").html(botMessage);

    const delay = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
    setTimeout(executeBotTurn, delay);
  } else {
    if (
      !canPlayerPlay(currentPlayer, localGameData.boardState) &&
      localGameData.deck.length === 0
    ) {
      showToast("Você não tem jogadas válidas. Passando a vez...", {
        icon: "info",
      });
      setTimeout(endTurn, 1500);
    } else {
      playAudio(myTurnSound, true);
      triggerVibration("myTurn");
      localGameData.gameMessage = "Sua vez! Selecione uma carta para jogar.";
      updateGameInfo(localGameData);
      $("#board .card-slot").css("pointer-events", "auto");
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

  if (result === "win") {
    history.wins++;
    history.streak = history.streak >= 0 ? history.streak + 1 : 1;
  } else if (result === "loss") {
    history.losses++;
    history.streak = history.streak <= 0 ? history.streak - 1 : -1;
  } else {
    history.draws++;
  }

  localStorage.setItem(WIN_LOSS_HISTORY_KEY, JSON.stringify(history));
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
      (id) => id !== teamId
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

  if (move.completedSequence) {
    profile.lastSequences.push(
      move.completedSequence.map((s) => `${s.row}_${s.col}`)
    );
    if (profile.lastSequences.length > 3) profile.lastSequences.shift();
  }

  localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

function executeBotTurn() {
  const botId = localGameData.turnOrder[localGameData.currentPlayerIndex];
  const bot = localGameData.players[botId];
  let move;

  const deadCards = (bot.hand || []).filter((card) =>
    isCardDead(card, localGameData.boardState)
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
    showToast(`<b>${bot.name}</b> trocou uma carta morta.`, { icon: "info" });
  }

  const difficulty = localGameData.botDifficulty || "hard";
  const history = JSON.parse(localStorage.getItem(WIN_LOSS_HISTORY_KEY)) || {
    streak: 0,
  };
  const winStreak = history.streak || 0;

  let strategicChance = { easy: 0.5, medium: 0.75, hard: 0.9, expert: 1.0 }[
    difficulty
  ];
  if (winStreak > 0) {
    strategicChance += winStreak * 0.05;
  }
  if (winStreak < 0) {
    strategicChance += winStreak * 0.08;
  }
  strategicChance = Math.max(0.1, Math.min(1.0, strategicChance));

  let useStrategicMove = Math.random() < strategicChance;

  const errorChance = { easy: 0.2, medium: 0.1, hard: 0.05, expert: 0.01 }[
    difficulty
  ];
  if (useStrategicMove && Math.random() < errorChance) {
    if (DEBUG_AI) console.log(`[BOT - ${bot.name}] SIMULANDO ERRO HUMANO!`);
    useStrategicMove = false;
  }

  if (useStrategicMove) {
    move = getStrategicMove(localGameData, bot);
  } else {
    move = getRandomMove(localGameData, bot);
  }

  if (useStrategicMove && !move) {
    move = getRandomMove(localGameData, bot);
  }

  if (DEBUG_AI && move) {
    console.log(
      `[BOT - ${bot.name}] Decisão: ${move.reason} (Score: ${move.score.toFixed(
        2
      )}) | Estratégia: ${useStrategicMove ? "ON" : "OFF"}`
    );
  }

  const baseDelay = 1000;
  const complexityDelay = move ? Math.min(move.score / 50, 1500) : 0;
  const randomDelay = Math.random() * 500;
  const totalDelay = baseDelay + complexityDelay + randomDelay;

  setTimeout(() => {
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
      if (move.isRemoval) {
        delete localGameData.boardState[move.slotKey];
      } else {
        localGameData.boardState[move.slotKey] = bot.teamId;
        handlePostMoveChecks(move.row, move.col, bot.teamId, true);
      }
      if (localGameData.deck.length > 0) {
        bot.hand.push(localGameData.deck.pop());
      }

      if (move && !move.isRemoval) {
        const bestSequenceFormed = findAllValidNewSequences(
          localGameData.boardState,
          localGameData.lockedChips,
          move.row,
          move.col,
          bot.teamId
        ).sort((a, b) => b.length - a.length)[0];

        if (bestSequenceFormed) {
          localGameData.botIntentions = localGameData.botIntentions || {};
          localGameData.botIntentions[bot.id] = {
            line: bestSequenceFormed.map((p) => `${p.row}_${p.col}`),
            lastUpdateTurn: localGameData.currentPlayerIndex,
          };
        }
      }
    } else {
      showToast(`<b>${bot.name}</b> não tinha jogadas e passou a vez.`, {
        icon: "info",
      });
    }

    if (!localGameData.winner) endTurn();
  }, totalDelay);
}

function analyzeSequence(
  sequence,
  boardState,
  botTeamId,
  opponentTeamIds,
  lockedChips
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
            opponentHand
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

function getStrategicMove(gameData, botPlayer) {
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
  if (deckSize > 70) {
    gamePhase = "opening";
  } else if (deckSize < 20) {
    gamePhase = "endgame";
  }

  let playerIsAggressive =
    playerProfile.totalMoves > 10 &&
    playerProfile.blockMoves / playerProfile.totalMoves > 0.4;
  let playerFavorsCenter =
    playerProfile.totalMoves > 10 &&
    playerProfile.centerControlMoves / playerProfile.totalMoves > 0.35;

  if (gameData.players["player1"] && gameData.players["player1"].moveHistory) {
    const lastHumanMove = Object.values(
      gameData.players["player1"].moveHistory
    ).slice(-3);
    const recentBlockMoves = lastHumanMove.filter(
      (move) => move.type === "block"
    ).length;
    if (lastHumanMove.length === 3 && recentBlockMoves >= 2) {
      playerIsAggressive = true;
    }
  }

  const opponent = gameData.players["player1"];
  if (opponent) {
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
              opponent.teamId
            );
            if (newSequences.length >= 2) {
              threatMap[`${r}_${c}`] = (threatMap[`${r}_${c}`] || 0) + 1;
            }
          }
        }
      }
    }
    const doubleThreatSlot = Object.keys(threatMap).find(
      (key) => threatMap[key] > 0
    );
    if (doubleThreatSlot) {
      const cardNeededToBlock =
        BOARD_LAYOUT[parseInt(doubleThreatSlot.split("_")[0])][
          parseInt(doubleThreatSlot.split("_")[1])
        ];
      if (hand.includes(cardNeededToBlock)) {
        return {
          card: cardNeededToBlock,
          ...parseSlotKey(doubleThreatSlot),
          score: 48000,
          reason: "Block Opponent's Winning Trap",
        };
      }
      if (twoEyedJack) {
        possibleMoves.push({
          card: twoEyedJack,
          ...parseSlotKey(doubleThreatSlot),
          score: 47900,
          reason: "Block Opponent's Winning Trap with Jack",
        });
      }
    }
  }

  for (const sequence of SEQUENCE_MAP) {
    const analysis = analyzeSequence(
      sequence,
      boardState,
      botTeamId,
      opponentTeamIds,
      lockedChips
    );
    if (
      analysis.myChips === 4 &&
      analysis.myLockedChips < 2 &&
      analysis.emptySlots.length === 1
    ) {
      const winningSlot = analysis.emptySlots[0];
      if (hand.includes(winningSlot.card)) {
        return {
          card: winningSlot.card,
          ...parseSlotKey(winningSlot.slotKey),
          score: 50000,
          reason: "Complete Sequence",
        };
      }
      if (twoEyedJack) {
        possibleMoves.push({
          card: twoEyedJack,
          ...parseSlotKey(winningSlot.slotKey),
          score: 49900,
          reason: "Complete Sequence with Jack",
        });
      }
    }
    for (const opponentId in analysis.opponentChipCounts) {
      if (
        analysis.opponentChipCounts[opponentId] === 4 &&
        analysis.emptySlots.length === 1
      ) {
        const blockingSlot = analysis.emptySlots[0];
        const cardNeededToBlock = blockingSlot.card;
        if (hand.includes(cardNeededToBlock)) {
          possibleMoves.push({
            card: cardNeededToBlock,
            ...parseSlotKey(blockingSlot.slotKey),
            score: 40000,
            reason: "Block Opponent",
          });
        }
        if (twoEyedJack) {
          const cardsInPlay = getCardsInPlay(gameData);
          let neededCardsOut = 0;
          if (cardsInPlay.has(cardNeededToBlock)) {
            neededCardsOut = Array.from(cardsInPlay.values()).filter(
              (c) => c === cardNeededToBlock
            ).length;
          }
          const probability =
            deckSize > 0 ? (2 - neededCardsOut) / deckSize : 0;
          const jackScore = 39900 * (1 - probability);
          possibleMoves.push({
            card: twoEyedJack,
            ...parseSlotKey(blockingSlot.slotKey),
            score: jackScore,
            reason: "Block Opponent with Jack (prob-adjusted)",
          });
        }
      }
    }
  }

  const nonJackHand = hand.filter((c) => !c.includes("J"));
  for (const card of nonJackHand) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] === card && !boardState[`${r}_${c}`]) {
          const tempBoard = { ...boardState, [`${r}_${c}`]: botTeamId };
          const newSequences = findAllValidNewSequences(
            tempBoard,
            lockedChips,
            r,
            c,
            botTeamId
          );
          if (newSequences.length >= 2) {
            possibleMoves.push({
              card,
              row: r,
              col: c,
              slotKey: `${r}_${c}`,
              score: 45000,
              reason: "Create a winning trap",
            });
          }
        }
      }
    }
  }

  for (const card of nonJackHand) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const slotKey = `${r}_${c}`;
        if (BOARD_LAYOUT[r][c] === card && !boardState[slotKey]) {
          let myMoveScore = evaluatePositionWithHandPotential(
            r,
            c,
            botTeamId,
            boardState,
            hand
          );

          const overlappingSequences = SEQUENCE_MAP.filter(
            (seq) =>
              seq.includes(slotKey) &&
              seq.some((s) => boardState[s] === botTeamId)
          );
          if (overlappingSequences.length >= 2) {
            myMoveScore += overlappingSequences.length * 20;
          }

          if (gamePhase === "opening") {
            myMoveScore += POSITIONAL_WEIGHT_MAP[r][c] * 2;
          } else if (gamePhase === "endgame" && myMoveScore > 50) {
            myMoveScore *= 1.5;
          }

          const cardPotential = evaluateCardPotential(card, boardState);
          if (myMoveScore < 50 && cardPotential > 10) {
            myMoveScore -= cardPotential * 0.5;
          }

          if (playerIsAggressive) {
            const opponentTeamId = opponentTeamIds[0];
            if (
              opponentTeamId &&
              evaluatePosition(r, c, opponentTeamId, boardState) >= 4
            )
              myMoveScore *= 1.15;
          }
          if (playerFavorsCenter && r >= 3 && r <= 6 && c >= 3 && c <= 6) {
            myMoveScore *= 1.1;
          }

          const simulatedGameData = JSON.parse(JSON.stringify(gameData));
          simulatedGameData.boardState[slotKey] = botTeamId;
          const humanPlayer = simulatedGameData.players["player1"];
          const opponentBestMove = getBestOpponentResponse(
            simulatedGameData,
            humanPlayer
          );
          let opponentResponseScore = opponentBestMove
            ? opponentBestMove.score
            : 0;
          if (opponentResponseScore > 10000) opponentResponseScore = 1500;

          let memoryBonus = 0;
          if (botIntentions[botPlayer.id]) {
            const intendedLine = botIntentions[botPlayer.id].line;
            if (intendedLine && intendedLine.includes(slotKey)) {
              memoryBonus = 50;
            }
          }

          const finalScore = myMoveScore - opponentResponseScore + memoryBonus;
          possibleMoves.push({
            card,
            row: r,
            col: c,
            slotKey,
            score: finalScore,
            reason: "Predictive Placement",
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
        lockedChips
      );
      const totalOpponentChips = Object.values(
        analysis.opponentChipCounts
      ).reduce((a, b) => a + b, 0);
      if (
        analysis.myChips === 4 &&
        analysis.myLockedChips < 2 &&
        totalOpponentChips === 1
      ) {
        const opponentSlotKey = Object.values(analysis.opponentSlots).flat()[0];
        if (opponentSlotKey && !lockedChips[opponentSlotKey]) {
          possibleMoves.push({
            card: oneEyedJack,
            isRemoval: true,
            ...parseSlotKey(opponentSlotKey),
            score: 35000,
            reason: "Remove blocker to set up win",
          });
        }
      }
      for (const opponentId in analysis.opponentChipCounts) {
        if (analysis.opponentChipCounts[opponentId] === 4) {
          const isInternallyBlocked =
            analysis.myChips > 0 ||
            Object.keys(analysis.opponentChipCounts).length > 1;
          if (!isInternallyBlocked) {
            const opponentSlotsForThisTeam =
              analysis.opponentSlots[opponentId] || [];
            for (const opponentSlotKey of opponentSlotsForThisTeam) {
              if (!lockedChips[opponentSlotKey]) {
                possibleMoves.push({
                  card: oneEyedJack,
                  isRemoval: true,
                  ...parseSlotKey(opponentSlotKey),
                  score: 38000,
                  reason: `Remove chip from a 4-chip threat`,
                });
              }
            }
          }
        }
      }
    }
  }

  if (possibleMoves.length > 0) {
    possibleMoves.sort((a, b) => b.score - a.score);
    return possibleMoves[0];
  }

  return getRandomMove(gameData, botPlayer);
}

function parseSlotKey(slotKey) {
  const [row, col] = slotKey.split("_").map(Number);
  return { row, col, slotKey };
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
  let modalHtml =
    '<div style="display: flex; flex-direction: column; gap: 15px;">';

  const createSelect = (id, label) =>
    `<div class="swal2-input-container">
            <label class="swal2-label">${label}:</label>
            <select id="${id}" class="swal2-select">
                ${Object.entries(coresDisponiveis)
                  .map(
                    ([value, name]) =>
                      `<option value="${value}">${name}</option>`
                  )
                  .join("")}
            </select>
        </div>`;

  const userLabel = isTeamGame ? "Cor da sua equipe" : "Cor das suas fichas";
  modalHtml += createSelect("user-color-select", userLabel);

  if (numTeams === 2) {
    const botLabel = isTeamGame
      ? "Cor da Equipe de Bots"
      : "Cor das fichas do Bot";
    modalHtml += createSelect("bot-color-select", botLabel);
  }

  modalHtml += "</div>";

  Swal.fire({
    title: "Escolha as Cores",
    html: modalHtml,
    showCancelButton: true,
    confirmButtonText: "<i class='fas fa-play'></i> Jogar",
    cancelButtonText: "<i class='fas fa-times'></i> Cancelar",
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
          Swal.showValidationMessage("As cores devem ser diferentes.");
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
  const availableBotNames = BOT_NAMES.filter(
    (name) => name.toLowerCase() !== myPlayerName.toLowerCase()
  );
  const shuffledNames = availableBotNames.sort(() => 0.5 - Math.random());
  const botNames = shuffledNames.slice(0, playerCount - 1);

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
    players[`player${i}`] = {
      id: `player${i}`,
      name: botNames[i - 2],
      hand: [],
      online: true,
      isBot: true,
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
    const availableColors = Object.keys(coresDisponiveis);
    botTeamColors = availableColors.filter(
      (color) => color !== chosenColors.user
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
    a.id.localeCompare(b.id)
  );

  for (let i = 0; i < maxMembersPerTeam; i++) {
    sortedTeams.forEach((team) => {
      if (team.members[i]) turnOrder.push(team.members[i]);
    });
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
    gameMessage: `O jogo começou! Vez de ${players[turnOrder[0]].name}.`,
  };

  myTeamId = localGameData.players[myPlayerId].teamId;

  saveLocalGame();
  window.history.pushState({}, "Sequence Local", "?game=local");

  setupGameUI("local");
  $(".ai-info-btn").show();
  renderAll(localGameData);
  checkNextTurn();
}

$("#start-practice-btn").on("click", function () {
  const savedGameData = localStorage.getItem(LOCAL_GAME_KEY);

  const startNewGameFlow = (newGame = false) => {
    isLocalGame = true;
    myPlayerName = $("#player-name-input").val().trim() || "Jogador 1";

    const gameModeValue = $("#player-count-select").val();
    if (!gameModeValue || gameModeValue === "0") {
      return showToast("Selecione o modo de jogo.", {
        title: "Oops...",
        icon: "warning",
      });
    }

    botDifficulty = $("#difficulty-select").val();
    if (!botDifficulty || botDifficulty === "0") {
      return showToast("Selecione a dificuldade.", {
        title: "Oops...",
        icon: "warning",
      });
    }

    const gameMode = gameModeValue.split(".");
    const playerCount = parseInt(gameMode[0]);
    const numTeams = parseInt(gameMode[1]);
    promptColorSelection(playerCount, numTeams, newGame);
  };

  if (savedGameData) {
    Swal.fire({
      title: "Jogo em andamento encontrado",
      html: "Há um jogo salvo em andamento.<br>Deseja <b>excluí-lo</b> e iniciar um novo?",
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "<i class='fas fa-rotate-right'></i> Novo jogo",
      denyButtonText: "<i class='fas fa-play'></i> Continuar jogo salvo</i>",
      cancelButtonText: "<i class='fas fa-times'></i> Cancelar",
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

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("game") === "local") {
  loadAndResumeLocalGame();
}

checkExistingLocalGame();
