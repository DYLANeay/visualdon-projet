import { loadJSON } from './api.js'

const dataEuElections = await loadJSON('../data/elections/elections.js')
const dataNoPasaran = await loadJSON('../data/nopasaran/data.json')

import "normalize.css";

console.log("hello");
