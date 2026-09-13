import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingUp } from "@/lib/icons";
import moment from "moment";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const categoryLabels = {
  exterior_wash: "Exterior Wash",
  interior_clean: "Interior Clean",
  detailing: "Detailing",
  mechanical: "Mechanical",
  add_on: "Add-Ons",
  package: "Packages"
};

export default function MonthlyProductStats({ washes = [], services = [] }) {
  const [viewType, setViewType] = React.useState("month");

  const { productData, categoryData, trendData } = useMemo(() => {
    const now = moment();
    const filterDate = viewType === "month" 
      ? now.clone().subtract(1, 'month')
      : now.clone().subtract(1, 'year');

    const filteredWashes = washes.filter(w => 
      moment(w.created_date).isAfter(filterDate) && 
      ['done', 'paid'].includes(w.status)
    );

    // Count by service/product
    const productCounts = {};
    const categoryCounts = {};
    
    filteredWashes.forEach(wash => {
      wash.services?.forEach(service => {
        const name = service.name || "Unknown";
        const category = service.category || "add_on";
        
        if (!productCounts[name]) {
          productCounts[name] = { name, count: 0, revenue: 0, category };
        }
        productCounts[name].count++;
        productCounts[name].revenue += service.price || 0;

        if (!categoryCounts[category]) {
          categoryCounts[category] = { name: categoryLabels[category] || category, count: 0, revenue: 0 };
        }
        categoryCounts[category].count++;
        categoryCounts[category].revenue += service.price || 0;
      });
    });

    const productData = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const categoryData = Object.values(categoryCounts)
      .sort((a, b) => b.revenue - a.revenue);

    // Trend data by week
    const trendData = [];
    const weeks = viewType === "month" ? 4 : 12;
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = now.clone().subtract(i, 'weeks').startOf('week');
      const weekEnd = weekStart.clone().endOf('week');
      
      const weekWashes = washes.filter(w => {
        const date = moment(w.created_date);
        return date.isBetween(weekStart, weekEnd, null, '[]') && ['done', 'paid'].includes(w.status);
      });

      const weekServices = {};
      weekWashes.forEach(wash => {
        wash.services?.forEach(service => {
          const cat = service.category || "add_on";
          if (!weekServices[cat]) weekServices[cat] = 0;
          weekServices[cat]++;
        });
      });

      trendData.push({
        week: weekStart.format('MMM D'),
        ...weekServices,
        total: weekWashes.length
      });
    }

    return { productData, categoryData, trendData };
  }, [washes, viewType]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-slate-600">Count: {data.count}</p>
          <p className="text-sm text-emerald-600">Revenue: KES {data.revenue?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-emerald-500" />
          Product/Service Analytics
        </h3>
        <Tabs value={viewType} onValueChange={setViewType}>
          <TabsList>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Services by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="revenue"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {categoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Stats Table */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            Detailed Product Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-slate-500">Service</th>
                  <th className="text-left p-2 text-sm font-medium text-slate-500">Category</th>
                  <th className="text-right p-2 text-sm font-medium text-slate-500">Count</th>
                  <th className="text-right p-2 text-sm font-medium text-slate-500">Revenue</th>
                  <th className="text-right p-2 text-sm font-medium text-slate-500">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {productData.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
                        {categoryLabels[product.category] || product.category}
                      </span>
                    </td>
                    <td className="p-2 text-right">{product.count}</td>
                    <td className="p-2 text-right text-emerald-600 font-medium">
                      KES {product.revenue.toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-slate-500">
                      KES {Math.round(product.revenue / product.count).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}