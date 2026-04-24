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
    animateYearChange(yearEl, year);
    setActiveDot(year);
    onYearChange(year);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const year = Number(dot.dataset.year);
      if (!Number.isNaN(year)) setYear(year);
    });
  });

  const scroller = scrollama();
  scroller
    .setup({
      step: '.switzerland-step',
      offset: 0.5,
    })
    .onStepEnter(({ element }) => {
      const year = Number(element.dataset.year);
      if (!Number.isNaN(year)) setYear(year);
    });

  window.addEventListener('resize', () => scroller.resize());
  return scroller;
}
