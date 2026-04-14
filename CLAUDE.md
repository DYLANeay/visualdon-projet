# CLAUDE.md -- Montee de l'extreme droite

## Project overview

Data visualization project for the VisualDon 2026 course at HEIG-VD.
Shows the rise of the far right in Europe and Switzerland through interactive
maps, timelines, charts, and scrollytelling.

**Authors**: Dylan Eray & Loic Peyramaure
**Repository**: https://github.com/DYLANeay/visualdon-projet

## Stack

- **Build**: Vite 8 (`vite`, `vite build`, `vite preview`)
- **Styling**: Tailwind CSS 4.2 via `@tailwindcss/vite` plugin + normalize.css
- **Language**: Vanilla JavaScript (ES modules), no framework
- **Maps & charts**: D3.js (d3-geo, d3-scale, d3-axis, d3-shape, d3-array, d3-zoom, d3-transition, d3-fetch)
- **Scroll narrative**: Scrollama
- **Formatting**: Prettier (see `.prettierrc`)

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview the production build
npm run format    # Format code with Prettier
```

## Architecture

```
index.html                  # Single-page app entry, all sections defined here
src/
  main.js                   # App entry point, imports modules, orchestrates init
  style.css                 # Global styles, Tailwind import, CSS custom properties
  modules/
    data-loader.js           # Centralized data loading with d3-fetch (json, csv)
    europe-map.js            # Europe choropleth map (d3-geo + GeoJSON)
    switzerland-map.js       # Switzerland cantons map (d3-geo + cantons GeoJSON)
    country-detail.js        # Country zoom view + party bar chart + event list
    canton-detail.js         # Canton detail view + UDC line chart + nopasaran events
    timeline.js              # Vertical (Europe) and horizontal (Switzerland) timelines
    event-modal.js           # <dialog> element logic for event detail overlays
    scroll-sections.js       # Scrollama setup for scroll-driven transitions
    scales.js                # Shared D3 color scales and data scales
    utils.js                 # Shared helpers (formatting, DOM utilities)
  styles/
    components.css           # Component-specific styles beyond Tailwind utilities
data/
  elections/
    elections.json           # Merged election data: country > party > elections[]
    convert.js               # CSV-to-JSON conversion script (run once, not bundled)
  geo-map/
    europe/
      CShapes-Europe.geojson       # Full Europe boundaries
      CShapes-Europe-1900.geojson  # Historical Europe boundaries (1900)
    switzerland/
      cantons.geojson              # Swiss cantons boundaries
  nopasaran/
    data.json               # UDC incidents by year from nopasaran.ch
    scraper.js              # Scraper script (run once, not bundled)
```

## Code conventions

### General

- **ES modules** everywhere in `src/`. Use `import`/`export`, never `require()`.
- **`const` by default**, `let` when reassignment is needed. Never `var`.
- **`async`/`await`** for all asynchronous operations. No raw `.then()` chains.
- **Arrow functions** for callbacks and short functions. Named `function` declarations for module-level exported functions.
- **Template literals** for string interpolation, never concatenation.
- **Strict equality** (`===` / `!==`) always.

### Naming

- **Files**: `kebab-case.js` (e.g., `europe-map.js`, `data-loader.js`)
- **Functions**: `camelCase` (e.g., `renderEuropeMap`, `loadElectionData`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants (e.g., `DEFAULT_YEAR`, `COLOR_SCALE_RANGE`)
- **DOM IDs**: `kebab-case` (e.g., `europe-map`, `canton-detail`)
- **CSS classes**: Tailwind utilities first; custom classes in `kebab-case`

### Language

- Code, comments, and commit messages in **English**.
- UI text (HTML content visible to users) in **French**.

### Module pattern

Each module in `src/modules/` exports an `init()` function or a named render function:

```js
// src/modules/europe-map.js
export async function initEuropeMap(container, data) {
  // setup projection, bindings, initial render
}

export function updateEuropeMap(year) {
  // update for new year selection
}
```

Modules do NOT directly access the DOM on import. They receive container
elements and data as parameters.

## D3 patterns

### Data binding

Always use the `.join()` pattern (not the enter/update/exit boilerplate):

```js
svg.selectAll('path')
  .data(features, (d) => d.properties.id)
  .join('path')
  .attr('d', path)
  .attr('fill', (d) => colorScale(getValue(d)));
```

### Margin convention

Every chart uses the standard margin object:

```js
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const width = containerWidth - margin.left - margin.right;
const height = containerHeight - margin.top - margin.bottom;

const svg = d3.select(container)
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);
```

### Map projections

- **Europe map**: `d3.geoEqualEarth()` with `.fitSize([width, height], geojson)` -- preserves area, which matters for a choropleth.
- **Switzerland map**: `d3.geoMercator()` with `.fitSize([width, height], geojson)` -- standard for Swiss cantons at this scale.
- Always use `.fitSize()` or `.fitExtent()` for automatic fitting, never hardcode scale/translate.

### Color scales

Use `d3.scaleThreshold()` for the choropleth (far-right vote share mapped to a sequential red palette):

```js
const colorScale = d3.scaleThreshold()
  .domain([5, 10, 15, 20, 30])
  .range(['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15']);
```

### Transitions

Use `d3.transition()` with reasonable durations (300-600ms) for map and chart
updates. Never block interaction during transitions.

## Data structures

### elections.json

```
elections.{COUNTRY_CODE}.name          -- country name
elections.{COUNTRY_CODE}.parties.{ID}  -- party object
  .name, .abbrev, .family_code, .family
  .elections[] -- { year, date, vote_pct, seats_won, total_seats, seats_pct, rile_score }
```

Filter far-right parties with `family_code === "70"`.
Sum `vote_pct` of all family_code 70 parties per country per year for the choropleth.

### nopasaran/data.json

```
totalEvents      -- total count
eventsByYear.{YEAR}[] -- array of event objects
  .title, .date, .year, .category, .description
  .consequences, .person, .role, .party
  .sources[].name, .sources[].url
  .url -- link to nopasaran.ch
```

The `.party` field contains canton info (e.g., "UDC - ZH"). Parse the canton
abbreviation after the dash to filter events by canton.

### GeoJSON files

- `CShapes-Europe.geojson` -- FeatureCollection, match features with election data via country code in properties.
- `CShapes-Europe-1900.geojson` -- Historical boundaries for the 1900 starting point.
- `cantons.geojson` -- Swiss cantons with `kantonsnummer`, `name`, `einwohnerzahl`, `kantonsflaeche` in properties.

## Scrollytelling

Use Scrollama with the sticky-container pattern:

1. Each major section (`#hero`, `#europe`, `#switzerland`) is a scrollytelling unit.
2. The map/chart is in a `position: sticky` container.
3. Text steps scroll past the sticky visual.
4. `onStepEnter` triggers data updates (year change, country highlight, section transition).

## Event modal

Use the native `<dialog>` element (already in `index.html`):

```js
const dialog = document.querySelector('dialog');
dialog.showModal();  // open
dialog.close();      // close
```

## Git workflow

- **`main`** branch: stable, deploys
- **`dylan`** and **`loic`** feature branches
- Pull requests to merge feature branches into `main`
- Commit messages in English, present tense, imperative mood
  (e.g., "add europe map choropleth", "fix timeline year display")
- Keep commits focused: one logical change per commit

## Important notes

- `data/elections/convert.js` and `data/nopasaran/scraper.js` are Node.js utility scripts, NOT part of the bundled app.
- GeoJSON files are large (10+ MB). They are loaded at runtime via d3-fetch from `data/`, served as static assets by Vite.
- HTML lang is `fr`. UI text is in French, code and comments are in English.
- Tailwind CSS 4 uses `@import "tailwindcss"` in CSS. No `tailwind.config.js` needed.
