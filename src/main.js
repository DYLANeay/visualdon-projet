import 'normalize.css';
import Lenis from 'lenis';
import { loadEuropeData, loadSwitzerlandData } from './modules/data-loader.js';
import { initThemeToggle } from './modules/theme-toggle.js';
import {
  initEuropeMap,
  updateEuropeMap,
  refreshEuropeMapTheme,
  zoomToFeature,
  resetZoom,
} from './modules/europe-map.js';
import { initEuropeScroll } from './modules/scroll-sections.js';
import {
  initCountryDetail,
  showCountryDetail,
  updateCountryDetail,
  hideCountryDetail,
} from './modules/country-detail.js';
import {
  initEventTiles,
  updateEventTiles,
  setEventTilesFocus,
  openEventModal,
} from './modules/event-tiles.js';
import {
  initSwitzerlandMap,
  updateSwitzerlandMap,
  refreshSwitzerlandMapTheme,
  zoomToCanton,
  resetCantonZoom,
} from './modules/switzerland-map.js';
import {
  initSwitzerlandScroll,
  formatDate,
} from './modules/switzerland-scroll.js';
import {
  initCantonDetail,
  showCantonDetail,
  updateCantonDetail,
  hideCantonDetail,
} from './modules/canton-detail.js';
import {
  initSwissEventTiles,
  updateSwissEventTiles,
  setSwissEventTilesFocus,
} from './modules/switzerland-events.js';
import { initCityRuralChart } from './modules/city-rural-chart.js';
import { initLanguageRegionsChart } from './modules/language-regions-chart.js';
import { initHorizontalScroll } from './modules/horizontal-scroll.js';
import { renderSwissLegend } from './modules/swiss-families.js';

// Inertie : défilement lissé + un peu plus rapide que le scroll natif
const lenis = new Lenis({
  duration: 0.9,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  wheelMultiplier: 2.8,
  touchMultiplier: 2.8,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

// Handle the inertia system (Lenis) ONLY for #europe and #switzerland
function updateLenisState() {
  const sections = document.querySelectorAll('#europe, #switzerland');
  let inSmoothSection = false;
  
  // Use scrollY instead of getBoundingClientRect when possible, but getBoundingClientRect is fine
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      inSmoothSection = true;
      break;
    }
  }
  
  if (inSmoothSection) {
    if (!lenis.options.smoothWheel) {
      lenis.options.smoothWheel = true;
      lenis.options.syncTouch = true;
    }
  } else {
    if (lenis.options.smoothWheel) {
      lenis.options.smoothWheel = false;
      lenis.options.syncTouch = false;
    }
  }
}

window.addEventListener('scroll', updateLenisState, { passive: true });
lenis.on('scroll', updateLenisState);
updateLenisState();



requestAnimationFrame(raf);

// Theme toggle
const themeToggleBtn = document.querySelector('#theme-toggle');
initThemeToggle(themeToggleBtn);

// Nav: add .is-scrolled class when past the hero
const siteNav = document.querySelector('.site-nav');

function syncSiteNavOffset() {
  if (!siteNav) return;
  const navHeight = Math.ceil(siteNav.getBoundingClientRect().height);
  document.documentElement.style.setProperty(
    '--site-nav-offset',
    `${navHeight + 12}px`,
  );
}

syncSiteNavOffset();
window.addEventListener('resize', syncSiteNavOffset);
if (document.fonts?.ready) {
  document.fonts.ready.then(syncSiteNavOffset).catch(() => {});
}

lenis.on('scroll', ({ scroll }) => {
  siteNav?.classList.toggle('is-scrolled', scroll > 80);
});

// ── Loading indicators ──────────────────────────────────────────────────────

function showLoading(containerId) {
  const el = document.querySelector(`#${containerId}`);
  if (!el || el.querySelector('.loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML =
    '<div class="loading-spinner"></div><span class="loading-text">Chargement des données…</span>';
  el.appendChild(overlay);
}

function hideLoading(containerId) {
  const el = document.querySelector(`#${containerId}`);
  if (!el) return;
  const overlay = el.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

// ── Europe section (lazy-init, preloaded immediately) ───────────────────────

let currentYear = 1900;
let europeReady = false;

async function bootEurope() {
  if (europeReady) return;
  const europeMapEl = document.querySelector('#europe-map');
  const countryDetailEl = document.querySelector('#country-detail');

  showLoading('europe-map');

  const { elections, geoEurope, geoEurope1900, wikipediaEvents } =
    await loadEuropeData();

  hideLoading('europe-map');
  europeReady = true;

  const countryEventsByIso = wikipediaEvents?.country_events || {};

  function _resolveEuropeYearForJump(targetYear) {
    const year = Number(targetYear);
    if (!Number.isFinite(year)) return null;

    const years = Array.from(document.querySelectorAll('.europe-step'))
      .map((el) => Number(el.dataset.year))
      .filter((value) => Number.isFinite(value));
    if (years.length === 0) return year;

    let closest = years[0];
    let minDelta = Math.abs(closest - year);
    for (const value of years) {
      const delta = Math.abs(value - year);
      if (delta < minDelta) {
        minDelta = delta;
        closest = value;
      }
    }
    return closest;
  }

  function _setActiveEuropeTimelineDot(year) {
    const slider = document.querySelector('#europe-timeline-slider');
    if (slider && slider.value !== String(year)) {
      slider.value = year;
    }
  }

  function jumpEuropeToYear(targetYear) {
    const year = _resolveEuropeYearForJump(targetYear);
    if (!Number.isFinite(year)) return;

    currentYear = year;
    updateEuropeMap(year);
    updateCountryDetail(year);
    updateEventTiles(year);

    const yearLabel = document.querySelector('#europe-year');
    if (yearLabel) yearLabel.textContent = String(year);
    _setActiveEuropeTimelineDot(year);

    const step = document.querySelector(`.europe-step[data-year="${year}"]`);
    if (step) {
      lenis.scrollTo(step, { duration: 0.9 });
    }
  }

  initEuropeMap(
    europeMapEl,
    { geoEurope, geoEurope1900 },
    elections,
    (iso2, feature) => {
      showCountryDetail(iso2, feature, currentYear);
      setEventTilesFocus(iso2);
    },
  );

  initCountryDetail({
    panel: countryDetailEl,
    elections,
    countryEventsByIso,
    onJumpToYear: jumpEuropeToYear,
    onOpenModal: openEventModal,
    onShow: (feature) => {
      zoomToFeature(feature);
    },
    onClose: () => {
      resetZoom();
      setEventTilesFocus(null);
    },
  });

  initEventTiles({
    mapContainer: europeMapEl,
    overlayLeft: document.querySelector('#event-tiles-left'),
    overlayRight: document.querySelector('#event-tiles-right'),
    svgLines: document.querySelector('#event-tiles-lines'),
    wikipediaEvents,
    countryEvents: wikipediaEvents?.country_events || {},
  });

  let isEuropeSliding = false;

  initEuropeScroll(elections, (year) => {
    if (isEuropeSliding) return;
    currentYear = year;
    updateEuropeMap(year);
    updateCountryDetail(year);
    updateEventTiles(year);
    _setActiveEuropeTimelineDot(year);
  });

  const europeSlider = document.querySelector('#europe-timeline-slider');
  if (europeSlider) {
    europeSlider.addEventListener('mousedown', () => (isEuropeSliding = true));
    europeSlider.addEventListener(
      'touchstart',
      () => (isEuropeSliding = true),
      { passive: true },
    );
    window.addEventListener('mouseup', () => (isEuropeSliding = false));
    window.addEventListener('touchend', () => (isEuropeSliding = false), {
      passive: true,
    });

    europeSlider.addEventListener('input', (e) => {
      const year = Number(e.target.value);
      currentYear = year;
      updateEuropeMap(year);
      updateCountryDetail(year);
      updateEventTiles(year);

      const yearLabel = document.querySelector('#europe-year');
      if (yearLabel) yearLabel.textContent = String(year);

      const steps = Array.from(document.querySelectorAll('.europe-step'));
      let targetStep = steps[0];
      let maxYear = -Infinity;
      for (const step of steps) {
        const stepYear = Number(step.dataset.year);
        if (stepYear <= year && stepYear > maxYear) {
          maxYear = stepYear;
          targetStep = step;
        }
      }
      if (targetStep) {
        lenis.scrollTo(targetStep, { immediate: true });
      }
    });

    // Map arrow keys to intuitive timeline direction: ArrowUp = earlier year
    // (page scrolls UP toward 1900), ArrowDown = later year. Without this
    // override the native rotated/vertical slider increments value on
    // ArrowUp, which feels reversed to users expecting scroll semantics.
    const KEY_DELTA = {
      ArrowUp: -1,
      ArrowDown: +1,
      ArrowLeft: -1,
      ArrowRight: +1,
      PageUp: -5,
      PageDown: +5,
    };
    europeSlider.addEventListener('keydown', (e) => {
      if (!(e.key in KEY_DELTA)) return;
      e.preventDefault();
      const min = Number(europeSlider.min);
      const max = Number(europeSlider.max);
      const step = Number(europeSlider.step) || 1;
      const current = Number(europeSlider.value);
      const next = Math.min(
        max,
        Math.max(min, current + KEY_DELTA[e.key] * step),
      );
      if (next === current) return;
      europeSlider.value = String(next);
      europeSlider.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  europeMapEl.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'svg') {
      import('./modules/europe-map.js').then((m) => m.resetCountryZoom());
      hideCountryDetail();
      setEventTilesFocus(null);
    }
  });
}

// Start loading Europe data immediately — never blocks the page render.
bootEurope();

// ── Switzerland section (lazy-init when approaching viewport) ───────────────

let currentSwissYear = 1999;
let switzerlandReady = false;

function _buildSwissDateList(nopasaran) {
  const allDatesMs = [];
  if (nopasaran && nopasaran.eventsByYear) {
    const allEvents = [];
    for (const yearStr in nopasaran.eventsByYear) {
      allEvents.push(...nopasaran.eventsByYear[yearStr]);
    }
    const eventDates = allEvents
      .map((e) => new Date(e.date).getTime())
      .sort((a, b) => a - b);
    if (eventDates.length > 0) {
      const minTime = new Date(
        new Date(eventDates[0]).getFullYear(),
        0,
        1,
      ).getTime();
      const maxTime = eventDates[eventDates.length - 1];
      const allDatesSet = new Set(eventDates);
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      for (let t = minTime; t <= maxTime; t += WEEK_MS) {
        allDatesSet.add(t);
      }
      return Array.from(allDatesSet).sort((a, b) => a - b);
    }
  }
  return allDatesMs;
}

let _stopSwissPlay = null;

async function bootSwitzerland() {
  if (switzerlandReady) return;
  const switzerlandMapEl = document.querySelector('#switzerland-map');
  const cantonDetailEl = document.querySelector('#canton-detail');

  if (!switzerlandMapEl) return;

  showLoading('switzerland-map');

  const { geoSwissCantons, nopasaran, cantonsElections } =
    await loadSwitzerlandData();

  hideLoading('switzerland-map');
  switzerlandReady = true;

  const legendEl = document.querySelector('#switzerland-legend');
  if (legendEl) renderSwissLegend(legendEl);

  const switzerlandAllDatesMs = _buildSwissDateList(nopasaran);

  if (geoSwissCantons) {
    initSwitzerlandMap(
      switzerlandMapEl,
      geoSwissCantons,
      cantonsElections,
      (feature) => {
        if (_stopSwissPlay) _stopSwissPlay();
        showCantonDetail(
          feature.properties.kantonsnummer,
          feature,
          currentSwissYear,
        );
        zoomToCanton(feature);
        setSwissEventTilesFocus(feature.properties.kantonsnummer);
      },
    );

    let isSwissSliding = false;

    const swissScroll = initSwitzerlandScroll((time) => {
      if (isSwissSliding) return;
      currentSwissYear = new Date(time).getFullYear();
      updateSwitzerlandMap(currentSwissYear);
      updateCantonDetail(currentSwissYear);
      updateSwissEventTiles(time);
      const slider = document.querySelector('#switzerland-timeline-slider');
      if (slider) {
        const index = switzerlandAllDatesMs.indexOf(time);
        if (index !== -1 && slider.value !== String(index)) {
          slider.value = index;
        }
      }
    }, switzerlandAllDatesMs);

    if (swissScroll) _stopSwissPlay = swissScroll.stopPlaying;

    const swissSlider = document.querySelector('#switzerland-timeline-slider');
    if (swissSlider && switzerlandAllDatesMs.length > 0) {
      swissSlider.min = 0;
      swissSlider.max = switzerlandAllDatesMs.length - 1;
      swissSlider.step = 1;
      // Initialize position
      swissSlider.value = switzerlandAllDatesMs.length - 1;

      swissSlider.addEventListener('mousedown', () => (isSwissSliding = true));
      swissSlider.addEventListener(
        'touchstart',
        () => (isSwissSliding = true),
        { passive: true },
      );
      window.addEventListener('mouseup', () => (isSwissSliding = false));
      window.addEventListener('touchend', () => (isSwissSliding = false), {
        passive: true,
      });

      swissSlider.addEventListener('input', (e) => {
        if (_stopSwissPlay) _stopSwissPlay();
        const index = Number(e.target.value);
        const time = switzerlandAllDatesMs[index];
        const year = new Date(time).getFullYear();

        currentSwissYear = year;
        updateSwitzerlandMap(year);
        updateCantonDetail(year);
        updateSwissEventTiles(time);

        const yearLabel = document.querySelector('#switzerland-year');
        if (yearLabel) {
          yearLabel.textContent = formatDate(time);
          yearLabel.classList.add('is-date');
        }

        const targetStep = document.querySelector(
          `.switzerland-step[data-time="${time}"]`,
        );
        if (targetStep) {
          lenis.scrollTo(targetStep, { immediate: true });
        }
      });
    }

    switzerlandMapEl.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'svg') {
        resetCantonZoom();
        hideCantonDetail();
        setSwissEventTilesFocus(null);
      }
    });
  }

  initSwissEventTiles({
    mapContainer: switzerlandMapEl,
    overlayLeft: document.querySelector('#event-tiles-switzerland-left'),
    overlayRight: document.querySelector('#event-tiles-switzerland-right'),
    svgLines: document.querySelector('#event-tiles-switzerland-lines'),
    nopasaranData: nopasaran,
  });

  if (cantonDetailEl && cantonsElections) {
    initCantonDetail({
      panel: cantonDetailEl,
      cantonsElections,
      onClose: () => {
        resetCantonZoom();
        setSwissEventTilesFocus(null);
      },
    });
  }
}

const swissSection = document.querySelector('#switzerland');
if (swissSection) {
  const swissLoader = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          bootSwitzerland();
          swissLoader.disconnect();
        }
      }
    },
    { rootMargin: '600px 0px' },
  );
  swissLoader.observe(swissSection);
}

// ── Chapter 3: city-vs-rural chart (lazy-init when approaching viewport) ────

const cityRuralEl = document.querySelector('#city-rural-chart');
if (cityRuralEl) {
  let booted = false;
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !booted) {
          booted = true;
          initCityRuralChart(cityRuralEl);
          obs.disconnect();
        }
      }
    },
    { rootMargin: '400px 0px' },
  );
  obs.observe(cityRuralEl);
}

// ── Chapter 3 (suite): language regions chart (lazy-init when approaching viewport) ──

const languageRegionsEl = document.querySelector('#language-regions-chart');
if (languageRegionsEl) {
  let booted = false;
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !booted) {
          booted = true;
          initLanguageRegionsChart(languageRegionsEl);
          obs.disconnect();
        }
      }
    },
    { rootMargin: '400px 0px' },
  );
  obs.observe(languageRegionsEl);
}

// ── Horizontal scroll for city-rural + language-regions panels ──────────────

const horizontalApi = initHorizontalScroll();

// Single-click nav: hash anchors targeting sections inside the horizontal
// track need an explicit scrollY (native anchor scroll lands on the wrapper).
// Other anchors fall through to lenis.scrollTo(element).
for (const link of document.querySelectorAll('.site-nav-links a[href^="#"]')) {
  link.addEventListener('click', (e) => {
    const hash = link.getAttribute('href').slice(1);
    if (!hash) return;
    e.preventDefault();
    const targetY = horizontalApi?.scrollToSection?.(hash);
    if (typeof targetY === 'number') {
      lenis.scrollTo(targetY, { duration: 1.2 });
      return;
    }
    const el = document.getElementById(hash);
    if (el) lenis.scrollTo(el, { duration: 1.0 });
  });
}



// ── Gentle fade-in when each sticky visual enters view ──────────────────────

const fadeTargets = [
  document.querySelector('#europe > .sticky'),
  document.querySelector('#switzerland > .sticky'),
].filter(Boolean);
fadeTargets.forEach((el) => el.classList.add('section-fade'));
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        sectionObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 },
);
fadeTargets.forEach((el) => sectionObserver.observe(el));

// ── Reset focus / detail panel when the user scrolls out of a section ──────

const europeSticky = document.querySelector('#europe > .sticky');
const swissSticky = document.querySelector('#switzerland > .sticky');
const sectionResetObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) continue;
      const section = entry.target.closest('section');
      if (section?.id === 'europe') {
        hideCountryDetail();
        setEventTilesFocus(null);
      } else if (section?.id === 'switzerland') {
        hideCantonDetail();
        setSwissEventTilesFocus(null);
      }
    }
  },
  { threshold: 0.1 },
);
if (europeSticky) sectionResetObserver.observe(europeSticky);
if (swissSticky) sectionResetObserver.observe(swissSticky);

// ── Stop Lenis when the event modal is open ─────────────────────────────────

const eventModal = document.querySelector('#event-modal');
if (eventModal) {
  // lenis.stop() is no longer called because data-lenis-prevent is used on the modal inner content
}

// ── Redraw maps on theme change (only if initialized) ───────────────────────

window.addEventListener('themechange', () => {
  if (europeReady) refreshEuropeMapTheme();
  if (switzerlandReady) refreshSwitzerlandMapTheme();
});
