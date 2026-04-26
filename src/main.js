import 'normalize.css';
import Lenis from 'lenis';
import { loadAllData } from './modules/data-loader.js';
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

const { geoEurope, geoEurope1900, geoSwissCantons, elections, nopasaran, cantonsElections } = await loadAllData();

let currentYear = 1900;

const europeMapEl = document.querySelector('#europe-map');
const countryDetailEl = document.querySelector('#country-detail');
const europeGotoBtn = document.querySelector('[data-goto="switzerland"]');
const swissGotoBtn = document.querySelector('[data-goto="europe"]');

initEuropeMap(europeMapEl, { geoEurope, geoEurope1900 }, elections, (iso2, feature) => {
  showCountryDetail(iso2, feature, currentYear);
  setEventTilesFocus(iso2);
});

initCountryDetail({
  panel: countryDetailEl,
  elections,
  onShow: (feature) => {
    zoomToFeature(feature);
    europeGotoBtn?.classList.add('hidden');
  },
  onClose: () => {
    resetZoom();
    setEventTilesFocus(null);
    europeGotoBtn?.classList.remove('hidden');
  },
});

initEventTiles({
  mapContainer: europeMapEl,
  overlayLeft: document.querySelector('#event-tiles-left'),
  overlayRight: document.querySelector('#event-tiles-right'),
  svgLines: document.querySelector('#event-tiles-lines'),
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
    europeGotoBtn?.classList.remove('hidden');
  }
});

let currentSwissYear = 1999;
let switzerlandAllDatesMs = [];
if (nopasaran && nopasaran.eventsByYear) {
  const allEvents = [];
  for (const yearStr in nopasaran.eventsByYear) {
    allEvents.push(...nopasaran.eventsByYear[yearStr]);
  }
  const eventDates = allEvents.map(e => new Date(e.date).getTime()).sort((a,b) => a - b);
  if (eventDates.length > 0) {
    // Start slightly before the first event to have some padding
    const minTime = new Date(new Date(eventDates[0]).getFullYear(), 0, 1).getTime();
    const maxTime = eventDates[eventDates.length - 1];
    const allDatesSet = new Set(eventDates);
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    for (let t = minTime; t <= maxTime; t += WEEK_MS) {
      allDatesSet.add(t);
    }
    switzerlandAllDatesMs = Array.from(allDatesSet).sort((a,b) => a - b);
  }
}

const switzerlandMapEl = document.querySelector('#switzerland-map');
const cantonDetailEl = document.querySelector('#canton-detail');

let _stopSwissPlay = null;

if (switzerlandMapEl && geoSwissCantons) {
  initSwitzerlandMap(switzerlandMapEl, geoSwissCantons, cantonsElections, (feature) => {
    // Stop autoplay when user clicks a canton so the fill transition
    // doesn't cancel the zoom transition.
    if (_stopSwissPlay) _stopSwissPlay();
    showCantonDetail(feature.properties.kantonsnummer, feature, currentSwissYear);
    zoomToCanton(feature);
    setSwissEventTilesFocus(feature.properties.kantonsnummer);
    swissGotoBtn?.classList.add('hidden');
  });
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
      swissGotoBtn?.classList.remove('hidden');
    }
  });
}

initSwissEventTiles({
  mapContainer: switzerlandMapEl,
  overlayLeft: document.querySelector('#event-tiles-switzerland-left'),
  overlayRight: document.querySelector('#event-tiles-switzerland-right'),
  svgLines: document.querySelector('#event-tiles-switzerland-lines'),
  nopasaranData: nopasaran
});

if (cantonDetailEl && cantonsElections) {
  initCantonDetail({
    panel: cantonDetailEl,
    cantonsElections,
    onClose: () => {
      resetCantonZoom();
      setSwissEventTilesFocus(null);
      swissGotoBtn?.classList.remove('hidden');
    },
  });
}

// Gentle fade-in the first time each sticky visual enters view.
// We observe the inner sticky panel (one viewport tall) rather than the outer
// section (many viewports tall), otherwise the intersection ratio never
// crosses any reasonable threshold.
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
// Reset focus / detail panel when the user scrolls out of a section.
// We observe the inner sticky panels (100vh tall) rather than the outer
// sections (thousands of vh), because with threshold 0.05 the tall sections
// are almost always considered "intersecting".
const europeSticky = document.querySelector('#europe > .sticky');
const swissSticky = document.querySelector('#switzerland > .sticky');
const sectionResetObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) continue; // only act when leaving
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

// Quick-jump buttons between Europe and Switzerland maps.
document.querySelectorAll('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.querySelector(`#${btn.dataset.goto}`);
    if (target) lenis.scrollTo(target, { duration: 1.2 });
  });
});
