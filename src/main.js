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

if (switzerlandMapEl && geoSwissCantons) {
  initSwitzerlandMap(switzerlandMapEl, geoSwissCantons, cantonsElections, (feature) => {
    showCantonDetail(feature.properties.kantonsnummer, feature, currentSwissYear);
    zoomToCanton(feature);
  });
  initSwitzerlandScroll((year) => {
    currentSwissYear = year;
    updateSwitzerlandMap(year);
    updateCantonDetail(year);
  });
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
