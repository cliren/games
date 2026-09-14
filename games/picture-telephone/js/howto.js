/**
 * HowToSheet — reusable 3-step how-to for hub games.
 * Auto-once via localStorage key howto:{gameId}:v1
 * Esc / Got it dismiss; header ? reopens.
 */

const GAME_ID = "picture-telephone";
const STORAGE_KEY = `howto:${GAME_ID}:v1`;

export function hasSeenHowto() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHowtoSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   overlay: HTMLElement,
 *   sheet: HTMLElement,
 *   gotItBtn: HTMLElement,
 *   closeBtn: HTMLElement,
 *   openBtn: HTMLElement,
 * }} els
 */
export function initHowto(els) {
  const { overlay, sheet, gotItBtn, closeBtn, openBtn } = els;
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    gotItBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    markHowtoSeen();
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  function onKey(e) {
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  gotItBtn.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  openBtn.addEventListener("click", open);
  document.addEventListener("keydown", onKey);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Prevent clicks inside sheet from closing
  sheet.addEventListener("click", (e) => e.stopPropagation());

  return {
    open,
    close,
    maybeAutoShow() {
      if (!hasSeenHowto()) open();
    },
  };
}
