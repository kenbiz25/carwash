// The visitor's cookie choice ("accepted" | "declined" | null if not asked
// yet). Stored in localStorage, not a cookie, so asking doesn't itself set
// one. Storage can throw (private mode, blocked site data) - treat that as
// "not asked yet" and the banner simply shows again next visit.
const STORAGE_KEY = "cookie_consent";

export function getCookieConsent() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Choice still applies for this page load via applyConsent below.
  }
}
