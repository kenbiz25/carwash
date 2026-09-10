import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2,
  Car,
  TrendingUp,
  DollarSign,
  Search,
  Activity,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [search, setSearch] = useState("");

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.auth.me(),
  });

  // ✅ Support both shapes across your app
  const isSuperAdmin = user?.role === "admin" || user?.user_role === "admin";

  const { data: allBusinesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ["all-businesses"],
    queryFn: () => api.entities.Business.list("-created_date", 200),
    enabled: isSuperAdmin,
  });

  const { data: allWashes = [], isLoading: loadingWashes } = useQuery({
    queryKey: ["all-washes"],
    queryFn: () => api.entities.Wash.list("-created_date", 1000),
    enabled: isSuperAdmin,
  });

  const { data: allPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["all-payments"],
    queryFn: () => api.entities.Payment.list("-created_date", 1000),
    enabled: isSuperAdmin,
  });

  const { data: allSubscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => api.entities.BusinessSubscription.list("-created_date", 200),
    enabled: isSuperAdmin,
  });

  // ─────────────────────────────────────────────────────────────
  // ✅ Precompute for performance (avoid filtering in every row)
  //
  // Every hook in this component must run on every render — including while
  // loadingUser is true or the user turns out not to be a superadmin — so the
  // early-return JSX for those cases lives below, after all hooks. Returning
  // early any sooner (as this used to) skips the useMemo calls below on some
  // renders and not others, which crashes React with "Rendered more hooks
  // than during the previous render."
  // ─────────────────────────────────────────────────────────────

  const washesCountByBiz = useMemo(() => {
    const map = new Map();
    for (const w of allWashes) {
      const bid = w?.business_id;
      if (!bid) continue;
      map.set(bid, (map.get(bid) || 0) + 1);
    }
    return map;
  }, [allWashes]);

  const subByBizId = useMemo(() => {
    const map = new Map();
    for (const s of allSubscriptions) {
      if (s?.business_id) map.set(s.business_id, s);
    }
    return map;
  }, [allSubscriptions]);

  const subByUserEmail = useMemo(() => {
    const map = new Map();
    for (const s of allSubscriptions) {
      if (s?.user_email) map.set(String(s.user_email).toLowerCase(), s);
    }
    return map;
  }, [allSubscriptions]);

  const getSubForBusiness = (biz) =>
    subByBizId.get(biz?.id) ||
    subByUserEmail.get(String(biz?.owner_email || "").toLowerCase()) ||
    null;

  const totalRevenue = useMemo(() => {
    return allPayments
      .filter((p) => p?.status === "confirmed")
      .reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
  }, [allPayments]);

  const todayWashes = useMemo(() => {
    const todayStr = new Date().toDateString();
    return allWashes.filter((w) => {
      const d = w?.created_date ? new Date(w.created_date) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d.toDateString() === todayStr;
    }).length;
  }, [allWashes]);

  const activeSubscriptions = useMemo(() => {
    return allSubscriptions.filter((s) =>
      ["active", "trialing"].includes(String(s?.status || "").toLowerCase())
    );
  }, [allSubscriptions]);

  const proPlans = activeSubscriptions.filter((s) => s?.plan === "pro").length;
  const enterprisePlans = activeSubscriptions.filter((s) => s?.plan === "enterprise").length;

  // Your pricing logic (leave as-is)
  const mrr = proPlans * 1500 + enterprisePlans * 4500;

  const filteredBusinesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allBusinesses;
    return allBusinesses.filter((b) => {
      const name = String(b?.name || "").toLowerCase();
      const city = String(b?.city || "").toLowerCase();
      const owner = String(b?.owner_email || "").toLowerCase();
      return name.includes(q) || city.includes(q) || owner.includes(q);
    });
  }, [allBusinesses, search]);

  const planColor = (plan) =>
    ({
      starter: "bg-slate-100 text-slate-700",
      pro: "bg-blue-100 text-blue-700",
      enterprise: "bg-purple-100 text-purple-700",
    })[String(plan || "").toLowerCase()] || "bg-slate-100 text-slate-700";

  const loadingAny = loadingBusinesses || loadingWashes || loadingPayments || loadingSubs;

  // If user is still loading, avoid flashing Access Denied
  if (loadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-500">Super Admin access required.</p>
        <Link to={createPageUrl("Dashboard")} className="mt-4">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-600" />
            Super Admin — All Carwashes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Platform-wide overview
          </p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 border-0 text-sm px-3 py-1">
          Super Admin
        </Badge>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Businesses",
            value: allBusinesses.length,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Total Revenue (KES)",
            value: `${(totalRevenue / 1000).toFixed(1)}K`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Washes Today",
            value: todayWashes,
            icon: Car,
            color: "text-cyan-600",
            bg: "bg-cyan-50 dark:bg-cyan-900/20",
          },
          {
            label: "Monthly MRR (KES)",
            value: `${(mrr / 1000).toFixed(1)}K`,
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {loadingAny ? "—" : stat.value}
              </p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            plan: "Starter",
            count: allSubscriptions.filter((s) => s?.plan === "starter").length,
            color: "bg-slate-100 dark:bg-slate-800",
          },
          { plan: "Pro", count: proPlans, color: "bg-blue-50 dark:bg-blue-900/20" },
          {
            plan: "Enterprise",
            count: enterprisePlans,
            color: "bg-purple-50 dark:bg-purple-900/20",
          },
        ].map((s, i) => (
          <Card key={i} className={`border-0 shadow-sm ${s.color}`}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {loadingAny ? "—" : s.count}
              </p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {s.plan} Plans
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Businesses Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Car Wash Businesses</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, city, owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {["Business", "Location", "Owner", "Plan", "Status", "Washes", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBusinesses.map((biz) => {
                  const sub = getSubForBusiness(biz);
                  const bizWashes = washesCountByBiz.get(biz.id) || 0;
                  const plan = sub?.plan || biz?.subscription_plan || "starter";

                  return (
                    <tr
                      key={biz.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {biz.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">{biz.bays_count || 1} bays</div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {biz.city || biz.location || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {biz.owner_email || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge className={`${planColor(plan)} border-0 text-xs`}>
                          {String(plan).charAt(0).toUpperCase() + String(plan).slice(1)}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        {biz.is_active !== false ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-xs">
                            <AlertCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {bizWashes}
                      </td>

                      <td className="px-4 py-3">
                        {/* ✅ View Business (requires /pages/SuperAdminBusinessView.jsx to exist) */}
                        <Link to={createPageUrl("SuperAdminBusinessView") + `?businessId=${biz.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredBusinesses.length === 0 && !loadingAny && (
              <div className="text-center py-12 text-slate-400">No businesses found</div>
            )}

            {loadingAny && (
              <div className="text-center py-12 text-slate-400">Loading platform data…</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}