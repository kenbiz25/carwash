import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { getCookieConsent, setCookieConsent } from "@/lib/cookieConsent";
import { applyConsent } from "@/lib/googleTags";

// Bottom-of-screen cookie notice, shown once until the visitor accepts or
// declines. Declining keeps Google Analytics/AdSense cookies off via consent
// mode (see googleTags.js) - the app's own local storage (signed-in session,
// selected business, dark mode) is needed for it to work, so isn't optional.
export default function CookieConsent() {
  const [choice, setChoice] = useState(() => getCookieConsent());

  if (choice) return null;

  const answer = (value) => {
    setCookieConsent(value);
    applyConsent(value === "accepted");
    setChoice(value);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
          We use cookies to keep you signed in, remember your preferences and, with your
          permission, measure site traffic. See our{" "}
          <Link to={createPageUrl("PrivacyPolicy")} className="underline hover:text-slate-900 dark:hover:text-white">
            Privacy Policy
          </Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => answer("declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => answer("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
