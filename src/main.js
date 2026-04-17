import 'normalize.css';
import Lenis from 'lenis';
import { loadAllData } from './modules/data-loader.js';
import { initEuropeMap, updateEuropeMap } from './modules/europe-map.js';
import { initEuropeScroll } from './modules/scroll-sections.js';

// Inertie : défilement lissé + un peu plus rapide que le scroll natif
const lenis = new Lenis({
  duration: 0.9,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  wheelMultiplier: 1.4,
  touchMultiplier: 1.4,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const { geoEurope, geoEurope1900, elections } = await loadAllData();

initEuropeMap(document.querySelector('#europe-map'), { geoEurope, geoEurope1900 }, elections);
initEuropeScroll(elections, updateEuropeMap);
