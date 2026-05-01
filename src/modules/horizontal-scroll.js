export function initHorizontalScroll() {
  const wrapper = document.querySelector('#horizontal-scroll');
  const track = wrapper?.querySelector('.horizontal-scroll__track');
  if (!wrapper || !track) return;

  let trackWidth = 0;
  let viewportWidth = 0;
  let wrapperHeight = 0;
  let pinTop = 0;
  let pinHeight = 0;

  function readPinTop() {
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--site-nav-offset')
      .trim();
    const parsed = parseInt(cssValue, 10);
    return Number.isFinite(parsed) ? parsed : 80;
  }

  function measure() {
    trackWidth = track.scrollWidth;
    viewportWidth = window.innerWidth;
    wrapperHeight = wrapper.offsetHeight;
    pinTop = readPinTop();
    pinHeight = window.innerHeight - pinTop;
  }

  function update() {
    const rect = wrapper.getBoundingClientRect();
    // Sticky window: rect.top goes from `pinTop` (just stuck) to
    // `pinTop - (wrapperHeight - pinHeight)` (about to unstick).
    const stickyRange = wrapperHeight - pinHeight;
    if (stickyRange <= 0) return;
    const progress = Math.min(1, Math.max(0, (pinTop - rect.top) / stickyRange));
    const maxX = trackWidth - viewportWidth;
    const x = progress * maxX;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
  }

  measure();
  update();

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    update();
  });
}
