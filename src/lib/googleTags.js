// GA4 + AdSense, loaded lazily and only on public-facing pages (the
// marketing homepage, branch pages, customer portal, etc.) - never on the
// authenticated staff/manager dashboard, which has no ad placements and
// shouldn't be sending customer-traffic analytics for internal tool usage.
// See src/lib/NavigationTracker.jsx for where this gets called, and
// src/lib/publicPages.js for the shared definition of "public."
const GA_MEASUREMENT_ID = "G-2P8489N3N7";
const ADSENSE_CLIENT_ID = "ca-pub-5400975942684710";

let loaded = false;

export function loadGoogleTags() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  // Pageviews are sent manually per route (see trackPageview below) instead
  // of GA's automatic one, which would only ever fire once for this
  // client-side-routed SPA regardless of how many public pages get visited.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const adsenseScript = document.createElement("script");
  adsenseScript.async = true;
  adsenseScript.crossOrigin = "anonymous";
  adsenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  document.head.appendChild(adsenseScript);
}

export function trackPageview({ path, title }) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}
