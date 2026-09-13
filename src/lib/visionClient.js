// Talks to app-data-server's /api/vision route, which holds the OpenAI key
// server-side (see app-data-server/src/routes/vision.js) - the browser only
// ever sends the photo and gets structured fields back.
import { auth } from "@/lib/firebase";

const BASE_URL = import.meta.env.VITE_APP_DATA_API_URL || "http://localhost:4051";

/** Reads plate/vehicle_type/make/model/color from a photo (data:image/... URL). */
export async function scanVehiclePhoto(imageDataUrl) {
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/vision/scan-vehicle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ image: imageDataUrl }),
    });
  } catch {
    throw new Error(`Couldn't reach the data server at ${BASE_URL} - make sure app-data-server is running, then try again.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Vehicle scan failed (${res.status})`);
  return data;
}
