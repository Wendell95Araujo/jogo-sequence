let friendsList = {};
let sentRequestsList = {};
let friendRequestsListener = null;
let sentRequestsListener = null;
let friendsListener = null;
const MAX_FRIEND_REQUESTS_PER_DAY = 20;

function initFriendsSystem() {
  if (!currentUser) return;
  const uid = currentUser.uid;

  if (friendsListener) friendsListener.off();
  friendsListener = database.ref(`friends/${uid}`);
  friendsListener.on("value", (snapshot) => {
    friendsList = snapshot.val() || {};
    updateFriendsBadge();
  });

  if (sentRequestsListener) sentRequestsListener.off();
  sentRequestsListener = database.ref(`sent_requests/${uid}`);
  sentRequestsListener.on("value", (snapshot) => {
    sentRequestsList = snapshot.val() || {};
    if ($("#friends-sent-section").length) {
      renderSentRequestsSection();
    }
  });

  let friendRequestsInitialLoad = true;
  if (friendRequestsListener) friendRequestsListener.off();
  friendRequestsListener = database.ref(`friend_requests/${uid}`);
  friendRequestsListener.on("value", (snapshot) => {
    const requests = snapshot.val() || {};
    const pendingCount = Object.values(requests).filter((r) => r.status === "pending").length;
    updateFriendRequestBadge(pendingCount);
    if (pendingCount > 0 && !Swal.isVisible() && !friendRequestsInitialLoad) {
      playFeedback("newMessage");
    }
    friendRequestsInitialLoad = false;
  });
}

function checkPendingFriendRequests() {
  if (!currentUser) return;
  database.ref(`friend_requests/${currentUser.uid}`).orderByChild("status").equalTo("pending").once("value", (snapshot) => {
    const requests = snapshot.val();
    if (requests) {
      const count = Object.keys(requests).length;
      updateFriendRequestBadge(count);
    }
  });
}

function updateFriendsBadge() {
  const count = Object.keys(friendsList).length;
  const $badge = $("#friends-badge");
  if (count > 0) {
    $badge.text(count).show();
  } else {
    $badge.hide();
  }
}

function updateFriendRequestBadge(count) {
  const $badge = $("#friend-requests-badge");
  if (count > 0) {
    $badge.text(count).show();
  } else {
    $badge.hide();
  }
}

function acceptFriendRequest(request, requestKey) {
  const myUid = currentUser.uid;
  const theirUid = request.fromUid;

  const notifKey = database.ref().push().key;
  const updates = {};
  updates[`friends/${myUid}/${theirUid}`] = { since: firebase.database.ServerValue.TIMESTAMP };
  updates[`friends/${theirUid}/${myUid}`] = { since: firebase.database.ServerValue.TIMESTAMP };
  updates[`friend_requests/${myUid}/${requestKey}`] = null;
  updates[`sent_requests/${theirUid}/${myUid}`] = null;
  updates[`friend_accepted_notifications/${theirUid}/${notifKey}`] = {
    fromUid: myUid,
    fromUsername: userProfile.username,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    read: false,
  };

  database.ref().update(updates).then(() => {
    showToast(translate("friends.accepted", { username: request.fromUsername }), { icon: "success" });
    incrementAnalytics({ friends_accepted: 1 });
  });
}

function declineFriendRequest(requestKey) {
  const updates = {};
  updates[`friend_requests/${currentUser.uid}/${requestKey}`] = null;
  updates[`sent_requests/${requestKey}/${currentUser.uid}`] = null;
  
  database.ref().update(updates).then(() => {
      incrementAnalytics({ friends_declined: 1 });
  });
}

function blockUser(blockedUid, requestKey) {
  const updates = {};
  updates[`blocked/${currentUser.uid}/${blockedUid}`] = true;
  updates[`friend_requests/${currentUser.uid}/${requestKey}`] = null;
  updates[`sent_requests/${blockedUid}/${currentUser.uid}`] = null;
  database.ref().update(updates);
  incrementAnalytics({ friends_blocked: 1 });
  showToast(translate("friends.userBlocked"), { icon: "info" });
}

function sendFriendRequest(targetUid, targetUsername, targetAvatar) {
  if (!currentUser || !userProfile) return;

  const myUid = currentUser.uid;
  if (myUid === targetUid) return;

  database.ref(`blocked/${targetUid}/${myUid}`).once("value", (blockedSnap) => {
    if (blockedSnap.exists()) return;

    database.ref(`friends/${myUid}/${targetUid}`).once("value", (friendSnap) => {
      if (friendSnap.exists()) return;

      const updates = {};
      updates[`friend_requests/${targetUid}/${myUid}`] = {
        fromUid: myUid,
        fromUsername: userProfile.username,
        fromAvatar: userProfile.avatar,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: "pending",
      };
      updates[`sent_requests/${myUid}/${targetUid}`] = {
        toUsername: targetUsername,
        toAvatar: targetAvatar,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: "pending",
      };

      database.ref().update(updates).then(() => {
        incrementAnalytics({ friend_requests_sent: 1 });
      });
    });
  });
}

function cancelFriendRequest(targetUid) {
  const myUid = currentUser.uid;
  const updates = {};
  updates[`friend_requests/${targetUid}/${myUid}`] = null;
  updates[`sent_requests/${myUid}/${targetUid}`] = null;

  database.ref().update(updates);
}

function removeFriend(friendUid) {
  if (!currentUser) return;

  Swal.fire({
    title: translate("friends.removeConfirmTitle"),
    text: translate("friends.removeConfirmText"),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: translate("friends.removeBtn"),
    cancelButtonText: translate("cancel"),
  }).then((result) => {
    if (result.isConfirmed) {
      const updates = {};
      updates[`friends/${currentUser.uid}/${friendUid}`] = null;
      updates[`friends/${friendUid}/${currentUser.uid}`] = null;
      database.ref().update(updates).then(() => {
        incrementAnalytics({ friends_removed: 1 });
        openFriendsModal();
      });
    } else {
      openFriendsModal();
    }
  });
}

function openFriendsModal() {
  if (!currentUser || !userProfile) {
    showToast(translate("friends.needAccount"), { icon: "warning" });
    return;
  }

  const uid = currentUser.uid;

  Swal.fire({
    title: `<i class="fas fa-users"></i> ${translate("friends.title")}`,
    html: `
      <div>
        <div class="modal-search-section">
          <div class="modal-search-row">
            <input id="swal-friend-search" type="text" class="swal2-input" placeholder="${translate("friends.searchPlaceholder")}">
            <button id="swal-friend-search-btn" class="modal-search-icon-btn"><i class="fas fa-magnifying-glass"></i></button>
          </div>
          <div id="swal-friend-search-results" class="modal-search-results"></div>
        </div>
        <hr class="modal-separator">
        <div id="friends-received-section"><p class="modal-empty-text"><i class="fas fa-spinner fa-spin"></i></p></div>
        <div id="friends-sent-section"><p class="modal-empty-text"><i class="fas fa-spinner fa-spin"></i></p></div>
        <div id="friends-list-section"><p class="modal-empty-text"><i class="fas fa-spinner fa-spin"></i></p></div>
        <div id="friends-blocked-section"><p class="modal-empty-text"><i class="fas fa-spinner fa-spin"></i></p></div>
      </div>`,
    showConfirmButton: false,
    showCloseButton: true,
    customClass: { popup: "swal2-modal-config-popup" },
    didOpen: () => {
      $("#swal-friend-search-btn").on("click", searchFriend);
      $("#swal-friend-search").on("keyup", (e) => { if (e.key === "Enter") searchFriend(); });

      renderFriendsSection(uid);
      renderSentRequestsSection();
      renderReceivedRequestsSection(uid);
      renderBlockedSection(uid);

      setTimeout(() => {
        if (!$(Swal.getPopup()).find(".modal-section-title:not(.collapsed)").length) {
          $('[data-section="friends-list"]').removeClass("collapsed");
          $('[data-section="friends-list"]').next(".modal-section-content").removeClass("collapsed");
        }
      }, 500);

      $(Swal.getPopup()).on("click", ".invite-friend-btn", function () {
        const friendUid = $(this).data("uid");
        const $btn = $(this);

        if (currentGameId) {
          sendInviteToLobbyPlayer(friendUid, currentGameId);
          $btn.prop("disabled", true).css("opacity", "0.5").html('<i class="fas fa-check"></i>');
          incrementAnalytics({ friend_game_invites_sent: 1 });
        } else {
          const inviteData = {
            gameId: null,
            hostName: myPlayerName,
            fromUid: currentUser.uid,
            type: "play_together",
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          };
          database.ref(`game_invites/${friendUid}`).push(inviteData);
          $btn.prop("disabled", true).css("opacity", "0.5").html('<i class="fas fa-check"></i>');
          incrementAnalytics({ friend_play_together_sent: 1 });
          const $li = $btn.closest("li");
          const $msg = $(`<div class="inline-feedback">${translate("friends.inviteSentPlay")}</div>`);
          $li.after($msg);
          setTimeout(() => $msg.fadeOut(300, () => $msg.remove()), 2000);
        }
      });

      $(Swal.getPopup()).on("click", ".remove-friend-btn", function () {
        const friendUid = $(this).data("uid");
        removeFriend(friendUid);
      });

      $(Swal.getPopup()).on("click", ".cancel-sent-request-btn", function () {
        const targetUid = $(this).data("uid");
        const $li = $(this).closest("li");
        const $msg = $(`<div class="inline-feedback">${translate("friends.requestCancelled")}</div>`);
        $li.after($msg);
        $li.fadeOut(300);
        setTimeout(() => {
          $msg.fadeOut(300, () => $msg.remove());
          cancelFriendRequest(targetUid);
        }, 2000);
      });

      $(Swal.getPopup()).on("click", ".accept-request-btn", function () {
        const requestKey = $(this).data("key");
        const fromUid = $(this).data("uid");
        const fromUsername = $(this).data("username");
        const fromAvatar = $(this).data("avatar");
        acceptFriendRequest({ fromUid, fromUsername, fromAvatar }, requestKey);
        $(this).closest("li").fadeOut();
      });

      $(Swal.getPopup()).on("click", ".decline-request-btn", function () {
        const requestKey = $(this).data("key");
        declineFriendRequest(requestKey);
        $(this).closest("li").fadeOut();
      });

      $(Swal.getPopup()).on("click", ".block-request-btn", function () {
        const requestKey = $(this).data("key");
        const fromUid = $(this).data("uid");
        blockUser(fromUid, requestKey);
        $(this).closest("li").fadeOut();
      });

      $(Swal.getPopup()).on("click", ".unblock-user-btn", function () {
        const blockedUid = $(this).data("uid");
        database.ref(`blocked/${currentUser.uid}/${blockedUid}`).remove();
        $(this).closest("li").fadeOut();
      });

      $(Swal.getPopup()).on("click", ".friend-profile-clickable", function () {
        const friendUid = $(this).data("uid");
        if (friendUid) {
          Swal.close();
          openFriendProfile(friendUid);
        }
      });

      $(Swal.getPopup()).on("click", ".view-profile-btn", function () {
        const friendUid = $(this).data("uid");
        if (friendUid) {
          Swal.close();
          openFriendProfile(friendUid);
        }
      });

      $(Swal.getPopup()).on("click", ".modal-section-title", function () {
        const wasCollapsed = $(this).hasClass("collapsed");
        $(Swal.getPopup()).find(".modal-section-title").addClass("collapsed");
        $(Swal.getPopup()).find(".modal-section-content").addClass("collapsed");
        if (wasCollapsed) {
          $(this).removeClass("collapsed");
          $(this).next(".modal-section-content").removeClass("collapsed");
          this.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
    willClose: () => {
      database.ref(`friends/${uid}`).off("value", friendsModalListener);
      database.ref(`friend_requests/${uid}`).off("value", receivedModalListener);
      database.ref(`blocked/${uid}`).off("value", blockedModalListener);
      friendsModalListener = null;
      receivedModalListener = null;
      blockedModalListener = null;
    },
  });
}

let friendsModalListener = null;
let receivedModalListener = null;
let blockedModalListener = null;

function renderFriendsSection(uid) {
  friendsModalListener = (snapshot) => {
    const friends = snapshot.val() || {};
    const friendUids = Object.keys(friends);
    const $section = $("#friends-list-section");

    const infoPromises = friendUids.map((fUid) =>
      Promise.race([
        database.ref(`users/${fUid}`).once("value").then((s) => {
          const data = s.val() || {};
          return { uid: fUid, username: data.username || "???", avatar: data.avatar || 1, status: data.status };
        }),
        new Promise((resolve) => setTimeout(() => resolve({ uid: fUid, username: "???", avatar: 1, status: "offline" }), 5000))
      ])
    );

    Promise.all(infoPromises).then((results) => {
      let listHtml = "";
      if (friendUids.length === 0) {
        listHtml = `<p class="modal-empty-text">${translate("friends.noFriends")}</p>`;
      } else {
        listHtml = '<ul class="modal-list">';
        results.forEach((friend) => {
          const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${friend.avatar}`;
          let statusIndicator = "";
          let inviteDisabled = "";
          if (friend.status === "online") {
            statusIndicator = `<span class="online-dot" title="Online"></span>`;
          } else if (friend.status === "playing") {
            statusIndicator = `<span class="playing-dot" title="${translate("friends.statusPlaying")}"></span>`;
            inviteDisabled = ' disabled style="opacity:0.4;cursor:not-allowed;"';
          }

          listHtml += `<li class="modal-list-item">
            <div class="modal-list-item-info friend-profile-clickable" data-uid="${friend.uid}">
              <img src="${avatarSrc}">
              <span>${friend.username}${statusIndicator}</span>
            </div>
            <div class="modal-list-actions">
              <button class="view-profile-btn invite-modal-btn" data-uid="${friend.uid}" title="${translate("friends.profileTitle")}"><i class="fas fa-user"></i></button>
              <button class="invite-friend-btn invite-modal-btn" data-uid="${friend.uid}"${inviteDisabled} title="${translate("friends.inviteToRoom")}"><i class="fas fa-paper-plane"></i></button>
              <button class="remove-friend-btn invite-modal-btn btn-remove-friend" data-uid="${friend.uid}" title="${translate("friends.removeBtn")}"><i class="fas fa-user-minus"></i></button>
            </div>
          </li>`;
        });
        listHtml += "</ul>";
      }

      $section.html(`
        <h4 class="modal-section-title collapsed" data-section="friends-list"><span>${translate("friends.myFriends")} (${friendUids.length})</span> <i class="fas fa-chevron-down accordion-arrow"></i></h4>
        <div class="modal-section-content collapsed">${listHtml}</div>
      `);
    });
  };
  database.ref(`friends/${uid}`).on("value", friendsModalListener);
}

function renderSentRequestsSection() {
  const sentUids = Object.keys(sentRequestsList);
  const $section = $("#friends-sent-section");

  let listHtml = "";
  if (sentUids.length === 0) {
    listHtml = `<p class="modal-empty-text">${translate("friends.noSentRequests")}</p>`;
  } else {
    listHtml = '<ul class="modal-list">';
    sentUids.forEach((sUid) => {
      const sentReq = sentRequestsList[sUid];
      const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${sentReq.toAvatar || 1}`;
      listHtml += `<li class="modal-list-item">
        <div class="modal-list-item-info">
          <img src="${avatarSrc}">
          <span>${sentReq.toUsername}</span>
        </div>
        <div class="modal-list-actions">
          <button class="cancel-sent-request-btn invite-modal-btn btn-remove-friend" data-uid="${sUid}" title="${translate("friends.cancelRequest")}"><i class="fas fa-times"></i></button>
        </div>
      </li>`;
    });
    listHtml += "</ul>";
  }

  $section.html(`
    <h4 class="modal-section-title collapsed" data-section="friends-sent"><span>${translate("friends.sentRequests")} (${sentUids.length})</span> <i class="fas fa-chevron-down accordion-arrow"></i></h4>
    <div class="modal-section-content collapsed">${listHtml}</div>
  `);
}

function renderReceivedRequestsSection(uid) {
  receivedModalListener = (snapshot) => {
    const requests = snapshot.val() || {};
    const $section = $("#friends-received-section");
    const pendingRequests = Object.entries(requests).filter(([, r]) => r.status === "pending");

    let listHtml = "";
    if (pendingRequests.length === 0) {
      listHtml = `<p class="modal-empty-text">${translate("friends.noReceivedRequests")}</p>`;
    } else {
      listHtml = '<ul class="modal-list">';
      pendingRequests.forEach(([key, req]) => {
        const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${req.fromAvatar || 1}`;
        listHtml += `<li class="modal-list-item">
          <div class="modal-list-item-info">
            <img src="${avatarSrc}">
            <span>${req.fromUsername}</span>
          </div>
          <div class="modal-list-actions">
            <button class="accept-request-btn invite-modal-btn" data-key="${key}" data-uid="${req.fromUid}" data-username="${req.fromUsername}" data-avatar="${req.fromAvatar}" title="${translate("friends.accept")}"><i class="fas fa-check"></i></button>
            <button class="decline-request-btn invite-modal-btn btn-remove-friend" data-key="${key}" title="${translate("friends.decline")}"><i class="fas fa-times"></i></button>
            <button class="block-request-btn invite-modal-btn" data-key="${key}" data-uid="${req.fromUid}" title="${translate("friends.block")}" style="color:#888;"><i class="fas fa-ban"></i></button>
          </div>
        </li>`;
      });
      listHtml += "</ul>";
    }

    const hasRequests = pendingRequests.length > 0;
    const collapsedClass = hasRequests ? "" : "collapsed";

    $section.html(`
      <h4 class="modal-section-title ${collapsedClass}" data-section="friends-received"><span>${translate("friends.receivedRequests")} (${pendingRequests.length})</span> <i class="fas fa-chevron-down accordion-arrow"></i></h4>
      <div class="modal-section-content ${collapsedClass}">${listHtml}</div>
    `);

    if (hasRequests) {
      $(Swal.getPopup()).find(".modal-section-title").not('[data-section="friends-received"]').addClass("collapsed");
      $(Swal.getPopup()).find(".modal-section-content").not($section.find(".modal-section-content")).addClass("collapsed");
    } else if (!$(Swal.getPopup()).find(".modal-section-title:not(.collapsed)").length) {
      $('[data-section="friends-list"]').removeClass("collapsed");
      $('[data-section="friends-list"]').next(".modal-section-content").removeClass("collapsed");
    }
  };
  database.ref(`friend_requests/${uid}`).on("value", receivedModalListener);
}

function renderBlockedSection(uid) {
  blockedModalListener = (snapshot) => {
    const blocked = snapshot.val() || {};
    const blockedUids = Object.keys(blocked);
    const $section = $("#friends-blocked-section");

    let listHtml = "";
    if (blockedUids.length === 0) {
      listHtml = `<p class="modal-empty-text">${translate("friends.noBlocked")}</p>`;
    } else {
      listHtml = '<ul class="modal-list">';
      blockedUids.forEach((bUid) => {
        listHtml += `<li class="modal-list-item">
          <div class="modal-list-item-info">
            <span>${bUid}</span>
          </div>
          <div class="modal-list-actions">
            <button class="unblock-user-btn invite-modal-btn" data-uid="${bUid}" title="${translate("friends.unblock")}"><i class="fas fa-unlock"></i></button>
          </div>
        </li>`;
      });
      listHtml += "</ul>";
    }

    $section.html(`
      <h4 class="modal-section-title collapsed" data-section="friends-blocked"><span>${translate("friends.blockedUsers")} (${blockedUids.length})</span> <i class="fas fa-chevron-down accordion-arrow"></i></h4>
      <div class="modal-section-content collapsed">${listHtml}</div>
    `);
  };
  database.ref(`blocked/${uid}`).on("value", blockedModalListener);
}

function searchFriend() {
  const query = $("#swal-friend-search").val().trim().toLowerCase();
  const $results = $("#swal-friend-search-results");

  if (!query || query.length < 3) {
    $results.html(`<p class="modal-hint-text">${translate("friends.searchMin3")}</p>`);
    return;
  }

  $results.html('<p class="modal-hint-text"><i class="fas fa-spinner fa-spin"></i></p>');

  database.ref("users").orderByChild("usernameLower").startAt(query).endAt(query + "\uf8ff").limitToFirst(5).once("value", (snapshot) => {
    const results = snapshot.val();
    
    if (!results || Object.keys(results).length === 0) {
      database.ref("users").orderByChild("usernameLower").limitToFirst(200).once("value", (allSnap) => {
        const allUsers = allSnap.val() || {};
        const filtered = {};
        Object.entries(allUsers).forEach(([uid, user]) => {
          if (user.usernameLower && user.usernameLower.includes(query)) {
            filtered[uid] = user;
          }
        });
        
        if (Object.keys(filtered).length === 0) {
          $results.html(`<p class="modal-hint-text">${translate("friends.noResults")}</p>`);
          return;
        }
        renderSearchResults(filtered, $results);
      });
      return;
    }

    renderSearchResults(results, $results);
  });
}

function renderSearchResults(results, $results) {
    let html = "";
    Object.entries(results).forEach(([uid, user]) => {
      if (uid === currentUser.uid) return;

      const isFriend = friendsList[uid];
      const isSent = sentRequestsList[uid];

      const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.avatar || 1}`;

      let actionBtn = "";
      if (isFriend) {
        actionBtn = `<span class="already-friend-badge"><i class="fas fa-check"></i> ${translate("friends.alreadyFriend")}</span>`;
      } else if (isSent) {
        actionBtn = `<button class="search-cancel-friend-btn invite-modal-btn btn-remove-friend" data-uid="${uid}" title="${translate("friends.cancelRequest")}"><i class="fas fa-times"></i></button>`;
      } else {
        database.ref(`friend_requests/${currentUser.uid}/${uid}`).once("value", (reqSnap) => {
          if (reqSnap.exists() && reqSnap.val().status === "pending") {
            $(`.search-add-friend-btn[data-uid="${uid}"]`).replaceWith(`
              <div class="modal-list-actions">
                <button class="accept-request-btn invite-modal-btn" data-key="${uid}" data-uid="${uid}" data-username="${user.username}" data-avatar="${user.avatar || 1}" title="${translate("friends.accept")}"><i class="fas fa-check"></i></button>
                <button class="decline-request-btn invite-modal-btn btn-remove-friend" data-key="${uid}" title="${translate("friends.decline")}"><i class="fas fa-times"></i></button>
              </div>`);
          }
        });
        actionBtn = `<button class="search-add-friend-btn invite-modal-btn" style="width: auto !important" data-uid="${uid}" data-username="${user.username}" data-avatar="${user.avatar || 1}"><i class="fas fa-user-plus"></i></button>`;
      }

      html += `<div class="search-result-item">
        <div class="search-result-info">
          <img src="${avatarSrc}">
          <span>${user.username}</span>
        </div>
        ${actionBtn}
      </div>`;
    });

    if (!html) {
      $results.html(`<p class="modal-hint-text">${translate("friends.noResults")}</p>`);
      return;
    }

    $results.html(html);

    $results.find(".search-add-friend-btn").on("click", function () {
      const targetUid = $(this).data("uid");
      const targetUsername = $(this).data("username");
      const targetAvatar = $(this).data("avatar");
      sendFriendRequest(targetUid, targetUsername, targetAvatar);
      $(this).prop("disabled", true).css("opacity", "0.5").html('<i class="fas fa-check"></i>');
      const $parent = $(this).closest(".search-result-item");
      const $msg = $(`<div class="inline-feedback">${translate("friends.requestSent", { username: targetUsername })}</div>`);
      $parent.after($msg);
      setTimeout(() => {
        $msg.fadeOut(300, () => $msg.remove());
        $parent.fadeOut(300, () => $parent.remove());
      }, 2000);
    });

    $results.find(".search-cancel-friend-btn").on("click", function () {
      const targetUid = $(this).data("uid");
      cancelFriendRequest(targetUid);
      $(this).prop("disabled", true).css("opacity", "0.5");
    });
}


function openFriendProfile(friendUid) {
  if (!currentUser) return;

  Promise.all([
    database.ref(`users/${friendUid}`).once("value"),
    database.ref(`rankings/global`).orderByChild("points").once("value"),
  ]).then(([userSnap, rankingSnap]) => {
    const user = userSnap.val();
    if (!user) {
      showToast(translate("friends.profileNotFound"), { icon: "error" });
      return;
    }

    const stats = user.stats || {};
    const rankingEntry = (rankingSnap.val() || {})[friendUid] || {};
    const wins = stats.onlineWins || rankingEntry.wins || 0;
    const losses = stats.onlineLosses || 0;
    const draws = stats.onlineDraws || 0;
    const gamesPlayed = stats.onlineGamesPlayed || rankingEntry.gamesPlayed || 0;
    const points = stats.points || rankingEntry.points || 0;
    const status = user.status || "offline";

    const avatarSrc = `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.avatar || 1}`;
    const rank = getPlayerRank(points);
    const hasRank = gamesPlayed >= 5;

    let position = "--";
    if (hasRank) {
      const rankingEntry = (rankingSnap.val() || {})[friendUid] || {};
      if (rankingEntry.position) {
        position = rankingEntry.position;
      } else {
        const rankingData = rankingSnap.val() || {};
        const players = Object.entries(rankingData)
          .filter(([, p]) => (p.gamesPlayed || 0) >= 5)
          .map(([uid, p]) => ({ uid, points: p.points || 0 }))
          .sort((a, b) => b.points - a.points);
        const idx = players.findIndex(p => p.uid === friendUid);
        if (idx >= 0) {
          position = idx + 1;
        }
      }
    }

    let statusText = "";
    let statusClass = "";
    if (status === "online") {
      statusText = "Online";
      statusClass = "online-dot";
    } else if (status === "playing") {
      statusText = translate("friends.statusPlaying");
      statusClass = "playing-dot";
    } else {
      statusText = "Offline";
      statusClass = "offline-dot";
    }

    const rankBadge = hasRank
      ? `<span class="rank-badge">${getRankBadgeSvg(rank, 18)} ${translate(rank.key)}</span>`
      : "";

    let rankProgressHtml = "";
    if (hasRank) {
      const nextRankInfo = getNextRankInfo(points);
      if (nextRankInfo) {
        rankProgressHtml = `<div class="friend-profile-rank-progress">
          <i class="fas fa-arrow-up"></i> ${translate(nextRankInfo.remaining === 1 ? "ranking.pointsToNext" : "ranking.pointsToNextPlural", { points: nextRankInfo.remaining, rank: translate(nextRankInfo.nextRank.key) })}
        </div>`;
      }
    }

    const isFriend = friendsList[friendUid];

    const profileHtml = `
      <div class="friend-profile-container">
        <div class="friend-profile-header">
          <img src="${avatarSrc}" class="friend-profile-avatar">
          <div class="friend-profile-name-section">
            <h3>${user.username} ${rankBadge}</h3>
            <span class="friend-profile-status"><span class="${statusClass}"></span> ${statusText}</span>
          </div>
        </div>
        <div class="friend-profile-stats">
          <div class="friend-profile-stat">
            <strong>${gamesPlayed}</strong>
            <small>${translate("ranking.games")}</small>
          </div>
          <div class="friend-profile-stat">
            <strong>${wins}</strong>
            <small>${translate("ranking.wins")}</small>
          </div>
          <div class="friend-profile-stat">
            <strong>${losses}</strong>
            <small>${translate("friends.profileLosses")}</small>
          </div>
          <div class="friend-profile-stat">
            <strong>${draws}</strong>
            <small>${translate("friends.profileDraws")}</small>
          </div>
        </div>
        <div class="friend-profile-ranking">
          <div class="friend-profile-stat">
            <strong>${points}</strong>
            <small>${translate("ranking.points")}</small>
          </div>
          <div class="friend-profile-stat">
            <strong>${position !== "--" ? "#" + position : "--"}</strong>
            <small>${translate("ranking.position")}</small>
          </div>
        </div>
        ${rankProgressHtml}
        ${isFriend ? `<div class="friend-profile-actions">
          ${status === "playing" ? `<button class="auth-btn-primary friend-profile-watch-btn" data-uid="${friendUid}"><i class="fas fa-eye"></i> ${translate("spectator.watchGame")}</button>` : `<button class="auth-btn-primary friend-profile-invite-btn" data-uid="${friendUid}"><i class="fas fa-paper-plane"></i> ${translate("friends.inviteToRoom")}</button>`}
          <button class="auth-btn-secondary friend-profile-remove-btn" data-uid="${friendUid}"><i class="fas fa-user-minus"></i> ${translate("friends.removeBtn")}</button>
        </div>` : ""}
      </div>
    `;

    let reopenFriends = true;

    Swal.fire({
      title: `<i class="fas fa-user"></i> ${translate("friends.profileTitle")}`,
      html: profileHtml,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal2-modal-config-popup" },
      didOpen: () => {
        $(Swal.getPopup()).find(".friend-profile-invite-btn").on("click", function () {
          const uid = $(this).data("uid");
          if (currentGameId) {
            sendInviteToLobbyPlayer(uid, currentGameId);
            $(this).prop("disabled", true).css("opacity", "0.5").html('<i class="fas fa-check"></i>');
            incrementAnalytics({ friend_game_invites_sent: 1 });
          } else {
            const inviteData = {
              gameId: null,
              hostName: myPlayerName,
              fromUid: currentUser.uid,
              type: "play_together",
              timestamp: firebase.database.ServerValue.TIMESTAMP,
            };
            database.ref(`game_invites/${uid}`).push(inviteData);
            $(this).prop("disabled", true).css("opacity", "0.5").html('<i class="fas fa-check"></i>');
            incrementAnalytics({ friend_play_together_sent: 1 });
            showToast(translate("friends.inviteSentPlay"), { icon: "success", timer: 2000 });
          }
        });

        $(Swal.getPopup()).find(".friend-profile-watch-btn").on("click", function () {
          const uid = $(this).data("uid");
          reopenFriends = false;
          Swal.close();
          database.ref(`users/${uid}/currentGameId`).once("value", (snap) => {
            const gameId = snap.val();
            if (gameId) {
              mostrarLoading();
              joinGameAsSpectator(gameId);
            } else {
              showToast(translate("spectator.gameNotActive"), { icon: "warning" });
            }
          });
        });

        $(Swal.getPopup()).find(".friend-profile-remove-btn").on("click", function () {
          const uid = $(this).data("uid");
          reopenFriends = false;
          Swal.close();
          removeFriend(uid);
        });
      },
      didClose: () => {
        if (reopenFriends) openFriendsModal();
      },
    });
  });
}
