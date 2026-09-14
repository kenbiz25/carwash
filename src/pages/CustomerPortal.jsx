import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Car, Crown, Phone, History, Gift,
  Loader2, CheckCircle, Clock, Droplets, Home, Sparkles
} from "@/lib/icons";
import moment from "moment";
import { toast } from "sonner";
import Logo from "@/components/common/Logo";
import { notifyInApp } from "@/components/notifications/NotificationService";

const REQUEST_TYPES = {
  home_wash: { label: "Home Wash Request", icon: Home, placeholder: "Your address / area and preferred time..." },
  additional_service: { label: "Additional Service Request", icon: Sparkles, placeholder: "What extra service would you like?" },
};

const tierColors = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  platinum: "bg-purple-100 text-purple-800 border-purple-300"
};

const tierIcons = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎"
};

export default function CustomerPortal() {
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get phone from URL if provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get("phone");
    const tokenParam = urlParams.get("token");
    
    if (phoneParam) {
      setPhone(phoneParam);
      if (tokenParam) {
        // Auto-verify with token
        handleVerify(phoneParam, tokenParam);
      }
    }
  }, []);

  const handleVerify = async (phoneNumber = phone, _token = null) => {
    setLoading(true);
    setError("");
    
    // Clean phone number
    const cleanPhone = phoneNumber.replace(/\s/g, "").replace(/^0/, "+254");

    // Find customer by phone — a phone can have a separate LoyaltyCustomer record
    // at each branch it's visited, so this isn't guaranteed to be one row. Pick
    // the most recently active one (rather than array order, which is arbitrary
    // IndexedDB storage order and would otherwise route requests to a random
    // branch) so the picked record's business_id is a meaningful choice.
    const [byCleanPhone, byRawPhone] = await Promise.all([
      api.entities.LoyaltyCustomer.filter({ phone: cleanPhone }),
      api.entities.LoyaltyCustomer.filter({ phone: phoneNumber }),
    ]);
    const seen = new Map();
    for (const c of [...byCleanPhone, ...byRawPhone]) seen.set(c.id, c);
    const matches = [...seen.values()];

    if (matches.length === 0) {
      setError("Phone number not found. Visit our car wash to register!");
      setLoading(false);
      return;
    }

    matches.sort((a, b) => new Date(b.last_visit_date || 0) - new Date(a.last_visit_date || 0));
    setCustomer(matches[0]);

    setVerified(true);
    setLoading(false);
  };

  const { data: washes = [] } = useQuery({
    queryKey: ["customerWashes", customer?.phone],
    queryFn: () => api.entities.Wash.filter({ customer_phone: customer.phone }, "-created_date", 50),
    enabled: !!customer?.phone,
  });

  const { data: subscription } = useQuery({
    queryKey: ["customerSubscription", customer?.id],
    queryFn: async () => {
      const subs = await api.entities.CustomerSubscription.filter({
        customer_id: customer.id,
        status: "active"
      });
      return subs[0] || null;
    },
    enabled: !!customer?.id,
  });

  const completedWashes = washes.filter(w => ["done", "paid"].includes(w.status));
  const totalSpent = completedWashes.reduce((sum, w) => sum + (w.amount_paid || w.amount_due || 0), 0);

  const [requestType, setRequestType] = useState(null); // "home_wash" | "additional_service" | null
  const [requestNotes, setRequestNotes] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const submitRequest = async () => {
    if (!requestNotes.trim()) {
      toast.error("Please add a few details for your request");
      return;
    }
    setSendingRequest(true);
    try {
      const businesses = await api.entities.Business.filter({ id: customer.business_id });
      const business = businesses[0];
      const recipientEmails = (business?.members || [])
        .filter(m => ["owner", "manager", "cashier"].includes(m.role))
        .map(m => m.email);

      await notifyInApp({
        businessId: customer.business_id,
        recipientEmails,
        title: REQUEST_TYPES[requestType].label,
        message: `${customer.name || "Customer"} (${customer.phone}): ${requestNotes.trim()}`,
        referenceType: "customer_request",
        referenceId: customer.id,
      });

      toast.success("Request sent! We'll be in touch shortly.");
      setRequestType(null);
      setRequestNotes("");
    } catch (err) {
      toast.error("Could not send request: " + (err?.message || err));
    } finally {
      setSendingRequest(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-navy-50 via-white to-brand-blue-pale/20">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <Logo size="lg" />
            <h1 className="text-2xl font-bold text-slate-900 mt-4">Customer Portal</h1>
            <p className="text-slate-600 mt-2">View your wash history, points & receipts</p>
          </div>

          <Card className="shadow-xl border-0">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-lg"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button 
                onClick={() => handleVerify()}
                variant="gradient" className="w-full text-lg py-6"
                disabled={loading || !phone}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Phone className="h-5 w-5 mr-2" />}
                View My Account
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Enter the phone number you use at the car wash
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-50 via-white to-brand-blue-pale/20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" />
        </div>

        {/* Customer Card */}
        <Card className="bg-gradient-to-br from-brand-navy to-brand-navy-mid text-white mb-6 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-emerald-100 text-sm">Welcome back</p>
                <h2 className="text-2xl font-bold">{customer.name || "Valued Customer"}</h2>
                <p className="text-emerald-200">{customer.phone}</p>
              </div>
              <div className="text-right">
                <Badge className={`${tierColors[customer.tier || "bronze"]} text-lg px-3 py-1`}>
                  {tierIcons[customer.tier || "bronze"]} {(customer.tier || "bronze").toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{customer.points || 0}</p>
                <p className="text-emerald-200 text-sm">Points</p>
              </div>
              <div className="text-center border-x border-emerald-400/30">
                <p className="text-3xl font-bold">{customer.visits_count || 0}</p>
                <p className="text-emerald-200 text-sm">Visits</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{(totalSpent / 1000).toFixed(1)}K</p>
                <p className="text-emerald-200 text-sm">Spent (KES)</p>
              </div>
            </div>

            {subscription && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-300" />
                  <span className="font-medium">{subscription.membership_name}</span>
                </div>
                <p className="text-sm text-emerald-200 mt-1">
                  {subscription.washes_remaining === -1 ? "Unlimited washes" : `${subscription.washes_remaining} washes remaining`}
                  {" • "}Renews {moment(subscription.next_billing_date).format("MMM D")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Service - home wash & additional service requests */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Need something extra?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRequestType("home_wash")}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors p-4 text-center"
              >
                <Home className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">Request Home Wash</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestType("additional_service")}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-colors p-4 text-center"
              >
                <Sparkles className="h-6 w-6 text-cyan-600" />
                <span className="text-sm font-medium text-slate-700">Request Additional Service</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="history">
          <TabsList className="w-full">
            <TabsTrigger value="history" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex-1">
              <Car className="h-4 w-4 mr-2" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex-1">
              <Gift className="h-4 w-4 mr-2" />
              Rewards
            </TabsTrigger>
          </TabsList>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {washes.length === 0 ? (
              <Card className="p-8 text-center">
                <Droplets className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No wash history yet</p>
              </Card>
            ) : (
              washes.map((wash) => (
                <Card key={wash.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{wash.plate_number}</span>
                        <Badge variant={wash.status === "paid" ? "default" : "outline"} className="text-xs">
                          {wash.status === "paid" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {wash.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {wash.services?.map(s => s.name).join(", ") || "Standard wash"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {moment(wash.created_date).format("MMM D, YYYY • h:mm A")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        KES {(wash.amount_paid || wash.amount_due || 0).toLocaleString()}
                      </p>
                      {wash.wash_number && (
                        <p className="text-xs text-slate-400 font-mono">{wash.wash_number}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="mt-4 space-y-3">
            {(customer.vehicles || []).length === 0 ? (
              <Card className="p-8 text-center">
                <Car className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No vehicles registered</p>
                <p className="text-sm text-slate-400 mt-1">Your vehicles will appear here after your visits</p>
              </Card>
            ) : (
              customer.vehicles.map((vehicle, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Car className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-mono font-semibold text-lg">{vehicle.plate_number}</p>
                      <p className="text-sm text-slate-500">
                        {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" • ") || vehicle.vehicle_type}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Your Points Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Current Points</span>
                  <span className="font-bold text-emerald-600">{customer.points || 0}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-orange to-brand-orange-hot rounded-full"
                    style={{ width: `${Math.min((customer.points || 0) / 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {customer.points < 500 
                    ? `${500 - (customer.points || 0)} more points for a free interior vacuum!`
                    : customer.points < 1000
                    ? `${1000 - (customer.points || 0)} more points to reach Silver tier!`
                    : "You're doing great! Keep earning points!"}
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Available Rewards</h3>
              <div className="space-y-2">
                <div className={`p-3 rounded-lg border ${(customer.points || 0) >= 500 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Free Interior Vacuum</p>
                      <p className="text-sm text-slate-500">500 points</p>
                    </div>
                    {(customer.points || 0) >= 500 ? (
                      <Button size="sm" className="bg-emerald-500">Redeem</Button>
                    ) : (
                      <Badge variant="outline">{500 - (customer.points || 0)} more</Badge>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${(customer.points || 0) >= 1000 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Free Basic Wash</p>
                      <p className="text-sm text-slate-500">1000 points</p>
                    </div>
                    {(customer.points || 0) >= 1000 ? (
                      <Button size="sm" className="bg-emerald-500">Redeem</Button>
                    ) : (
                      <Badge variant="outline">{1000 - (customer.points || 0)} more</Badge>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${(customer.points || 0) >= 2500 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Premium Package</p>
                      <p className="text-sm text-slate-500">2500 points</p>
                    </div>
                    {(customer.points || 0) >= 2500 ? (
                      <Button size="sm" className="bg-emerald-500">Redeem</Button>
                    ) : (
                      <Badge variant="outline">{2500 - (customer.points || 0)} more</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Membership Tiers</h3>
              <div className="space-y-2">
                {["bronze", "silver", "gold", "platinum"].map((tier) => (
                  <div 
                    key={tier}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      customer.tier === tier ? 'bg-emerald-50 border-emerald-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tierIcons[tier]}</span>
                      <span className="font-medium capitalize">{tier}</span>
                    </div>
                    {customer.tier === tier && (
                      <Badge className="bg-emerald-500">Current</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Questions? Visit us or call the car wash</p>
        </div>
      </div>

      {/* Request Service Dialog */}
      <Dialog open={!!requestType} onOpenChange={(open) => !open && setRequestType(null)}>
        <DialogContent className="sm:max-w-md">
          {requestType && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {React.createElement(REQUEST_TYPES[requestType].icon, { className: "h-5 w-5 text-emerald-600" })}
                  {REQUEST_TYPES[requestType].label}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-2">
                  <Label>Details</Label>
                  <Textarea
                    placeholder={REQUEST_TYPES[requestType].placeholder}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={submitRequest}
                  disabled={sendingRequest}
                  variant="gradient" className="w-full"
                >
                  {sendingRequest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Request
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  We'll contact you at {customer?.phone} to confirm.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}