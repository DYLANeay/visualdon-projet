const _state = new WeakMap();

// Animate a text swap on a year element: the old value slides up + fades out,
// then the new value slides in from below + fades in.
//
// Coalescing: rapid successive calls (e.g. fast scroll through 50 years) do
// not start 50 animations or cancel mid-flight (cancelling a fill:forwards
// animation snaps the element back to its underlying state, which flickers).
// Instead each call updates the latest target; the running animation always
// commits to whatever target is current when it finishes, then runs another
// cycle if the target moved again during the in-fade.
export function animateYearChange(el, newValue, { duration = 380 } = {}) {
  if (!el) return;
  const nextText = String(newValue);

  let state = _state.get(el);
  if (!state) {
    state = { latest: el.textContent.trim(), running: false };
    _state.set(el, state);
  }

  if (state.latest === nextText) return;
  state.latest = nextText;

  if (state.running) return;
  _runCycle(el, state, duration);
}

function _runCycle(el, state, duration) {
  if (el.textContent.trim() === state.latest) {
    state.running = false;
    return;
  }
  state.running = true;

  const out = el.animate(
    [
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      {
        opacity: 0,
        transform: 'translateY(-14px) scale(0.98)',
        filter: 'blur(2px)',
      },
    ],
    {
      duration: duration * 0.45,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards',
    },
  );

  out.onfinish = () => {
    el.textContent = state.latest;
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
    inAnim.onfinish = () => {
      if (el.textContent.trim() !== state.latest) {
        _runCycle(el, state, duration);
      } else {
        state.running = false;
      }
    };
  };
}
