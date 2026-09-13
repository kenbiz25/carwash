import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  FileText,
  Download,
  TrendingUp,
  Car,
  Banknote,
  Users
} from "@/lib/icons";
import moment from "moment";
import StatCard from "@/components/common/StatCard";
import { useBusiness } from "@/lib/BusinessContext";

export default function Reports() {
  const [dateRange, setDateRange] = useState("week");

  const { currentBusiness: business } = useBusiness();

  const { data: washes = [] } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 1000),
    enabled: !!business?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", business?.id],
    queryFn: () => api.entities.Payment.filter({ business_id: business?.id }, "-created_date", 1000),
    enabled: !!business?.id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", business?.id],
    queryFn: () => api.entities.Staff.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  // Filter data by date range
  const filterByDateRange = (items) => {
    const now = moment();
    return items.filter(item => {
      const itemDate = moment(item.created_date);
      switch (dateRange) {
        case "today":
          return itemDate.isSame(now, "day");
        case "week":
          return itemDate.isSame(now, "week");
        case "month":
          return itemDate.isSame(now, "month");
        default:
          return true;
      }
    });
  };

  const filteredWashes = filterByDateRange(washes);
  const filteredPayments = filterByDateRange(payments);
  const confirmedPayments = filteredPayments.filter(p => p.status === "confirmed");

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const mpesaRevenue = confirmedPayments.filter(p => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashRevenue = confirmedPayments.filter(p => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalWashes = filteredWashes.length;
    const completedWashes = filteredWashes.filter(w => ['done', 'paid'].includes(w.status)).length;
    const avgWashValue = completedWashes > 0 ? Math.round(totalRevenue / completedWashes) : 0;

    return { totalRevenue, mpesaRevenue, cashRevenue, totalWashes, completedWashes, avgWashValue };
  }, [confirmedPayments, filteredWashes]);

  // Revenue by day chart data
  const revenueByDay = useMemo(() => {
    const days = dateRange === "today" ? 1 : dateRange === "week" ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = moment().subtract(i, "days");
      const dayPayments = confirmedPayments.filter(p => 
        moment(p.created_date).format("YYYY-MM-DD") === date.format("YYYY-MM-DD")
      );
      data.push({
        date: date.format("MMM D"),
        revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        washes: filteredWashes.filter(w => 
          moment(w.created_date).format("YYYY-MM-DD") === date.format("YYYY-MM-DD")
        ).length
      });
    }
    return data;
  }, [confirmedPayments, filteredWashes, dateRange]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const mpesa = confirmedPayments.filter(p => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
    const cash = confirmedPayments.filter(p => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);
    const card = confirmedPayments.filter(p => p.method === "card").reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return [
      { name: "M-Pesa", value: mpesa, color: "#10b981" },
      { name: "Cash", value: cash, color: "#3b82f6" },
      { name: "Card", value: card, color: "#8b5cf6" }
    ].filter(d => d.value > 0);
  }, [confirmedPayments]);

  // Staff performance data
  const staffPerformance = useMemo(() => {
    return staff.map(s => {
      const staffWashes = filteredWashes.filter(w => w.assigned_staff_id === s.id);
      const completedWashes = staffWashes.filter(w => ['done', 'paid'].includes(w.status));
      const revenue = completedWashes.reduce((sum, w) => sum + (w.amount_due || 0), 0);
      const commission = revenue * ((s.commission_rate || 10) / 100);
      
      return {
        name: s.name,
        washes: completedWashes.length,
        revenue,
        commission: Math.round(commission)
      };
    }).sort((a, b) => b.washes - a.washes);
  }, [staff, filteredWashes]);

  // Service popularity
  const servicePopularity = useMemo(() => {
    const serviceCounts = {};
    filteredWashes.forEach(wash => {
      wash.services?.forEach(service => {
        const name = service.name || "Unknown";
        if (!serviceCounts[name]) {
          serviceCounts[name] = { count: 0, revenue: 0 };
        }
        serviceCounts[name].count++;
        serviceCounts[name].revenue += service.price || 0;
      });
    });
    return Object.entries(serviceCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredWashes]);

  const dateRangeLabels = {
    today: "Today",
    week: "This Week",
    month: "This Month"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Analytics and business insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={dateRange} onValueChange={setDateRange}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Revenue (${dateRangeLabels[dateRange]})`}
          value={`KES ${stats.totalRevenue.toLocaleString()}`}
          icon={Banknote}
          iconColor="text-brand-orange"
          iconBg="bg-brand-orange-50 dark:bg-brand-orange/10"
        />
        <StatCard
          title="Washes Completed"
          value={stats.completedWashes}
          icon={Car}
          iconColor="text-brand-navy dark:text-brand-blue-light"
          iconBg="bg-brand-navy-50 dark:bg-brand-navy-mid/40"
          subtitle={`${stats.totalWashes} total`}
        />
        <StatCard
          title="Avg Wash Value"
          value={`KES ${stats.avgWashValue.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-brand-blue-mid dark:text-brand-blue-light"
          iconBg="bg-brand-blue-pale/40 dark:bg-brand-blue-mid/20"
        />
        <StatCard
          title="M-Pesa Rate"
          value={`${Math.round((stats.mpesaRevenue / stats.totalRevenue) * 100) || 0}%`}
          icon={FileText}
          iconColor="text-brand-orange-hot"
          iconBg="bg-brand-orange-100 dark:bg-brand-orange/10"
          subtitle={`KES ${stats.mpesaRevenue.toLocaleString()}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === "revenue" ? `KES ${value.toLocaleString()}` : value,
                      name === "revenue" ? "Revenue" : "Washes"
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodData.map((method) => (
                <div key={method.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: method.color }} />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{method.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Staff Performance */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Washes</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  staffPerformance.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.washes}</TableCell>
                      <TableCell>KES {member.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">
                        KES {member.commission.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Popular Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicePopularity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  servicePopularity.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.count}</TableCell>
                      <TableCell className="text-emerald-600">
                        KES {service.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}