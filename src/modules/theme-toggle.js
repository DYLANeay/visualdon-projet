/**
 * Theme toggle: switches between light and dark mode.
 * Persists preference to localStorage and dispatches a 'themechange' event
 * so other modules (maps) can redraw with updated CSS-var colors.
 */
export function initThemeToggle(button) {
  if (!button) return;

  const apply = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    button.setAttribute('aria-pressed', String(isDark));
    window.dispatchEvent(new CustomEvent('themechange'));
  };

  button.addEventListener('click', () => {
    apply(!document.documentElement.classList.contains('dark'));
  });

  button.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
}
