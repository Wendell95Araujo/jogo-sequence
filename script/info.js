$(document).ready(function () {
  const path = window.location.pathname;
  const pageName = path
    .substring(path.lastIndexOf("/") + 1)
    .replace(".html", "");

  const validPages = ["rules", "about", "contact", "privacy"];
  if (!validPages.includes(pageName)) return;

  const titleKey = `page_${pageName}_title`;
  const contentKey = `content_${pageName}`;
  const defaultLang = "pt";

  initializeTranslations();

  const switcherHtml = `
        <div class="language-selector">
            <button class="lang-btn ${
              currentLanguage === "pt" ? "active" : ""
            }" data-lang="pt">PT</button>
            <button class="lang-btn ${
              currentLanguage === "en" ? "active" : ""
            }" data-lang="en">EN</button>
            <button class="lang-btn ${
              currentLanguage === "es" ? "active" : ""
            }" data-lang="es">ES</button>
        </div>
      `;
  $("#language-switcher-container").html(switcherHtml);

  if (currentLanguage !== defaultLang) {
    document.title = translate(titleKey);
    $("#content-container").html(translate(contentKey));
  }

  const backLink = `<a href="/" class="back-link">${translate(
    "back_to_game"
  )}</a>`;
  $(".container").append(backLink);

  $(".lang-btn").on("click", function () {
    const newLang = $(this).data("lang");
    if (newLang !== currentLanguage) {
      currentLanguage = newLang;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);

      document.title = translate(titleKey);
      $("#content-container").html(translate(contentKey));
      $(".lang-btn").removeClass("active");
      $(this).addClass("active");
      $(".back-link").text(translate("back_to_game"));
    }
  });
});
