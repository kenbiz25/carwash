import React from "react";

const imgSizes = {
  sm:      "h-6",
  default: "h-7",
  lg:      "h-10",
  xl:      "h-14",
};

const padding = {
  sm:      "p-1",
  default: "p-1.5",
  lg:      "p-2",
  xl:      "p-2.5",
};

export default function Logo({ size = "default", showText = true }) {
  // showText prop kept for backwards-compat but ignored — text is part of the image
  // White backing plate: the logo's linework is navy-on-transparent, and every
  // place this component is used (nav, sidebar, footer) has a navy background —
  // without it, only the red accent would be visible.
  return (
    <span className={`inline-flex items-center bg-white rounded-lg shadow-sm ${padding[size]}`}>
      <img
        src="/img/main.png"
        alt="BGO Shine Hub"
        className={`${imgSizes[size]} w-auto object-contain`}
        draggable={false}
      />
    </span>
  );
}
