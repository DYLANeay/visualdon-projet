/*
 * Wikipedia event builder
 *
 * Builds a large event dataset for Europe with:
 * - balanced map-level events
 * - country-specific event collections
 * - far-right / general / swiss-implication typing
 * - lightweight relation graph extracted from article links
 *
 * Usage:
 *   node data/wikipedia/fetcher.js
 */

const fs = require('fs');
const path = require('path');

const API_ACTION = 'https://fr.wikipedia.org/w/api.php';
const API_REST = 'https://fr.wikipedia.org/api/rest_v1/page/summary/';
const OUTPUT_FILE = path.join(__dirname, 'events.json');

const CURRENT_YEAR = new Date().getFullYear();
const SEARCH_LIMIT = 20;
const MAX_CANDIDATE_TITLES = 1400;
const MAX_EUROPE_EVENTS = 350;
const MAX_COUNTRY_EVENTS = 120;
const MAX_EVENTS_PER_DECADE = 20;
const MIN_COUNTRY_EVENTS = 12;

const HEADERS = {
  'User-Agent': 'VisualDon-Projet/2.0 (educational, HEIG-VD)',
  Accept: 'application/json',
};

const EUROPE_COUNTRIES = {
  AL: { label: 'Albanie', keywords: ['albanie', 'albanais'] },
  AT: { label: 'Autriche', keywords: ['autriche', 'autrichien'] },
  BA: { label: 'Bosnie-Herzegovine', keywords: ['bosnie', 'herzegovine', 'bosniaque'] },
  BE: { label: 'Belgique', keywords: ['belgique', 'belge'] },
  BG: { label: 'Bulgarie', keywords: ['bulgarie', 'bulgare'] },
  BY: { label: 'Belarus', keywords: ['belarus', 'bielorussie', 'biélorussie'] },
  CH: { label: 'Suisse', keywords: ['suisse', 'helvetique', 'helvetes', 'helvétique', 'udc'] },
  CY: { label: 'Chypre', keywords: ['chypre', 'chypriote', 'elam', 'front populaire national'] },
  CZ: { label: 'Tchequie', keywords: ['tchequie', 'tcheque', 'tchéquie', 'tchèque'] },
  DE: { label: 'Allemagne', keywords: ['allemagne', 'allemand', 'afd'] },
  DK: { label: 'Danemark', keywords: ['danemark', 'danois'] },
  EE: { label: 'Estonie', keywords: ['estonie', 'estonien'] },
  ES: { label: 'Espagne', keywords: ['espagne', 'espagnol', 'franquisme', 'franco'] },
  FI: { label: 'Finlande', keywords: ['finlande', 'finlandais'] },
  FR: { label: 'France', keywords: ['france', 'francais', 'français', 'rassemblement national', 'front national'] },
  GB: { label: 'Royaume-Uni', keywords: ['royaume-uni', 'angleterre', 'britannique', 'ukip', 'britain'] },
  GR: { label: 'Grece', keywords: ['grece', 'grèce', 'grec', 'aube doree', 'aube dorée'] },
  HR: { label: 'Croatie', keywords: ['croatie', 'croate'] },
  HU: { label: 'Hongrie', keywords: ['hongrie', 'hongrois', 'fidesz', 'jobbik'] },
  IE: { label: 'Irlande', keywords: ['irlande', 'irlandais'] },
  IT: { label: 'Italie', keywords: ['italie', 'italien', 'mussolini', 'meloni', 'liga'] },
  LT: { label: 'Lituanie', keywords: ['lituanie', 'lituanien'] },
  LU: { label: 'Luxembourg', keywords: ['luxembourg', 'luxembourgeois'] },
  LV: { label: 'Lettonie', keywords: ['lettonie', 'letton'] },
  MD: { label: 'Moldavie', keywords: ['moldavie', 'moldave'] },
  ME: { label: 'Montenegro', keywords: ['montenegro', 'monténégro', 'montenegrin'] },
  MK: { label: 'Macedoine du Nord', keywords: ['macedoine', 'macédoine', 'north macedonia'] },
  NL: { label: 'Pays-Bas', keywords: ['pays-bas', 'neerlandais', 'néerlandais', 'wilders'] },
  NO: { label: 'Norvege', keywords: ['norvege', 'norvège', 'norvegien', 'norvégien'] },
  PL: { label: 'Pologne', keywords: ['pologne', 'polonais', 'pis'] },
  PT: { label: 'Portugal', keywords: ['portugal', 'portugais', 'chega'] },
  RO: { label: 'Roumanie', keywords: ['roumanie', 'roumain'] },
  RS: { label: 'Serbie', keywords: ['serbie', 'serbe'] },
  SE: { label: 'Suede', keywords: ['suede', 'suède', 'suedois', 'suédois'] },
  SI: { label: 'Slovenie', keywords: ['slovenie', 'slovénie', 'slovene', 'slovène'] },
  SK: { label: 'Slovaquie', keywords: ['slovaquie', 'slovaque'] },
  UA: { label: 'Ukraine', keywords: ['ukraine', 'ukrainien'] },
};

const BASE_EVENT_SEEDS = [
  // Core European far-right history
  { title: 'Marche sur Rome', year: 1922, country: 'IT', type: 'far-right', date: '1922-10-28' },
  { title: 'Incendie du Reichstag', year: 1933, country: 'DE', type: 'far-right', date: '1933-02-27' },
  { title: 'Nuit de Cristal', year: 1938, country: 'DE', type: 'far-right', date: '1938-11-09' },
  { title: 'Seconde Guerre mondiale', year: 1939, country: 'PL', type: 'general', date: '1939-09-01' },
  { title: 'Procès de Nuremberg', year: 1945, country: 'DE', type: 'far-right', date: '1945-11-20' },
  { title: 'Guerre froide', year: 1947, country: 'DE', type: 'general' },
  { title: 'Manifestations de 1968', year: 1968, country: 'FR', type: 'general' },
  { title: 'Chute du mur de Berlin', year: 1989, country: 'DE', type: 'general', date: '1989-11-09' },
  { title: 'Traité de Maastricht', year: 1992, country: 'NL', type: 'general', date: '1992-02-07' },
  { title: 'Traité de Lisbonne', year: 2007, country: 'PT', type: 'general', date: '2007-12-13' },
  { title: 'Crise migratoire en Europe', year: 2015, country: null, type: 'general' },
  { title: 'Invasion de l\'Ukraine par la Russie en 2022', year: 2022, country: 'UA', type: 'general', date: '2022-02-24' },
  { title: 'Pandemie de Covid-19', year: 2020, country: null, type: 'general', date: '2020-03-11' },
  // Swiss far-right
  { title: 'Action nationale (Suisse)', year: 1961, country: 'CH', type: 'swiss-far-right' },
  { title: 'James Schwarzenbach', year: 1970, country: 'CH', type: 'swiss-far-right' },
  { title: 'Union democratique du centre', year: 1971, country: 'CH', type: 'swiss-far-right' },
  { title: 'Christoph Blocher', year: 1977, country: 'CH', type: 'swiss-far-right' },
  { title: 'Référendum sur l\'immigration de masse', year: 2014, country: 'CH', type: 'swiss-far-right', date: '2014-02-09' },
  { title: 'Initiative populaire contre la construction de minarets', year: 2009, country: 'CH', type: 'swiss-far-right', date: '2009-11-29' },
  { title: 'Initiative populaire fédérale « contre l\'immigration de masse »', year: 2014, country: 'CH', type: 'swiss-far-right' },
  // Major country far-right parties & events
  { title: 'Rassemblement national', year: 1972, country: 'FR', type: 'far-right' },
  { title: 'Élection présidentielle française de 2002', year: 2002, country: 'FR', type: 'far-right', date: '2002-04-21' },
  { title: 'Alternative pour l\'Allemagne', year: 2013, country: 'DE', type: 'far-right' },
  { title: 'Attentats d\'Oslo et d\'Utøya', year: 2011, country: 'NO', type: 'far-right', date: '2011-07-22' },
  { title: 'Attentats de Hanau', year: 2020, country: 'DE', type: 'far-right', date: '2020-02-19' },
  { title: 'Giorgia Meloni', year: 2022, country: 'IT', type: 'far-right', date: '2022-10-22' },
  { title: 'Brexit', year: 2016, country: 'GB', type: 'general', date: '2016-06-23' },
  { title: 'Aube dorée', year: 2012, country: 'GR', type: 'far-right' },
  { title: 'Vox (parti politique)', year: 2013, country: 'ES', type: 'far-right' },
  { title: 'Parti pour la liberté', year: 2006, country: 'NL', type: 'far-right' },
  { title: 'Parti de la liberté d\'Autriche', year: 1956, country: 'AT', type: 'far-right' },
  { title: 'Ligue (parti politique)', year: 1991, country: 'IT', type: 'far-right' },
  { title: 'Franquisme', year: 1939, country: 'ES', type: 'far-right' },
  { title: 'Salazarisme', year: 1933, country: 'PT', type: 'far-right' },
  { title: 'Fidesz', year: 1988, country: 'HU', type: 'far-right' },
  { title: 'Viktor Orbán', year: 2010, country: 'HU', type: 'far-right' },
  { title: 'Jarosław Kaczyński', year: 2005, country: 'PL', type: 'far-right' },
  { title: 'Droit et justice', year: 2001, country: 'PL', type: 'far-right' },
  { title: 'Mouvement flamand', year: 1914, country: 'BE', type: 'far-right' },
  { title: 'Vlaams Belang', year: 1978, country: 'BE', type: 'far-right' },
  { title: 'Parti populaire danois', year: 1995, country: 'DK', type: 'far-right' },
  { title: 'Front populaire national', year: 2008, country: 'CY', type: 'far-right' },
  { title: 'Élections législatives chypriotes de 2016', year: 2016, country: 'CY', type: 'far-right' },
  { title: 'Élections législatives chypriotes de 2021', year: 2021, country: 'CY', type: 'far-right' },
  { title: 'Parti de la liberté (Suède)', year: 1964, country: 'SE', type: 'far-right' },
  { title: 'Démocrates de Suède', year: 1988, country: 'SE', type: 'far-right' },
  { title: 'Vrais Finlandais', year: 1995, country: 'FI', type: 'far-right' },
  { title: 'Mouvement pour une Slovaquie meilleure', year: 2021, country: 'SK', type: 'far-right' },
  { title: 'Kotleba – Notre Slovaquie', year: 2010, country: 'SK', type: 'far-right' },
  { title: 'Mouvement pour la liberté et les droits civiques', year: 2021, country: 'BG', type: 'far-right' },
  { title: 'Parti de la grande Roumanie', year: 1991, country: 'RO', type: 'far-right' },
  { title: 'Alliance pour l\'unification des Roumains', year: 2019, country: 'RO', type: 'far-right' },
  { title: 'Chega', year: 2019, country: 'PT', type: 'far-right' },
  { title: 'Fratelli d\'Italia', year: 2012, country: 'IT', type: 'far-right' },
  { title: 'Jobbik', year: 2003, country: 'HU', type: 'far-right' },
  // Central/Eastern Europe
  { title: 'Solidarność', year: 1980, country: 'PL', type: 'general', date: '1980-09-17' },
  { title: 'Révolution de velours', year: 1989, country: 'CZ', type: 'general', date: '1989-11-17' },
  { title: 'Václav Havel', year: 1989, country: 'CZ', type: 'general' },
  { title: 'Dissolution de la Tchécoslovaquie', year: 1993, country: 'CZ', type: 'general', date: '1993-01-01' },
  { title: 'SPD (République tchèque)', year: 2015, country: 'CZ', type: 'far-right' },
  { title: 'Parti populaire – Notre Slovaquie', year: 2010, country: 'SK', type: 'far-right' },
  { title: 'Révolution roumaine de 1989', year: 1989, country: 'RO', type: 'general', date: '1989-12-16' },
  // Ireland
  { title: 'Accord du Vendredi saint', year: 1998, country: 'IE', type: 'general', date: '1998-04-10' },
  { title: 'Aontú', year: 2019, country: 'IE', type: 'far-right' },
  { title: 'National Party (Irlande)', year: 2016, country: 'IE', type: 'far-right' },
  // Nordic countries
  { title: 'Parti du progrès (Norvège)', year: 1973, country: 'NO', type: 'far-right' },
  { title: 'Mouvement de résistance nordique', year: 1997, country: 'SE', type: 'far-right' },
  // Luxembourg & Low Countries
  { title: 'Parti de la Réforme', year: 1925, country: 'LU', type: 'general' },
  { title: 'Mouvement réformateur (Luxembourg)', year: 2006, country: 'LU', type: 'general' },
  { title: 'Forum voor Democratie', year: 2016, country: 'NL', type: 'far-right' },
  { title: 'Geert Wilders', year: 2006, country: 'NL', type: 'far-right' },
  // Balkans
  { title: 'Guerre de Bosnie', year: 1992, country: 'BA', type: 'general', date: '1992-04-01' },
  { title: 'Guerre de Yougoslavie', year: 1991, country: 'RS', type: 'general' },
  { title: 'Radovan Karadžić', year: 1992, country: 'BA', type: 'far-right' },
  { title: 'Vojislav Šešelj', year: 1991, country: 'RS', type: 'far-right' },
  { title: 'Srpskaakademija nauka i umetnosti', year: 1986, country: 'RS', type: 'far-right' },
  { title: 'Aleksandar Vučić', year: 2017, country: 'RS', type: 'far-right' },
  { title: 'Hreštačka demokracija (Croatie)', year: 1989, country: 'HR', type: 'far-right' },
  { title: 'Mouvement pour les droits et libertés (Bulgarie)', year: 1990, country: 'BG', type: 'far-right' },
  // Moldova & Belarus
  { title: 'Élection présidentielle moldave de 2020', year: 2020, country: 'MD', type: 'general' },
  { title: 'Manifestations au Bélarus en 2020-2021', year: 2020, country: 'BY', type: 'general' },
  { title: 'Alexandre Loukachenko', year: 1994, country: 'BY', type: 'far-right' },
  // Montenegro, North Macedonia, Slovenia, Albania
  { title: 'Djukanović', year: 1991, country: 'ME', type: 'far-right' },
  { title: 'VMRO-DPMNE', year: 1990, country: 'MK', type: 'far-right' },
  { title: 'Parti démocrate slovène', year: 1989, country: 'SI', type: 'far-right' },
  { title: 'Janez Janša', year: 2004, country: 'SI', type: 'far-right' },
  { title: 'Parti démocrate (Albanie)', year: 1990, country: 'AL', type: 'general' },
  // Additional general events
  { title: 'Guerre d\'Espagne', year: 1936, country: 'ES', type: 'far-right', date: '1936-07-17' },
  { title: 'Printemps de Prague', year: 1968, country: 'CZ', type: 'general', date: '1968-01-05' },
  { title: 'Crise économique de 2008', year: 2008, country: null, type: 'general' },
  { title: 'Crise de la dette dans la zone euro', year: 2010, country: 'GR', type: 'general' },
  { title: 'Attentat de Christchurch', year: 2019, country: null, type: 'far-right', date: '2019-03-15' },
  { title: 'Élections européennes de 2024', year: 2024, country: null, type: 'far-right' },
  { title: 'Élections européennes de 2019', year: 2019, country: null, type: 'far-right' },
  { title: 'Groupe Identité et Démocratie', year: 2019, country: null, type: 'far-right' },
  { title: 'Conservateurs et réformistes européens', year: 2009, country: null, type: 'far-right' },
];

const EUROPE_WIDE_QUERIES = [
  'extreme droite europe',
  'election europe parti nationaliste',
  'crise politique europe',
  'referendum immigration europe',
  'violence politique europe',
  'parti populiste europe',
  'fascisme europe histoire',
  'neonazisme europe',
  'manifestation europe',
  'attentat europe politique',
  'union europeenne traite',
  'elections europeennes',
  'securite migration europe',
];

// Wikipedia categories to crawl for members — each yields up to 200 article titles.
const CATEGORY_SEEDS = [
  'Catégorie:Extrême droite en France',
  'Catégorie:Extrême droite en Allemagne',
  'Catégorie:Extrême droite en Italie',
  'Catégorie:Extrême droite en Espagne',
  'Catégorie:Extrême droite en Autriche',
  'Catégorie:Extrême droite en Hongrie',
  'Catégorie:Extrême droite en Pologne',
  'Catégorie:Extrême droite en Grèce',
  'Catégorie:Extrême droite aux Pays-Bas',
  'Catégorie:Extrême droite en Belgique',
  'Catégorie:Extrême droite au Royaume-Uni',
  'Catégorie:Extrême droite en Suède',
  'Catégorie:Extrême droite en Finlande',
  'Catégorie:Extrême droite au Danemark',
  'Catégorie:Extrême droite en Norvège',
  'Catégorie:Extrême droite en Suisse',
  'Catégorie:Extrême droite en Roumanie',
  'Catégorie:Extrême droite en Bulgarie',
  'Catégorie:Élection présidentielle française',
  'Catégorie:Élection législative française',
  'Catégorie:Histoire politique de l\'Allemagne au XXe siècle',
  'Catégorie:Histoire politique de l\'Italie au XXe siècle',
  'Catégorie:Nationalisme européen',
  'Catégorie:Populisme en Europe',
  'Catégorie:Fascisme',
  'Catégorie:Néofascisme',
  'Catégorie:Néonazisme',
];

const COUNTRY_QUERY_TOPICS = [
  'extreme droite',
  'election legislative',
  'crise politique',
  'referendum immigration',
  'histoire politique',
  'nationalisme',
  'gouvernement',
];

const EVENT_TITLE_KEYWORDS = [
  'election',
  'attentat',
  'crise',
  'guerre',
  'referendum',
  'référendum',
  'manifestation',
  'invasion',
  'coup d\'etat',
  'coup d\'état',
  'traité',
  'traite',
  'accord',
  'parti',
  'coalition',
  'gouvernement',
  'dictature',
  'fascisme',
  'nationaliste',
  'parlement',
];

const FAR_RIGHT_KEYWORDS = [
  'extreme droite',
  'extrême droite',
  'fascisme',
  'fasciste',
  'neonazi',
  'néonazi',
  'nationaliste',
  'identitaire',
  'xenophobie',
  'xénophobie',
  'ultranationaliste',
  'populiste',
  'rn',
  'afd',
  'vox',
  'jobbik',
  'fidesz',
  'udc',
];

const SWISS_KEYWORDS = [
  'suisse',
  'helvetique',
  'helvétique',
  'helvetes',
  'helvètes',
  'udc',
  'confederation',
  'confédération',
  'zurich',
  'geneve',
  'genève',
  'berne',
];

const BIOGRAPHY_HINTS = [
  'naissance',
  'deces',
  'décès',
  'acteur',
  'actrice',
  'chanteur',
  'chanteuse',
  'ecrivain',
  'écrivain',
  'football',
  'olympique',
];

const NORMALIZED_COUNTRY_KEYWORDS = Object.fromEntries(
  Object.entries(EUROPE_COUNTRIES).map(([iso2, meta]) => [
    iso2,
    meta.keywords.map((k) => normalizeText(k)),
  ]),
);

const BASE_SEED_MAP = new Map(
  BASE_EVENT_SEEDS.map((seed) => [normalizeText(seed.title), seed]),
);

const WIKIDATA_YEAR_CACHE = new Map();

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/[\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toWikiTitle(value) {
  return String(value || '').replace(/_/g, ' ').trim();
}

function toSummaryPath(value) {
  return encodeURIComponent(toWikiTitle(value).replace(/ /g, '_'));
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 96);
}

function unique(list) {
  return Array.from(new Set(list));
}

function firstYearFromText(text) {
  const match = String(text || '').match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function hasAnyKeyword(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAction(params) {
  const url = `${API_ACTION}?${new URLSearchParams({
    format: 'json',
    origin: '*',
    ...params,
  })}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      return res.json();
    }

    if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 3) {
      throw new Error(`Action API ${res.status}`);
    }

    await sleep(220 * (attempt + 1));
  }

  throw new Error('Action API unavailable');
}

async function fetchSummary(title) {
  const url = `${API_REST}${toSummaryPath(title)}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const json = await res.json();
      if (!json || json.type === 'disambiguation') return null;
      if (!json.title || !json.extract) return null;
      return json;
    }

    if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 3) {
      return null;
    }

    await sleep(220 * (attempt + 1));
  }

  return null;
}

async function searchTitles(query, limit = SEARCH_LIMIT) {
  const data = await fetchAction({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    srprop: '',
  });
  return (data.query?.search || []).map((entry) => entry.title).filter(Boolean);
}

async function fetchPageMeta(title) {
  const data = await fetchAction({
    action: 'query',
    prop: 'categories|pageprops',
    cllimit: '500',
    clshow: '!hidden',
    titles: title,
  });
  const pages = Object.values(data.query?.pages || {});
  const page = pages[0] || {};
  return {
    categories: (page.categories || []).map((cat) =>
      cat.title.replace(/^Catégorie:/i, ''),
    ),
    wikidataId: page.pageprops?.wikibase_item || null,
  };
}

function extractYearFromWikidataClaims(entity) {
  if (!entity?.claims) return null;
  const claimOrder = ['P585', 'P571', 'P580', 'P577', 'P569'];

  for (const claimId of claimOrder) {
    const claims = entity.claims[claimId];
    if (!Array.isArray(claims)) continue;

    for (const claim of claims) {
      const timeValue = claim?.mainsnak?.datavalue?.value?.time;
      if (!timeValue || typeof timeValue !== 'string') continue;
      const match = timeValue.match(/([+-]\d{4})-/);
      if (!match) continue;
      const year = Number(match[1]);
      if (Number.isFinite(year) && year >= 1800 && year <= CURRENT_YEAR + 1) {
        return year;
      }
    }
  }

  return null;
}

async function fetchWikidataYear(wikidataId) {
  if (!wikidataId) return null;
  if (WIKIDATA_YEAR_CACHE.has(wikidataId)) {
    return WIKIDATA_YEAR_CACHE.get(wikidataId);
  }

  try {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      WIKIDATA_YEAR_CACHE.set(wikidataId, null);
      return null;
    }

    const data = await res.json();
    const entity = data.entities?.[wikidataId];
    const year = extractYearFromWikidataClaims(entity);
    WIKIDATA_YEAR_CACHE.set(wikidataId, year || null);
    return year || null;
  } catch {
    WIKIDATA_YEAR_CACHE.set(wikidataId, null);
    return null;
  }
}

async function fetchLinks(title) {
  const data = await fetchAction({
    action: 'query',
    prop: 'links',
    plnamespace: '0',
    pllimit: '200',
    titles: title,
  });
  const pages = Object.values(data.query?.pages || {});
  return pages.flatMap((page) => (page.links || []).map((link) => link.title));
}

async function fetchCategoryMembers(categoryTitle) {
  const data = await fetchAction({
    action: 'query',
    list: 'categorymembers',
    cmtitle: categoryTitle.startsWith('Catégorie:') ? categoryTitle : `Catégorie:${categoryTitle}`,
    cmnamespace: '0',
    cmlimit: '200',
    cmprop: 'title',
  });
  return (data.query?.categorymembers || []).map((entry) => entry.title).filter(Boolean);
}

async function mapLimit(items, limit, mapper) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      try {
        results[index] = await mapper(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
}

function buildCountryQueries() {
  const queries = [];
  for (const meta of Object.values(EUROPE_COUNTRIES)) {
    for (const topic of COUNTRY_QUERY_TOPICS) {
      queries.push(`${meta.label} ${topic}`);
    }
  }
  return queries;
}

function isPotentialEventTitle(title) {
  const trimmed = toWikiTitle(title);
  if (!trimmed) return false;
  if (trimmed.length > 130) return false;
  if (/^(Liste|Portail|Projet|Aide|Discussion|Wikipédia)/i.test(trimmed)) return false;
  if (/^Catégorie:/i.test(trimmed)) return false;

  const normalized = normalizeText(trimmed);
  const hasYear = /\b(18\d{2}|19\d{2}|20\d{2})\b/.test(normalized);
  const hasSignalKeyword = EVENT_TITLE_KEYWORDS.some((kw) =>
    normalized.includes(normalizeText(kw)),
  );
  const hasCountryKeyword = Object.values(EUROPE_COUNTRIES).some((meta) =>
    normalized.includes(normalizeText(meta.label)),
  );

  return hasYear || hasSignalKeyword || hasCountryKeyword;
}

function detectCountriesFromText(text) {
  const normalized = normalizeText(text);
  const matches = [];

  for (const [iso2, keywords] of Object.entries(NORMALIZED_COUNTRY_KEYWORDS)) {
    let firstIndex = -1;
    for (const keyword of keywords) {
      const idx = normalized.indexOf(keyword);
      if (idx >= 0 && (firstIndex === -1 || idx < firstIndex)) {
        firstIndex = idx;
      }
    }
    if (firstIndex !== -1) {
      matches.push({ iso2, index: firstIndex });
    }
  }

  matches.sort((a, b) => a.index - b.index);
  const countries = unique(matches.map((m) => m.iso2));
  return {
    country: countries[0] || null,
    countries,
  };
}

function inferYear(summary, categories, seedMeta, wikidataYear) {
  if (seedMeta?.year) return seedMeta.year;
  const titleYear = firstYearFromText(summary?.title || '');
  if (titleYear) return titleYear;

  // In categories we often have "... en 19XX" which is better than body heuristics.
  for (const category of categories) {
    const categoryYear = firstYearFromText(category);
    if (categoryYear) return categoryYear;
  }

  if (wikidataYear) return wikidataYear;

  return firstYearFromText(summary?.extract || summary?.description || '');
}

function isLikelyBiography(title, categories, text) {
  const joined = `${title} ${categories.join(' ')} ${text}`;
  const lower = normalizeText(joined);
  const hasBiographyHint = BIOGRAPHY_HINTS.some((hint) => lower.includes(normalizeText(hint)));
  const hasEventSignal = hasAnyKeyword(lower, EVENT_TITLE_KEYWORDS) || hasAnyKeyword(lower, FAR_RIGHT_KEYWORDS);
  return hasBiographyHint && !hasEventSignal;
}

function _hasStrongSwissSignal(title, extract, categories) {
  const normTitle = normalizeText(title);
  const normEarly = normalizeText((extract || '').slice(0, 220));
  const swissInTitle = SWISS_KEYWORDS.some((kw) => normTitle.includes(normalizeText(kw)));
  const swissInEarly = SWISS_KEYWORDS.some((kw) => normEarly.includes(normalizeText(kw)));
  const swissInRelationCategory = categories.some((cat) => {
    const c = normalizeText(cat);
    return (
      SWISS_KEYWORDS.some((kw) => c.includes(normalizeText(kw))) &&
      (c.includes('relations') || c.includes('diplomatie') || c.includes('affaire') || c.includes('politique'))
    );
  });
  return swissInTitle || swissInEarly || swissInRelationCategory;
}

function classifyEventType(text, categories, country, seedMeta, title, extract) {
  if (seedMeta?.type) return seedMeta.type;
  const haystack = `${text} ${categories.join(' ')}`;
  const hasFarRightSignal = hasAnyKeyword(haystack, FAR_RIGHT_KEYWORDS);
  const hasStrongSwiss = _hasStrongSwissSignal(title || '', extract || '', categories);

  if (hasFarRightSignal && hasStrongSwiss && country && country !== 'CH') return 'swiss-abroad';
  if (hasFarRightSignal && country === 'CH') return 'swiss-far-right';
  if (hasFarRightSignal) return 'far-right';
  if (hasStrongSwiss && country && country !== 'CH') return 'swiss-abroad';
  return 'general';
}

function buildTags(text, categories, type) {
  const tags = new Set([type]);
  const haystack = normalizeText(`${text} ${categories.join(' ')}`);
  if (haystack.includes('election')) tags.add('election');
  if (haystack.includes('referendum') || haystack.includes('référendum')) tags.add('referendum');
  if (haystack.includes('migration') || haystack.includes('immigration')) tags.add('migration');
  if (haystack.includes('violence') || haystack.includes('attentat')) tags.add('violence');
  if (haystack.includes('parlement')) tags.add('parliament');
  if (haystack.includes('union europeenne') || haystack.includes('union européenne')) tags.add('eu');
  return Array.from(tags);
}

function computeScore(event) {
  let score = 0;
  if (event.type === 'far-right') score += 4;
  if (event.type === 'swiss-abroad' || event.type === 'swiss-far-right') score += 5;
  if (event.country) score += 2;
  if (event.image) score += 1;
  if ((event.description || '').length > 180) score += 1;
  if (event.tags.includes('election')) score += 1;
  if (event.tags.includes('migration')) score += 1;
  if (event.tags.includes('violence')) score += 1;
  return score;
}

function pickSide(event) {
  if (event.type === 'swiss-abroad') return 'right';
  const hash = Array.from(event.id).reduce((acc, ch) => acc + ch.charCodeAt(0), event.year || 0);
  return hash % 2 === 0 ? 'left' : 'right';
}

function selectBalancedByDecade(events, maxTotal, maxPerDecade) {
  const byDecade = new Map();

  for (const event of events) {
    const decade = Math.floor(event.year / 10) * 10;
    const bucket = byDecade.get(decade) || [];
    bucket.push(event);
    byDecade.set(decade, bucket);
  }

  for (const bucket of byDecade.values()) {
    bucket.sort((a, b) => b.score - a.score || a.year - b.year);
  }

  const decades = Array.from(byDecade.keys()).sort((a, b) => a - b);
  const perDecadeCount = new Map(decades.map((d) => [d, 0]));
  const selected = [];

  let added = true;
  while (selected.length < maxTotal && added) {
    added = false;
    for (const decade of decades) {
      const bucket = byDecade.get(decade);
      const count = perDecadeCount.get(decade);
      if (!bucket || bucket.length === 0 || count >= maxPerDecade) continue;
      selected.push(bucket.shift());
      perDecadeCount.set(decade, count + 1);
      added = true;
      if (selected.length >= maxTotal) break;
    }
  }

  return selected.sort((a, b) => a.year - b.year || b.score - a.score);
}

function buildCountryEvents(allEvents) {
  const byCountry = {};
  for (const iso2 of Object.keys(EUROPE_COUNTRIES)) {
    let countryEvents = allEvents
      .filter((event) => event.country === iso2 || event.countries.includes(iso2))
      .sort((a, b) => b.score - a.score || a.year - b.year)
      .slice(0, MAX_COUNTRY_EVENTS)
      .sort((a, b) => a.year - b.year || b.score - a.score);

    // For sparse countries, pad with general events that mention the country in their text.
    if (countryEvents.length < MIN_COUNTRY_EVENTS) {
      const countryMeta = EUROPE_COUNTRIES[iso2];
      const normKeywords = (countryMeta?.keywords || []).map(normalizeText);
      const extras = allEvents
        .filter(
          (event) =>
            !countryEvents.some((e) => e.id === event.id) &&
            normKeywords.some((kw) => normalizeText(event.description || '').includes(kw)),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, MIN_COUNTRY_EVENTS - countryEvents.length);
      countryEvents = [...countryEvents, ...extras].sort((a, b) => a.year - b.year || b.score - a.score);
    }

    byCountry[iso2] = countryEvents;
  }
  return byCountry;
}

function wireRelations(selectedEvents, linksByTitle) {
  const idByNormalizedTitle = new Map(
    selectedEvents.map((event) => [normalizeText(event.title), event.id]),
  );

  for (const event of selectedEvents) {
    const links = linksByTitle.get(normalizeText(event.title)) || [];
    const relations = [];
    for (const link of links) {
      const relatedId = idByNormalizedTitle.get(normalizeText(link));
      if (relatedId && relatedId !== event.id) relations.push(relatedId);
    }
    event.relations = unique(relations).slice(0, 20);
  }
}

async function collectCandidateTitles() {
  const titleSet = new Set(BASE_EVENT_SEEDS.map((seed) => toWikiTitle(seed.title)));

  const queries = [...EUROPE_WIDE_QUERIES, ...buildCountryQueries()];
  console.log(`→ search queries: ${queries.length}`);

  const resultsByQuery = await mapLimit(queries, 4, async (query) => {
    const titles = await searchTitles(query, SEARCH_LIMIT);
    return titles;
  });

  for (const titles of resultsByQuery) {
    if (!titles) continue;
    for (const title of titles) titleSet.add(toWikiTitle(title));
  }

  // One-hop link expansion from seed articles.
  const seedTitlesForExpansion = BASE_EVENT_SEEDS.map((seed) => toWikiTitle(seed.title)).slice(0, 40);
  const linksBySeed = await mapLimit(seedTitlesForExpansion, 3, async (title) => fetchLinks(title));
  for (const links of linksBySeed) {
    if (!links) continue;
    for (const title of links.slice(0, 120)) titleSet.add(toWikiTitle(title));
  }

  // Category members traversal — each political category yields ~200 articles.
  console.log(`→ category traversal: ${CATEGORY_SEEDS.length} categories`);
  const categoryResults = await mapLimit(CATEGORY_SEEDS, 3, async (cat) => {
    const members = await fetchCategoryMembers(cat).catch(() => []);
    return members;
  });
  for (const members of categoryResults) {
    if (!members) continue;
    for (const title of members) titleSet.add(toWikiTitle(title));
  }

  const filtered = Array.from(titleSet).filter(isPotentialEventTitle).slice(0, MAX_CANDIDATE_TITLES);
  console.log(`→ candidate titles: ${filtered.length}`);
  return filtered;
}

async function buildEvent(title) {
  const normalizedTitle = normalizeText(title);
  const seedMeta = BASE_SEED_MAP.get(normalizedTitle);

  const [summary, pageMeta] = await Promise.all([
    fetchSummary(title),
    fetchPageMeta(title).catch(() => ({ categories: [], wikidataId: null })),
  ]);

  if (!summary || !summary.extract) return null;

  const categories = pageMeta?.categories || [];
  const wikidataYear = await fetchWikidataYear(pageMeta?.wikidataId || null);
  const year = inferYear(summary, categories, seedMeta, wikidataYear);
  if (!year || year < 1900 || year > CURRENT_YEAR + 1) return null;

  const textBundle = `${summary.title} ${summary.description || ''} ${summary.extract} ${categories.join(' ')}`;
  if (isLikelyBiography(summary.title, categories, textBundle)) return null;

  const countryDetection = detectCountriesFromText(textBundle);
  const country = seedMeta?.country || countryDetection.country;
  const countries = unique([...(countryDetection.countries || []), ...(country ? [country] : [])]);

  const extract = summary.extract || '';
  const type = classifyEventType(textBundle, categories, country, seedMeta, summary.title, extract);
  const description = extract.replace(/\s+/g, ' ').trim();
  if (description.length < 35) return null;

  // Extract the sentence containing a Swiss keyword for swiss-abroad events.
  let swissLink = null;
  if (type === 'swiss-abroad') {
    const sentences = extract.split(/(?<=[.!?])\s+/);
    const swissMatch = sentences.find((s) =>
      SWISS_KEYWORDS.some((kw) => normalizeText(s).includes(normalizeText(kw))),
    );
    if (swissMatch) swissLink = swissMatch.replace(/\s+/g, ' ').trim().slice(0, 180);
  }

  const canonicalTitle = summary.title;
  const fallbackUrl = `https://fr.wikipedia.org/wiki/${toSummaryPath(canonicalTitle)}`;
  const id = slugify(`${year}-${canonicalTitle}`);
  const event = {
    id,
    title: canonicalTitle,
    description,
    year,
    date: seedMeta?.date || null,
    country: country || null,
    countries,
    type,
    side: 'left',
    url: summary.content_urls?.desktop?.page || fallbackUrl,
    image: summary.thumbnail?.source || null,
    source: 'Wikipedia',
    categories,
    tags: buildTags(textBundle, categories, type),
    relations: [],
    score: 0,
    ...(swissLink ? { swiss_link: swissLink } : {}),
  };

  event.score = computeScore(event);
  event.side = pickSide(event);
  return event;
}

function dedupeEvents(events) {
  const map = new Map();
  for (const event of events) {
    if (!event) continue;
    const key = normalizeText(`${event.title}-${event.year}`);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, event);
      continue;
    }
    const existingRank = existing.score + (existing.image ? 1 : 0) + (existing.country ? 1 : 0);
    const newRank = event.score + (event.image ? 1 : 0) + (event.country ? 1 : 0);
    if (newRank > existingRank) map.set(key, event);
  }
  return Array.from(map.values());
}

async function collectLinksForRelations(events) {
  const linksByTitle = new Map();
  const titles = events.map((event) => event.title);
  const linksResults = await mapLimit(titles, 3, async (title) => ({
    title,
    links: await fetchLinks(title).catch(() => []),
  }));

  for (const result of linksResults) {
    if (!result) continue;
    linksByTitle.set(normalizeText(result.title), result.links || []);
  }
  return linksByTitle;
}

async function main() {
  console.log('📚 Building rich Wikipedia event dataset for Europe...');

  const candidateTitles = await collectCandidateTitles();
  const builtCandidates = await mapLimit(candidateTitles, 5, async (title) => buildEvent(title));

  const allEvents = dedupeEvents(builtCandidates.filter(Boolean));
  const usableEvents = allEvents
    .filter((event) => event.year >= 1900 && event.year <= CURRENT_YEAR + 1)
    .sort((a, b) => a.year - b.year || b.score - a.score);

  const europeCandidates = usableEvents.filter((event) => Boolean(event.country) || event.type !== 'general');
  const europeEvents = selectBalancedByDecade(
    europeCandidates,
    MAX_EUROPE_EVENTS,
    MAX_EVENTS_PER_DECADE,
  );

  const relationLinks = await collectLinksForRelations(europeEvents);
  wireRelations(europeEvents, relationLinks);

  const countryEvents = buildCountryEvents(usableEvents);

  const output = {
    fetchedAt: new Date().toISOString(),
    source: {
      restSummary: API_REST,
      actionApi: API_ACTION,
    },
    note: 'Events are discovered through Wikipedia search, category tags, and one-hop link expansion from core far-right seeds.',
    stats: {
      candidateTitles: candidateTitles.length,
      allEvents: usableEvents.length,
      europeEvents: europeEvents.length,
      countriesWithEvents: Object.values(countryEvents).filter((events) => events.length > 0).length,
    },
    europe_events: europeEvents,
    country_events: countryEvents,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log('✅ done');
  console.log(`   - candidates: ${candidateTitles.length}`);
  console.log(`   - usable events: ${usableEvents.length}`);
  console.log(`   - europe events: ${europeEvents.length}`);
  console.log(`   - output: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('❌ fetcher error:', error);
  process.exit(1);
});
