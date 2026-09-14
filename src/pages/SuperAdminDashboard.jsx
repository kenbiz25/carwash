import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { listPendingUsers, assignPendingUser } from "@/lib/userAdminClient";
import { toast } from "sonner";
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
  UserPlus,
  Loader2,
} from "@/lib/icons";

const ASSIGNABLE_ROLES = ["owner", "manager", "cashier", "staff"];

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

  // Accounts with no role/branch assigned yet — first-time Google sign-ins
  // land here until a super admin picks a business + role for them.
  const { data: pendingUsers = [], refetch: refetchPending, isError: pendingErrored, error: pendingError } = useQuery({
    queryKey: ["pending-users"],
    queryFn: listPendingUsers,
    enabled: isSuperAdmin,
    retry: false,
  });
  const [pendingAssign, setPendingAssign] = useState({}); // uid -> { business_id, role }
  const [assigningUid, setAssigningUid] = useState(null);

  const handleAssignPending = async (uid) => {
    const choice = pendingAssign[uid];
    if (!choice?.business_id || !choice?.role) {
      toast.error("Pick a business and a role first");
      return;
    }
    setAssigningUid(uid);
    try {
      await assignPendingUser(uid, choice);
      const bizName = allBusinesses.find((b) => b.id === choice.business_id)?.name || "the branch";
      toast.success(`Assigned as ${choice.role} at ${bizName} - they'll see it next time they sign in`);
      refetchPending();
    } catch (err) {
      toast.error(err?.message || "Failed to assign");
    } finally {
      setAssigningUid(null);
    }
  };

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

  const loadingAny = loadingBusinesses || loadingWashes || loadingPayments;

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
            Super Admin - All Carwashes
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
            label: "Total Washes",
            value: allWashes.length,
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
                {loadingAny ? "-" : stat.value}
              </p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending sign-ups - Google accounts with no branch/role yet */}
      {(pendingUsers.length > 0 || pendingErrored) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-500" />
              Pending Sign-ups ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingErrored && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{pendingError?.message || "Couldn't load pending sign-ups."}</span>
              </div>
            )}
            {pendingUsers.map((u) => {
              const choice = pendingAssign[u.uid] || {};
              return (
                <div key={u.uid} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <Select
                    value={choice.business_id || ""}
                    onValueChange={(val) => setPendingAssign(p => ({ ...p, [u.uid]: { ...p[u.uid], business_id: val } }))}
                  >
                    <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Business" /></SelectTrigger>
                    <SelectContent>
                      {allBusinesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={choice.role || ""}
                    onValueChange={(val) => setPendingAssign(p => ({ ...p, [u.uid]: { ...p[u.uid], role: val } }))}
                  >
                    <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="gradient" disabled={assigningUid === u.uid} onClick={() => handleAssignPending(u.uid)}>
                    {assigningUid === u.uid && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    {assigningUid === u.uid ? "Assigning…" : "Assign"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
                  {["Business", "Location", "Owner", "Status", "Washes", "Actions"].map(
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
                  const bizWashes = washesCountByBiz.get(biz.id) || 0;

                  return (
                    <tr
                      key={biz.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {biz.name || "-"}
                        </div>
                        <div className="text-xs text-slate-500">{biz.bays_count || 1} bays</div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {biz.city || biz.location || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {biz.owner_email || "-"}
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