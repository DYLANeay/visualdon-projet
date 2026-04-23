import scrollama from 'scrollama';
import { animateYearChange } from './utils.js';

export function initSwitzerlandScroll(onYearChange) {
  const section = document.querySelector('#switzerland');
  if (!section) return null;

  const stepsContainer = section.querySelector('.switzerland-steps');
  const yearEl = document.querySelector('#switzerland-year');
  const dots = Array.from(section.querySelectorAll('.switzerland-timeline-dot'));
  const labels = Array.from(section.querySelectorAll('.switzerland-timeline-labels li'));

  // Use the timeline dot years as scroll milestones, in order.
  const years = dots
    .map((dot) => Number(dot.dataset.year))
    .filter((y) => !Number.isNaN(y));

  // Keep dot labels in sync with their data-year so they're readable.
  labels.forEach((li, i) => {
    if (years[i] !== undefined) li.textContent = years[i];
  });

  // Generate scroll steps — one per timeline year — so the section has
  // enough height to stick while the user scrolls.
  stepsContainer.innerHTML = '';
  years.forEach((year) => {
    const div = document.createElement('div');
    div.className = 'switzerland-step';
    div.dataset.year = year;
    stepsContainer.appendChild(div);
  });

  function setYear(year) {
    animateYearChange(yearEl, year);
    dots.forEach((d) => d.classList.remove('active'));
    const active = section.querySelector(
      `.switzerland-timeline-dot[data-year="${year}"]`,
    );
    if (active) active.classList.add('active');
    onYearChange(year);
  }

  // Click-to-jump on timeline dots.
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
