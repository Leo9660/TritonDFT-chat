export type Theme = "light" | "dark";

const KEY = "tritondft.theme.v1";

/** Light by default: the app is read for long stretches, and the low-contrast
 * paper palette is easier to sit with than an inverted one. */
export const DEFAULT_THEME: Theme = "light";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const v = localStorage.getItem(KEY);
  return v === "dark" || v === "light" ? v : DEFAULT_THEME;
}

export function saveTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode — the theme just won't persist */
  }
}

/** Dark is opted into by stamping the root; light is the bare :root palette. */
export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}
