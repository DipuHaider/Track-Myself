export const TEXT_SCALES = ["sm", "md", "lg", "xl"] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const TEXT_SCALE_LABELS: Record<TextScale, string> = {
  sm: "Small",
  md: "Default",
  lg: "Large",
  xl: "Largest",
};

export const COLOR_SCHEMES = ["light", "dark", "system"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export type A11yPrefs = {
  textScale: TextScale;
  scheme: ColorScheme;
  contrast: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  readingSpacing: boolean;
  underlineLinks: boolean;
};

export const A11Y_DEFAULTS: A11yPrefs = {
  textScale: "md",
  scheme: "system",
  contrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  readingSpacing: false,
  underlineLinks: false,
};

export const A11Y_KEY = "tm-a11y";
export const A11Y_EVENT = "tm-a11y-change";
export const THEME_EVENT = "theme-change";

export function normaliseA11y(raw: unknown): A11yPrefs {
  const v = (raw ?? {}) as Partial<Record<keyof A11yPrefs, unknown>>;
  const scale = TEXT_SCALES.includes(v.textScale as TextScale)
    ? (v.textScale as TextScale)
    : A11Y_DEFAULTS.textScale;
  const scheme = COLOR_SCHEMES.includes(v.scheme as ColorScheme)
    ? (v.scheme as ColorScheme)
    : A11Y_DEFAULTS.scheme;

  return {
    textScale: scale,
    scheme,
    contrast: v.contrast === true,
    reduceMotion: v.reduceMotion === true,
    dyslexiaFont: v.dyslexiaFont === true,
    readingSpacing: v.readingSpacing === true,
    underlineLinks: v.underlineLinks === true,
  };
}

export function resolveScheme(scheme: ColorScheme): "light" | "dark" {
  if (scheme === "light" || scheme === "dark") return scheme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyA11y(prefs: A11yPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.setAttribute("data-theme", resolveScheme(prefs.scheme));
  root.setAttribute("data-text-scale", prefs.textScale);
  root.toggleAttribute("data-contrast", prefs.contrast);
  root.toggleAttribute("data-reduce-motion", prefs.reduceMotion);
  root.toggleAttribute("data-dyslexia", prefs.dyslexiaFont);
  root.toggleAttribute("data-reading-spacing", prefs.readingSpacing);
  root.toggleAttribute("data-underline-links", prefs.underlineLinks);

  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
    localStorage.setItem("theme", prefs.scheme === "system" ? "system" : prefs.scheme);
  } catch {}

  window.dispatchEvent(new Event(A11Y_EVENT));
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function readStoredA11y(): A11yPrefs {
  if (typeof window === "undefined") return A11Y_DEFAULTS;
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) {
      const theme = localStorage.getItem("theme");
      if (theme === "dark" || theme === "light") {
        return { ...A11Y_DEFAULTS, scheme: theme };
      }
      return A11Y_DEFAULTS;
    }
    return normaliseA11y(JSON.parse(raw));
  } catch {
    return A11Y_DEFAULTS;
  }
}

export const A11Y_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,p={},raw=localStorage.getItem("${A11Y_KEY}");
if(raw){p=JSON.parse(raw)||{}}
var t=localStorage.getItem("theme");
var s=p.scheme||(t==="dark"||t==="light"?t:"system");
var dark=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.setAttribute("data-theme",dark?"dark":"light");
d.setAttribute("data-text-scale",p.textScale||"md");
if(p.contrast)d.setAttribute("data-contrast","");
if(p.reduceMotion)d.setAttribute("data-reduce-motion","");
if(p.dyslexiaFont)d.setAttribute("data-dyslexia","");
if(p.readingSpacing)d.setAttribute("data-reading-spacing","");
if(p.underlineLinks)d.setAttribute("data-underline-links","");
}catch(e){}})();`;
