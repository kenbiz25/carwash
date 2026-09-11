import React from "react";
import StatCard from "../common/StatCard";
import { Car, Banknote, Clock, Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function QuickStats({ washes = [], payments = [], staff = [], inventory = [] }) {
  const today = new Date().toDateString();
  
  const todayWashes = washes.filter(w => 
    new Date(w.created_date).toDateString() === today
  );
  
  const todayRevenue = payments
    .filter(p => new Date(p.created_date).toDateString() === today && p.status === 'confirmed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Share of today's confirmed payments taken via M-Pesa (not "of today's
  // paid washes" — that divided by a count that's routinely 0 before a wash
  // is marked paid, which produced a literal "Infinity%" whenever an M-Pesa
  // payment landed before any wash had that status yet).
  const todayConfirmedPayments = payments
    .filter(p => new Date(p.created_date).toDateString() === today && p.status === 'confirmed');
  const mpesaPayments = todayConfirmedPayments.filter(p => p.method === 'mpesa');

  const mpesaPercent = todayConfirmedPayments.length > 0
    ? Math.round((mpesaPayments.length / todayConfirmedPayments.length) * 100)
    : 0;
  
  const pendingWashes = washes.filter(w => ['waiting', 'washing'].includes(w.status));
  
  const lowStockItems = inventory.filter(i => i.quantity <= (i.low_stock_threshold || 5));
  
  const activeStaff = staff.filter(s => s.is_active !== false);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title="Today's Washes"
        value={todayWashes.length}
        icon={Car}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        subtitle="vehicles serviced"
      />
      <StatCard
        title="Revenue Today"
        value={`KES ${todayRevenue.toLocaleString()}`}
        icon={Banknote}
        iconColor="text-green-600"
        iconBg="bg-green-100 dark:bg-green-900/30"
        trend="+12% vs yesterday"
        trendUp={true}
      />
      <StatCard
        title="M-Pesa %"
        value={`${mpesaPercent}%`}
        icon={TrendingUp}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        subtitle="digital payments"
      />
      <StatCard
        title="In Queue"
        value={pendingWashes.length}
        icon={Clock}
        iconColor="text-amber-600"
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        subtitle="waiting/washing"
      />
      <StatCard
        title="Active Staff"
        value={activeStaff.length}
        icon={Users}
        iconColor="text-blue-600"
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        subtitle="on duty"
      />
      <StatCard
        title="Low Stock"
        value={lowStockItems.length}
        icon={AlertTriangle}
        iconColor={lowStockItems.length > 0 ? "text-red-600" : "text-slate-400"}
        iconBg={lowStockItems.length > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-slate-100 dark:bg-slate-800"}
        subtitle="items need restock"
      />
    </div>
  );
}