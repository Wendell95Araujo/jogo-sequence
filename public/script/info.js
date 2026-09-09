$(document).ready(function () {
  initializeTranslations();
  setupLanguageSwitcher();
  translateContentBlock();
});

function setupLanguageSwitcher() {
  const container = document.getElementById("language-switcher-container");
  if (!container) return;

  const switcherHtml = `
        <div class="language-selector">
            <button class="lang-btn ${
              currentLanguage === "pt" ? "active" : ""
            }" data-lang="pt" title="Português">
                <img src="https://flagcdn.com/80x60/br.webp" alt="Bandeira do Brasil" width="20">
            </button>
            <button class="lang-btn ${
              currentLanguage === "en" ? "active" : ""
            }" data-lang="en" title="English">
                <img src="https://flagcdn.com/80x60/us.webp" alt="Bandeira dos EUA" width="20">
            </button>
            <button class="lang-btn ${
              currentLanguage === "es" ? "active" : ""
            }" data-lang="es" title="Español">
                <img src="https://flagcdn.com/80x60/es.webp" alt="Bandeira da Espanha" width="20">
            </button>
        </div>
    `;
  container.innerHTML = switcherHtml;

  const selector = container.querySelector(".language-selector");

  container.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const newLang = this.dataset.lang;

      if (selector.classList.contains("collapsed")) {
        selector.classList.remove("collapsed");
        return;
      }

      if (newLang !== currentLanguage) {
        currentLanguage = newLang;
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
        document.documentElement.lang = currentLanguage;

        container.querySelectorAll(".lang-btn").forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        translateContentBlock();
      }

      if (window.scrollY > 100) {
        selector.classList.add("collapsed");
      }
    });
  });

  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      selector.classList.add("collapsed");
    } else {
      selector.classList.remove("collapsed");
    }
  }, { passive: true });
}

function translateContentBlock() {
  const contentElement = document.querySelector("[data-translate-content-key]");
  if (contentElement) {
    const key = contentElement.dataset.translateContentKey;
    const translatedHtml = translate(key);

    if (translatedHtml && translatedHtml !== key) {
      contentElement.innerHTML = translatedHtml;
    }
  }

  document.querySelectorAll("[data-translate-key]").forEach(el => {
    const key = el.dataset.translateKey;
    const translated = translate(key);
    if (translated && translated !== key) {
      el.innerHTML = translated;
    }
  });
}
