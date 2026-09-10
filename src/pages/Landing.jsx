import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/common/Logo";
import PlanCheckoutDialog from "@/components/subscription/PlanCheckoutDialog";
import {
  ChevronRight,
  Check,
  Star,
  ArrowRight,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  BadgeCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/api/firebaseClient";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons (Leaflet + bundler icon path issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom orange marker for map pins
const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Data ─────────────────────────────────────────────────────────────────────

const WHATSAPP_BOOKING_URL = "https://wa.me/254757234111?text=" + encodeURIComponent("Hi BGO Shine Hub, I'd like to book a wash.");

const services = [
  {
    title: "Car Wash",
    description: "Full body exterior wash for saloons, SUVs, vans and more - quick and thorough, every time.",
    photo: "/img/main-wash.jpg",
    alt: "BGO Shine Hub staff washing a car at the wash bay",
  },
  {
    title: "Interior Cleaning",
    description: "Vacuuming, interior steam wash, and dashboard polishing that leaves your cabin fresh and spotless.",
    photo: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    alt: "Clean car interior after detailing",
  },
  {
    title: "Engine Cleaning & Greasing",
    description: "Engine bay washing, degreasing and greasing to keep your vehicle running smoothly underneath the hood.",
    photo: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80",
    alt: "Mechanic cleaning a car engine bay",
  },
  {
    title: "Waxing & Buffing",
    description: "Protective waxing and buffing that restores shine and guards your paintwork against the elements.",
    photo: "/img/detailing.jpg",
    alt: "BGO Shine Hub staff detailing a car's exterior",
  },
  {
    title: "Air Freshening & Detailing",
    description: "Air fresheners, dashboard polish and finishing touches that make every drive feel brand new.",
    photo: "/img/detailing-2.jpg",
    alt: "BGO Shine Hub staff applying tyre shine",
  },
  {
    title: "Commercial & Fleet Washing",
    description: "Matatus, buses, lorries and canters welcome - reliable wash and greasing for commercial vehicles too.",
    photo: "/img/wash.jpg",
    alt: "Car wash bay with a commercial lorry in the background",
  },
];

const testimonials = [
  { name: "Susan Achieng", location: "Njiru, Nairobi", quote: "My car looks brand new every time I visit. The interior steam wash is on another level!", rating: 5 },
  { name: "Brian Kiptoo",  location: "Nairobi",         quote: "Affordable, fast, and the staff are so professional. I don't trust anyone else with my car.", rating: 5 },
  { name: "Alice Nyambura", location: "Kayole, Nairobi", quote: "I love that I can drop my car off and pick it up clean and fresh. Highly recommend BGO Shine Hub!", rating: 5 },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mapBusinesses, setMapBusinesses] = useState([]);

  useEffect(() => {
    api.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  // Load businesses that have coordinates for the map
  useEffect(() => {
    api.entities.Business.list(null, 100).then((list) => {
      setMapBusinesses(list.filter(b => b.latitude && b.longitude));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get("plan");
    if (planParam && isAuthenticated) {
      setSelectedPlan(planParam);
      setCheckoutOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-white">
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
            {/* Social icons */}
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
            <Logo size="default" />
            <div className="hidden md:flex items-center gap-8">
              {["#services", "#map", "#testimonials"].map((href, i) => (
                <a key={i} href={href} className="text-brand-blue-pale hover:text-white transition-colors text-sm font-medium">
                  {["Services", "Locations", "Reviews"][i]}
                </a>
              ))}
              <Link to={createPageUrl("Help")} className="text-brand-blue-pale hover:text-white transition-colors text-sm font-medium">
                Help
              </Link>
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
                  <Button variant="outline" className="border-brand-blue-light/40 text-brand-blue-light hover:bg-brand-blue-light/10 hover:text-white" onClick={() => api.auth.redirectToLogin()}>
                    Staff Login
                  </Button>
                  <Button className="bg-brand-orange hover:bg-brand-orange-hot text-white" asChild>
                    <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a Wash</a>
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
              {["#services", "#map", "#testimonials"].map((href, i) => (
                <a key={i} href={href} className="py-2 text-brand-blue-pale" onClick={() => setMobileMenuOpen(false)}>
                  {["Services", "Locations", "Reviews"][i]}
                </a>
              ))}
              <Link to={createPageUrl("Help")} className="py-2 text-brand-blue-pale" onClick={() => setMobileMenuOpen(false)}>Help</Link>
              <hr className="border-white/10 my-2" />
              {isAuthenticated ? (
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="w-full bg-brand-orange hover:bg-brand-orange-hot">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Button variant="outline" className="w-full border-brand-blue-light/40 text-brand-blue-light hover:bg-brand-blue-light/10" onClick={() => api.auth.redirectToLogin()}>Staff Login</Button>
                  <Button className="w-full bg-brand-orange hover:bg-brand-orange-hot" asChild>
                    <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a Wash</a>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Dark bg image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/img/main.jpeg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark/95 via-brand-navy/85 to-brand-navy/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-36 pb-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — headline */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge className="bg-brand-orange/20 text-brand-orange border-brand-orange/30">
                  📍 Njiru, Nairobi
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  🕐 Open 24/7
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Professional Car Care,{" "}
                <span className="text-brand-orange">Done Right</span>
              </h1>
              <p className="text-xl text-brand-blue-pale mb-3 leading-relaxed font-medium">
                Car Wash · Interior Cleaning · Greasing · Air Freshening
              </p>
              <p className="text-lg text-slate-300 mb-10 max-w-lg">
                Convenient, affordable, and professional vehicle care in Njiru, Nairobi. Book a wash and let us keep your car clean, fresh, and well-maintained.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-hot text-white text-lg px-8 h-14 shadow-lg shadow-brand-orange/30" asChild>
                  <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">
                    Book a Wash <ChevronRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="border-brand-blue-light/50 text-brand-blue-light hover:bg-brand-blue-light/10 hover:text-white text-lg px-8 h-14" asChild>
                  <a href="tel:+254757234111">Call Us</a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
                {["Open 24/7", "Same-day service", "Experienced staff", "Affordable pricing"].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-orange" />{t}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex justify-center mt-10 lg:mt-0"
            >
              <div className="relative">
                {/* Android frame — real mockup image (opaque screen, so content paints on top) */}
                <div className="relative w-64 overflow-hidden" style={{ aspectRatio: "111 / 232", borderRadius: "38px" }}>
                  {/* Screen — painted on top of the image's white screen area, starting right at the frame's curve so none of its bare screen shows through beside the camera cutout */}
                  <div className="absolute z-10 overflow-hidden bg-slate-100" style={{ top: "2.5%", bottom: "2.3%", left: "5%", right: "5%", borderRadius: "26px" }}>
                    {/* Camera cutout — drawn here rather than relying on the frame image's, so it never gets hidden behind the screen fill */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3 rounded-full bg-slate-900 z-20" />
                    {/* Status bar — overlaid directly on the screen, not a separate bezel bar */}
                    <div className="flex items-center justify-between px-5 pt-6 pb-0.5 text-slate-700">
                      <span className="text-[9px] font-semibold">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="flex gap-[2px] items-end h-2.5">
                          {[2, 3, 4, 5].map(h => <div key={h} style={{ height: `${h * 1.6}px` }} className="w-[2.5px] bg-slate-700 rounded-sm" />)}
                        </div>
                        <div className="text-[8px]">●●</div>
                      </div>
                    </div>

                  {/* Screen content — customer view. Fixed height + scroll so visitors can explore it. */}
                  <div className="p-3 pt-1.5 space-y-2.5 h-[25rem] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                    {/* App header */}
                    <div className="flex items-center justify-between bg-brand-navy rounded-2xl px-3 py-2">
                      <div>
                        <p className="text-[10px] text-brand-blue-pale">Hi Jane 👋</p>
                        <p className="text-xs text-white font-semibold">BGO Shine Hub</p>
                      </div>
                      <Badge className="bg-amber-400 text-brand-navy-dark text-[10px] border-0 px-1.5 py-0 h-5 font-bold">
                        ★ 4.8
                      </Badge>
                    </div>

                    {/* Book a wash CTA */}
                    <div className="bg-brand-orange rounded-2xl p-3 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">Book a Wash</p>
                        <p className="text-orange-100 text-[9px]">Njiru branch · 15 min away</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">→</div>
                    </div>

                    {/* Popular services quick-add */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm">
                      <p className="text-[10px] font-semibold text-slate-700 mb-2">Popular Services</p>
                      {[
                        { name: "Basic Wash",           price: "KES 300" },
                        { name: "Interior Steam Wash",  price: "KES 1,500" },
                        { name: "Waxing",                price: "KES 500" },
                      ].map(s => (
                        <div key={s.name} className="flex items-center gap-2 py-1.5 border-b last:border-0 border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-800">{s.name}</p>
                            <p className="text-[9px] text-slate-400">{s.price}</p>
                          </div>
                          <div className="h-5 w-5 rounded-full bg-brand-blue-mid/10 text-brand-blue-mid flex items-center justify-center text-[11px] font-bold">+</div>
                        </div>
                      ))}
                    </div>

                    {/* Request home wash / additional service */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm">
                      <p className="text-[10px] font-semibold text-slate-700 mb-2">Need More?</p>
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-blue-light flex-shrink-0" />
                        <p className="text-[10px] text-slate-600 flex-1">Request Home Wash</p>
                        <ArrowRight className="h-3 w-3 text-brand-blue-mid" />
                      </div>
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-orange flex-shrink-0" />
                        <p className="text-[10px] text-slate-600 flex-1">Request Additional Service</p>
                        <ArrowRight className="h-3 w-3 text-brand-blue-mid" />
                      </div>
                    </div>

                    {/* Rating strip */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                      </div>
                      <p className="text-[9px] text-slate-500">230+ reviews</p>
                    </div>
                  </div>

                    {/* Home indicator — floats over the bottom of the screen, like a real device */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-slate-800/25" />
                  </div>

                  {/* Frame — real mockup PNG, cropped tight to the device and sat behind the content */}
                  <img
                    src="/img/phone.png"
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute z-0 max-w-none select-none"
                    style={{ width: "229.7%", height: "109.9%", left: "-64.6%", top: "-4.9%" }}
                  />
                </div>

                {/* Glow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-brand-orange/25 blur-2xl rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Curved wave transition */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-20 fill-white">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "3",       label: "Branches in Nairobi", color: "text-brand-blue-mid"   },
              { value: "15K+",    label: "Vehicles Washed",     color: "text-brand-orange"     },
              { value: "85%",     label: "Repeat Customers",    color: "text-brand-blue-light" },
              { value: "4.8 ★",   label: "Customer Rating",     color: "text-amber-500"        },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className={`text-3xl md:text-4xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider wave into features */}
      <div className="relative h-16 overflow-hidden bg-brand-navy">
        <svg viewBox="0 0 1440 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute top-0 w-full h-full fill-white">
          <path d="M0,0 L1440,0 L1440,30 C1080,64 360,0 0,30 Z" />
        </svg>
      </div>

      {/* ── Services ───────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-4 bg-brand-navy">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-brand-orange/20 text-brand-orange border-brand-orange/30 mb-4">Our Services</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Complete Vehicle Care Services
            </h2>
            <p className="text-xl text-brand-blue-pale max-w-2xl mx-auto">
              From a quick wash to full detailing - professional car care in Njiru, Nairobi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-brand-orange/40 transition-all duration-300"
              >
                {/* Photo */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={feature.photo}
                    alt={feature.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Text */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-white mb-1.5">{feature.title}</h3>
                  <p className="text-brand-blue-pale text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Curved wave out of features */}
      <div className="relative h-16 overflow-hidden bg-white">
        <svg viewBox="0 0 1440 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full fill-brand-navy">
          <path d="M0,0 L1440,0 L1440,30 C1080,64 360,0 0,30 Z" />
        </svg>
      </div>

      {/* ── Map Section ────────────────────────────────────────────── */}
      <section id="map" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-brand-blue-mid/10 text-brand-blue-mid border-brand-blue-mid/20 mb-4">
              <MapPin className="h-3 w-3 mr-1" /> Our Locations
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Find a BGO Shine Hub Near You
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              Visit any of our branches across Nairobi for professional car care, wherever you are.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200" style={{ height: 480 }}>
            <MapContainer
              center={[-1.2668, 36.9257]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapBusinesses.map((biz) => (
                <Marker key={biz.id} position={[biz.latitude, biz.longitude]} icon={orangeIcon}>
                  <Popup>
                    <div className="text-sm min-w-[140px]">
                      <p className="font-semibold text-brand-blue-mid">{biz.name}</p>
                      {biz.city && <p className="text-slate-500">{biz.city}</p>}
                      {biz.phone && <p className="text-slate-500">📞 {biz.phone}</p>}
                      {biz.slug && (
                        <Link to={`/${biz.slug}`} className="text-brand-orange font-medium mt-1 inline-block hover:underline">
                          View branch page →
                        </Link>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <p className="text-center text-sm text-slate-400 mt-4">
            Zoom in to find the branch closest to you
          </p>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-amber-100 text-amber-700 border-0 mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              What Our Customers Say
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="p-6 h-full border-0 shadow-lg bg-white">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 italic">"{t.quote}"</p>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-brand-orange">{t.location}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Parallax image — stays fixed as content scrolls over it */}
        <div
          className="mt-20 h-72 md:h-96 w-full"
          style={{
            backgroundImage: "url('/img/bay.jpg')",
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div className="h-full w-full bg-brand-navy/60 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-bold mb-3"
              >
                "Every car deserves the BGO shine."
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-brand-blue-pale text-lg"
              >
                Convenient, affordable, and professional care - that's the BGO Shine Hub promise.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-r from-brand-blue to-brand-blue-mid">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready for a Spotless Ride?
          </h2>
          <p className="text-xl text-brand-blue-pale mb-8">
            Book your next wash with BGO Shine Hub - professional care, every time.
          </p>
          <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-hot text-white text-lg px-8 h-14 shadow-lg shadow-brand-orange/30" asChild>
            <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Book a Wash <ChevronRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-brand-navy-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Column 1 — Brand + contact + social */}
            <div>
              <div className="border-b-2 border-brand-orange pb-2 mb-4 inline-block">
                <Logo size="default" />
              </div>
              <ul className="space-y-2 text-slate-400 text-sm mb-4">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-brand-orange mt-0.5 flex-shrink-0" />
                  Njiru, Nairobi
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-orange flex-shrink-0" />
                  +254 757 234 111
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-orange flex-shrink-0" />
                  bgoshinehubltd@gmail.com
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <a href="https://wa.me/254757234111" aria-label="WhatsApp" className="h-8 w-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity bg-[#25D366]">
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                </a>
              </div>
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <h4 className="font-bold text-base mb-1 pb-2 border-b-2 border-brand-blue-light inline-block">
                Quick Links
              </h4>
              <ul className="mt-3 space-y-0">
                {[
                  { label: "Services", href: "#services" },
                  { label: "Reviews",  href: "#testimonials" },
                  { label: "My Wash History", href: createPageUrl("CustomerPortal") },
                  { label: "Help Center", href: createPageUrl("Help") },
                ].map(item => (
                  <li key={item.label} className="border-b border-white/10 border-dashed last:border-0">
                    <a href={item.href} className="flex items-center gap-2 py-2 text-slate-400 hover:text-brand-blue-light text-sm transition-colors">
                      <span className="text-brand-blue-light">-</span> {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Get Started */}
            <div>
              <h4 className="font-bold text-base mb-1 pb-2 border-b-2 border-brand-orange inline-block">
                Get Started
              </h4>
              <ul className="mt-3 space-y-0 mb-4">
                {[
                  { label: "Book a Wash", href: WHATSAPP_BOOKING_URL, external: true },
                  { label: "Staff Login", href: "#", isLogin: true },
                  { label: "Privacy Policy", href: createPageUrl("PrivacyPolicy") },
                  { label: "Terms of Service", href: createPageUrl("TermsOfService") },
                ].map(item => (
                  <li key={item.label} className="border-b border-white/10 border-dashed last:border-0">
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={item.isLogin ? (e) => { e.preventDefault(); api.auth.redirectToLogin(); } : undefined}
                      className="flex items-center gap-2 py-2 text-slate-400 hover:text-brand-orange text-sm transition-colors"
                    >
                      <span className="text-brand-orange">-</span> {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Button className="bg-brand-orange hover:bg-brand-orange-hot text-white w-full" asChild>
                <a href={WHATSAPP_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book on WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} BGO Shine Hub. All rights reserved.
            </p>
            <p className="text-slate-600 text-xs">Built for Kenya 🇰🇪</p>
          </div>
        </div>
      </footer>

      {/* ── Checkout Dialog ─────────────────────────────────────────── */}
      <PlanCheckoutDialog
        plan={selectedPlan}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSuccess={() => { window.location.href = createPageUrl("Dashboard"); }}
      />
    </div>
  );
}
