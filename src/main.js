import { loadJSON } from './api.js'

const dataEuElections = await loadJSON('../data/elections/elections.js')
const dataNoPasaran = await loadJSON('../data/nopasaran/data.json')

console.log("hello");
