export function initHorizontalScroll() {
  const wrapper = document.querySelector('#horizontal-scroll');
  const pin = wrapper?.querySelector('.horizontal-scroll__pin');
  const track = wrapper?.querySelector('.horizontal-scroll__track');
  const panels = wrapper?.querySelectorAll('.horizontal-scroll__panel');
  const panel1 = panels?.[0];
  const panel2 = panels?.[1];
  if (!wrapper || !pin || !track || !panel1 || !panel2) return;

  let pinTop = 0;
  let pinHeight = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let panel1Overflow = 0;
  let panel2Overflow = 0;
  let totalScrollable = 0;
  let phase1End = 0;
  let phase2End = 0;
  let maxX = 0;

  function readPinTop() {
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--site-nav-offset')
      .trim();
    const parsed = parseInt(cssValue, 10);
    return Number.isFinite(parsed) ? parsed : 80;
  }

  function measure() {
    pinTop = readPinTop();
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    const maxPin = viewportHeight - pinTop;

    // Measure the section inside each panel — panel.scrollHeight would
    // report the flex-stretched panel height (max of both), not the
    // section's natural content height.
    const section1 = panel1.firstElementChild;
    const section2 = panel2.firstElementChild;
    const panel1Height = section1?.scrollHeight ?? panel1.scrollHeight;
    const panel2Height = section2?.scrollHeight ?? panel2.scrollHeight;

    // Pin matches the SHORTER panel so it fits exactly (no empty space).
    // The taller panel overflows by the diff and is scrolled by phase 1/3.
    // Capped at viewport so we never make the pin taller than the screen.
    // If sections haven't measured yet (0), fall back to viewport height
    // so the pin isn't 0px and the wrapper isn't collapsed; the
    // ResizeObserver will re-measure once content settles.
    const minContent = Math.min(panel1Height, panel2Height);
    pinHeight = minContent > 0 ? Math.min(maxPin, minContent) : maxPin;
    pin.style.height = pinHeight + 'px';

    panel1Overflow = Math.max(0, panel1Height - pinHeight);
    panel2Overflow = Math.max(0, panel2Height - pinHeight);

    // Phase 1: vertical scroll through panel 1
    // Phase 2: 1/3 vh for horizontal slide (short transition)
    // Phase 3: vertical scroll through panel 2
    const slideDistance = Math.round(viewportHeight / 3);
    totalScrollable = panel1Overflow + slideDistance + panel2Overflow;

    phase1End = totalScrollable > 0 ? panel1Overflow / totalScrollable : 0;
    phase2End =
      totalScrollable > 0
        ? (panel1Overflow + slideDistance) / totalScrollable
        : 0;

    maxX = track.scrollWidth - viewportWidth;

    wrapper.style.height = totalScrollable + pinHeight + 'px';
  }

  function update() {
    const rect = wrapper.getBoundingClientRect();
    const stickyProgress = Math.min(
      1,
      Math.max(0, (pinTop - rect.top) / totalScrollable),
    );

    let trackX = 0;
    let panel1Y = 0;
    let panel2Y = 0;

    if (stickyProgress <= phase1End) {
      // Phase 1: vertical scroll through panel 1
      const p1 = phase1End > 0 ? stickyProgress / phase1End : 0;
      panel1Y = -p1 * panel1Overflow;
    } else if (stickyProgress <= phase2End) {
      // Phase 2: horizontal slide from panel 1 to panel 2
      panel1Y = -panel1Overflow;
      const p2 =
        phase2End > phase1End
          ? (stickyProgress - phase1End) / (phase2End - phase1End)
          : 1;
      trackX = p2 * maxX;
    } else {
      // Phase 3: vertical scroll through panel 2
      panel1Y = -panel1Overflow;
      trackX = maxX;
      const p3 =
        phase2End < 1 ? (stickyProgress - phase2End) / (1 - phase2End) : 1;
      panel2Y = -p3 * panel2Overflow;
    }

    track.style.transform = `translate3d(${-trackX}px, 0, 0)`;
    panel1.style.transform = `translate3d(0, ${panel1Y}px, 0)`;
    panel2.style.transform = `translate3d(0, ${panel2Y}px, 0)`;
  }

  measure();
  requestAnimationFrame(() => {
    measure();
    update();
  });

  // Final safety re-measure once everything (stylesheets, fonts, async
  // data fetches that drive chart sizing) has settled. Without this, an
  // F5 at the top of the page can leave the wrapper sized from a stale
  // measurement taken before the charts rendered.
  window.addEventListener('load', () => {
    measure();
    update();
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    update();
  });

  // Re-measure when section content changes (e.g. chart renders lazily).
  // We observe the sections, NOT the panels: panels are flex items that
  // stretch to the taller panel's height, so when only one section grows
  // the panel size may not change and the observer would miss it.
  const panelObserver = new ResizeObserver(() => {
    measure();
    update();
  });
  if (panel1.firstElementChild) panelObserver.observe(panel1.firstElementChild);
  if (panel2.firstElementChild) panelObserver.observe(panel2.firstElementChild);

  // Hash anchors like #city-rural / #language-regions point to sections
  // inside the transformed track, so native scrollIntoView lands on the
  // wrapper not the panel — the user has to click twice. This resolver
  // returns the absolute scrollY needed to surface a given panel on the
  // first click.
  function scrollToSection(id) {
    const PANEL_INDEX = { 'city-rural': 0, 'language-regions': 1 };
    const idx = PANEL_INDEX[id];
    if (idx === undefined) return null;
    measure();
    const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
    if (idx === 0) return wrapperTop;
    const slideDistance = Math.round(window.innerHeight / 3);
    return wrapperTop + panel1Overflow + slideDistance;
  }

  return { scrollToSection };
}
