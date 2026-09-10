import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function RevenueChart({ payments = [], viewType = "week" }) {
  const [chartType, setChartType] = React.useState("area");
  
  const chartData = useMemo(() => {
    const confirmedPayments = payments.filter(p => p.status === 'confirmed');
    
    if (viewType === "week") {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = moment().subtract(i, 'days');
        const dayPayments = confirmedPayments.filter(p => 
          moment(p.created_date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
        );
        const mpesa = dayPayments.filter(p => p.method === 'mpesa').reduce((sum, p) => sum + (p.amount || 0), 0);
        const cash = dayPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
        
        days.push({
          name: date.format('ddd'),
          date: date.format('MMM D'),
          mpesa,
          cash,
          total: mpesa + cash
        });
      }
      return days;
    }
    
    // Monthly view
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = moment().subtract(i, 'weeks').startOf('week');
      const weekEnd = moment().subtract(i, 'weeks').endOf('week');
      const weekPayments = confirmedPayments.filter(p => {
        const pDate = moment(p.created_date);
        return pDate.isBetween(weekStart, weekEnd, null, '[]');
      });
      const mpesa = weekPayments.filter(p => p.method === 'mpesa').reduce((sum, p) => sum + (p.amount || 0), 0);
      const cash = weekPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
      
      weeks.push({
        name: `Week ${4 - i}`,
        date: weekStart.format('MMM D'),
        mpesa,
        cash,
        total: mpesa + cash
      });
    }
    return weeks;
  }, [payments, viewType]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm text-green-600">M-Pesa: KES {payload[0]?.payload?.mpesa?.toLocaleString()}</p>
          <p className="text-sm text-blue-600">Cash: KES {payload[0]?.payload?.cash?.toLocaleString()}</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
            Total: KES {payload[0]?.payload?.total?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          Revenue Overview
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={chartType === "area" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("area")}
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "bar" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMpesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mpesa" stroke="#10b981" fillOpacity={1} fill="url(#colorMpesa)" />
                <Area type="monotone" dataKey="cash" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCash)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mpesa" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cash" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">M-Pesa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Cash</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}