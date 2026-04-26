import scrollama from 'scrollama';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatDate(ms) {
    const d = new Date(ms);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function initSwitzerlandScroll(onTimeChange, allDatesMs) {
  const section = document.querySelector('#switzerland');
  if (!section || !allDatesMs || allDatesMs.length === 0) return null;

  const stepsContainer = section.querySelector('.switzerland-steps');
  const yearEl = document.querySelector('#switzerland-year');
  const dots = Array.from(section.querySelectorAll('.switzerland-timeline-dot'));
  const labels = Array.from(section.querySelectorAll('.switzerland-timeline-labels li'));

  const milestoneYears = dots
    .map((dot) => Number(dot.dataset.year))
    .filter((y) => !Number.isNaN(y))
    .sort((a, b) => a - b);

  labels.forEach((li, i) => {
    if (milestoneYears[i] !== undefined) li.textContent = milestoneYears[i];
  });

  stepsContainer.innerHTML = '';
  allDatesMs.forEach((time) => {
    const div = document.createElement('div');
    div.className = 'switzerland-step';
    div.dataset.time = time;
    stepsContainer.appendChild(div);
  });

  let _currentTime = allDatesMs[0];
  let _isPlaying = false;

  function setActiveDot(time) {
    const currentY = new Date(time).getFullYear();
    let activeYear = milestoneYears[0];
    for (const m of milestoneYears) {
      if (m <= currentY) activeYear = m;
      else break;
    }
    dots.forEach((d) => {
      d.classList.toggle('active', Number(d.dataset.year) === activeYear);
    });
  }

  function setTime(time) {
    _currentTime = time;
    if (yearEl) {
        yearEl.textContent = formatDate(time);
        yearEl.style.fontSize = "7.5rem"; // Reduce font size to fit the date
    }
    setActiveDot(time);
    onTimeChange(time);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetYear = Number(dot.dataset.year);
      if (!Number.isNaN(targetYear)) {
        stopPlaying();
        
        let targetTime = allDatesMs[0];
        for (const t of allDatesMs) {
            if (new Date(t).getFullYear() >= targetYear) {
                targetTime = t;
                break;
            }
        }
        
        const targetStep = stepsContainer.querySelector(`[data-time="${targetTime}"]`);
        if (targetStep) {
            targetStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        setTime(targetTime);
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
      if (_isPlaying) return;
      const time = Number(element.dataset.time);
      if (!Number.isNaN(time)) setTime(time);
    });

  window.addEventListener('resize', () => scroller.resize());

  const playBtn = document.querySelector('#switzerland-play');
  let playInterval = null;

  function stopPlaying() {
    _isPlaying = false;
    if (playInterval) clearTimeout(playInterval);
    playInterval = null;
    if (playBtn) {
      playBtn.querySelector('[aria-hidden]').textContent = '▶';
      playBtn.classList.remove('is-playing');
    }
  }

  function startPlaying() {
    _isPlaying = true;
    let currentIndex = allDatesMs.indexOf(_currentTime);
    if (currentIndex === -1 || currentIndex >= allDatesMs.length - 1) {
        currentIndex = 0;
    }

    function playNextStep() {
      if (!_isPlaying) return;
      if (currentIndex >= allDatesMs.length - 1) {
        stopPlaying();
        return;
      }

      const prevTime = allDatesMs[currentIndex];
      currentIndex++;
      const nextTime = allDatesMs[currentIndex];
      
      const targetStep = stepsContainer.querySelector(`[data-time="${nextTime}"]`);
      if (targetStep) {
          targetStep.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      setTime(nextTime);

      const deltaMs = nextTime - prevTime;
      // Normal empty week is 7 days => 120ms (cruising speed)
      // If delta <= 1 day, it's a dense cluster of events => wait longer to read! (e.g. 500ms)
      let delay = 120;
      if (deltaMs <= 24 * 60 * 60 * 1000) {
          delay = 550;
      } else if (deltaMs <= 3 * 24 * 60 * 60 * 1000) {
          delay = 300;
      }
      
      playInterval = setTimeout(playNextStep, delay);
    }
    
    playInterval = setTimeout(playNextStep, 100);

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
