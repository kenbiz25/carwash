import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Car, MapPin, ArrowLeft, History } from "@/lib/icons";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Logo from "@/components/common/Logo";
import StatusBadge from "@/components/common/StatusBadge";
import VehicleIcon from "@/components/common/VehicleIcon";
import moment from "moment";
import { trackCar } from "@/lib/publicTrackClient";

export default function TrackCar() {
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);

  const handleTrack = async () => {
    if (!phone.trim() || !plate.trim()) {
      setError("Enter both your phone number and a plate number that's been washed under it.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await trackCar({ phone: phone.trim(), plate: plate.trim() });
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message || "Something went wrong - please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Not verified yet - phone + plate form
  if (!history) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-mid to-brand-navy-dark flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link to={createPageUrl("Landing")} className="inline-block">
              <Logo size="lg" />
            </Link>
            <h1 className="text-2xl font-bold text-white mt-4">Track My Car</h1>
            <p className="text-brand-blue-pale mt-2">
              Enter your phone number and a plate number you've checked in with to see its status
              and your full wash history.
            </p>
          </div>

          <Card className="shadow-xl border-0">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input
                  placeholder="KAA 123B"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="text-lg uppercase font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleTrack}
                variant="gradient" className="w-full text-lg py-6"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Search className="h-5 w-5 mr-2" />}
                Track My Car
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Both must match a real check-in - this is how we confirm it's really your car.
              </p>
            </CardContent>
          </Card>

          <Link
            to={createPageUrl("Landing")}
            className="flex items-center justify-center gap-1.5 text-sm text-brand-blue-pale hover:text-white transition-colors mt-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Verified - full wash history
  const current = history[0];
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Landing")}>
            <Logo size="md" />
          </Link>
          <Button variant="outline" size="sm" onClick={() => { setHistory(null); setPlate(""); }}>
            Track Another
          </Button>
        </div>

        {current && (
          <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-brand-navy to-brand-navy-mid text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <VehicleIcon type={current.vehicle_type || "saloon"} size="lg" />
                <div className="flex-1">
                  <p className="font-mono font-bold text-xl">{current.plate_number}</p>
                  {current.business_name && (
                    <p className="text-sm text-brand-blue-pale flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{current.business_name}
                    </p>
                  )}
                </div>
                <StatusBadge status={current.status} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-brand-blue-pale text-sm">
                  {current.status === "paid" ? "Paid" : "Amount Due"}
                </span>
                <span className="font-bold text-xl">KES {(current.amount_due || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <History className="h-4 w-4" /> My Wash History
        </h2>

        {history.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <Car className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No wash history found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((wash, i) => (
              <Card key={i} className="p-4 border-0 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <VehicleIcon type={wash.vehicle_type || "saloon"} size="default" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold">{wash.plate_number}</span>
                        <StatusBadge status={wash.status} />
                      </div>
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {wash.services?.map((s) => s.name).join(", ") || "No services yet"}
                      </p>
                      {wash.business_name && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{wash.business_name}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {moment(wash.entry_time).format("D MMM YYYY, h:mm A")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-emerald-600">
                      KES {(wash.amount_paid || wash.amount_due || 0).toLocaleString()}
                    </p>
                    {wash.payment_method && (
                      <p className="text-xs text-slate-400 capitalize">{wash.payment_method}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
