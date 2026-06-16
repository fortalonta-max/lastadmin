const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "leen_utm";

/**
 * Call on every page load/navigation.
 * If the current URL contains UTM params, they overwrite any stored ones.
 * Params are kept in sessionStorage so they persist across the funnel
 * (home → product → cart → checkout) but reset on a new browser session.
 */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const found: UtmParams = {};
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) found[key] = val.slice(0, 200);
  }
  if (Object.keys(found).length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    } catch {
      // sessionStorage unavailable — ignore
    }
  }
}

/** Returns the UTM params captured during this session, or an empty object. */
export function getUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}
