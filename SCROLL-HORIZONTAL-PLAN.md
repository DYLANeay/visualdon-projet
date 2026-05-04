# Horizontal scroll for Ville/Campagne + Langues sections

## Context

The page currently scrolls vertically through five chapters: hero → Europe map → Switzerland map → Ville/Campagne (`#city-rural`) → Langues (`#language-regions`) → À propos (`#about`).

We want chapters 3 and 3-bis (Ville/Campagne and Langues) to read as a side-by-side horizontal sequence: as the user scrolls down, the two panels slide in from the right. Once both have passed, vertical scrolling resumes naturally for `#about`.

The mobile blocker (`<768px`) already replaces the page with a warning, so this only needs to work on desktop/large screens.

## Approach: sticky pin + JS-driven translateX

Standard "scrolljacking" pattern, no new dependencies:

1. Wrap the two sections in a tall outer `<section>` (height = `200vh` for 2 panels).
2. Inside, a `position: sticky` pin holds the viewport for the duration of the outer section.
3. Inside the pin, a flex track lays the two panels side-by-side (each `100vw` wide).
4. A `scroll` listener computes vertical progress through the wrapper and applies `transform: translate3d(-x, 0, 0)` to the track.
5. `#about` sits after the wrapper in normal flow → vertical scroll resumes automatically.

**Why not pure CSS?** A pure-CSS scroll-snap container would need the user to scroll horizontally. The user wants vertical scroll → horizontal motion, which requires translating the track based on vertical scroll position.

**Lenis** is already disabled outside `#europe` / `#switzerland` (`src/main.js:65-89`), so the new wrapper uses native scroll — no Lenis interaction needed. The translate logic can hook the same `window` scroll event listener pattern.

## Files to modify

### `index.html` (lines 409–492)

Wrap `#city-rural` and `#language-regions` in a new container. Keep their existing IDs and inner structure so the chart init code (`src/main.js:490-526`) continues to find `#city-rural-chart` and `#language-regions-chart` via `querySelector`.

```html
<!-- Chapters 3 + 3 suite: horizontal scroll wrapper -->
<section id="horizontal-scroll" class="horizontal-scroll">
  <div class="horizontal-scroll__pin">
    <div class="horizontal-scroll__track">
      <div class="horizontal-scroll__panel">
        <section id="city-rural" class="city-rural-section"> ... </section>
      </div>
      <div class="horizontal-scroll__panel">
        <section id="language-regions" class="city-rural-section"> ... </section>
      </div>
    </div>
  </div>
</section>
```

### `src/style.css` (append new block near line 1930, before `.chart-sticky`)

```css
.horizontal-scroll {
  position: relative;
  height: 200vh;          /* 2 panels × 100vh */
}

.horizontal-scroll__pin {
  position: sticky;
  top: var(--site-nav-offset, 80px);
  height: calc(100vh - var(--site-nav-offset, 80px));
  overflow: hidden;
}

.horizontal-scroll__track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.horizontal-scroll__panel {
  flex: 0 0 100vw;
  height: 100%;
  overflow-y: auto;       /* let tall chart content scroll inside the panel if needed */
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* Reduce vertical padding inside horizontal panels — the section was designed
   for normal vertical flow with 80/120px gaps that no longer make sense. */
.horizontal-scroll__panel .city-rural-section {
  padding-top: 48px;
  padding-bottom: 48px;
  width: 100%;
}
```

### `src/modules/horizontal-scroll.js` (new file)

```js
export function initHorizontalScroll() {
  const wrapper = document.querySelector('#horizontal-scroll');
  const track = wrapper?.querySelector('.horizontal-scroll__track');
  if (!wrapper || !track) return;

  let trackWidth = 0;
  let viewportWidth = 0;
  let wrapperHeight = 0;

  function measure() {
    trackWidth = track.scrollWidth;
    viewportWidth = window.innerWidth;
    wrapperHeight = wrapper.offsetHeight;
  }

  function update() {
    const rect = wrapper.getBoundingClientRect();
    const scrollable = wrapperHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    const maxX = trackWidth - viewportWidth;
    const x = progress * maxX;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
  }

  measure();
  update();

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => { measure(); update(); });
}
```

### `src/main.js`

Add import and call after DOM is ready (alongside the existing chart lazy-init around line 506):

```js
import { initHorizontalScroll } from './modules/horizontal-scroll.js';
// ...
initHorizontalScroll();
```

The existing `IntersectionObserver` blocks at `src/main.js:490-526` continue to lazy-init the charts the first time their containers cross the viewport — this still works because the panels are visible (just transformed) once the wrapper enters view.

## Things to verify after implementation

1. **Chart sizing**: open dev server (`npm run dev`), scroll down through `#switzerland` into the new wrapper. Both charts should render at panel width and the lazy-init observers should fire on schedule. Inspect each `<svg>` width in devtools — it should match the panel width minus padding.
2. **Smoothness**: scroll with a trackpad and a wheel mouse. Track should translate continuously without jank.
3. **Boundaries**: at the wrapper top, panel 1 should be fully visible (no offset). At wrapper bottom, panel 2 should be fully visible. Test by scrolling slowly past each end.
4. **Resume vertical**: after the wrapper, `#about` should scroll normally with no leftover transform or scroll lock.
5. **Resize**: resize the browser window — the track should re-measure and stay aligned (no drift).
6. **Lenis interaction**: Lenis is disabled in this region per the existing logic. Confirm scroll feels native here while still smooth in `#europe`/`#switzerland`.
7. **Theme toggle**: switch light/dark while inside the horizontal section — chart colors should refresh without breaking translate state.

## Out of scope

- Touch/mobile gestures (mobile is blocked by the existing `.mobile-warning` at `<768px`).
- Snap-to-panel behavior (smooth continuous scroll is fine; can be added later with `scroll-snap-type` on the wrapper if desired).
- Side nav indicator showing which panel is active.
