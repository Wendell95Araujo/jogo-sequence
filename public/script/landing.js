document.addEventListener("DOMContentLoaded", () => {
  initializeTranslations();
  setupLanguageSwitcher();
  loadPublicRating();
  loadReviews();
  setupExclusiveAccordions();
  setupFadeInAnimations();
  setupScreenshotsCarousel();
  trackCountryVisit();
});

function toggleFeatures() {
  const more = document.getElementById("features-more");
  const btn = document.getElementById("features-toggle-btn");
  const isExpanded = more.classList.toggle("expanded");
  btn.classList.toggle("active", isExpanded);
  const span = btn.querySelector("span");
  span.textContent = isExpanded
    ? translate("landing.features.showLess")
    : translate("landing.features.showMore");
}

function setupExclusiveAccordions() {
  document.querySelectorAll("details[name]").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      const group = detail.getAttribute("name");
      document.querySelectorAll(`details[name="${group}"]`).forEach((other) => {
        if (other !== detail && other.open) {
          other.removeAttribute("open");
        }
      });
    });
  });
}

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

        container
          .querySelectorAll(".lang-btn")
          .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        updateLandingTranslations();
        renderReviews();
      }

      if (window.scrollY > 100) {
        selector.classList.add("collapsed");
      }
    });
  });

  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      selector.classList.add("collapsed");
    } else {
      selector.classList.remove("collapsed");
    }
    lastScroll = window.scrollY;
  }, { passive: true });

  updateLandingTranslations();
}

function updateLandingTranslations() {
  document.title = translate("pageTitle");
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute("content", translate("pageDescription"));
  }

  document.querySelectorAll("[data-translate-key]").forEach(el => {
    const key = el.dataset.translateKey;
    el.innerHTML = translate(key);
  });

  document.querySelectorAll("[data-translate-content-key]").forEach(el => {
    const key = el.dataset.translateContentKey;
    const translatedHtml = translate(key);
    if (translatedHtml && translatedHtml !== key) {
      el.innerHTML = translatedHtml;
    }
  });

  document.querySelectorAll("[data-translate-placeholder-key]").forEach(el => {
    el.setAttribute("placeholder", translate(el.dataset.translatePlaceholderKey));
  });

  document.querySelectorAll("[data-translate-title-key]").forEach(el => {
    el.setAttribute("title", translate(el.dataset.translateTitleKey));
  });

  document.querySelectorAll("[data-translate-aria-label-key]").forEach(el => {
    el.setAttribute("aria-label", translate(el.dataset.translateAriaLabelKey));
  });

  updateSchemaTranslations();
}

function loadPublicRating() {
  const badge = document.getElementById("hero-rating-badge");
  const skeleton = document.getElementById("rating-skeleton");
  const content = document.getElementById("rating-content");

  if (!badge) return;
  badge.style.display = "flex";

  const timeoutLimit = setTimeout(() => {
    badge.style.transition = "opacity 0.4s";
    badge.style.opacity = "0";
    setTimeout(() => { badge.style.display = "none"; }, 400);
  }, 3000);

  fetch("https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/meta/public_rating.json")
    .then((res) => res.json())
    .then((data) => {
      clearTimeout(timeoutLimit);

      if (data && data.average) {
        document.getElementById("hero-rating-value").textContent = data.average;

        if (data.count < 10) {
          document.querySelector(".rating-text").style.display = "none";
          badge.style.padding = "8px 16px";
        } else {
          document.getElementById("hero-rating-count").textContent = data.count;
          document.querySelector(".rating-text").style.display = "";
        }

        skeleton.style.display = "none";
        content.style.display = "";
        content.style.opacity = "0";
        requestAnimationFrame(() => {
          content.style.transition = "opacity 0.3s";
          content.style.opacity = "1";
        });
      } else {
        badge.style.display = "none";
      }
    })
    .catch(() => {
      clearTimeout(timeoutLimit);
      badge.style.display = "none";
    });
}

function updateSchemaTranslations() {
  const schemas = document.querySelectorAll('script[type="application/ld+json"]');

  schemas.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent);

      if (data["@type"] === "VideoGame") {
        data.description = translate("schema.videoGameDescription") || data.description;
      }

      if (data["@type"] === "FAQPage" && data.mainEntity) {
        const faqKeys = ["landing.faq.q1", "landing.faq.q2", "landing.faq.q3", "landing.faq.q4", "landing.faq.q5"];
        const faqAnswerKeys = ["landing.faq.a1", "landing.faq.a2", "landing.faq.a3", "landing.faq.a4", "landing.faq.a5"];

        data.mainEntity = faqKeys.map((qKey, i) => {
          const question = translate(qKey);
          const answer = translate(faqAnswerKeys[i]);
          if (!question || question === qKey) return null;
          return {
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: answer
            }
          };
        }).filter(Boolean);
      }

      script.textContent = JSON.stringify(data);
    } catch (e) {}
  });
}

function setupFadeInAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll("section:not(#features), .screenshot-item").forEach(el => {
    el.classList.add("fade-in");
    observer.observe(el);
  });

  const contentWrapper = document.querySelector(".content-wrapper");
  if (contentWrapper) {
    window.addEventListener("scroll", () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = window.scrollY / maxScroll;
      const opacity = Math.max(0, 0.25 - (scrollPercent * 0.25));
      contentWrapper.style.setProperty("--bg-pattern-opacity", opacity);
    }, { passive: true });
  }
}

function setupScreenshotsCarousel() {
  const track = document.querySelector(".carousel-track");
  if (!track) return;

  const allItems = track.querySelectorAll(".screenshot-item");
  const dotsContainer = document.querySelector(".carousel-dots");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");
  let current = 0;

  function getVisibleItems() {
    return [...allItems].filter(item => {
      const style = window.getComputedStyle(item);
      return style.display !== "none";
    });
  }

  function buildDots() {
    dotsContainer.innerHTML = "";
    const items = getVisibleItems();
    items.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.classList.add("carousel-dot");
      if (i === 0) dot.classList.add("active");
      dot.setAttribute("aria-label", "Slide " + (i + 1));
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function goTo(index) {
    const items = getVisibleItems();
    current = Math.max(0, Math.min(index, items.length - 1));
    track.scrollTo({ left: items[current].offsetLeft - track.offsetLeft, behavior: "smooth" });
    updateDots();
    updateButtons(items.length);
  }

  function updateDots() {
    dotsContainer.querySelectorAll(".carousel-dot").forEach((d, i) => {
      d.classList.toggle("active", i === current);
    });
  }

  function updateButtons(total) {
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  track.addEventListener("scroll", () => {
    const items = getVisibleItems();
    const scrollLeft = track.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    items.forEach((item, i) => {
      const dist = Math.abs(item.offsetLeft - track.offsetLeft - scrollLeft);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    if (closest !== current) { current = closest; updateDots(); updateButtons(items.length); }
  });

  buildDots();
  updateButtons(getVisibleItems().length);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { current = 0; buildDots(); goTo(0); }, 200);
  });
}


let cachedReviewsData = null;

function loadReviews() {
  fetch("https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/game_reviews.json")
    .then(res => res.json())
    .then(data => {
      if (!data) return;
      cachedReviewsData = data;
      renderReviews();
    })
    .catch(() => {});
}

function renderReviews() {
  if (!cachedReviewsData) return;
  const container = document.getElementById("reviews-quotes");
  if (!container) return;

  const data = cachedReviewsData;
  const lang = currentLanguage || "pt";

  const reviews = Object.values(data)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (reviews.length === 0) {
    document.getElementById("reviews")?.style.setProperty("display", "none");
    return;
  }

  let html = "";
  reviews.forEach(review => {
    const comment = review.comment && review.comment.trim() !== ""
      ? (review.translations?.[lang] || review.comment)
      : null;
    const stars = "★".repeat(review.stars) + "☆".repeat(5 - review.stars);
    const name = review.playerName || translate("landing.reviews.anonymous");
    const date = new Date(review.createdAt);
    const timeAgo = getRelativeTime(date);

    html += `
      <div class="review-card${comment ? '' : ' review-card--no-comment'}">
        <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(review.stars)}${'<i class="far fa-star"></i>'.repeat(5 - review.stars)}</div>
        ${comment ? `<p class="review-comment">"${comment}"</p>` : ''}
        <span class="review-author"><span>— ${name} <span class="review-date">${timeAgo}</span></span>${review.version ? `<span class="review-version">v${review.version}</span>` : ''}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  const prevBtn = document.querySelector(".reviews-nav-prev");
  const nextBtn = document.querySelector(".reviews-nav-next");
  if (prevBtn && nextBtn) {
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);

    let currentReviewIndex = 0;

    function getReviewCards() {
      return container.querySelectorAll(".review-card");
    }

    function scrollToReviewIndex(index) {
      const cards = getReviewCards();
      if (!cards.length) return;
      currentReviewIndex = Math.max(0, Math.min(index, cards.length - 1));
      cards[currentReviewIndex].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      updateReviewNavButtons();
    }

    function updateReviewNavButtons() {
      const cards = getReviewCards();
      newPrev.disabled = currentReviewIndex <= 0;
      newNext.disabled = currentReviewIndex >= cards.length - 1;
    }

    newPrev.addEventListener("click", () => {
      scrollToReviewIndex(currentReviewIndex - 1);
    });
    newNext.addEventListener("click", () => {
      scrollToReviewIndex(currentReviewIndex + 1);
    });

    container.addEventListener("scroll", () => {
      const cards = getReviewCards();
      const scrollLeft = container.scrollLeft;
      let closest = 0;
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - container.offsetLeft - scrollLeft);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      currentReviewIndex = closest;
      updateReviewNavButtons();
    }, { passive: true });

    updateReviewNavButtons();
  }

  const ratingEl = document.getElementById("landing-rating-value");
  const countEl = document.getElementById("landing-reviews-count");
  const allReviews = Object.values(data);
  const avg = (allReviews.reduce((s, r) => s + (r.stars || 0), 0) / allReviews.length).toFixed(1);
  if (ratingEl) ratingEl.textContent = avg;
  if (countEl) countEl.firstChild.textContent = allReviews.length + " ";
}

function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  const labels = {
    pt: {
      today: "hoje",
      yesterday: "ontem",
      daysAgo: `há ${days} ${days === 1 ? "dia" : "dias"}`,
      weeksAgo: `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`,
      monthsAgo: `há ${months} ${months === 1 ? "mês" : "meses"}`,
    },
    en: {
      today: "today",
      yesterday: "yesterday",
      daysAgo: `${days} ${days === 1 ? "day" : "days"} ago`,
      weeksAgo: `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`,
      monthsAgo: `${months} ${months === 1 ? "month" : "months"} ago`,
    },
    es: {
      today: "hoy",
      yesterday: "ayer",
      daysAgo: `hace ${days} ${days === 1 ? "día" : "días"}`,
      weeksAgo: `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`,
      monthsAgo: `hace ${months} ${months === 1 ? "mes" : "meses"}`,
    },
  };

  const l = labels[currentLanguage] || labels.pt;

  if (days === 0) return l.today;
  if (days === 1) return l.yesterday;
  if (days < 7) return l.daysAgo;
  if (days < 30) return l.weeksAgo;
  return l.monthsAgo;
}


function trackCountryVisit() {
  if (sessionStorage.getItem("metricsTracked_landing")) return;
  if (/bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|semrushbot|lighthouse|headlesschrome|pagespeed|google-inspectiontool|mediapartners-google|adsbot-google|google-adwords|google-ads|googleadsense|apis-google|feedfetcher-google/i.test(navigator.userAgent)) return;
  sessionStorage.setItem("metricsTracked_landing", "1");

  var lang = currentLanguage || "pt";
  var dbUrl = "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com";
  var updates = {};

  if (!sessionStorage.getItem("metricsTracked_global")) {
    sessionStorage.setItem("metricsTracked_global", "1");
    updates["metrics/language_visits/" + lang] = { ".sv": { "increment": 1 } };
    var deviceInfo = getDeviceInfo();
    updates["metrics/device_visits/" + deviceInfo.os] = { ".sv": { "increment": 1 } };
    updates["metrics/device_type_visits/" + deviceInfo.type] = { ".sv": { "increment": 1 } };
  }

  fetch("https://api.country.is/")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.country) {
        updates["metrics/country_visits/landing/" + data.country] = { ".sv": { "increment": 1 } };
        updates["metrics/country_last_seen/" + data.country] = { ".sv": "timestamp" };
      }
      fetch(dbUrl + "/.json", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      }).catch(function() {});
    })
    .catch(function() {
      fetch(dbUrl + "/.json", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      }).catch(function() {});
    });
}

function getDeviceInfo() {
  var ua = navigator.userAgent;
  var os = "other";
  if (/Android/i.test(ua)) os = "android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "ios";
  else if (/Windows/i.test(ua)) os = "windows";
  else if (/Mac/i.test(ua)) os = "mac";
  else if (/Linux/i.test(ua)) os = "linux";

  var type = "desktop";
  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) type = "mobile";
  else if (/Tablet|iPad/i.test(ua)) type = "tablet";

  return { os: os, type: type };
}
