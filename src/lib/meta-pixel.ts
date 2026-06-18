// Meta Pixel client-side helper. Settings come from site_settings.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __fbqLoaded?: string;
  }
}

export function initMetaPixel(pixelId: string | null | undefined) {
  if (typeof window === "undefined" || !pixelId) return;
  if (window.__fbqLoaded === pixelId) return;
  window.__fbqLoaded = pixelId;

  // Standard Facebook pixel snippet
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      // eslint-disable-next-line prefer-rest-params
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = !0;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq?.("init", pixelId);
  // NOTE: PageView is NOT fired here on init.
  // The MetaPixelLoader useEffect fires the initial PageView immediately after
  // calling initMetaPixel, and the router's onResolved subscription fires it
  // on every subsequent SPA navigation. Firing PageView inside initMetaPixel
  // AND from the router subscription caused a double PageView on initial load
  // when the pixel script was already cached in the browser (making fbq
  // available synchronously).

  // noscript fallback for browsers with JavaScript disabled
  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
  document.body.appendChild(noscript);
}

export function trackPixel(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) window.fbq("track", event, params ?? {}, { eventID: eventId });
  else window.fbq("track", event, params ?? {});
}

/** Read _fbp and _fbc cookies set by the Pixel — pass to CAPI for better match quality. */
export function getPixelCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const cookies = Object.fromEntries(
    document.cookie.split("; ").filter(Boolean).map((c) => {
      const idx = c.indexOf("=");
      return [c.slice(0, idx), c.slice(idx + 1)];
    }),
  );
  return {
    fbp: cookies["_fbp"] ?? undefined,
    fbc: cookies["_fbc"] ?? undefined,
  };
}
