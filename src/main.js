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

const { geoEurope, geoEurope1900, elections } = await loadAllData();

let currentYear = 1900;

const europeMapEl = document.querySelector('#europe-map');
const countryDetailEl = document.querySelector('#country-detail');

initEuropeMap(europeMapEl, { geoEurope, geoEurope1900 }, elections, (iso2, feature) => {
  showCountryDetail(iso2, feature, currentYear);
});

initCountryDetail({
  panel: countryDetailEl,
  elections,
  onShow: (feature) => zoomToFeature(feature),
  onClose: () => resetZoom(),
});

initEuropeScroll(elections, (year) => {
  currentYear = year;
  updateEuropeMap(year);
  updateCountryDetail(year);
});
