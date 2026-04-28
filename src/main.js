import 'normalize.css';
import Lenis from 'lenis';
import { loadEuropeData, loadSwitzerlandData } from './modules/data-loader.js';
import { initThemeToggle } from './modules/theme-toggle.js';
import {
  initEuropeMap,
  updateEuropeMap,
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
  zoomToCanton,
  resetCantonZoom,
} from './modules/switzerland-map.js';
import { initSwitzerlandScroll } from './modules/switzerland-scroll.js';
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
    const dots = Array.from(document.querySelectorAll('.timeline-dot'));
    if (dots.length === 0) return;

    let targetDot = null;
    let targetYear = -Infinity;
    for (const dot of dots) {
      const dotYear = Number(dot.dataset.year);
      if (!Number.isFinite(dotYear)) continue;
      if (dotYear <= year && dotYear > targetYear) {
        targetYear = dotYear;
        targetDot = dot;
      }
    }

    if (!targetDot) {
      targetDot = dots[0];
    }

    dots.forEach((dot) => dot.classList.remove('active'));
    targetDot?.classList.add('active');
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

  initEuropeScroll(elections, (year) => {
    currentYear = year;
    updateEuropeMap(year);
    updateCountryDetail(year);
    updateEventTiles(year);
  });

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

    const swissScroll = initSwitzerlandScroll((time) => {
      currentSwissYear = new Date(time).getFullYear();
      updateSwitzerlandMap(currentSwissYear);
      updateCantonDetail(currentSwissYear);
      updateSwissEventTiles(time);
    }, switzerlandAllDatesMs);

    if (swissScroll) _stopSwissPlay = swissScroll.stopPlaying;

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
  const obs = new MutationObserver(() => {
    if (eventModal.open) lenis.stop();
    else lenis.start();
  });
  obs.observe(eventModal, { attributes: true, attributeFilter: ['open'] });
}

// ── Redraw maps on theme change (only if initialized) ───────────────────────

window.addEventListener('themechange', () => {
  if (europeReady) updateEuropeMap(currentYear);
  if (switzerlandReady) updateSwitzerlandMap(currentSwissYear);
});
