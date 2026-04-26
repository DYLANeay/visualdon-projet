import scrollama from 'scrollama';
import { animateYearChange } from './utils.js';

export function initSwitzerlandScroll(onYearChange) {
  const section = document.querySelector('#switzerland');
  if (!section) return null;

  const stepsContainer = section.querySelector('.switzerland-steps');
  const yearEl = document.querySelector('#switzerland-year');
  const dots = Array.from(section.querySelectorAll('.switzerland-timeline-dot'));
  const labels = Array.from(section.querySelectorAll('.switzerland-timeline-labels li'));

  // Milestone years come from the timeline dots, in order.
  const milestoneYears = dots
    .map((dot) => Number(dot.dataset.year))
    .filter((y) => !Number.isNaN(y))
    .sort((a, b) => a - b);

  if (milestoneYears.length < 2) return null;

  // Keep dot labels in sync with their data-year so they're readable.
  labels.forEach((li, i) => {
    if (milestoneYears[i] !== undefined) li.textContent = milestoneYears[i];
  });

  // One scroll step per year between the first and last milestone, so the big
  // watermark counts up year by year as the user scrolls instead of jumping
  // from milestone to milestone.
  const minYear = milestoneYears[0];
  const maxYear = milestoneYears[milestoneYears.length - 1];
  const allYears = [];
  for (let y = minYear; y <= maxYear; y++) allYears.push(y);

  stepsContainer.innerHTML = '';
  allYears.forEach((year) => {
    const div = document.createElement('div');
    div.className = 'switzerland-step';
    div.dataset.year = year;
    stepsContainer.appendChild(div);
  });

  // Track the current year so the play button can resume from it.
  let _currentScrollYear = minYear;
  // Flag to suppress scrollama callbacks while auto-playing.
  let _isPlaying = false;

  function setActiveDot(year) {
    // Light up the latest milestone dot at or before the current year.
    let activeYear = milestoneYears[0];
    for (const m of milestoneYears) {
      if (m <= year) activeYear = m;
      else break;
    }
    dots.forEach((d) => {
      d.classList.toggle('active', Number(d.dataset.year) === activeYear);
    });
  }

  function setYear(year) {
    _currentScrollYear = year;
    animateYearChange(yearEl, year);
    setActiveDot(year);
    onYearChange(year);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const year = Number(dot.dataset.year);
      if (!Number.isNaN(year)) {
        stopPlaying();
        setYear(year);
      }
    });
  });

  const scroller = scrollama();
  scroller
    .setup({
      step: '.switzerland-step',
      offset: 0.5,
    })
    .onStepEnter(({ element }) => {
      // While auto-playing, ignore scroll-driven year changes to prevent
      // oscillation between the interval's year and the scroll position.
      if (_isPlaying) return;
      const year = Number(element.dataset.year);
      if (!Number.isNaN(year)) setYear(year);
    });

  window.addEventListener('resize', () => scroller.resize());

  // ── Play button ───────────────────────────────────────────────────────
  const playBtn = document.querySelector('#switzerland-play');
  let playInterval = null;

  function stopPlaying() {
    _isPlaying = false;
    if (playInterval) clearInterval(playInterval);
    playInterval = null;
    if (playBtn) {
      playBtn.querySelector('[aria-hidden]').textContent = '▶';
      playBtn.classList.remove('is-playing');
    }
  }

  function startPlaying() {
    _isPlaying = true;
    let playYear = _currentScrollYear;
    // If already at the end, restart from the beginning.
    if (playYear >= maxYear) playYear = minYear;

    playInterval = setInterval(() => {
      if (playYear >= maxYear) {
        stopPlaying();
        return;
      }
      playYear++;
      setYear(playYear);
    }, 400); // 400ms per year

    if (playBtn) {
      playBtn.querySelector('[aria-hidden]').textContent = '⏸';
      playBtn.classList.add('is-playing');
    }
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playInterval) stopPlaying();
      else startPlaying();
    });
  }

  return { scroller, stopPlaying };
}
