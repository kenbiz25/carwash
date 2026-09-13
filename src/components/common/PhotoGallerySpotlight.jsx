import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "@/lib/icons";

/**
 * A carousel with one large, sharp "spotlight" photo in the center and
 * `sideCount` smaller, gently dimmed photos on each side, cycled with arrow
 * buttons. Sizes scale with the viewport (via clamp()) instead of being
 * fixed pixel values, and depth is conveyed mostly through size/opacity
 * rather than heavy blur, which read as a washed-out haze at the old
 * settings rather than a deliberate depth-of-field effect.
 */
export default function PhotoGallerySpotlight({ photos = [], altPrefix = "photo", sideCount = 1 }) {
  const [index, setIndex] = useState(0);
  if (!photos.length) return null;

  const go = (dir) => setIndex((i) => (i + dir + photos.length) % photos.length);
  const at = (offset) => photos[(index + offset + photos.length * 10) % photos.length];

  const sideOffsets = Array.from({ length: sideCount }, (_, i) => i + 1);

  const sideCardStyle = (depth) => ({
    width: `clamp(${140 - depth * 20}px, ${20 - depth * 3}vw, ${240 - depth * 40}px)`,
    aspectRatio: "3/4",
    filter: `blur(${depth * 0.4}px) brightness(${1 - depth * 0.06})`,
    opacity: 1 - depth * 0.14,
    zIndex: 10 - depth,
  });

  return (
    <div className="py-8 max-w-5xl mx-auto overflow-x-auto">
      <div className="flex items-center justify-center gap-2 sm:gap-4 w-fit mx-auto">
        {[...sideOffsets].reverse().map((depth) => (
          <div key={`l${depth}`} className="hidden sm:block relative flex-shrink-0 rounded-2xl overflow-hidden shadow-lg bg-slate-200 -mr-8 transition-all duration-300" style={sideCardStyle(depth)}>
            <img src={at(-depth)} alt={`${altPrefix} preview`} className="w-full h-full object-cover" draggable={false} />
          </div>
        ))}

        <div
          className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-slate-200 z-20"
          style={{ width: "clamp(260px, 34vw, 420px)", aspectRatio: "3/4" }}
        >
          <img src={at(0)} alt={`${altPrefix} featured`} className="w-full h-full object-cover" draggable={false} />
        </div>

        {sideOffsets.map((depth) => (
          <div key={`r${depth}`} className="hidden sm:block relative flex-shrink-0 rounded-2xl overflow-hidden shadow-lg bg-slate-200 -ml-8 transition-all duration-300" style={sideCardStyle(depth)}>
            <img src={at(depth)} alt={`${altPrefix} preview`} className="w-full h-full object-cover" draggable={false} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={() => go(-1)}
          className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:border-brand-orange hover:text-brand-orange transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {photos.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-brand-orange" : "w-1.5 bg-slate-300"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:border-brand-orange hover:text-brand-orange transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
