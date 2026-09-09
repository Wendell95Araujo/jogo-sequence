function getChipSize() {
  return parseInt(getComputedStyle(document.body).getPropertyValue('--chip-size')) || 20;
}

function animarFichaParaTabuleiro(fichaOrigem, elementoDestino, corTime, callback) {
  if (!fichaOrigem || !elementoDestino || !isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  animarFichaFallback(fichaOrigem, elementoDestino, corTime, callback);
}

function animarFichaFallback(fichaOrigem, elementoDestino, corTime, callback) {
  const rectOrigem = fichaOrigem.getBoundingClientRect();
  const rectDestino = elementoDestino.getBoundingClientRect();

  const fantasma = document.createElement('div');
  fantasma.className = `chip chip-${corTime}`;

  const dx = rectDestino.left - rectOrigem.left;
  const dy = rectDestino.top - rectOrigem.top;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.min(0.9, Math.max(0.5, dist / 600));

  Object.assign(fantasma.style, {
    position: 'fixed',
    top: `${rectOrigem.top}px`,
    left: `${rectOrigem.left}px`,
    transform: 'none',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: `all ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`
  });

  document.body.appendChild(fantasma);
  fichaOrigem.style.opacity = '0';

  requestAnimationFrame(() => {
    const chipSize = getChipSize();
    const diffX = rectDestino.left - rectOrigem.left + (rectDestino.width - chipSize) / 2;
    const diffY = rectDestino.top - rectOrigem.top + (rectDestino.height - chipSize) / 2;
    fantasma.style.transform = `translate(${diffX}px, ${diffY}px)`;
    fantasma.style.opacity = '0.9';
  });

  const cleanup = () => {
    if (document.body.contains(fantasma)) fantasma.remove();
    fichaOrigem.style.opacity = '';
    if (callback) callback();
  };

  fantasma.addEventListener('transitionend', cleanup, { once: true });
  setTimeout(() => {
    if (document.body.contains(fantasma)) cleanup();
  }, (duration * 1000) + 100);
}


function efeitoExplosao(cores, bursts = 3) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
  document.body.appendChild(container);

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let burst = 0; burst < bursts; burst++) {
    setTimeout(() => {
      const bx = cx + (Math.random() - 0.5) * window.innerWidth * 0.4;
      const by = cy + (Math.random() - 0.5) * window.innerHeight * 0.3;
      const numParticles = 30 + Math.floor(Math.random() * 15);

      for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.3;
        const distance = 80 + Math.random() * 130;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const size = Math.random() * 6 + 3;
        const color = cores[Math.floor(Math.random() * cores.length)];
        const duration = 1.2 + Math.random() * 0.5;

        particle.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${size}px;height:${size}px;background:${color};border-radius:50%;box-shadow:0 0 6px ${color};opacity:1;transition:transform ${duration}s cubic-bezier(0.1, 0.4, 0.3, 1), opacity ${duration * 0.8}s ease-in ${duration * 0.3}s;`;
        container.appendChild(particle);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            particle.style.transform = `translate(${tx}px, ${ty}px)`;
            particle.style.opacity = '0';
          });
        });

        setTimeout(() => particle.remove(), duration * 3000 + 500);
      }
    }, burst * 700);
  }

  setTimeout(() => container.remove(), bursts * 700 + 2500);
}

function efeitoChuva(duracao = 5000) {
  const rainContainer = document.createElement('div');
  rainContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
  rainContainer.classList.add('rain-container');
  document.body.appendChild(rainContainer);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);pointer-events:none;z-index:99998;transition:opacity 1s;opacity:0;';
  overlay.classList.add('rain-overlay');
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { requestAnimationFrame(() => { overlay.style.opacity = '1'; }); });

  const interval = setInterval(() => {
    for (let i = 0; i < 8; i++) {
      const drop = document.createElement('div');
      const width = Math.random() * 2 + 2.5;
      const height = Math.random() * 20 + 15;
      drop.style.cssText = `position:absolute;top:-30px;left:${Math.random() * 100}%;width:${width}px;height:${height}px;background:linear-gradient(transparent, rgba(174,194,224,0.8));border-radius:0 0 2px 2px;animation:rainDrop ${Math.random() * 0.5 + 0.9}s linear forwards;`;
      rainContainer.appendChild(drop);
      drop.addEventListener('animationend', () => drop.remove());
    }
  }, 40);

  const splashInterval = setInterval(() => {
    const splash = document.createElement('div');
    const size = Math.random() * 12 + 6;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    splash.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${size}px;height:${size * 0.6}px;border-radius:50%;background:radial-gradient(ellipse, rgba(174,194,224,0.4) 0%, rgba(174,194,224,0.15) 50%, transparent 70%);border:1px solid rgba(174,194,224,0.3);opacity:0;animation:splashAppear 1.8s ease-out forwards;`;
    rainContainer.appendChild(splash);
    setTimeout(() => splash.remove(), 2000);
  }, 150);

  rainContainer.dataset.intervalId = interval;
  rainContainer.dataset.splashIntervalId = splashInterval;

  setTimeout(() => {
    clearInterval(interval);
    clearInterval(splashInterval);
    overlay.style.opacity = '0';
    setTimeout(() => {
      rainContainer.remove();
      overlay.remove();
    }, 2000);
  }, duracao);
}

function celebrarSequencia(elementosFichas, useDelay = true) {
  const teamColor = myTeamId ? (getTeamColor(myTeamId) || 'blue') : 'blue';
  const coresMap = {
    blue: ['#FFD700', '#FFC107', '#FFEB3B', '#2196F3', '#64B5F6', '#FFD700', '#F9A825'],
    red: ['#FFD700', '#FFC107', '#FFEB3B', '#f44336', '#ef5350', '#FFD700', '#F9A825'],
    green: ['#FFD700', '#FFC107', '#FFEB3B', '#4CAF50', '#66BB6A', '#FFD700', '#F9A825']
  };
  const cores = coresMap[teamColor] || coresMap.blue;

  if (elementosFichas && elementosFichas.length > 0) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    const chipData = [];
    elementosFichas.forEach((chip) => {
      if (!chip) return;
      const slot = chip.closest && chip.closest('.card-slot');
      const isCanto = slot && 
        ((slot.dataset.row === '0' || slot.dataset.row === '9') &&
         (slot.dataset.col === '0' || slot.dataset.col === '9'));
      if (isCanto) return;
      const rect = chip.getBoundingClientRect();
      chipData.push({ chip, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 });
    });

    chipData.forEach((data, i) => {
      setTimeout(() => {
        const { chip, cx, cy } = data;
        const numParticles = 20;

        for (let p = 0; p < numParticles; p++) {
          const particle = document.createElement('div');
          const angle = (Math.PI * 2 * p) / numParticles + (Math.random() - 0.5) * 0.4;
          const distance = 40 + Math.random() * 55;
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance;
          const size = Math.random() * 5 + 3;
          const color = cores[Math.floor(Math.random() * cores.length)];

          particle.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};border-radius:50%;box-shadow:0 0 6px ${color};opacity:1;transition:transform 1s cubic-bezier(0.1, 0.4, 0.3, 1), opacity 0.8s ease-in 0.3s;`;
          container.appendChild(particle);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              particle.style.transform = `translate(${tx}px, ${ty}px)`;
              particle.style.opacity = '0';
            });
          });

          setTimeout(() => particle.remove(), 1400);
        }

        chip.classList.add('locked');
      }, useDelay ? i * 250 : 0);
    });

    const totalTime = useDelay ? chipData.length * 250 + 1500 : 1500;
    setTimeout(() => container.remove(), totalTime);
  } else {
    efeitoExplosao(cores, 5);
  }
}


function celebrarVitoria(corTime) {
  const coresMap = {
    blue: ['#2196F3', '#64B5F6', '#1565C0', '#BBDEFB', '#FFD700'],
    red: ['#f44336', '#ef5350', '#c62828', '#FFCDD2', '#FFD700'],
    green: ['#4CAF50', '#66BB6A', '#2E7D32', '#C8E6C9', '#FFD700']
  };
  const cores = coresMap[corTime] || coresMap.blue;
  efeitoExplosao(cores, 3);
  setTimeout(() => iniciarChuvaConfetes(cores, 'confetti-vitoria'), 800);
}

function animarReembaralhar(deckSizeFinal, callback) {
  if (!isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  const discard = document.getElementById('discard-pile');
  const deck = document.getElementById('deck-pile');
  if (!discard || !deck) {
    if (callback) callback();
    return;
  }

  const rectDiscard = discard.getBoundingClientRect();
  const rectDeck = deck.getBoundingClientRect();
  const numCartas = 8;
  const delay = 100;

  let animadas = 0;

  for (let i = 0; i < numCartas; i++) {
    setTimeout(() => {
      const carta = document.createElement('div');
      Object.assign(carta.style, {
        position: 'fixed',
        top: `${rectDiscard.top}px`,
        left: `${rectDiscard.left}px`,
        width: `${rectDiscard.width}px`,
        height: `${rectDiscard.height}px`,
        zIndex: `${9990 - i}`,
        pointerEvents: 'none',
        transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        border: '2px solid white',
        borderRadius: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '1'
      });
      carta.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:7px;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:1px 3px;border-radius:3px;">ROW 5</span>`;

      document.body.appendChild(carta);

      requestAnimationFrame(() => {
        carta.style.top = `${rectDeck.top}px`;
        carta.style.left = `${rectDeck.left}px`;
        carta.style.width = `${rectDeck.width}px`;
        carta.style.height = `${rectDeck.height}px`;
      });

      const progress = (i + 1) / numCartas;
      const simulatedDeck = Math.round(progress * deckSizeFinal);
      if (typeof atualizarEspessuraDeck === 'function') {
        atualizarEspessuraDeck(simulatedDeck, 2);
      }

      const onDone = () => {
        carta.remove();
        animadas++;
        if (animadas === numCartas) {
          if (typeof atualizarEspessuraDeck === 'function') {
            atualizarEspessuraDeck(deckSizeFinal, 2);
          }
          if (callback) callback();
        }
      };

      carta.addEventListener('transitionend', onDone, { once: true });
      setTimeout(() => { if (document.body.contains(carta)) onDone(); }, 600);
    }, i * delay);
  }
}

function iniciarChuvaConfetes(cores, containerId) {
  pararChuvaConfetes(containerId);

  const container = document.createElement('div');
  container.className = 'confetti-container';
  container.id = containerId;
  document.body.appendChild(container);

  const interval = setInterval(() => {
    for (let i = 0; i < 4; i++) {
      const confete = document.createElement('div');
      confete.className = 'confete';
      confete.style.left = `${Math.random() * 100}vw`;
      confete.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
      confete.style.animationDuration = `${Math.random() * 2 + 2}s`;
      confete.style.animationDelay = `${Math.random() * 0.3}s`;

      const shapes = ['50%', '2px', '0'];
      confete.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
      confete.style.width = `${Math.random() * 8 + 5}px`;
      confete.style.height = `${Math.random() * 12 + 5}px`;

      container.appendChild(confete);
      confete.addEventListener('animationend', () => confete.remove());
    }
  }, 120);

  container.dataset.intervalId = interval;

  setTimeout(() => pararChuvaConfetes(containerId), 6000);
}

function pararChuvaConfetes(containerId) {
  const container = document.getElementById(containerId || 'confetti-vitoria');
  if (container) {
    clearInterval(Number(container.dataset.intervalId));
    const maxDuration = 4500;
    setTimeout(() => container.remove(), maxDuration);
  }
}

function pararTodasAnimacoesFade() {
  const selectors = ['.confetti-container', '.rain-container', '.rain-overlay', '[style*="pointer-events:none"][style*="z-index:99999"]', '[style*="pointer-events:none"][style*="z-index:99998"]'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.intervalId) clearInterval(Number(el.dataset.intervalId));
      if (el.dataset.splashIntervalId) clearInterval(Number(el.dataset.splashIntervalId));
      el.style.transition = 'opacity 0.35s ease-out';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    });
  });
}


function celebrarDerrota() {
  const gameContainer = document.getElementById('game-container') || document.body;
  gameContainer.classList.add('shake-defeat');
  setTimeout(() => gameContainer.classList.remove('shake-defeat'), 450);
  efeitoChuva();
}


function celebrarEmpate() {
  const coresEmpate = ['#9E9E9E', '#757575', '#BDBDBD', '#616161', '#E0E0E0'];
  iniciarChuvaConfetes(coresEmpate, 'confetti-empate');
}


function dispararCelebracao(resultado, corTime, elementosSequencia, useDelay = true, shake = false) {
  if (!isAnimationsEnabled()) return;

  if (shake) {
    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.classList.add('shake-defeat');
    setTimeout(() => gameContainer.classList.remove('shake-defeat'), 450);
  }

  if (resultado === 'sequencia' && elementosSequencia) {
    celebrarSequencia(elementosSequencia, useDelay);
  } else if (resultado === 'win') {
    celebrarVitoria(corTime);
  } else if (resultado === 'loss') {
    celebrarDerrota();
  } else if (resultado === 'draw') {
    celebrarEmpate();
  }
}


let chipStackCount = 5;

const CHIP_STACK_STORAGE_KEY = "sequenceChipStackCount";

function initChipStack(teamColor, isNewGame) {
  const stack = document.getElementById('chip-stack');
  if (!stack) return;

  const colorClass = `team-${teamColor}`;
  const fichas = stack.querySelectorAll('.ficha-stack');
  fichas.forEach((f) => {
    f.className = 'ficha-stack ' + colorClass;
    f.style.display = '';
  });

  if (isNewGame) {
    chipStackCount = 5;
  } else {
    const saved = parseInt(localStorage.getItem(CHIP_STACK_STORAGE_KEY));
    chipStackCount = (saved > 0 && saved <= 5) ? saved : 5;
  }

  const fichasArr = Array.from(fichas);
  for (let i = fichasArr.length - 1; i >= chipStackCount; i--) {
    fichasArr[i].style.display = 'none';
  }

  if (isAnimationsEnabled()) {
    const visiveis = fichasArr.filter((f) => f.style.display !== 'none');
    visiveis.forEach((f) => { f.style.transform = 'scale(0)'; });
  }

  salvarChipStackCount();
  stack.style.display = '';
}

function animarRecolherFichas(callback) {
  if (!isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  const chipElements = document.querySelectorAll('.card-slot .chip');
  if (chipElements.length === 0) {
    if (callback) callback();
    return;
  }

  const chips = Array.from(chipElements);
  const delay = Math.max(30, Math.min(80, 2000 / chips.length));
  let removed = 0;

  chips.forEach((chip, i) => {
    setTimeout(() => {
      chip.style.transition = "transform 0.2s, opacity 0.2s";
      chip.style.transform = "scale(0)";
      chip.style.opacity = "0";
      setTimeout(() => chip.remove(), 200);
      removed++;
      if (removed === chips.length && callback) {
        setTimeout(callback, 300);
      }
    }, i * delay);
  });
}

function animarMontarPilha(delayInicial) {
  if (!isAnimationsEnabled()) return;
  const stack = document.getElementById('chip-stack');
  if (!stack) return;

  const fichas = Array.from(stack.querySelectorAll('.ficha-stack'));
  const visiveis = fichas.filter((f) => f.style.display !== 'none');

  visiveis.forEach((f, i) => {
    setTimeout(() => {
      f.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
      f.style.transform = 'scale(1)';
      setTimeout(() => { f.style.transition = ''; }, 300);
    }, (delayInicial || 0) + (i * 80));
  });
}

function salvarChipStackCount() {
  if (typeof isLocalGame !== 'undefined' && isLocalGame) {
    try { localStorage.setItem(CHIP_STACK_STORAGE_KEY, chipStackCount.toString()); } catch(e) {}
  }
}

function removerFichaDaPilha() {
  const stack = document.getElementById('chip-stack');
  if (!stack) return;

  const fichas = Array.from(stack.querySelectorAll('.ficha-stack'));
  const visiveis = fichas.filter((f) => f.style.display !== 'none');

  if (visiveis.length > 0) {
    visiveis[visiveis.length - 1].style.display = 'none';
    chipStackCount--;
  }

  if (chipStackCount <= 0) {
    reabastecerPilha();
  }
  salvarChipStackCount();
}

function reabastecerPilha() {
  const stack = document.getElementById('chip-stack');
  if (!stack) return;

  const fichas = stack.querySelectorAll('.ficha-stack');
  chipStackCount = 5;

  fichas.forEach((f, i) => {
    f.style.display = '';
    f.style.transform = 'scale(0)';
    f.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      f.style.transform = 'scale(1)';
    }, i * 80);
  });
  salvarChipStackCount();
}

function animarJogadaComPilha(slotDestino, teamColor, callback) {
  const stack = document.getElementById('chip-stack');
  if (!stack || stack.style.display === 'none') {
    if (callback) callback();
    return;
  }

  const fichas = Array.from(stack.querySelectorAll('.ficha-stack'));
  const visiveis = fichas.filter((f) => f.style.display !== 'none');
  const fichaOrigem = visiveis.length > 0 ? visiveis[visiveis.length - 1] : null;

  if (!fichaOrigem || !slotDestino) {
    removerFichaDaPilha();
    if (callback) callback();
    return;
  }

  slotDestino.setAttribute('data-animating', 'true');

  animarFichaParaTabuleiro(fichaOrigem, slotDestino, teamColor, () => {
    removerFichaDaPilha();
    slotDestino.removeAttribute('data-animating');
    if (callback) callback();
  });
}


function detectarNovaFicha(oldBoard, newBoard) {
  for (const key in newBoard) {
    if (newBoard[key] && newBoard[key] !== "F" && !oldBoard[key]) {
      const [row, col] = key.split("_").map(Number);
      return { row, col, teamId: newBoard[key], tipo: 'add' };
    }
  }
  return null;
}

function detectarFichaRemovida(oldBoard, newBoard) {
  for (const key in oldBoard) {
    if (oldBoard[key] && oldBoard[key] !== "F" && !newBoard[key]) {
      const [row, col] = key.split("_").map(Number);
      return { row, col, teamId: oldBoard[key], tipo: 'remove' };
    }
  }
  return null;
}


function animarDevolucaoParaPilha(slotOrigem, teamColor, callback) {
  const stack = document.getElementById('chip-stack');
  if (!slotOrigem || !stack || stack.style.display === 'none' || !isAnimationsEnabled()) {
    if (typeof callback === 'function') callback();
    return;
  }

  const corMap = { blue: '#2980b9', red: '#e53935', green: '#27ae60' };
  const borderMap = { blue: '#1c4e7a', red: '#8e1b1b', green: '#1e6b3c' };
  const rectOrigem = slotOrigem.getBoundingClientRect();

  const fichas = Array.from(stack.querySelectorAll('.ficha-stack'));
  const ocultas = fichas.filter((f) => f.style.display === 'none');

  let fichaAlvo;
  if (ocultas.length > 0) {
    fichaAlvo = ocultas[0];
    fichaAlvo.style.display = '';
    fichaAlvo.style.opacity = '0';
  } else {
    const index = fichas.length;
    const bottomOffset = index * 5;
    const leftOffsets = [5, 6, 4, 6, 5];
    const leftOffset = leftOffsets[index % leftOffsets.length];

    fichaAlvo = document.createElement('div');
    fichaAlvo.className = fichas.length > 0 ? fichas[0].className : 'ficha-stack';
    fichaAlvo.style.bottom = `${bottomOffset}px`;
    fichaAlvo.style.left = `${leftOffset}px`;
    fichaAlvo.style.opacity = '0';
    stack.appendChild(fichaAlvo);
  }

  const rectAlvo = fichaAlvo.getBoundingClientRect();

  const chipReal = slotOrigem.querySelector('.chip');
  if (chipReal) chipReal.style.opacity = '0';

  const fantasma = document.createElement('div');
  const chipSize = getChipSize();

  const dx = rectAlvo.left - rectOrigem.left;
  const dy = rectAlvo.top - rectOrigem.top;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.min(0.9, Math.max(0.5, dist / 600));

  fantasma.className = `chip chip-${teamColor}`;
  Object.assign(fantasma.style, {
    position: 'fixed',
    top: `${rectOrigem.top + rectOrigem.height / 2 - chipSize / 2}px`,
    left: `${rectOrigem.left + rectOrigem.width / 2 - chipSize / 2}px`,
    transform: 'none',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: `all ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`,
    opacity: '0.9'
  });

  document.body.appendChild(fantasma);

  requestAnimationFrame(() => {
    fantasma.style.top = `${rectAlvo.top + rectAlvo.height / 2 - chipSize / 2}px`;
    fantasma.style.left = `${rectAlvo.left + rectAlvo.width / 2 - chipSize / 2}px`;
  });

  const finalize = () => {
    fantasma.remove();
    fichaAlvo.style.opacity = '';
    chipStackCount++;
    salvarChipStackCount();
    if (typeof callback === 'function') callback();
  };

  fantasma.addEventListener('transitionend', finalize, { once: true });
  setTimeout(() => {
    if (document.body.contains(fantasma)) finalize();
  }, (duration * 1000) + 100);
}

function adicionarFichaNaPilha() {
  const stack = document.getElementById('chip-stack');
  if (!stack) return;

  const fichas = Array.from(stack.querySelectorAll('.ficha-stack'));
  const ocultas = fichas.filter((f) => f.style.display === 'none');

  let ficha;
  if (ocultas.length > 0) {
    ficha = ocultas[0];
    ficha.style.display = '';
  } else {
    const index = fichas.length;
    const bottomOffset = index * 5;
    const leftOffsets = [5, 6, 4, 6, 5];
    const leftOffset = leftOffsets[index % leftOffsets.length];

    ficha = document.createElement('div');
    ficha.className = fichas.length > 0 ? fichas[0].className : 'ficha-stack';
    ficha.style.bottom = `${bottomOffset}px`;
    ficha.style.left = `${leftOffset}px`;
    stack.appendChild(ficha);
  }

  chipStackCount++;
  salvarChipStackCount();
}


function detectarPosicaoMinhaMao() {
  const container = document.getElementById('game-container');
  if (!container) return 'bottom';

  const style = window.getComputedStyle(container);
  const direction = style.flexDirection;
  const playerInfo = document.getElementById('player-info');

  if (direction === 'column-reverse') return 'top';
  if (direction === 'column') return 'bottom';

  if (playerInfo) {
    const rect = playerInfo.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (rect.left < containerRect.left + containerRect.width / 2) return 'left';
  }
  return 'right';
}

function getDirecoesDisponiveis(minhaPosicao) {
  const todas = ['bottom', 'left', 'top', 'right'];
  const meuIndex = todas.indexOf(minhaPosicao);
  const disponiveis = [];
  for (let i = 1; i < 4; i++) {
    disponiveis.push(todas[(meuIndex + i) % 4]);
  }
  return disponiveis;
}

function getPosicaoParaJogador(playerIndex, myIndex, totalPlayers, numTeams, playerTeamId, myTeamIdLocal) {
  const minhaPosicao = detectarPosicaoMinhaMao();

  if (totalPlayers === 4 && numTeams === 2 && playerTeamId === myTeamIdLocal) {
    const direcoes = getDirecoesDisponiveis(minhaPosicao);
    return direcoes[1];
  }

  const outrosCount = totalPlayers - 1;
  let relativePos = (playerIndex - myIndex + totalPlayers) % totalPlayers;

  const posicoes = gerarPosicoesMesa(minhaPosicao, outrosCount);
  return posicoes[relativePos - 1] || 'top';
}

function gerarPosicoesMesa(minhaPosicao, outrosCount) {
  const todas = ['bottom', 'left', 'top', 'right'];
  const meuIdx = todas.indexOf(minhaPosicao);

  const B = minhaPosicao;
  const L = todas[(meuIdx + 1) % 4];
  const T = todas[(meuIdx + 2) % 4];
  const R = todas[(meuIdx + 3) % 4];

  const mapas = {
    1:  [T],
    2:  [L, R],
    3:  [L, T, R],
    5:  [L, L, T, R, R],
    7:  [L, L, L, T, T, R, R],
    8:  [L, L, L, T, T, T, R, R],
    9:  [L, L, L, T, T, T, R, R, R],
    11: [B, L, L, L, T, T, T, R, R, R, B],
  };

  return mapas[outrosCount] || mapas[11].slice(0, outrosCount);
}

function getPosicaoParaEspectador(playerIndex, totalPlayers) {
  const posicoesMesa = gerarPosicoesMesa('bottom', totalPlayers);
  return posicoesMesa[playerIndex] || 'top';
}

function getOrigemPorDirecao(direcao, rectDestino, subIndex, totalNoLado) {
  const sub = subIndex || 0;
  const total = totalNoLado || 1;

  const minhaPosicao = typeof detectarPosicaoMinhaMao === 'function' ? detectarPosicaoMinhaMao() : 'bottom';
  const isMyOwnSide = (direcao === minhaPosicao);
  const effectiveSub = isMyOwnSide && total > 1 ? (total - 1 - sub) : sub;

  let spread;
  if (total === 1) {
    spread = 0.5;
  } else if (total === 2) {
    spread = [0.3, 0.7][effectiveSub];
  } else {
    spread = [0.25, 0.5, 0.75][effectiveSub];
  }

  switch (direcao) {
    case 'top':
      return { x: window.innerWidth * spread, y: -20 };
    case 'bottom':
      return { x: window.innerWidth * (1 - spread), y: window.innerHeight + 20 };
    case 'left':
      return { x: -20, y: window.innerHeight * (1 - spread) };
    case 'right':
      return { x: window.innerWidth + 20, y: window.innerHeight * spread };
    default:
      return { x: window.innerWidth / 2, y: -20 };
  }
}

function getSubPosicao(playerIndex, myIndex, totalPlayers) {
  const outrosCount = totalPlayers - 1;
  const relativePos = (playerIndex - myIndex + totalPlayers) % totalPlayers;
  const minhaPosicao = detectarPosicaoMinhaMao();
  const posicoes = gerarPosicoesMesa(minhaPosicao, outrosCount);
  const direcao = posicoes[relativePos - 1];

  let subIndex = 0;
  let totalNoLado = 0;
  let countBefore = 0;

  for (let i = 0; i < posicoes.length; i++) {
    if (posicoes[i] === direcao) {
      totalNoLado++;
      if (i < relativePos - 1) countBefore++;
    }
  }
  subIndex = countBefore;

  return { subIndex, totalNoLado };
}

function animarFichaOponente(slotDestino, teamColor, teamId, numTeams, playerId, callback) {
  if (!slotDestino || !isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  slotDestino.setAttribute('data-animating', 'true');

  const corMap = { blue: '#2980b9', red: '#e53935', green: '#27ae60' };
  const borderMap = { blue: '#1c4e7a', red: '#8e1b1b', green: '#1e6b3c' };
  const rectDestino = slotDestino.getBoundingClientRect();

  let direcao = 'top';
  let subIdx = 0;
  let totalLado = 1;
  const gameData = (typeof isLocalGame !== 'undefined' && isLocalGame)
    ? (typeof localGameData !== 'undefined' ? localGameData : null)
    : (typeof currentGameDataState !== 'undefined' ? currentGameDataState : null);

  if (gameData && gameData.turnOrder) {
    const turnOrder = gameData.turnOrder;
    const myIdx = turnOrder.indexOf(myPlayerId);
    const playerIdx = playerId ? turnOrder.indexOf(playerId) : -1;

    if (myIdx >= 0 && playerIdx >= 0) {
      direcao = getPosicaoParaJogador(
        playerIdx, myIdx, turnOrder.length, numTeams, teamId, myTeamId
      );
      const sub = getSubPosicao(playerIdx, myIdx, turnOrder.length);
      subIdx = sub.subIndex;
      totalLado = sub.totalNoLado;
    } else {
      const minhaPosicao = detectarPosicaoMinhaMao();
      const direcoes = getDirecoesDisponiveis(minhaPosicao);
      direcao = direcoes[1];
    }
  }

  const origem = getOrigemPorDirecao(direcao, rectDestino, subIdx, totalLado);

  const fantasma = document.createElement('div');
  const chipSize = getChipSize();

  const dx = rectDestino.left - origem.x;
  const dy = rectDestino.top - origem.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.min(0.9, Math.max(0.5, dist / 600));

  fantasma.className = `chip chip-${teamColor}`;
  Object.assign(fantasma.style, {
    position: 'fixed',
    top: `${origem.y}px`,
    left: `${origem.x}px`,
    transform: 'none',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: `all ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`,
    opacity: '0.9'
  });

  document.body.appendChild(fantasma);

  requestAnimationFrame(() => {
    const destX = rectDestino.left + rectDestino.width / 2 - chipSize / 2;
    const destY = rectDestino.top + rectDestino.height / 2 - chipSize / 2;
    fantasma.style.top = `${destY}px`;
    fantasma.style.left = `${destX}px`;
    fantasma.style.opacity = '0.9';
  });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    fantasma.remove();
    slotDestino.removeAttribute('data-animating');
    if (callback) callback();
  };

  fantasma.addEventListener('transitionend', finish, { once: true });
  setTimeout(() => { if (!done) finish(); }, (duration * 1000) + 100);
}


function animarRemocaoFicha(slotOrigem, teamColor, teamId, numTeams, playerId, callback) {
  if (!slotOrigem || !isAnimationsEnabled()) {
    if (typeof callback === 'function') callback();
    return;
  }

  const corMap = { blue: '#2980b9', red: '#e53935', green: '#27ae60' };
  const borderMap = { blue: '#1c4e7a', red: '#8e1b1b', green: '#1e6b3c' };
  const rectOrigem = slotOrigem.getBoundingClientRect();

  let direcao = 'top';
  let subIdx = 0;
  let totalLado = 1;
  const gameData = (typeof isLocalGame !== 'undefined' && isLocalGame)
    ? (typeof localGameData !== 'undefined' ? localGameData : null)
    : (typeof currentGameDataState !== 'undefined' ? currentGameDataState : null);

  if (gameData && gameData.turnOrder) {
    const turnOrder = gameData.turnOrder;
    const myIdx = turnOrder.indexOf(myPlayerId);
    let ownerIdx = -1;
    if (playerId) {
      ownerIdx = turnOrder.indexOf(playerId);
    } else {
      const players = gameData.players || {};
      for (let i = 0; i < turnOrder.length; i++) {
        const p = players[turnOrder[i]];
        if (p && p.teamId === teamId && turnOrder[i] !== myPlayerId) {
          ownerIdx = i;
          break;
        }
      }
    }
    if (myIdx >= 0 && ownerIdx >= 0) {
      direcao = getPosicaoParaJogador(
        ownerIdx, myIdx, turnOrder.length, numTeams, teamId, myTeamId
      );
      const sub = getSubPosicao(ownerIdx, myIdx, turnOrder.length);
      subIdx = sub.subIndex;
      totalLado = sub.totalNoLado;
    } else {
      const minhaPosicao = detectarPosicaoMinhaMao();
      const direcoes = getDirecoesDisponiveis(minhaPosicao);
      direcao = direcoes[1];
    }
  }

  const destino = getOrigemPorDirecao(direcao, rectOrigem, subIdx, totalLado);

  const chipReal = slotOrigem.querySelector('.chip');
  if (chipReal) chipReal.style.opacity = '0';

  const fantasma = document.createElement('div');
  const chipSize = getChipSize();

  const dx = destino.x - rectOrigem.left;
  const dy = destino.y - rectOrigem.top;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.min(0.9, Math.max(0.5, dist / 600));

  fantasma.className = `chip chip-${teamColor}`;
  Object.assign(fantasma.style, {
    position: 'fixed',
    top: `${rectOrigem.top + rectOrigem.height / 2 - chipSize / 2}px`,
    left: `${rectOrigem.left + rectOrigem.width / 2 - chipSize / 2}px`,
    transform: 'none',
    boxShadow: '0 0 10px rgba(255, 0, 0, 0.4)',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: `all ${duration}s cubic-bezier(0.5, 0, 0.75, 0)`,
    opacity: '1'
  });

  document.body.appendChild(fantasma);

  let callbackFired = false;
  const fireCallback = () => {
    if (callbackFired) return;
    callbackFired = true;
    fantasma.remove();
    if (typeof callback === 'function') callback();
  };

  requestAnimationFrame(() => {
    fantasma.style.top = `${destino.y}px`;
    fantasma.style.left = `${destino.x}px`;
    fantasma.style.opacity = '0';
    fantasma.style.transform = 'scale(0.5)';
  });

  fantasma.addEventListener('transitionend', fireCallback, { once: true });

  setTimeout(() => {
    if (document.body.contains(fantasma)) fireCallback();
  }, (duration * 1000) + 100);
}

function animarDistribuicao(numCartas, totalCardsDealt, callback) {
  const deck = document.getElementById('deck-pile');
  const hand = document.getElementById('player-hand');
  if (!deck || !hand || !isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  const gameData = (typeof localGameData !== 'undefined') ? localGameData : null;
  if (!gameData || !gameData.turnOrder) {
    if (callback) callback();
    return;
  }

  const turnOrder = gameData.turnOrder;
  const totalPlayers = turnOrder.length;
  const numTeams = gameData.numTeams || 2;
  const myIdx = turnOrder.indexOf(typeof myPlayerId !== 'undefined' ? myPlayerId : 'player1');

  const cartasMao = hand.querySelectorAll('.card-in-hand');
  cartasMao.forEach(c => { c.style.opacity = '0'; c.style.transform = 'scale(0.8)'; });

  let deckVisual = 104;
  const delay = 130;

  const distribuicao = [];
  const cartasPorJogador = new Array(totalPlayers).fill(0);

  for (let round = 0; round < numCartas; round++) {
    for (let p = 0; p < totalPlayers; p++) {
      distribuicao.push({ playerIdx: p, cardIdx: cartasPorJogador[p] });
      cartasPorJogador[p]++;
    }
  }

  let animadas = 0;
  const totalAnimacoes = distribuicao.length;

  for (let i = 0; i < totalAnimacoes; i++) {
    const { playerIdx, cardIdx } = distribuicao[i];
    const isMe = (playerIdx === myIdx);

    setTimeout(() => {
      const rectDeck = deck.getBoundingClientRect();

      deckVisual--;
      if (typeof atualizarEspessuraDeck === 'function') {
        atualizarEspessuraDeck(deckVisual, totalPlayers);
      }

      let destTop, destLeft, destW, destH;

      if (isMe) {
        const cartaDestino = cartasMao[cardIdx];
        if (cartaDestino) {
          const rect = cartaDestino.getBoundingClientRect();
          destTop = rect.top;
          destLeft = rect.left;
          destW = rect.width;
          destH = rect.height;
        } else {
          const rectHand = hand.getBoundingClientRect();
          destTop = rectHand.top;
          destLeft = rectHand.left + (cardIdx * 35);
          destW = 30;
          destH = 50;
        }
      } else {
        const playerId = turnOrder[playerIdx];
        const player = gameData.players[playerId];
        const teamId = player ? player.teamId : 'team2';

        const direcao = (typeof getPosicaoParaJogador === 'function')
          ? getPosicaoParaJogador(playerIdx, myIdx, totalPlayers, numTeams, teamId, typeof myTeamId !== 'undefined' ? myTeamId : 'team1')
          : 'top';
        const sub = (typeof getSubPosicao === 'function')
          ? getSubPosicao(playerIdx, myIdx, totalPlayers)
          : { subIndex: 0, totalNoLado: 1 };
        const destino = (typeof getOrigemPorDirecao === 'function')
          ? getOrigemPorDirecao(direcao, null, sub.subIndex, sub.totalNoLado)
          : { x: window.innerWidth / 2, y: -30 };

        destTop = destino.y;
        destLeft = destino.x;
        destW = 30;
        destH = 45;
      }

      const dx = destLeft - rectDeck.left;
      const dy = destTop - rectDeck.top;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = Math.min(1.0, Math.max(0.45, dist / 700));

      const fantasma = document.createElement('div');
      Object.assign(fantasma.style, {
        position: 'fixed',
        top: `${rectDeck.top}px`,
        left: `${rectDeck.left}px`,
        width: `${rectDeck.width}px`,
        height: `${rectDeck.height}px`,
        zIndex: `${9990 - i}`,
        pointerEvents: 'none',
        transition: `all ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`,
        margin: '0',
        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        border: '2px solid white',
        borderRadius: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '1'
      });
      fantasma.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:6px;color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.4);padding:1px 2px;border-radius:2px;">ROW 5</span>`;

      document.body.appendChild(fantasma);

      requestAnimationFrame(() => {
        fantasma.style.top = `${destTop}px`;
        fantasma.style.left = `${destLeft}px`;
        fantasma.style.width = `${destW}px`;
        fantasma.style.height = `${destH}px`;
        fantasma.style.borderRadius = '5px';
        if (!isMe) {
          fantasma.style.opacity = '0.7';
          fantasma.style.transform = 'scale(0.7)';
        }
      });

      const onDone = () => {
        fantasma.remove();
        if (isMe) {
          const cartaDestino = cartasMao[cardIdx];
          if (cartaDestino) {
            cartaDestino.style.transition = 'opacity 0.2s, transform 0.2s';
            cartaDestino.style.opacity = '';
            cartaDestino.style.transform = '';
          }
        }
        animadas++;
        if (animadas === totalAnimacoes) {
          if (typeof atualizarEspessuraDeck === 'function') {
            atualizarEspessuraDeck(gameData.deck ? gameData.deck.length : 0, totalPlayers);
          }
          if (callback) callback();
        }
      };

      fantasma.addEventListener('transitionend', onDone, { once: true });
      setTimeout(() => { if (document.body.contains(fantasma)) onDone(); }, (duration * 1000) + 100);
    }, i * delay);
  }
}


function animarCompraCarta(cardCode, callback) {
  const deck = document.getElementById('deck-pile');
  const hand = document.getElementById('player-hand');
  if (!deck || !hand || !isAnimationsEnabled()) {
    if (callback) callback();
    return;
  }

  const rectDeck = deck.getBoundingClientRect();
  const existingCards = Array.from(hand.querySelectorAll('.card-in-hand'));

  const firstRects = new Map();
  existingCards.forEach(card => {
    firstRects.set(card, card.getBoundingClientRect());
  });

  const insertIndex = calcularPosicaoInsercao(cardCode, existingCards);

  const placeholder = document.createElement('div');
  placeholder.className = 'card-in-hand';
  placeholder.style.opacity = '0';
  placeholder.style.pointerEvents = 'none';
  placeholder.style.transition = 'none';

  if (insertIndex >= existingCards.length) {
    hand.appendChild(placeholder);
  } else {
    hand.insertBefore(placeholder, existingCards[insertIndex]);
  }

  const rectDestino = placeholder.getBoundingClientRect();

  existingCards.forEach(card => {
    const first = firstRects.get(card);
    const last = card.getBoundingClientRect();
    if (!first || !last) return;
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    card.style.transform = `translate(${dx}px, ${dy}px)`;
    card.style.transition = 'none';
  });

  requestAnimationFrame(() => {
    existingCards.forEach(card => {
      card.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
      card.style.transform = '';
    });
  });

  const carta = document.createElement('div');
  Object.assign(carta.style, {
    position: 'fixed',
    top: `${rectDeck.top}px`,
    left: `${rectDeck.left}px`,
    width: `${rectDeck.width}px`,
    height: `${rectDeck.height}px`,
    zIndex: '9998',
    pointerEvents: 'none',
    transition: 'all 0.75s cubic-bezier(0.25, 1, 0.5, 1)',
    margin: '0',
    borderRadius: '4px',
    backgroundColor: 'var(--card-background-color, #f4f6f8)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  });

  if (cardCode) {
    carta.classList.add('card-in-hand');
    let value = cardCode.slice(0, -1);
    if (value === 'T') value = '10';
    const suit = cardCode.slice(-1);
    const iconClass = (typeof suitIcons !== 'undefined' && suitIcons[suit]) || 'fa-spade';
    const colorClass = (typeof suitColors !== 'undefined' && suitColors[suit]) || 'suit-black';
    carta.innerHTML = `
      <span class="card-value ${colorClass}">${value}</span>
      <i class="far ${iconClass} card-suit ${colorClass}"></i>
    `;
  } else {
    Object.assign(carta.style, {
      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      border: '2px solid white',
      width: `${rectDeck.width}px`,
      height: `${rectDeck.height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    carta.className = '';
    carta.innerHTML = `<span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:7px;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:1px 3px;border-radius:3px;">ROW 5</span>`;
  }

  document.body.appendChild(carta);

  requestAnimationFrame(() => {
    carta.style.top = `${rectDestino.top}px`;
    carta.style.left = `${rectDestino.left}px`;
    carta.style.width = `${rectDestino.width}px`;
    carta.style.height = `${rectDestino.height}px`;
  });

  let resolved = false;
  const cleanup = () => {
    if (resolved) return;
    resolved = true;
    existingCards.forEach(card => {
      card.style.transition = '';
      card.style.transform = '';
    });
    if (callback) callback();
    if (document.body.contains(carta)) carta.remove();
    if (hand.contains(placeholder)) placeholder.remove();
  };

  carta.addEventListener('transitionend', cleanup, { once: true });
  setTimeout(() => { if (!resolved) cleanup(); }, 850);
}

function calcularPosicaoInsercao(cardCode, existingCards) {
  const suitOrder = { C: 1, D: 2, H: 3, S: 4 };
  const valueOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'Q': 12, 'K': 13, 'A': 14 };

  if (!cardCode) return existingCards.length;

  const newValue = cardCode.slice(0, -1);
  const newSuit = cardCode.slice(-1);
  const isNewJack = newValue === 'J';

  for (let i = 0; i < existingCards.length; i++) {
    const code = existingCards[i].getAttribute('data-card') || '';
    const existValue = code.slice(0, -1);
    const existSuit = code.slice(-1);
    const isExistJack = existValue === 'J';

    if (isNewJack && !isExistJack) continue;
    if (!isNewJack && isExistJack) return i;

    if (isNewJack && isExistJack) {
      if (cardCode.localeCompare(code) < 0) return i;
    } else {
      const suitComp = (suitOrder[newSuit] || 0) - (suitOrder[existSuit] || 0);
      if (suitComp < 0) return i;
      if (suitComp === 0 && (valueOrder[newValue] || 0) < (valueOrder[existValue] || 0)) return i;
    }
  }

  return existingCards.length;
}


function animarFichasExistentes() {
  if (!isAnimationsEnabled()) return;

  const fichas = document.querySelectorAll('#board .chip');
  if (fichas.length === 0) return;

  const fichasArr = Array.from(fichas);
  const delay = 60;
  const maxBatch = 5;
  const batchDelay = 30;

  fichasArr.forEach((ficha, i) => {
    ficha.style.transform = 'scale(0)';
    ficha.style.opacity = '0';

    const batchIndex = Math.floor(i / maxBatch);
    const posInBatch = i % maxBatch;
    const totalDelay = (batchIndex * maxBatch * batchDelay) + (posInBatch * delay);

    setTimeout(() => {
      ficha.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
      ficha.style.transform = 'translate(-50%, -50%) scale(1)';
      ficha.style.opacity = '';
      setTimeout(() => { ficha.style.transition = ''; }, 350);
    }, totalDelay + 200);
  });
}


function animarDescarte(cardElement, preRect, cardCode) {
  if (!isAnimationsEnabled()) return;

  const discardContainer = document.getElementById('discard-container');
  const discard = document.getElementById('discard-pile') || discardContainer;
  if (!discard) return;

  const rectCard = preRect || (cardElement ? cardElement.getBoundingClientRect() : null);
  if (!rectCard || rectCard.width === 0) return;

  const rectDiscard = discard.getBoundingClientRect();
  if (rectDiscard.width === 0) return;

  discard.setAttribute('data-animating', 'true');

  const fantasma = document.createElement('div');
  Object.assign(fantasma.style, {
    position: 'fixed',
    top: `${rectCard.top}px`,
    left: `${rectCard.left}px`,
    width: `${rectCard.width}px`,
    height: `${rectCard.height}px`,
    zIndex: '9998',
    pointerEvents: 'none',
    transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
    margin: '0',
    borderRadius: '4px',
    backgroundColor: 'var(--card-background-color, #f4f6f8)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  });

  if (cardCode) {
    fantasma.classList.add('card-in-hand');
    let value = cardCode.slice(0, -1);
    if (value === 'T') value = '10';
    const suit = cardCode.slice(-1);
    const iconClass = (typeof suitIcons !== 'undefined' && suitIcons[suit]) || 'fa-spade';
    const colorClass = (typeof suitColors !== 'undefined' && suitColors[suit]) || 'suit-black';
    const savedStyle = localStorage.getItem("sequenceCardStyle") || "outline";
    const suitClass = "fa-" + (savedStyle === "outline" ? "regular" : savedStyle);
    fantasma.innerHTML = `
      <span class="card-value ${colorClass}">${value}</span>
      <i class="${suitClass} ${iconClass} card-suit ${colorClass}"></i>
    `;
  }

  document.body.appendChild(fantasma);

  requestAnimationFrame(() => {
    fantasma.style.top = `${rectDiscard.top}px`;
    fantasma.style.left = `${rectDiscard.left}px`;
    fantasma.style.width = `${rectDiscard.width}px`;
    fantasma.style.height = `${rectDiscard.height}px`;
  });

  const cleanup = () => {
    discard.removeAttribute('data-animating');
    requestAnimationFrame(() => {
      fantasma.remove();
    });
  };

  fantasma.addEventListener('transitionend', cleanup, { once: true });

  setTimeout(() => {
    if (document.body.contains(fantasma)) cleanup();
  }, 900);
}
