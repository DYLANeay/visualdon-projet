/*
 * convert-extreme-droite.js
 *
 * Reads extreme_droite_europe.json, scrapes Wikipedia for descriptions/images,
 * and writes events.json in the app format.
 *
 * Usage:
 *   node data/wikipedia/convert-extreme-droite.js
 *   node data/wikipedia/convert-extreme-droite.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'extreme_droite_europe.json');
const OUTPUT = path.join(__dirname, 'events.json');
const MAX_DESC_LENGTH = 700;
const CONCURRENCY = 3;
const DELAY_MS = 400;
const TIMEOUT_MS = 15000;

const HEADERS = {
  'User-Agent': 'VisualDon-Converter/1.0 (educational, HEIG-VD)',
  Accept: 'application/json',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 96);
}

function cleanText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\[\d+\]/g, '')
    .replace(/\[(Quand|source insuffisante|Combien|Lesquels|Où|Quoi|réf|Réf)[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastDot = cut.lastIndexOf('.');
  if (lastDot > maxLen * 0.6) return cut.slice(0, lastDot + 1);
  return cut + '…';
}

// ── Wikipedia fetch ──────────────────────────────────────────────────────────

function getPageTitle(url) {
  try {
    const p = new URL(url).pathname.replace(/^\/wiki\//, '');
    return decodeURIComponent(p);
  } catch {
    return null;
  }
}

async function fetchSummary(title) {
  const apiUrl =
    'https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(apiUrl, { headers: HEADERS, signal: ctrl.signal });
    } catch {
      clearTimeout(tid);
      continue;
    } finally {
      clearTimeout(tid);
    }

    if (resp.ok) {
      const json = await resp.json();
      if (!json || json.type === 'disambiguation') return null;
      return {
        extract: cleanText(json.extract || ''),
        image: json.thumbnail?.source || null,
        pageUrl: json.content_urls?.desktop?.page || null,
      };
    }
    if (resp.status === 404) return null;
    if (resp.status === 429) {
      await sleep(10000);
      continue;
    }
  }
  return null;
}

async function fetchMobileLead(title) {
  const url =
    'https://fr.wikipedia.org/api/rest_v1/page/mobile-html/' + encodeURIComponent(title);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'] }, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
  if (!resp.ok) return null;
  const html = await resp.text();

  const s0 = html.indexOf('data-mw-section-id="0"');
  const s1 = html.indexOf('data-mw-section-id="1"');
  if (s0 < 0 || s1 < 0) return null;
  const content = html.slice(html.indexOf('>', s0) + 1, s1);

  const paras = [];
  const re = /<p[^>]*>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const end = content.indexOf('</p>', m.index);
    if (end < 0) continue;
    const text = cleanText(content.slice(m.index + m[0].length, end));
    if (text.length > 30) paras.push(text);
  }
  return paras.length > 0 ? paras.join(' ') : null;
}

// ── Event building ───────────────────────────────────────────────────────────

let sideToggle = 0;

function nextSide() {
  sideToggle += 1;
  return sideToggle % 2 === 0 ? 'right' : 'left';
}

function extractTitleAndDesc(label) {
  // The label IS the description. Extract a short title from it.
  const text = String(label || '').trim();
  if (!text) return { title: '', desc: '' };

  let title, desc;

  // Case 1: "Title : description text here"
  const colonIdx = text.indexOf(':');
  if (colonIdx > 2 && colonIdx < 80) {
    title = text.slice(0, colonIdx).trim();
    desc = text.slice(colonIdx + 1).trim();
    return { title, desc };
  }

  // Case 2: "Title (descriptive context here that's 30+ chars)"
  const parenMatch = text.match(/^(.+?)\s*\(([^)]{30,})\)$/);
  if (parenMatch) {
    title = parenMatch[1].trim();
    desc = parenMatch[2].trim();
    return { title, desc };
  }

  // Case 3: Short label with parenthetical disambiguation like "Vox (parti politique)"
  const shortParenMatch = text.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (shortParenMatch && shortParenMatch[1].length > 2) {
    title = shortParenMatch[1].trim();
    desc = text; // use full label as description
    return { title, desc };
  }

  // Case 4: No colon, no parentheses — the whole thing is both title and description
  title = text;
  desc = text;
  return { title, desc };
}

function parseCommonEvent(raw) {
  const label = String(raw.label || '').trim();
  if (!label) return null;

  const { title, desc } = extractTitleAndDesc(label);

  const year = Number(raw.year);
  if (!Number.isFinite(year)) return null;

  const type = raw.type === 'extreme_droite' ? 'far-right' : 'general';
  const country = raw.pays || null;

  return {
    id: slugify(`${year}-${title}`),
    title,
    year,
    date: null,
    country,
    type,
    side: nextSide(),
    url: raw.link || null,
    description: desc, // label IS the description
    label: label,
    source: 'Wikipedia',
    image: null,
  };
}

function parseCountryEvent(raw, iso2) {
  const label = String(raw.label || '').trim();
  if (!label) return null;

  const { title, desc } = extractTitleAndDesc(label);

  const dateStr = String(raw.date || '');
  const yearMatch = dateStr.match(/^(\d{4})/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  if (!Number.isFinite(year)) return null;

  return {
    id: slugify(`${year}-${title}`),
    title,
    year,
    date: dateStr || null,
    country: iso2,
    type: 'far-right',
    side: nextSide(),
    url: raw.link || null,
    description: desc, // label IS the description
    label: label,
    source: 'Wikipedia',
    image: null,
  };
}

// ── Concurrent pipeline ──────────────────────────────────────────────────────

async function enrichAll(events, label) {
  const total = events.length;
  let done = 0;
  const cache = new Map();

  async function enrichOne(event) {
    if (!event.url) {
      done++;
      return event;
    }

    const title = getPageTitle(event.url);
    if (!title) {
      done++;
      return event;
    }

    let cached = cache.get(title);
    if (cached === undefined) {
      await sleep(DELAY_MS);
      cached = await fetchSummary(title);
      cache.set(title, cached);
    }

    done++;
    if (done % 10 === 0 || done === total) {
      process.stdout.write(`\r   ${label}: ${done}/${total}`);
      if (done === total) process.stdout.write('\n');
    }

    const wpExtract = cached?.extract || '';

    // Merge: label description gives context, Wikipedia gives detail
    let desc;
    const labelDesc = (event.description || '').trim();
    if (wpExtract.length > labelDesc.length) {
      // Wikipedia has more detail — use it, prepend label context if it adds info
      if (labelDesc && !wpExtract.includes(labelDesc.slice(0, 30))) {
        desc = labelDesc + '. ' + wpExtract;
      } else {
        desc = wpExtract;
      }
    } else if (wpExtract && labelDesc && !labelDesc.includes(wpExtract.slice(0, 30))) {
      // Label has more context, append Wikipedia detail
      desc = labelDesc + '. ' + wpExtract;
    } else {
      // Keep the best one
      desc = labelDesc || wpExtract;
    }

    return {
      ...event,
      description: truncateSentence(desc, MAX_DESC_LENGTH),
      image: event.image || cached?.image || null,
      url: cached?.pageUrl || event.url,
      label: undefined,
    };
  }

  const results = [];
  const queue = [...events];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const evt = queue.shift();
      results.push(await enrichOne(evt));
    }
  });
  await Promise.all(workers);

  // Sort by year
  return results.sort((a, b) => a.year - b.year);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('🔧 Converting extreme_droite_europe.json → events.json');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const rawData = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));

  // Parse common events
  const commonRaw = Array.isArray(rawData.common_events) ? rawData.common_events : [];
  let commonEvents = commonRaw.map(parseCommonEvent).filter(Boolean);
  console.log(`   Parsed ${commonEvents.length} common events`);

  // Parse country events
  const countryEvents = {};
  let countryTotal = 0;
  for (const [iso2, events] of Object.entries(rawData.country_events || {})) {
    if (!Array.isArray(events)) continue;
    const parsed = events.map((e) => parseCountryEvent(e, iso2)).filter(Boolean);
    if (parsed.length > 0) {
      countryEvents[iso2] = parsed;
      countryTotal += parsed.length;
    }
  }
  console.log(`   Parsed ${countryTotal} country events across ${Object.keys(countryEvents).length} countries\n`);

  // Enrich from Wikipedia
  console.log('📚 Enriching from Wikipedia…');
  console.log(`   Common events (${commonEvents.length}):`);
  commonEvents = await enrichAll(commonEvents, 'common');

  for (const iso2 of Object.keys(countryEvents).sort()) {
    console.log(`   Country ${iso2} (${countryEvents[iso2].length} events):`);
    countryEvents[iso2] = await enrichAll(countryEvents[iso2], iso2);
  }

  // Build output
  const output = {
    fetchedAt: new Date().toISOString(),
    source: { restSummary: 'https://fr.wikipedia.org/api/rest_v1/page/summary/' },
    note: 'Converted from extreme_droite_europe.json. Edit that file to modify events.',
    stats: {
      europeEvents: commonEvents.length,
      countriesWithEvents: Object.keys(countryEvents).length,
      totalCountryEvents: Object.values(countryEvents).flat().length,
    },
    europe_events: commonEvents,
    country_events: countryEvents,
  };

  if (!dryRun) {
    fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✅ Written to ${OUTPUT}`);
  } else {
    console.log('\n⚠️  Dry run — not written.');
    console.log(`   Would write ${commonEvents.length} europe + ${countryTotal} country events`);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
