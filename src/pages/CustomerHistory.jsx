import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  Banknote,
  Car,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import moment from "moment";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusColor(status) {
  switch (status) {
    case "paid": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "washing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "waiting": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "done": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

export default function CustomerHistory() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState("spent"); // spent | visits | recent

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  const { data: businesses = [] } = useUserBusinesses(user);

  // Use the first owned business (or the one stored in localStorage)
  const primaryBusinessId = useMemo(() => {
    const stored = (() => { try { return localStorage.getItem("selectedBusinessId"); } catch { return null; } })();
    if (stored && businesses.find((b) => b.id === stored)) return stored;
    return businesses[0]?.id || null;
  }, [businesses]);

  const { data: washes = [], isLoading } = useQuery({
    queryKey: ["allWashes", primaryBusinessId],
    queryFn: () => api.entities.Wash.filter({ business_id: primaryBusinessId }, "-entry_time", 2000),
    enabled: !!primaryBusinessId,
  });

  // Aggregate washes per customer (by phone number)
  const customers = useMemo(() => {
    const map = new Map();

    for (const wash of washes) {
      const phone = wash.customer_phone?.trim();
      if (!phone) continue;

      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          name: wash.customer_name || "",
          email: wash.customer_email || "",
          residence: wash.customer_residence || "",
          visits: 0,
          totalSpent: 0,
          lastVisit: null,
          services: [],
          washes: [],
        });
      }

      const c = map.get(phone);
      c.visits += 1;
      c.totalSpent += wash.amount_due || wash.amount_paid || 0;

      const visitDate = new Date(wash.entry_time || wash.created_date);
      if (!c.lastVisit || visitDate > c.lastVisit) {
        c.lastVisit = visitDate;
        // Use most recent info for name/email/residence
        if (wash.customer_name) c.name = wash.customer_name;
        if (wash.customer_email) c.email = wash.customer_email;
        if (wash.customer_residence) c.residence = wash.customer_residence;
      }

      // Collect unique services
      const serviceNames = (wash.services || []).map((s) => s.name || s).filter(Boolean);
      for (const svc of serviceNames) {
        if (!c.services.includes(svc)) c.services.push(svc);
      }

      c.washes.push(wash);
    }

    return Array.from(map.values());
  }, [washes]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? customers.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.email?.toLowerCase().includes(q)
        )
      : customers;

    return [...filtered].sort((a, b) => {
      if (sortBy === "spent") return b.totalSpent - a.totalSpent;
      if (sortBy === "visits") return b.visits - a.visits;
      if (sortBy === "recent") return (b.lastVisit || 0) - (a.lastVisit || 0);
      return 0;
    });
  }, [customers, search, sortBy]);

  const totalRevenue = useMemo(
    () => customers.reduce((s, c) => s + c.totalSpent, 0),
    [customers]
  );

  const avgSpend = customers.length ? Math.round(totalRevenue / customers.length) : 0;

  // Customer detail: their washes sorted newest first
  const customerWashes = useMemo(() => {
    if (!selectedCustomer) return [];
    return [...selectedCustomer.washes].sort(
      (a, b) =>
        new Date(b.entry_time || b.created_date) - new Date(a.entry_time || a.created_date)
    );
  }, [selectedCustomer]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            All clients who have used your services
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: customers.length, icon: Users, color: "text-blue-600" },
          { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: Banknote, color: "text-emerald-600" },
          { label: "Avg. Spend", value: `KES ${avgSpend.toLocaleString()}`, icon: TrendingUp, color: "text-violet-600" },
          { label: "Total Visits", value: washes.filter((w) => w.customer_phone).length, icon: Car, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "spent", label: "By Spend" },
            { key: "visits", label: "By Visits" },
            { key: "recent", label: "By Recent" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === key
                  ? "bg-brand-orange text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading customer history…</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {search ? "No customers match your search." : "No customer data yet."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCustomers.map((customer, idx) => (
            <Card
              key={customer.phone}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCustomer(customer)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank badge */}
                  <div className="text-xs font-bold text-slate-400 w-6 text-center flex-shrink-0">
                    #{idx + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-brand-blue-mid text-white text-sm font-bold">
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {customer.name || "Unknown Customer"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {customer.services.slice(0, 3).map((svc) => (
                        <span
                          key={svc}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {svc}
                        </span>
                      ))}
                      {customer.services.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          +{customer.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      KES {customer.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {customer.visits} visit{customer.visits !== 1 ? "s" : ""}
                    </p>
                    {customer.lastVisit && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {moment(customer.lastVisit).fromNow()}
                      </p>
                    )}
                  </div>

                  {/* Mobile stats */}
                  <div className="text-right flex-shrink-0 sm:hidden">
                    <p className="font-bold text-emerald-600 text-sm">
                      KES {customer.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{customer.visits} visits</p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-brand-blue-mid text-white font-bold">
                      {initials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">
                      {selectedCustomer.name || "Unknown Customer"}
                    </p>
                    <p className="text-sm font-normal text-slate-500">{selectedCustomer.phone}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.residence && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span>{selectedCustomer.residence}</span>
                    </div>
                  )}
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      KES {selectedCustomer.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Total Spent</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                      {selectedCustomer.visits}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">Visits</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3 text-center">
                    <p className="text-lg font-bold text-violet-700 dark:text-violet-400">
                      KES {selectedCustomer.visits
                        ? Math.round(selectedCustomer.totalSpent / selectedCustomer.visits).toLocaleString()
                        : 0}
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-500">Avg / Visit</p>
                  </div>
                </div>

                {/* Services used */}
                {selectedCustomer.services.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Services Used
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCustomer.services.map((svc) => (
                        <Badge key={svc} variant="secondary" className="text-xs">
                          {svc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visit history */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Visit History
                  </p>
                  <div className="space-y-2">
                    {customerWashes.map((wash) => (
                      <div
                        key={wash.id}
                        className="flex items-start justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-900 dark:text-white">
                              {wash.plate_number || wash.carpet_type || "-"}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(
                                wash.status
                              )}`}
                            >
                              {wash.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(wash.services || []).map((s) => s.name || s).join(", ") || "-"}
                          </p>
                          {wash.delivery_type === "delivery" && wash.delivery_date && (
                            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Delivery: {moment(wash.delivery_date).format("D MMM YYYY")}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {moment(wash.entry_time || wash.created_date).format("D MMM YYYY, h:mm a")}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                            KES {(wash.amount_due || wash.amount_paid || 0).toLocaleString()}
                          </p>
                          {wash.payment_method && (
                            <p className="text-[10px] text-slate-400 capitalize">{wash.payment_method}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
