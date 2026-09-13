import React, { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  Car,
  Banknote,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Phone,
  MapPin,
  Calendar,
} from "@/lib/icons";
import moment from "moment";

const planColor = (plan) =>
  ({
    starter: "bg-slate-100 text-slate-700",
    pro: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  })[String(plan || "").toLowerCase()] || "bg-slate-100 text-slate-700";

const statusColor = (status) =>
  ({
    paid:      "bg-emerald-100 text-emerald-700",
    done:      "bg-blue-100 text-blue-700",
    washing:   "bg-amber-100 text-amber-700",
    waiting:   "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-700",
  })[String(status || "").toLowerCase()] || "bg-slate-100 text-slate-600";

function StatCard({ label, value, icon: Icon, color = "text-slate-600", bg = "bg-slate-100" }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminBusinessView() {
  const [params] = useSearchParams();
  const businessId = params.get("businessId");

  const { data: business, isLoading: loadingBiz, error } = useQuery({
    queryKey: ["superadmin-business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const rows = await api.entities.Business.filter({ id: businessId });
      return rows?.[0] || null;
    },
  });

  const { data: washes = [], isLoading: loadingWashes } = useQuery({
    queryKey: ["superadmin-business-washes", businessId],
    enabled: !!businessId,
    queryFn: () =>
      api.entities.Wash.filter({ business_id: businessId }, "-created_date", 200),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["superadmin-business-payments", businessId],
    enabled: !!businessId,
    queryFn: () =>
      api.entities.Payment.filter({ business_id: businessId }, "-created_date", 500),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["superadmin-business-staff", businessId],
    enabled: !!businessId,
    queryFn: () => api.entities.Staff.filter({ business_id: businessId }),
  });

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayWashes = washes.filter(
      (w) => new Date(w.created_date).toDateString() === today
    );
    const confirmedPayments = payments.filter((p) => p.status === "confirmed");
    const totalRevenue = confirmedPayments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0), 0
    );
    const todayRevenue = confirmedPayments
      .filter((p) => new Date(p.created_date).toDateString() === today)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const thisMonth = moment().format("YYYY-MM");
    const monthWashes = washes.filter(
      (w) => moment(w.created_date).format("YYYY-MM") === thisMonth
    );
    const monthRevenue = confirmedPayments
      .filter((p) => moment(p.created_date).format("YYYY-MM") === thisMonth)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      todayWashes: todayWashes.length,
      todayRevenue,
      totalWashes: washes.length,
      totalRevenue,
      monthWashes: monthWashes.length,
      monthRevenue,
      activeStaff: staff.filter((s) => s.is_active !== false).length,
      pendingWashes: washes.filter((w) =>
        ["waiting", "washing"].includes(w.status)
      ).length,
    };
  }, [washes, payments, staff]);

  const recentWashes = useMemo(
    () =>
      [...washes]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 10),
    [washes]
  );

  if (!businessId) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Missing businessId parameter</p>
        </div>
        <Link to={createPageUrl("SuperAdminDashboard")} className="inline-block mt-4">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Super Admin Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const loading = loadingBiz || loadingWashes || loadingPayments;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to={createPageUrl("SuperAdminDashboard")}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> All Businesses
          </Button>
        </Link>
        <Badge className="bg-purple-100 text-purple-700 border-0 text-sm px-3 py-1">
          Super Admin View
        </Badge>
      </div>

      {/* Business Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            {loadingBiz ? "Loading…" : business?.name || "Business Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-600">Failed to load business</p>
          ) : !business && !loadingBiz ? (
            <p className="text-slate-500">Business not found</p>
          ) : business ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Location</p>
                  <p className="font-medium">{business.city || business.location || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="font-medium">{business.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Owner</p>
                  <p className="font-medium text-xs break-all">{business.owner_email || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs">Registered</p>
                  <p className="font-medium">
                    {business.created_date
                      ? moment(business.created_date).format("MMM D, YYYY")
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Badge className={`${planColor(business.subscription_plan)} border-0`}>
                  {String(business.subscription_plan || "starter").charAt(0).toUpperCase() +
                    String(business.subscription_plan || "starter").slice(1)}{" "}
                  Plan
                </Badge>
                {business.is_active !== false ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <CheckCircle className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <AlertCircle className="h-3 w-3" /> Inactive
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {business.bays_count || 1} bay{(business.bays_count || 1) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Key Metrics – row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Washes"       value={loading ? "-" : stats.todayWashes}                              icon={Car}       color="text-brand-orange" bg="bg-brand-orange-50 dark:bg-brand-orange/10" />
        <StatCard label="Today's Revenue (KES)" value={loading ? "-" : stats.todayRevenue.toLocaleString()}           icon={Banknote}  color="text-brand-navy dark:text-brand-blue-light" bg="bg-brand-navy-50 dark:bg-brand-navy-mid/40" />
        <StatCard label="Month Washes"          value={loading ? "-" : stats.monthWashes}                             icon={TrendingUp} color="text-brand-blue-mid dark:text-brand-blue-light" bg="bg-brand-blue-pale/40 dark:bg-brand-blue-mid/20" />
        <StatCard label="Month Revenue (KES)"   value={loading ? "-" : `${(stats.monthRevenue / 1000).toFixed(1)}K`} icon={TrendingUp} color="text-brand-orange-hot" bg="bg-brand-orange-100 dark:bg-brand-orange/10" />
      </div>

      {/* Key Metrics – row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Washes"          value={loading ? "-" : stats.totalWashes}                              icon={Car}       color="text-brand-blue-bright dark:text-brand-blue-light" bg="bg-brand-navy-100 dark:bg-brand-navy-mid/40" />
        <StatCard label="Total Revenue (KES)"   value={loading ? "-" : `${(stats.totalRevenue / 1000).toFixed(1)}K`}  icon={Banknote}  color="text-brand-navy dark:text-brand-blue-light" bg="bg-brand-navy-50 dark:bg-brand-navy-mid/40" />
        <StatCard label="Active Staff"          value={loading ? "-" : stats.activeStaff}                              icon={Users}     color="text-brand-orange" bg="bg-brand-orange-50 dark:bg-brand-orange/10" />
        <StatCard label="In Queue Now"          value={loading ? "-" : stats.pendingWashes}                            icon={Clock}     color="text-brand-orange-hot" bg="bg-brand-orange-100 dark:bg-brand-orange/10" />
      </div>

      {/* Recent Washes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-600" />
            Recent Washes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {["Plate", "Services", "Status", "Amount (KES)", "Staff", "Time"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentWashes.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {w.plate_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                      {w.services?.map((s) => s.name).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(w.status)}`}>
                        {w.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {(w.amount_due || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {w.assigned_staff_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {w.created_date ? moment(w.created_date).fromNow() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentWashes.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400">No washes recorded yet</div>
            )}
            {loading && (
              <div className="text-center py-12 text-slate-400">Loading…</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      {business?.members?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Team Members ({business.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {business.members.map((m) => (
                <div key={m.email} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {m.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {m.email}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}