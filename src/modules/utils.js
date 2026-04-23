const _inFlight = new WeakMap();

// Animate a text swap on a year element: the old value slides up + fades out,
// then the new value slides in from below + fades in. Guards against overlap
// when scroll fires rapid consecutive year changes.
export function animateYearChange(el, newValue, { duration = 380 } = {}) {
  if (!el) return;
  const nextText = String(newValue);
  if (el.textContent.trim() === nextText) return;

  const previous = _inFlight.get(el);
  if (previous) previous.cancel();

  const out = el.animate(
    [
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      {
        opacity: 0,
        transform: 'translateY(-14px) scale(0.98)',
        filter: 'blur(2px)',
      },
    ],
    { duration: duration * 0.45, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
  );

  _inFlight.set(el, out);

  out.onfinish = () => {
    el.textContent = nextText;
    const inAnim = el.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(14px) scale(0.98)',
          filter: 'blur(2px)',
        },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      ],
      {
        duration: duration * 0.55,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );
    _inFlight.set(el, inAnim);
    inAnim.onfinish = () => {
      _inFlight.delete(el);
    };
  };
}
