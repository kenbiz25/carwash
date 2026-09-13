import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Layers } from "@/lib/icons";
import moment from "moment";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function BayRevenueChart({ washes = [], baysCount = 4 }) {
  const bayData = useMemo(() => {
    const thisMonth = washes.filter(w => 
      moment(w.created_date).isSame(moment(), 'month') && ['done', 'paid'].includes(w.status)
    );

    const bays = {};
    for (let i = 1; i <= baysCount; i++) {
      bays[i] = { bay: `Bay ${i}`, washes: 0, revenue: 0 };
    }
    bays['unassigned'] = { bay: 'Unassigned', washes: 0, revenue: 0 };

    thisMonth.forEach(wash => {
      const bay = wash.bay_number || 'unassigned';
      const key = bay === 'unassigned' ? 'unassigned' : bay;
      if (bays[key]) {
        bays[key].washes++;
        bays[key].revenue += wash.amount_paid || wash.amount_due || 0;
      }
    });

    return Object.values(bays).filter(b => b.washes > 0);
  }, [washes, baysCount]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border text-sm">
          <p className="font-semibold">{data.bay}</p>
          <p className="text-slate-600 dark:text-slate-400">{data.washes} washes</p>
          <p className="text-emerald-600 font-medium">KES {data.revenue.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-500" />
          Revenue by Bay (This Month)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bayData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-slate-400">
            No bay data available
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="bay" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {bayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}