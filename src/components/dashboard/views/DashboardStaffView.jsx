import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Car, ClipboardList, Clock, ChevronRight, CheckCircle2, Wallet, Banknote, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RecentWashes from "@/components/dashboard/RecentWashes";
import EnhancedCheckIn from "@/components/wash/EnhancedCheckIn";

const statusColor = (status) =>
  ({
    waiting: "bg-amber-100 text-amber-700",
    washing: "bg-blue-100 text-blue-700",
    paused: "bg-orange-100 text-orange-700",
  })[status] || "bg-slate-100 text-slate-600";

const elapsed = (date) => {
  if (!date) return "";
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

function CashierFinancePanel({ payments = [] }) {
  const todayPayments = useMemo(() => payments.filter((p) => isToday(p.created_date)), [payments]);
  const totalToday = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const mpesaToday = todayPayments.filter((p) => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashToday = todayPayments.filter((p) => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
        <Wallet className="h-4 w-4 text-emerald-600" /> Today's Collections
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">KES {totalToday.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Smartphone className="h-3 w-3" /> M-Pesa</p>
          <p className="text-xl font-bold text-emerald-600">KES {mpesaToday.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Banknote className="h-3 w-3" /> Cash</p>
          <p className="text-xl font-bold text-blue-600">KES {cashToday.toLocaleString()}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
        <p className="text-xs font-medium text-slate-500 mb-2">Recent payments</p>
        {todayPayments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No payments collected yet today</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {todayPayments.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize text-slate-600 dark:text-slate-300">{p.method}</span>
                <span className="font-semibold text-slate-800 dark:text-white">KES {p.amount?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link
        to={createPageUrl("Payments")}
        className="mt-3 flex items-center justify-center gap-1 text-sm text-emerald-600 hover:underline"
      >
        View all payments <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function StaffPerformancePanel({ myWashes = [] }) {
  const completedToday = myWashes.filter((w) => isToday(w.created_date) && ["done", "paid"].includes(w.status));
  const assignedActive = myWashes.filter((w) => ["waiting", "washing", "paused"].includes(w.status));
  const totalCompleted = myWashes.filter((w) => ["done", "paid"].includes(w.status));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> My Work
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <p className="text-xs text-slate-500">Assigned to me</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{assignedActive.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Done today</p>
          <p className="text-xl font-bold text-emerald-600">{completedToday.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Done all-time</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{totalCompleted.length}</p>
        </div>
      </div>
      {assignedActive.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Nothing assigned to you right now</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {assignedActive.map((w) => (
            <div key={w.id} className="flex items-center gap-3 py-2">
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-white w-24 truncate">{w.plate_number || "-"}</span>
              <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{w.services?.map((s) => s.name).join(", ") || "-"}</span>
              <Badge className={`text-xs ${statusColor(w.status)} border-0 capitalize`}>{w.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardStaffView({ user, userRole, currentBusiness, washes, payments, services, staff, businessId }) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [showActive, setShowActive] = useState(false);

  const activeWashes = (washes || []).filter(w => ["waiting", "washing", "paused"].includes(w.status));

  const myStaffRecord = useMemo(
    () => (staff || []).find((s) => s.user_email?.toLowerCase() === user?.email?.toLowerCase()),
    [staff, user]
  );
  const myWashes = useMemo(
    () => (washes || []).filter((w) => myStaffRecord && w.assigned_staff_id === myStaffRecord.id),
    [washes, myStaffRecord]
  );

  const isCashier = userRole === "cashier";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome, {user?.full_name?.split(" ")[0] || "Staff"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {isCashier ? "Cashier" : "Staff"} · {currentBusiness?.name}
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setCheckInOpen(true)}
          className="bg-gradient-to-br from-brand-blue-mid to-brand-blue-light text-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all cursor-pointer w-full"
        >
          <Car className="h-10 w-10 mx-auto mb-3" />
          <p className="font-bold text-lg">Quick Check-in</p>
          <p className="text-blue-100 text-sm">Start a vehicle wash</p>
        </button>

        <Link to={createPageUrl("JobOrders")}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer h-full flex flex-col items-center justify-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-blue-500" />
            <p className="font-bold text-lg text-slate-800 dark:text-white">Job Orders</p>
            <p className="text-slate-500 text-sm">Drive-in queue</p>
          </div>
        </Link>

        {/* Active Washes toggle card */}
        <button
          type="button"
          onClick={() => setShowActive(v => !v)}
          className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer w-full"
        >
          {activeWashes.length > 0 && (
            <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {activeWashes.length}
            </span>
          )}
          <Clock className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <p className="font-bold text-lg text-slate-800 dark:text-white">Active Washes</p>
          <p className="text-slate-500 text-sm">{showActive ? "Hide list" : "View live queue"}</p>
        </button>
      </div>

      {/* Inline active washes panel */}
      {showActive && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Active Washes ({activeWashes.length})
            </h3>
            <Link
              to={createPageUrl("Washes")}
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {activeWashes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No active washes right now</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {activeWashes.map(w => (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                    <Car className="h-4 w-4 text-brand-blue-mid flex-shrink-0" />
                    <span className="font-mono font-bold text-slate-800 dark:text-white text-sm truncate">
                      {w.plate_number || "-"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {w.services?.map(s => s.name).join(", ") || "-"}
                    </p>
                    <p className="text-xs text-slate-400">{elapsed(w.entry_time || w.created_date)}</p>
                  </div>
                  <Badge className={`text-xs ${statusColor(w.status)} border-0 flex-shrink-0 capitalize`}>
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role-specific panel: cashiers see finance, staff see their assigned work */}
      <div className="grid lg:grid-cols-2 gap-6">
        {isCashier ? <CashierFinancePanel payments={payments} /> : <StaffPerformancePanel myWashes={myWashes} />}
        <RecentWashes washes={(washes || []).slice(0, 10)} />
      </div>

      {/* Vehicle check-in dialog */}
      <EnhancedCheckIn
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        businessId={businessId}
        services={services}
        staff={staff}
        user={user}
        defaultType="vehicle"
        onSuccess={() => setCheckInOpen(false)}
      />
    </div>
  );
}
