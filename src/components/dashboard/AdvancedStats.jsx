import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Repeat, DollarSign, BarChart3 } from "lucide-react";
import moment from "moment";

export default function AdvancedStats({ washes = [], payments = [], customers = [] }) {
  const stats = useMemo(() => {
    const now = moment();
    const thisMonth = washes.filter(w => 
      moment(w.created_date).isSame(now, 'month') && ['done', 'paid'].includes(w.status)
    );
    const lastMonth = washes.filter(w => 
      moment(w.created_date).isSame(now.clone().subtract(1, 'month'), 'month') && ['done', 'paid'].includes(w.status)
    );

    // Average ticket size
    const thisMonthRevenue = thisMonth.reduce((sum, w) => sum + (w.amount_paid || w.amount_due || 0), 0);
    const avgTicketSize = thisMonth.length > 0 ? Math.round(thisMonthRevenue / thisMonth.length) : 0;

    // Customer retention (customers who visited more than once in 30 days)
    const customerVisits = {};
    thisMonth.forEach(w => {
      if (w.customer_phone) {
        customerVisits[w.customer_phone] = (customerVisits[w.customer_phone] || 0) + 1;
      }
    });
    const totalCustomers = Object.keys(customerVisits).length;
    const repeatCustomers = Object.values(customerVisits).filter(v => v > 1).length;
    const retentionRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    // Month over month growth
    const lastMonthRevenue = lastMonth.reduce((sum, w) => sum + (w.amount_paid || w.amount_due || 0), 0);
    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
      : 0;

    // Washes growth
    const washesGrowth = lastMonth.length > 0
      ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
      : 0;

    // Top service
    const serviceCounts = {};
    thisMonth.forEach(w => {
      w.services?.forEach(s => {
        serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
      });
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      avgTicketSize,
      retentionRate,
      repeatCustomers,
      totalCustomers,
      revenueGrowth,
      washesGrowth,
      thisMonthWashes: thisMonth.length,
      thisMonthRevenue,
      topService: topService ? { name: topService[0], count: topService[1] } : null
    };
  }, [washes, payments]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Ticket Size</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                KES {stats.avgTicketSize.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Customer Retention</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.retentionRate}%
              </p>
              <p className="text-xs text-slate-400">
                {stats.repeatCustomers} of {stats.totalCustomers} repeat
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Revenue Growth</p>
              <p className={`text-2xl font-bold ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}%
              </p>
              <p className="text-xs text-slate-400">vs last month</p>
            </div>
            <div className={`h-10 w-10 rounded-full ${stats.revenueGrowth >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center`}>
              <TrendingUp className={`h-5 w-5 ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Top Service</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {stats.topService?.name || "N/A"}
              </p>
              <p className="text-xs text-slate-400">
                {stats.topService?.count || 0} this month
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}