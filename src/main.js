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

const { geoEurope, geoEurope1900, geoSwissCantons, elections, cantonsElections } = await loadAllData();

let currentYear = 1900;

const europeMapEl = document.querySelector('#europe-map');
const countryDetailEl = document.querySelector('#country-detail');

initEuropeMap(europeMapEl, { geoEurope, geoEurope1900 }, elections, (iso2, feature) => {
  showCountryDetail(iso2, feature, currentYear);
  setEventTilesFocus(iso2);
});

initCountryDetail({
  panel: countryDetailEl,
  elections,
  onShow: (feature) => zoomToFeature(feature),
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
});

initEuropeScroll(elections, (year) => {
  currentYear = year;
  updateEuropeMap(year);
  updateCountryDetail(year);
  updateEventTiles(year);
});

let currentSwissYear = 1999;

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
  });
  const swissScroll = initSwitzerlandScroll((year) => {
    currentSwissYear = year;
    updateSwitzerlandMap(year);
    updateCantonDetail(year);
  });
  if (swissScroll) _stopSwissPlay = swissScroll.stopPlaying;
}

if (cantonDetailEl && cantonsElections) {
  initCantonDetail({
    panel: cantonDetailEl,
    cantonsElections,
    onClose: () => resetCantonZoom(),
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
      }
    }
  },
  { threshold: 0.1 },
);
if (europeSticky) sectionResetObserver.observe(europeSticky);
if (swissSticky) sectionResetObserver.observe(swissSticky);
