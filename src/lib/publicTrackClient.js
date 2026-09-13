// Talks to app-data-server's one deliberately public endpoint (see
// app-data-server/src/routes/publicTrack.js) - no Firebase login involved,
// since customers never have an account in this app. Both phone AND plate
// must match together, same as any "order number + zip code" tracking page.
const BASE_URL = import.meta.env.VITE_APP_DATA_API_URL || "http://localhost:4051";

/**
 * Verifies a phone+plate pair and, if it matches a real check-in, returns
 * that phone number's full wash history: { verified: true, history: [...] }.
 * Throws with a friendly message on no-match/failure.
 */
export async function trackCar({ phone, plate }) {
  const params = new URLSearchParams({ phone, plate });
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/public/track-car?${params}`);
  } catch {
    throw new Error(`Couldn't reach the tracking service - please try again shortly.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Tracking request failed (${res.status})`);
  return data;
}
