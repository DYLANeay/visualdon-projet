export function animateYearChange(el, newValue) {
  if (!el) return;
  const nextText = String(newValue);
  if (el.textContent.trim() === nextText) return;
  el.textContent = nextText;
}
