import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Singleton loader — script is only injected once
let mapsReady = false;
let mapsLoading = false;
const pendingCallbacks = [];

function loadMapsScript(cb) {
  if (mapsReady) { cb(); return; }
  pendingCallbacks.push(cb);
  if (mapsLoading) return;
  mapsLoading = true;
  window.__mapsLoaded = () => {
    mapsReady = true;
    pendingCallbacks.forEach(fn => fn());
    pendingCallbacks.length = 0;
  };
  const s = document.createElement("script");
  s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=__mapsLoaded&loading=async`;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

/**
 * Location input backed by Google Maps Places Autocomplete.
 * Degrades to a plain Input when VITE_GOOGLE_MAPS_API_KEY is not set.
 */
export default function PlaceAutocomplete({ value, onChange, placeholder, className }) {
  const inputRef  = useRef(null);
  const acRef     = useRef(null);
  // Always keep a fresh reference to onChange so the one-time listener
  // never calls a stale closure (which caused the "resets other fields" bug).
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(mapsReady);

  // Sync the ref every render — no stale closures
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadMapsScript(() => setReady(true));
  }, []);

  // Attach the Autocomplete widget once the Maps script is ready.
  // Depends only on `ready`, NOT on `onChange`, so the listener is
  // attached exactly once and always calls the latest handler via the ref.
  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
      componentRestrictions: { country: "ke" },
      fields: ["formatted_address", "name"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const addr  = place.formatted_address || place.name || "";
      onChangeRef.current(addr); // ← always the latest onChange
    });

    acRef.current = ac;
  }, [ready]);

  if (!MAPS_KEY) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-9 ${className || ""}`}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
      {!ready && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 animate-spin" />
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search for a location in Kenya…"}
        className={`pl-9 ${className || ""}`}
      />
    </div>
  );
}