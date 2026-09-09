const AVATARS_MALE = [3, 4, 9, 10, 11, 14, 15, 17, 20, 22, 23, 25, 26, 28, 29, 32, 34, 39, 40];
const AVATARS_FEMALE = [1, 2, 5, 6, 7, 8, 12, 13, 16, 18, 19, 21, 24, 27, 30, 31, 33, 35, 36, 37, 38, 41, 42];

function openRankingModal() {
  const isLoggedIn = currentUser && userProfile;
  const cacheKey = "ranking_cache";
  const cacheExpiry = 2 * 60 * 1000;

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheExpiry) {
        renderRankingContent(data, isLoggedIn);
        fetchRankingData().then(freshData => {
          localStorage.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: Date.now() }));
        }).catch(() => {});
        return;
      }
    } catch (e) {}
  }

  fetchRankingData().then(data => {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    renderRankingContent(data, isLoggedIn);
  }).catch((error) => {
    console.error("Erro ao carregar ranking:", error);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        renderRankingContent(data, isLoggedIn);
        return;
      } catch (e) {}
    }
    if (typeof showToast === "function") {
      showToast(translate("ranking.loadError"), { icon: "error" });
    }
  });
}

function fetchRankingData() {
  const rankingPromise = database.ref("rankings/global").orderByChild("points").once("value")
    .then(snap => snap.val() || {});
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000));
  return Promise.race([rankingPromise, timeoutPromise]);
}

function renderRankingContent(data, isLoggedIn) {

    let players = Object.entries(data)
      .map(([uid, info]) => ({ uid, ...info }))
      .filter((p) => (p.gamesPlayed || 0) >= 5);

    players.sort((a, b) => (b.points || 0) - (a.points || 0));

    if (isLoggedIn) {
      const positionUpdates = {};
      players.forEach((p, i) => {
        positionUpdates[`rankings/global/${p.uid}/position`] = i + 1;
      });
      if (Object.keys(positionUpdates).length > 0) {
        database.ref().update(positionUpdates).catch(() => {});
      }
    }

    let myPosition = -1;
    if (isLoggedIn) {
      myPosition = players.findIndex((p) => p.uid === currentUser.uid);
    }

    let tableHtml = "";
    if (players.length === 0) {
      tableHtml = `<p class="modal-empty-text">${translate("ranking.noPlayers")}</p>`;
    } else {
      const top50 = players.slice(0, 50);
      const myIndexInFull = isLoggedIn ? players.findIndex((p) => p.uid === currentUser.uid) : -1;
      const isInTop50 = myIndexInFull >= 0 && myIndexInFull < 50;

      let neighborsToShow = [];
      if (!isInTop50 && myIndexInFull > 0) {
        const start = Math.max(50, myIndexInFull - 2);
        const end = Math.min(players.length, myIndexInFull + 3);
        neighborsToShow = players.slice(start, end).map((p, i) => ({ ...p, realIndex: start + i }));
      }

      const hasSeedPlayers = top50.some(p => p.uid.startsWith("seed_"));

      function renderRow(player, index) {
        const isMe = isLoggedIn && player.uid === currentUser.uid;
        const rowClass = isMe ? "ranking-row-me" : "";
        const clickableClass = !hasSeedPlayers ? "ranking-row-clickable" : "";
        const medal = index === 0
          ? '<i class="fas fa-trophy" style="color:#f1c40f;font-size:1.2em;"></i>'
          : index === 1
          ? '<i class="fas fa-trophy" style="color:#95a5a6;font-size:1.2em;"></i>'
          : index === 2
          ? '<i class="fas fa-trophy" style="color:#cd7f32;font-size:1.2em;"></i>'
          : `${index + 1}`;
        const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${player.avatar || 1}`;
        const playerRank = getPlayerRank(player.points || 0);

        return `<tr class="${rowClass} ${clickableClass}" data-uid="${player.uid}">
          <td><strong>${medal}</strong></td>
          <td>
            <div class="ranking-row-avatar">
              <img src="${avatarSrc}">
              <span>${player.username}</span>
            </div>
          </td>
          <td><span class="rank-badge-sm">${getRankBadgeSvg(playerRank, 32)} <small>${translate(playerRank.key)}</small></span></td>
          <td class="col-center"><strong>${player.points || 0}</strong></td>
          <td class="col-center">${player.gamesPlayed || 0}</td>
        </tr>`;
      }

      tableHtml = `<div class="ranking-table-container">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${translate("ranking.player")}</th>
              <th>${translate("ranking.rank")}</th>
              <th class="col-center">${translate("ranking.points")}</th>
              <th class="col-center">${translate("ranking.games")}</th>
            </tr>
          </thead>
          <tbody>`;

      top50.forEach((player, index) => {
        tableHtml += renderRow(player, index);
      });

      if (neighborsToShow.length > 0) {
        tableHtml += `<tr><td colspan="5" class="col-center" style="padding:4px;opacity:0.5;">• • •</td></tr>`;
        neighborsToShow.forEach((player) => {
          tableHtml += renderRow(player, player.realIndex);
        });
      }

      tableHtml += "</tbody></table></div>";
    }

    let myInfoHtml = "";
    if (isLoggedIn && userProfile.stats) {
      const myPoints = userProfile.stats.points || 0;
      const myGames = userProfile.stats.gamesPlayed || 0;
      const posText = myPosition >= 0 ? `#${myPosition + 1}` : (userProfile.stats.position ? `#${userProfile.stats.position}` : "--");
      const hasRank = myGames >= 5;
      const myRank = getPlayerRank(myPoints);

      let rankHtml = hasRank
        ? `<div><strong>${getRankBadgeSvg(myRank, 20)} ${translate(myRank.key)}</strong><small>${translate("ranking.rank")}</small></div>`
        : "";

      myInfoHtml = `<div class="ranking-my-info">
        <div><strong>${posText}</strong><small>${translate("ranking.position")}</small></div>
        <div><strong>${myPoints}</strong><small>${translate("ranking.points")}</small></div>
        ${rankHtml}
        <div><strong>${myGames}</strong><small>${translate("ranking.games")}</small></div>
      </div>`;

      if (hasRank) {
        const nextRankInfo = getNextRankInfo(myPoints);
        if (nextRankInfo) {
          myInfoHtml += `<p class="modal-hint-text" style="text-align:center;margin:8px 0;">
            <i class="fas fa-arrow-up"></i> ${translate(nextRankInfo.remaining === 1 ? "ranking.pointsToNext" : "ranking.pointsToNextPlural", { points: nextRankInfo.remaining, rank: translate(nextRankInfo.nextRank.key) })}
          </p>`;
        }
      }

      if (myGames < 5) {
        myInfoHtml += `<p class="modal-hint-text" style="text-align:center;margin:8px 0;">${translate("ranking.needMoreGames", { count: 5 - myGames })}</p>`;
      }
    } else if (!isLoggedIn) {
      myInfoHtml = `<div class="ranking-login-prompt">
        <i class="fas fa-lock"></i> ${translate("ranking.loginToParticipate")}
      </div>`;
    }

    Swal.fire({
      title: `<i class="fas fa-trophy"></i> ${translate("ranking.title")}`,
      html: `${myInfoHtml}
        <div style="text-align:center;margin-bottom:12px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
          <button class="ranking-tiers-btn" onclick="showRankTiersModal()">
            <i class="fas fa-layer-group"></i> ${translate("ranking.viewTiers")}
          </button>
          <button class="ranking-tiers-btn" onclick="showScoringModal('ranking')">
            <i class="fas fa-calculator"></i> ${translate("ranking.howScoring")}
          </button>
        </div>
        ${tableHtml}`,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
      width: "500px",
      didOpen: () => {
        $(Swal.getPopup()).on("click", ".ranking-row-clickable", function () {
          const uid = $(this).data("uid");
          if (uid && !uid.startsWith("seed_") && uid !== currentUser?.uid) {
            Swal.close();
            openFriendProfile(uid);
          }
        });
      },
    });
}

const RANK_TIERS = [
  { min: 0, key: "ranks.bronze3", name: "Bronze III", icon: "fa-shield", color: "#cd7f32", dark: "#a05e1f", numeral: "III", shape: "shield" },
  { min: 30, key: "ranks.bronze2", name: "Bronze II", icon: "fa-shield", color: "#cd7f32", dark: "#a05e1f", numeral: "II", shape: "shield" },
  { min: 60, key: "ranks.bronze1", name: "Bronze I", icon: "fa-shield", color: "#cd7f32", dark: "#a05e1f", numeral: "I", shape: "shield" },
  { min: 100, key: "ranks.silver3", name: "Prata III", icon: "fa-shield", color: "#95a5a6", dark: "#7f8c8d", numeral: "III", shape: "shield" },
  { min: 150, key: "ranks.silver2", name: "Prata II", icon: "fa-shield", color: "#95a5a6", dark: "#7f8c8d", numeral: "II", shape: "shield" },
  { min: 200, key: "ranks.silver1", name: "Prata I", icon: "fa-shield", color: "#95a5a6", dark: "#7f8c8d", numeral: "I", shape: "shield" },
  { min: 275, key: "ranks.gold3", name: "Ouro III", icon: "fa-shield", color: "#f1c40f", dark: "#d4ac0d", numeral: "III", shape: "shield" },
  { min: 375, key: "ranks.gold2", name: "Ouro II", icon: "fa-shield", color: "#f1c40f", dark: "#d4ac0d", numeral: "II", shape: "shield" },
  { min: 500, key: "ranks.gold1", name: "Ouro I", icon: "fa-shield", color: "#f1c40f", dark: "#d4ac0d", numeral: "I", shape: "shield" },
  { min: 650, key: "ranks.master3", name: "Mestre III", icon: "fa-trophy", color: "#cd7f32", dark: "#a05e1f", numeral: "III", shape: "trophy" },
  { min: 850, key: "ranks.master2", name: "Mestre II", icon: "fa-trophy", color: "#95a5a6", dark: "#7f8c8d", numeral: "II", shape: "trophy" },
  { min: 1100, key: "ranks.master1", name: "Mestre I", icon: "fa-trophy", color: "#f1c40f", dark: "#d4ac0d", numeral: "I", shape: "trophy" },
  { min: 1400, key: "ranks.sapphire", name: "Safira", icon: "fa-gem", color: "#304FFE", dark: "#1a237e", numeral: "", shape: "gem" },
  { min: 1800, key: "ranks.ruby", name: "Rubi", icon: "fa-gem", color: "#c62828", dark: "#8e0000", numeral: "", shape: "gem" },
  { min: 2300, key: "ranks.diamond", name: "Diamante", icon: "fa-gem", color: "#4fc3f7", dark: "#0288d1", numeral: "", shape: "gem" },
  { min: 3000, key: "ranks.elite", name: "Elite", icon: "fa-crown", color: "#f1c40f", dark: "#d4ac0d", numeral: "", shape: "crown" },
];

function getPlayerRank(points) {
  let rank = RANK_TIERS[0];
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].min) {
      rank = RANK_TIERS[i];
      break;
    }
  }
  return rank;
}

function getRankBadgeSvg(rank, size) {
  const s = size || 20;
  const color = rank.color;
  const dark = rank.dark;
  const numeral = rank.numeral;

  if (rank.shape === "gem") {
    return `<svg width="${s}" height="${s}" viewBox="0 0 512 512" style="vertical-align:middle;">
      <path d="M116.7 33.8c4.5-6.1 11.7-9.8 19.3-9.8l240 0c7.6 0 14.8 3.6 19.3 9.8l112 152c6.8 9.2 6.1 21.9-1.5 30.4l-232 256c-4.5 5-11 7.9-17.8 7.9s-13.2-2.9-17.8-7.9l-232-256c-7.7-8.5-8.3-21.2-1.5-30.4l112-152zm38.5 39.8c-3.3 2.5-4.2 7-2.1 10.5l57.4 95.6L63.3 192c-4.1 .3-7.3 3.8-7.3 8s3.2 7.6 7.3 8l192 16c.4 0 .9 0 1.3 0l192-16c4.1-.3 7.3-3.8 7.3-8s-3.2-7.6-7.3-8L301.5 179.8l57.4-95.6c2.1-3.5 1.2-8.1-2.1-10.5s-7.9-2-10.7 1L256 172.2 165.9 74.6c-2.8-3-7.4-3.4-10.7-1z" fill="${color}"/>
    </svg>`;
  }

  if (rank.shape === "trophy") {
    return `<svg width="${s}" height="${s}" viewBox="0 0 576 512" style="vertical-align:middle;">
      <path d="M400 0L176 0c-26.5 0-48.1 21.8-47.1 48.2c.2 5.3 .4 10.6 .7 15.8L24 64C10.7 64 0 74.7 0 88c0 92.6 33.5 157 78.5 200.7c44.3 43.1 98.3 64.8 138.1 75.8c23.4 6.5 39.4 26 39.4 45.6c0 20.9-17 37.9-37.9 37.9L192 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-26.1 0C337 448 320 431 320 410.1c0-19.6 15.9-39.2 39.4-45.6c39.9-11 93.9-32.7 138.2-75.8C542.5 245 576 180.6 576 88c0-13.3-10.7-24-24-24L446.4 64c.3-5.2 .5-10.4 .7-15.8C448.1 21.8 426.5 0 400 0zM48.9 112l84.4 0c9.1 90.1 29.2 150.3 51.9 190.6c-24.9-11-50.8-26.5-73.2-48.3c-32-31.1-58-76-63-142.3zM464.1 254.3c-22.4 21.8-48.3 37.3-73.2 48.3c22.7-40.3 42.8-100.5 51.9-190.6l84.4 0c-5.1 66.3-31.1 111.2-63 142.3z" fill="${color}"/>
      <text x="288" y="230" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="160" font-weight="800" font-family="Montserrat,sans-serif">${numeral}</text>
    </svg>`;
  }

  if (rank.shape === "crown") {
    return `<svg width="${s}" height="${s}" viewBox="0 0 576 512" style="vertical-align:middle;">
      <path d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6l277.2 0c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z" fill="${color}"/>
    </svg>`;
  }

  return `<svg width="${s}" height="${s}" viewBox="0 0 512 512" style="vertical-align:middle;">
    <path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z" fill="${color}"/>
    <text x="256" y="270" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="200" font-weight="800" font-family="Montserrat,sans-serif">${numeral}</text>
  </svg>`;
}

function getRankBadgeHtml(points, size) {
  const rank = getPlayerRank(points);
  return `<span class="rank-badge">${getRankBadgeSvg(rank, size)} ${translate(rank.key)}</span>`;
}

function getNextRankInfo(points) {
  const currentRankIndex = RANK_TIERS.findIndex((tier, i) => {
    const nextTier = RANK_TIERS[i + 1];
    if (!nextTier) return true;
    return points >= tier.min && points < nextTier.min;
  });

  if (currentRankIndex < 0 || currentRankIndex >= RANK_TIERS.length - 1) {
    return null;
  }

  const nextRank = RANK_TIERS[currentRankIndex + 1];
  return {
    nextRank,
    remaining: nextRank.min - points,
  };
}

function showRankTiersModal(source) {
  let tiersHtml = '<div class="rank-tiers-table-container"><table class="rank-tiers-table"><thead><tr>';
  tiersHtml += `<th>${translate("ranking.rank")}</th>`;
  tiersHtml += `<th>${translate("ranking.points")}</th>`;
  tiersHtml += '</tr></thead><tbody>';

  RANK_TIERS.forEach((tier, i) => {
    const nextTier = RANK_TIERS[i + 1];
    const rangeText = nextTier ? `${tier.min} - ${nextTier.min - 1}` : `${tier.min}+`;
    const isCurrentRank = currentUser && userProfile && userProfile.stats
      ? getPlayerRank(userProfile.stats.points || 0).key === tier.key
      : false;

    tiersHtml += `<tr class="${isCurrentRank ? 'rank-tier-current' : ''}">
      <td><span class="rank-badge-sm">${getRankBadgeSvg(tier, 22)} <small>${translate(tier.key)}</small></span></td>
      <td><strong>${rangeText}</strong></td>
    </tr>`;
  });

  tiersHtml += '</tbody></table></div>';

  Swal.fire({
    title: `<i class="fas fa-layer-group"></i> ${translate("ranking.tiersTitle")}`,
    html: tiersHtml,
    showCloseButton: true,
    showDenyButton: true,
    denyButtonText: `<i class="fas fa-arrow-left"></i> ${translate("ranking.back")}`,
    confirmButtonText: translate("ranking.close"),
    customClass: { popup: "swal2-modal-config-popup" },
    width: "420px",
    reverseButtons: true,
  }).then((result) => {
    if (result.isDenied) {
      if (source === "profile") {
        openProfileModal();
      } else {
        openRankingModal();
      }
    }
  });
}

function showScoringModal(source) {
  const html = `
    <div class="scoring-table-container">
      <table class="rank-tiers-table" style="text-align:left;">
        <thead>
          <tr>
            <th style="text-align:left;">${translate("ranking.scoringTitle")}</th>
            <th style="text-align:center;">${translate("ranking.points")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:left;"><i class="fas fa-robot"></i> ${translate("ranking.scoringOffline")}</td>
            <td style="text-align:center;"><strong>1</strong></td>
          </tr>
          <tr>
            <td style="text-align:left;"><i class="fas fa-users"></i> ${translate("ranking.scoringOnlineTeam")}</td>
            <td style="text-align:center;"><strong>2</strong></td>
          </tr>
          <tr>
            <td style="text-align:left;"><i class="fas fa-user"></i> ${translate("ranking.scoringOnlineSolo")}</td>
            <td style="text-align:center;"><strong>3</strong></td>
          </tr>
          <tr>
            <td style="text-align:left;"><i class="fas fa-handshake"></i> ${translate("ranking.scoringDraw")}</td>
            <td style="text-align:center;"><strong>1</strong></td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:12px;border-top:2px solid rgba(0,0,0,0.1);text-align:left;">
              <strong><i class="fas fa-arrow-up"></i> ${translate("ranking.scoringBonus")}</strong><br>
              <small style="opacity:0.8;">${translate("ranking.scoringBonusDesc")}</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  Swal.fire({
    title: `<i class="fas fa-calculator"></i> ${translate("ranking.scoringTitle")}`,
    html: html,
    showCloseButton: true,
    showDenyButton: true,
    denyButtonText: `<i class="fas fa-arrow-left"></i> ${translate("ranking.back")}`,
    confirmButtonText: translate("ranking.close"),
    customClass: { popup: "swal2-modal-config-popup" },
    width: "420px",
    reverseButtons: true,
  }).then((result) => {
    if (result.isDenied) {
      if (source === "profile") {
        openProfileModal();
      } else {
        openRankingModal();
      }
    }
  });
}
