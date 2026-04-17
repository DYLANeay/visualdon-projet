/**
 * Pipeline CSV → JSON (Manifesto Project + ParlGov → Carte Europe)
 *
 * INPUTS :
 *   - MPDataset_MPDS2025a.csv  (Manifesto Project, post-1945, has parfam)
 *   - view_election.csv        (ParlGov, covers pre-1945 gaps, no parfam)
 *
 * OUTPUT : elections.json
 *
 * Stratégie :
 *   1. Manifesto = source primaire (famille politique fiable via parfam)
 *   2. ParlGov remplit les trous pré-1945 + périodes non couvertes
 *   3. Familles politiques : parfam si Manifesto, sinon whitelist pays→parti
 *   4. Régimes dictatoriaux (Mussolini, Franco, Salazar) : entrées synthétiques
 *
 * Usage : node convert.js
 */

const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const MP_INPUT = path.join(__dirname, "MPDataset_MPDS2025a.csv");
const PG_INPUT = path.join(__dirname, "view_election.csv");
const OUTPUT_FILE = path.join(__dirname, "elections.json");

// Manifesto country_code → ISO2 (schéma MPDS2025a)
const MP_COUNTRY_MAP = {
  11: "SE", 12: "NO", 13: "DK", 14: "FI", 15: "IS",
  21: "BE", 22: "NL", 23: "LU",
  31: "FR", 32: "IT", 33: "ES", 34: "GR", 35: "PT",
  41: "DE", 42: "AT", 43: "CH",
  51: "GB", 52: "GB",
  53: "IE", 54: "MT", 55: "CY",
  75: "AL", 79: "BA", 80: "BG", 81: "HR", 82: "CZ",
  83: "EE", 86: "HU", 87: "LV", 88: "LT", 89: "MK",
  90: "MD", 91: "ME", 92: "PL", 93: "RO", 95: "RS",
  96: "SK", 97: "SI", 98: "UA",
};

const COUNTRY_NAMES = {
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", IS: "Iceland",
  BE: "Belgium", NL: "Netherlands", LU: "Luxembourg",
  FR: "France", IT: "Italy", ES: "Spain", GR: "Greece", PT: "Portugal",
  DE: "Germany", AT: "Austria", CH: "Switzerland",
  GB: "United Kingdom", IE: "Ireland", MT: "Malta", CY: "Cyprus",
  AL: "Albania", BA: "Bosnia", BG: "Bulgaria", HR: "Croatia", CZ: "Czech Republic",
  EE: "Estonia", HU: "Hungary", LV: "Latvia", LT: "Lithuania", MK: "North Macedonia",
  MD: "Moldova", ME: "Montenegro", PL: "Poland", RO: "Romania", RS: "Serbia",
  SK: "Slovakia", SI: "Slovenia", UA: "Ukraine",
};

// ParlGov ISO3 → ISO2 (filtré Europe)
const PG_COUNTRY_MAP = {
  DEU: "DE", FRA: "FR", ITA: "IT", ESP: "ES", PRT: "PT", GRC: "GR",
  GBR: "GB", IRL: "IE", NLD: "NL", BEL: "BE", LUX: "LU",
  AUT: "AT", CHE: "CH", SWE: "SE", NOR: "NO", DNK: "DK", FIN: "FI", ISL: "IS",
  POL: "PL", CZE: "CZ", SVK: "SK", HUN: "HU", ROU: "RO", BGR: "BG",
  EST: "EE", LVA: "LV", LTU: "LT", HRV: "HR", SVN: "SI", SRB: "RS",
  UKR: "UA", ALB: "AL", MKD: "MK", BIH: "BA", MNE: "ME", MDA: "MD",
  CYP: "CY", MLT: "MT",
};

// parfam → label
const FAMILY_MAP = {
  "10": "Ecologiste",
  "20": "Communiste/Extrême gauche",
  "30": "Socialiste/Social-démocrate",
  "40": "Libéral",
  "50": "Chrétien-démocrate",
  "60": "Conservateur",
  "70": "Nationaliste/Extrême droite",
  "80": "Agraire/Centre",
  "90": "Régionaliste/Ethnique",
  "95": "Islamiste",
  "98": "Divers/Non classifié",
  "999": "Inconnu",
};

// Partis d'extrême droite (family_code = "70") par pays ISO2
// Utilisé pour les entrées ParlGov (pas de parfam natif)
const FAR_RIGHT_BY_COUNTRY = {
  AT: ["FPO", "FPÖ", "BZO", "BZÖ", "VdU"],
  BE: ["VB", "FN", "VlB", "FNb"],
  BG: ["Ataka", "VMRO", "Vazrazhdane", "NFSB"],
  CZ: ["SPD", "Usvit"],
  DE: ["NSDAP", "DNVP", "NPD", "DVU", "REP", "AfD"],
  DK: ["DF", "NB", "FrP"],
  ES: ["VOX", "FE-JONS", "FE"],
  FI: [], // PS est ambigu, on s'appuie sur Manifesto
  FR: ["FN", "RN", "MNR", "Reconquete", "Reconquête"],
  GB: ["BNP", "UKIP", "Reform"],
  GR: ["LAOS", "XA", "EL"],
  HU: ["Jobbik", "MH", "MiHazank"],
  IT: ["MSI", "AN", "LN", "FdI", "FDI", "FT", "L"],
  LV: ["NA", "TB/LNNK"],
  NL: ["PVV", "FvD", "CD", "CP", "LPF"],
  NO: ["FrP"],
  PL: ["RN", "Konfederacja", "KORWiN"],
  PT: ["CHEGA", "CH", "PNR"],
  RO: ["AUR", "PRM", "SOS"],
  SE: ["SD"],
  SK: ["SNS", "LSNS", "KotlebaLSNS"],
  SI: ["SNS"],
  CH: ["SVP", "UDC", "SD", "DS", "EDU", "UDF"],
};

// Régimes dictatoriaux (partis uniques / absence d'élections libres)
// Ces entrées synthétiques colorent le pays via la logique "nearest previous year"
const REGIME_OVERRIDES = [
  { iso2: "IT", party_id: "SYN_PNF", abbrev: "PNF", name: "Partito Nazionale Fascista",
    elections: [
      { year: 1924, date: "1924-04-06", vote_pct: 64.9 },
      { year: 1929, date: "1929-03-24", vote_pct: 98.4 },
      { year: 1934, date: "1934-03-25", vote_pct: 99.8 },
      { year: 1946, date: "1946-06-02", vote_pct: null }, // fin régime (proclamation République)
    ],
  },
  { iso2: "ES", party_id: "SYN_FET", abbrev: "FET-JONS", name: "Falange Española / Movimiento Nacional",
    elections: [
      { year: 1939, date: "1939-04-01", vote_pct: 99.0 },
      { year: 1966, date: "1966-12-14", vote_pct: 95.9 },
      { year: 1976, date: "1976-12-15", vote_pct: null }, // fin régime (référendum transition)
    ],
  },
  { iso2: "PT", party_id: "SYN_UN", abbrev: "UN", name: "União Nacional (Estado Novo)",
    elections: [
      { year: 1934, date: "1934-12-16", vote_pct: 99.5 },
      { year: 1949, date: "1949-11-13", vote_pct: 99.0 },
      { year: 1969, date: "1969-10-26", vote_pct: 88.0 },
      { year: 1975, date: "1975-04-25", vote_pct: null }, // fin régime (Révolution des Œillets)
    ],
  },
  { iso2: "GR", party_id: "SYN_JUNTA", abbrev: "Junte", name: "Régime des colonels",
    elections: [
      { year: 1968, date: "1968-09-29", vote_pct: 92.0 },
      { year: 1974, date: "1974-11-17", vote_pct: null }, // fin régime (Metapolitefsi)
    ],
  },
  { iso2: "DE", party_id: "SYN_NSDAP", abbrev: "NSDAP", name: "NSDAP (Troisième Reich)",
    elections: [
      { year: 1933, date: "1933-11-12", vote_pct: 92.1 },
      { year: 1936, date: "1936-03-29", vote_pct: 98.8 },
      { year: 1938, date: "1938-04-10", vote_pct: 99.0 },
      { year: 1946, date: "1946-05-08", vote_pct: null }, // fin régime (capitulation / dénazification)
    ],
  },
];

// ──────────────────────────────────────────────
// CSV PARSER (robuste : guillemets + sauts de ligne embarqués)
// ──────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.length >= headers.length).map((r) => {
    const o = {};
    for (let j = 0; j < headers.length; j++) o[headers[j]] = r[j] ?? "";
    return o;
  });
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function cleanVal(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "NA" || s === "" ? null : s;
}

function toNumber(v) {
  const s = cleanVal(v);
  if (s === null) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function round2(n) { return Math.round(n * 100) / 100; }

// Normalise un abbrev (retire accents/tirets) pour le matching extrême droite
function normAbbrev(a) {
  if (!a) return "";
  return a.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s\-\/]/g, "").toUpperCase();
}

function isFarRightParlGov(iso2, abbrev) {
  const list = FAR_RIGHT_BY_COUNTRY[iso2] || [];
  const n = normAbbrev(abbrev);
  return list.some((a) => normAbbrev(a) === n);
}

// ──────────────────────────────────────────────
// ÉTAPE 1 — Manifesto Project
// ──────────────────────────────────────────────
console.log("📂 Lecture Manifesto…");
const mpRaw = fs.readFileSync(MP_INPUT, "utf-8");
const mpRows = rowsToObjects(parseCSV(mpRaw));
console.log(`   ${mpRows.length} lignes.`);

const result = {};

// Index des (iso2, date) déjà couverts par Manifesto — pour éviter les doublons ParlGov
const mpDatesByCountry = {}; // iso2 → Set<"YYYY-MM-DD">

console.log("🌍 Traitement Manifesto…");
let mpKept = 0;
for (const row of mpRows) {
  const code = parseInt(row.country, 10);
  const iso2 = MP_COUNTRY_MAP[code];
  if (!iso2) continue;
  mpKept++;

  const pervote = toNumber(row.pervote);
  const absseat = toNumber(row.absseat);
  const totseats = toNumber(row.totseats);
  const rile = toNumber(row.rile);

  let seatsPct = null;
  if (absseat !== null && totseats !== null && totseats > 0) {
    seatsPct = round2((absseat / totseats) * 100);
  }

  const dateRaw = cleanVal(row.date);
  const year = dateRaw ? parseInt(String(dateRaw).substring(0, 4), 10) : null;
  // edate Manifesto : "DD/MM/YYYY" → on normalise en "YYYY-MM-DD"
  const edateRaw = cleanVal(row.edate);
  let electionDate = null;
  if (edateRaw) {
    const m = edateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) electionDate = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    else electionDate = edateRaw;
  }

  const partyId = cleanVal(row.party);
  const partyName = cleanVal(row.partyname);
  const partyAbbrev = cleanVal(row.partyabbrev);
  const parfamRaw = cleanVal(row.parfam);
  const familyCode = parfamRaw;
  const familyLabel = FAMILY_MAP[parfamRaw] || "Inconnu";

  if (!result[iso2]) result[iso2] = { name: COUNTRY_NAMES[iso2] || iso2, parties: {} };

  const pid = `mp_${partyId}`;
  if (!result[iso2].parties[pid]) {
    result[iso2].parties[pid] = {
      name: partyName, abbrev: partyAbbrev,
      family_code: familyCode, family: familyLabel,
      source: "manifesto",
      elections: [],
    };
  }
  const party = result[iso2].parties[pid];
  if (partyName) party.name = partyName;
  if (partyAbbrev) party.abbrev = partyAbbrev;
  if (familyCode) { party.family_code = familyCode; party.family = familyLabel; }

  party.elections.push({
    year, date: electionDate, vote_pct: pervote,
    seats_won: absseat !== null ? Math.round(absseat) : null,
    total_seats: totseats !== null ? Math.round(totseats) : null,
    seats_pct: seatsPct, rile_score: rile,
  });

  if (electionDate) {
    (mpDatesByCountry[iso2] = mpDatesByCountry[iso2] || new Set()).add(electionDate);
  }
}
console.log(`   ${mpKept} lignes Manifesto retenues.`);

// ──────────────────────────────────────────────
// ÉTAPE 2 — ParlGov (remplit les trous)
// ──────────────────────────────────────────────
console.log("📂 Lecture ParlGov…");
const pgRaw = fs.readFileSync(PG_INPUT, "utf-8");
const pgRows = rowsToObjects(parseCSV(pgRaw));
console.log(`   ${pgRows.length} lignes.`);

let pgKept = 0, pgSkipped = 0;
for (const row of pgRows) {
  if (row.type !== "parliament") continue;
  const iso2 = PG_COUNTRY_MAP[row.country];
  if (!iso2) continue;

  const date = cleanVal(row.date); // YYYY-MM-DD
  if (!date) continue;

  // Skip si Manifesto couvre déjà cette date exacte
  if (mpDatesByCountry[iso2] && mpDatesByCountry[iso2].has(date)) { pgSkipped++; continue; }

  const year = parseInt(date.substring(0, 4), 10);
  const voteShare = toNumber(row.vote_share);
  const seats = toNumber(row.seats);
  const partyAbbrev = cleanVal(row.party);
  const partyId = cleanVal(row.party_id) || cleanVal(row.id);
  if (!partyId) continue;

  const farRight = isFarRightParlGov(iso2, partyAbbrev);
  const familyCode = farRight ? "70" : "98";

  if (!result[iso2]) result[iso2] = { name: COUNTRY_NAMES[iso2] || iso2, parties: {} };

  const pid = `pg_${partyId}`;
  if (!result[iso2].parties[pid]) {
    result[iso2].parties[pid] = {
      name: partyAbbrev, abbrev: partyAbbrev,
      family_code: familyCode, family: FAMILY_MAP[familyCode],
      source: "parlgov",
      elections: [],
    };
  }
  result[iso2].parties[pid].elections.push({
    year, date, vote_pct: voteShare,
    seats_won: seats !== null ? Math.round(seats) : null,
    total_seats: null, seats_pct: null, rile_score: null,
  });
  pgKept++;
}
console.log(`   ${pgKept} entrées ParlGov ajoutées (${pgSkipped} dédupliquées).`);

// ──────────────────────────────────────────────
// ÉTAPE 3 — Régimes dictatoriaux
// ──────────────────────────────────────────────
console.log("⚫ Ajout des régimes dictatoriaux…");
for (const reg of REGIME_OVERRIDES) {
  if (!result[reg.iso2]) result[reg.iso2] = { name: COUNTRY_NAMES[reg.iso2] || reg.iso2, parties: {} };
  const pid = reg.party_id;
  result[reg.iso2].parties[pid] = {
    name: reg.name, abbrev: reg.abbrev,
    family_code: "70", family: FAMILY_MAP["70"],
    source: "regime",
    elections: reg.elections.map((e) => ({
      year: e.year, date: e.date, vote_pct: e.vote_pct,
      seats_won: null, total_seats: null, seats_pct: null, rile_score: null,
    })),
  };
}

// ──────────────────────────────────────────────
// Tri final
// ──────────────────────────────────────────────
for (const iso2 of Object.keys(result)) {
  for (const pid of Object.keys(result[iso2].parties)) {
    result[iso2].parties[pid].elections.sort((a, b) => (a.year || 0) - (b.year || 0));
  }
}

const output = { elections: result, evenements: [] };
console.log("💾 Écriture elections.json…");
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

// Stats
const nbCountries = Object.keys(result).length;
let nbParties = 0, nbElections = 0, nbFarRight = 0;
for (const iso2 of Object.keys(result)) {
  const parties = Object.values(result[iso2].parties);
  nbParties += parties.length;
  for (const p of parties) {
    nbElections += p.elections.length;
    if (p.family_code === "70") nbFarRight++;
  }
}
console.log(`\n✅ Terminé !`);
console.log(`   📊 ${nbCountries} pays`);
console.log(`   🏛️  ${nbParties} partis (${nbFarRight} extrême droite)`);
console.log(`   🗳️  ${nbElections} entrées électorales`);
