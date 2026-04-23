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
} from './modules/switzerland-map.js';
import { initSwitzerlandScroll } from './modules/switzerland-scroll.js';

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

const { geoEurope, geoEurope1900, geoSwissCantons, elections } = await loadAllData();

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

const switzerlandMapEl = document.querySelector('#switzerland-map');
if (switzerlandMapEl && geoSwissCantons) {
  initSwitzerlandMap(switzerlandMapEl, geoSwissCantons, (feature) => {
    // Future: open canton detail view (maquette 4-cantonClicked)
    console.log('canton clicked:', feature.properties.name);
  });
  initSwitzerlandScroll((year) => {
    updateSwitzerlandMap(year);
  });
}

// Gentle fade-in the first time a major section enters view.
const fadeSections = document.querySelectorAll('#europe, #switzerland');
fadeSections.forEach((el) => el.classList.add('section-fade'));
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        sectionObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.08 },
);
fadeSections.forEach((el) => sectionObserver.observe(el));
