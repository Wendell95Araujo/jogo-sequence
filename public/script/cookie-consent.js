const PRIVACY_LAST_UPDATED = "2026-07-01";
const CONSENT_STORAGE_KEY = "cookieConsentAccepted";

function initCookieConsent() {
  const saved = localStorage.getItem(CONSENT_STORAGE_KEY);

  if (!saved) {
    showCookieBanner(false);
    return;
  }

  try {
    const data = JSON.parse(saved);
    if (data.policyDate !== PRIVACY_LAST_UPDATED) {
      showCookieBanner(true);
    }
  } catch (e) {
    showCookieBanner(false);
  }
}

function showCookieBanner(isUpdate) {
  const message = isUpdate
    ? translate("cookie.updated")
    : translate("cookie.message");

  const privacyLink = translate("cookie.privacyLink");
  const acceptText = translate("cookie.accept");

  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner" + (isUpdate ? " cookie-banner--updated" : "");
  banner.innerHTML = `
    <div class="cookie-banner-content">
      <div class="cookie-banner-message">
        ${isUpdate ? '<i class="fas fa-info-circle cookie-banner-icon"></i>' : '<i class="fas fa-cookie-bite cookie-banner-icon"></i>'}
        <p class="cookie-banner-text">
          ${message} <a href="privacy.html" class="cookie-banner-link">${privacyLink}</a>.
        </p>
      </div>
      <button class="cookie-banner-btn" id="cookie-accept-btn">${acceptText}</button>
    </div>
  `;

  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add("cookie-banner--visible");
    });
  });

  document.getElementById("cookie-accept-btn").addEventListener("click", acceptCookies);
}

function acceptCookies() {
  const data = { policyDate: PRIVACY_LAST_UPDATED, acceptedAt: Date.now() };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));

  const banner = document.getElementById("cookie-banner");
  if (banner) {
    banner.classList.remove("cookie-banner--visible");
    setTimeout(() => banner.remove(), 400);
  }
}

document.addEventListener("DOMContentLoaded", initCookieConsent);
