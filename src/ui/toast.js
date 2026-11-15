const DEFAULT_DURATION_MS = 2600;
const VISIBLE_CLASS = 'is-visible';

export function createToast(element) {
  let hideTimer = null;

  function show(message, durationMs = DEFAULT_DURATION_MS) {
    element.textContent = message;
    element.classList.add(VISIBLE_CLASS);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => element.classList.remove(VISIBLE_CLASS), durationMs);
  }

  return { show };
}
