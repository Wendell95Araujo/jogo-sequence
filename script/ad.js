const AD_FREQUENCY = 3;
const GAME_COUNT_KEY = "sequenceGameCount";
const AD_TIMER_SECONDS = 5;

function getGameCount() {
  return parseInt(localStorage.getItem(GAME_COUNT_KEY) || "0");
}

function incrementGameCount() {
  let count = getGameCount();
  localStorage.setItem(GAME_COUNT_KEY, (count + 1).toString());
}

function shouldShowAd() {
  const gameCount = getGameCount();
  return gameCount > 0 && gameCount % AD_FREQUENCY === 0;
}

function showAd(onAdFinishedCallback) {
  const adOverlay = $("#ad-overlay");
  const adCloseBtn = $("#ad-close-btn");
  const adTimerSpan = $("#ad-timer");
  const adPlaceholder = $("#ad-placeholder");

  adPlaceholder.html(`
      <ins class="adsbygoogle"
           style="display:block;width:300px;height:250px;"
           data-ad-client="CLIENT-ID"
           data-ad-slot="SLOT_ID"></ins>
  `);

  let countdown = AD_TIMER_SECONDS;
  adTimerSpan.text(countdown);
  adOverlay.css("display", "flex");
  adCloseBtn.hide();

  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.error("Erro ao tentar carregar o anúncio do AdSense:", e);
  }

  $(".ad-continue-message").html(translate("adContinueText"));

  const interval = setInterval(() => {
    countdown--;
    adTimerSpan.text(countdown);
    if (countdown <= 0) {
      clearInterval(interval);
      $(".ad-continue-message").html(translate("adCanClose"));
      adCloseBtn.show();
    }
  }, 1000);

  adCloseBtn.off("click").on("click", () => {
    adOverlay.hide();
    clearInterval(interval);
    if (onAdFinishedCallback && typeof onAdFinishedCallback === "function") {
      onAdFinishedCallback();
    }
  });
}

function checkAndShowAd(actionCallback) {
  // CORREÇÃO: Verifica o status da conexão em vez do modo de jogo.
  // Se não estiver online, nunca mostra o anúncio.
  if (connectionStatus !== "online") {
    actionCallback();
    return;
  }

  // A lógica de anúncio está desativada temporariamente.
  // Para reativar, remova a linha abaixo e descomente o bloco if/else.
  actionCallback();

  /*
  // QUANDO O ADSENSE APROVAR, APAGUE A LINHA "actionCallback();" ACIMA
  // E DESCOMENTE ESTE BLOCO:
  if (shouldShowAd()) {
    showAd(actionCallback);
  } else {
    actionCallback();
  }
  */
}
