// The public marketing site's branch locations (homepage map, location
// cards, and each branch's own /njiru, /kayole, /utawala page) are static,
// hardcoded data - deliberately NOT read from the operational database
// (app-data-server). Those are two different things: this is what a visitor
// sees when browsing the public site, independent of whatever branches an
// owner has actually set up for day-to-day wash/staff/payment tracking in
// the app itself. That means the public site works even before any business
// exists in the database, and never goes blank if the backend is briefly
// unreachable.
//
// To update what visitors see for a branch (photos, hours, description,
// phone, pin location), edit the matching entry below directly and rebuild
// - no admin login or database involved.
export const PUBLIC_LOCATIONS = [
  {
    id: "njiru",
    name: "BGO Shine Hub - Njiru",
    slug: "njiru",
    city: "Nairobi",
    location: "Njiru, Nairobi",
    phone: "+254757234111",
    description: "Professional car wash, interior cleaning, greasing & air freshening",
    hours: "Open 24 hours, 7 days a week",
    latitude: -1.2503418,
    longitude: 36.9389425,
    photos: [
      "/img/main.jpeg",
      "/img/bay.jpg",
      "/img/detailing.jpg",
      "/img/detailing-2.jpg",
      "/img/main-wash.jpg",
      "/img/wash.jpg",
    ],
    gallery_style: "spotlight",
  },
  {
    id: "kayole",
    name: "BGO Shine Hub - Kayole",
    slug: "kayole",
    city: "Nairobi",
    location: "Kayole, Nairobi",
    phone: "+254757234111",
    description: "Professional car wash, interior cleaning, greasing & air freshening",
    hours: "Open 24 hours, 7 days a week",
    latitude: -1.2833,
    longitude: 36.8833,
    photos: [
      "/img/main.jpeg",
      "/img/bay.jpg",
      "/img/detailing.jpg",
      "/img/detailing-2.jpg",
      "/img/main-wash.jpg",
      "/img/wash.jpg",
    ],
    gallery_style: "spotlight",
  },
  {
    id: "utawala",
    name: "BGO Shine Hub - Utawala",
    slug: "utawala",
    city: "Nairobi",
    location: "Utawala, Nairobi",
    phone: "+254757234111",
    description: "Professional car wash, interior cleaning, greasing & air freshening",
    hours: "Open 24 hours, 7 days a week",
    latitude: -1.2775,
    longitude: 36.9515,
    photos: [
      "/img/main.jpeg",
      "/img/bay.jpg",
      "/img/detailing.jpg",
      "/img/detailing-2.jpg",
      "/img/main-wash.jpg",
      "/img/wash.jpg",
    ],
    gallery_style: "spotlight",
  },
];

export function getPublicLocationBySlug(slug) {
  return PUBLIC_LOCATIONS.find((b) => b.slug === (slug || "").toLowerCase()) || null;
}
