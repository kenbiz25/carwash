import React from "react";

/**
 * A row of photo cards fanned out in perspective — each one rotated and
 * dropped slightly further from center the further out it sits, like a hand
 * of cards. Purely presentational (no interactivity), sized to gracefully
 * scroll horizontally on narrow screens rather than crushing together.
 */
export default function PhotoGalleryFan({ photos = [], altPrefix = "photo" }) {
  if (!photos.length) return null;
  const mid = (photos.length - 1) / 2;

  return (
    <div className="overflow-x-auto py-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        className="flex justify-center items-start gap-3 sm:gap-4 w-fit mx-auto"
        style={{ perspective: "500px" }}
      >
        {photos.map((src, i) => {
          const offset = i - mid;
          const rotateY = offset * -13;
          const translateY = Math.abs(offset) * 20;
          const scale = 1 - Math.abs(offset) * 0.045;
          return (
            <div
              key={i}
              className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-xl bg-slate-200 transition-transform duration-500 hover:!translate-y-0 hover:!scale-100 hover:!rotate-0"
              style={{
                width: "150px",
                aspectRatio: "3/4",
                transform: `translateY(${translateY}px) rotateY(${rotateY}deg) scale(${scale})`,
                zIndex: photos.length - Math.abs(offset),
              }}
            >
              <img src={src} alt={`${altPrefix} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
