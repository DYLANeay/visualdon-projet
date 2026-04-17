import scrollama from 'scrollama';

export function initEuropeScroll(elections, onYearChange) {
  const section = document.querySelector('#europe');
  const stepsContainer = section.querySelector('.europe-steps');

  const allYears = new Set([1900]);
  for (const country of Object.values(elections)) {
    for (const party of Object.values(country.parties)) {
      for (const election of party.elections) {
        allYears.add(election.year);
      }
    }
  }
  const years = Array.from(allYears).sort((a, b) => a - b);

  years.forEach((year) => {
    const div = document.createElement('div');
    div.className = 'europe-step';
    div.dataset.year = year;
    stepsContainer.appendChild(div);
  });

  const scroller = scrollama();
  scroller
    .setup({
      step: '.europe-step',
      offset: 0.5,
    })
    .onStepEnter(({ element }) => {
      const year = +element.dataset.year;
      onYearChange(year);
      const yearEl = document.querySelector('#europe-year');
      if (yearEl) yearEl.textContent = year;

      document.querySelectorAll('.timeline-dot').forEach((dot) => {
        dot.classList.remove('active');
      });
      const activeDot = document.querySelector(`.timeline-dot[data-year="${year}"]`);
      if (activeDot) activeDot.classList.add('active');
    });

  return scroller;
}
