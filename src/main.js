import 'normalize.css';
import { loadAllData } from './modules/data-loader.js';
import { initEuropeMap, updateEuropeMap } from './modules/europe-map.js';
import { initEuropeScroll } from './modules/scroll-sections.js';

const { geoEurope, geoEurope1900, elections } = await loadAllData();

initEuropeMap(document.querySelector('#europe-map'), { geoEurope, geoEurope1900 }, elections);
initEuropeScroll(elections, updateEuropeMap);
