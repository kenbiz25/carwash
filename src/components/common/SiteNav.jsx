import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import Logo from "@/components/common/Logo";
import { Phone, Mail, MessageCircle, BadgeCheck, Menu, X, ArrowRight } from "@/lib/icons";
import { motion } from "framer-motion";
import { api } from "@/api/firebaseClient";
import { WHATSAPP_BOOKING_URL } from "@/lib/constants";

const SECTION_LINKS = [
  { hash: "#services", label: "Services" },
  { hash: "#map", label: "Locations" },
  { hash: "#testimonials", label: "Reviews" },
];

/**
 * The public site's top trust bar + main nav + mobile menu — used on Landing
 * and on every branch page so a visitor who lands directly on e.g. /kayole
 * (a shared link, a QR code, a Google listing) still gets full site
 * navigation, not just a dead end back to "All Locations".
 *
 * `basePath` prefixes the in-page section links (#services, #map,
 * #testimonials) — those ids only exist on the Landing page itself, so any
 * page other than Landing must pass basePath="/Landing" to link back to it
 * instead of trying (and failing) to scroll within its own page.
 */
export default function SiteNav({ basePath = "" }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  return (
    <>
      {/* ── Top social / trust bar ─────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-brand-navy-dark border-b border-white/5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <a href="tel:+254757234111" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="h-3 w-3 text-brand-orange" /> +254 757 234 111
            </a>
            <a href="mailto:bgoshinehubltd@gmail.com" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="h-3 w-3 text-brand-orange" /> bgoshinehubltd@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 font-semibold">Open 24/7</span>
            <div className="w-px h-4 bg-white/10" />
            <BadgeCheck className="h-3.5 w-3.5 text-brand-orange" />
            <span className="text-xs text-slate-400">Rated 4.8★ by our customers</span>
            <div className="w-px h-4 bg-white/10 mx-2" />
            <a href="https://wa.me/254757234111" aria-label="WhatsApp" className="h-6 w-6 rounded flex items-center justify-center bg-[#25D366] hover:opacity-80 transition-opacity">
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 md:top-9 left-0 right-0 z-50 bg-brand-navy/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("Landing")}>
              <Logo size="default" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {SECTION_LINKS.map(({ hash, label }) => (
                <a key={hash} href={`${basePath}${hash}`} className="text-brand-blue-pale hover:text-white transition-colors text-sm font-medium">
                  {label}
                </a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="bg-brand-orange hover:bg-brand-orange-hot text-white">
                    Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Button className="bg-brand-orange hover:bg-brand-orange-hot text-white" asChild>
                    <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a Wash</a>
                  </Button>
                  <Button variant="outline" className="border-brand-blue-light/40 text-brand-blue-light hover:bg-brand-blue-light/10 hover:text-white" onClick={() => api.auth.redirectToLogin()}>
                    Login
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-brand-navy border-t border-white/10 p-4">
            <div className="flex flex-col gap-3">
              {SECTION_LINKS.map(({ hash, label }) => (
                <a key={hash} href={`${basePath}${hash}`} className="py-2 text-brand-blue-pale" onClick={() => setMobileMenuOpen(false)}>
                  {label}
                </a>
              ))}
              <hr className="border-white/10 my-2" />
              {isAuthenticated ? (
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="w-full bg-brand-orange hover:bg-brand-orange-hot">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Button className="w-full bg-brand-orange hover:bg-brand-orange-hot" asChild>
                    <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a Wash</a>
                  </Button>
                  <Button variant="outline" className="w-full border-brand-blue-light/40 text-brand-blue-light hover:bg-brand-blue-light/10" onClick={() => api.auth.redirectToLogin()}>Login</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>
    </>
  );
}
