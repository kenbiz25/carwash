// Single source of truth for "does this page require sign-in" - shared by
// App.jsx's route guard and NavigationTracker.jsx's public-vs-internal
// analytics split, so the two can never drift apart (e.g. a page silently
// getting GA/AdSense loaded while still being staff-only, or vice versa).
// Must match keys in pages.config.
export const PUBLIC_PAGES = new Set(["Landing", "Login", "CustomerPortal", "JoinBusiness", "PrivacyPolicy", "TermsOfService", "TrackCar"]);
