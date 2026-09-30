import React, { Suspense, lazy, useEffect, useRef, useState } from "react";

const LocationMap = lazy(() => import("./LocationMap"));

// Renders a placeholder until the map is within ~400px of the viewport, then
// loads Leaflet and the real map - most visitors to the landing page never
// scroll that far, so they never download it. Takes the same props as
// LocationMap; the parent sets the height.
export default function LazyLocationMap(props) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setVisible(true); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const placeholder = (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-sm text-slate-400">
      Loading map…
    </div>
  );

  return (
    <div ref={ref} className="h-full w-full" data-map-loaded={visible ? "true" : "false"}>
      {visible ? <Suspense fallback={placeholder}><LocationMap {...props} /></Suspense> : placeholder}
    </div>
  );
}
