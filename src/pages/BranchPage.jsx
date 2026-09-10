import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/api/firebaseClient";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, ArrowLeft, Navigation, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function BranchPage() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    api.entities.Business.filter({ slug: (slug || "").toLowerCase() })
      .then((list) => { if (!cancelled) setBusiness(list[0] || null); })
      .catch(() => { if (!cancelled) setBusiness(null); });
    return () => { cancelled = true; };
  }, [slug]);

  if (business === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (business === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-white">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Branch not found</h1>
        <p className="text-slate-500 mb-6">We couldn't find a BGO Shine Hub branch at this address.</p>
        <Link to="/Landing"><Button className="bg-brand-orange hover:bg-brand-orange/90">Back to Home</Button></Link>
      </div>
    );
  }

  const phone = business.phone || "+254757234111";
  const telHref = `tel:${phone.replace(/\s+/g, "")}`;
  const waHref = `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=` +
    encodeURIComponent(`Hi, I'd like to book a wash at BGO Shine Hub ${business.location || business.name}.`);
  const mapsHref = business.latitude && business.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
    : null;
  const photos = (business.photos || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/Landing" className="flex items-center gap-2">
            <Logo size="default" />
            <span className="font-bold text-slate-900">BGO Shine Hub</span>
          </Link>
          <Link to="/Landing" className="text-sm text-slate-500 hover:text-brand-blue-mid flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> All Locations
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-brand-navy-dark text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-brand-orange font-semibold text-sm mb-2 flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {business.city || "Nairobi"}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{business.name}</h1>
          <p className="text-brand-blue-pale max-w-xl mb-3">{business.description || "Professional car wash and detailing."}</p>
          <p className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-sm">
            <Clock className="h-4 w-4" /> Open 24/7
          </p>
        </div>
      </div>

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((src, i) => (
              <div key={i} className={`overflow-hidden rounded-xl bg-slate-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`} style={{ aspectRatio: i === 0 ? "4/3" : "1/1" }}>
                <img src={src} alt={`${business.name} photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact + directions */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Contact &amp; Directions</h2>
          <div className="space-y-3 mb-6">
            <a href={telHref} className="flex items-center gap-3 text-slate-700 hover:text-brand-blue-mid">
              <Phone className="h-4 w-4 text-brand-orange" /> {phone}
            </a>
            <p className="flex items-center gap-3 text-slate-700">
              <MapPin className="h-4 w-4 text-brand-orange" /> {business.location || business.city}
            </p>
            <p className="flex items-center gap-3 text-slate-700">
              <Clock className="h-4 w-4 text-brand-orange" /> Open 24 hours, 7 days a week
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <MessageCircle className="h-4 w-4 mr-2" /> Book a Wash on WhatsApp
              </Button>
            </a>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Navigation className="h-4 w-4 mr-2" /> Get Directions
                </Button>
              </a>
            )}
          </div>
        </div>

        {business.latitude && business.longitude && (
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200" style={{ height: 280 }}>
            <MapContainer center={[business.latitude, business.longitude]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[business.latitude, business.longitude]}>
                <Popup>{business.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
