import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Download,
  Banknote,
  Smartphone,
  CreditCard,
  RefreshCw,
  TrendingUp
} from "@/lib/icons";
import StatusBadge from "@/components/common/StatusBadge";
import StatCard from "@/components/common/StatCard";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import moment from "moment";
import { useBusiness } from "@/lib/BusinessContext";
import { defaultDateRange, isWithinDateRange } from "@/lib/dateRange";

// "Week" (the default) is the last 7 days, "Month" the last 30, matching
// defaultDateRange's own semantics - not a calendar week/month.
const QUICK_RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
];

export default function Payments() {
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickRange, setQuickRange] = useState("week");
  const [{ startDate, endDate }, setRange] = useState(() => defaultDateRange(7));
  const setStartDate = (value) => { setQuickRange(null); setRange((r) => ({ ...r, startDate: value })); };
  const setEndDate = (value) => { setQuickRange(null); setRange((r) => ({ ...r, endDate: value })); };
  const applyQuickRange = (key) => {
    const days = QUICK_RANGES.find((r) => r.key === key)?.days || 7;
    setQuickRange(key);
    setRange(defaultDateRange(days));
  };

  const { currentBusiness: business } = useBusiness();

  const { data: payments = [], refetch } = useQuery({
    queryKey: ["payments", business?.id],
    queryFn: () => api.entities.Payment.filter({ business_id: business?.id }, "-created_date", 500),
    enabled: !!business?.id,
  });

  const { data: washes = [] } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 500),
    enabled: !!business?.id,
  });

  // Get wash info for each payment
  const paymentsWithWash = payments.map(payment => {
    const wash = washes.find(w => w.id === payment.wash_id);
    return { ...payment, wash };
  });

  // Filter by date range (inclusive of both endpoints)
  const dateFilteredPayments = paymentsWithWash.filter(p => isWithinDateRange(p.created_date, startDate, endDate));

  // Filter by method and search
  const filteredPayments = dateFilteredPayments.filter(payment => {
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
    const matchesSearch = !searchQuery || 
      payment.wash?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.mpesa_receipt?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  // Calculate stats
  const confirmedPayments = dateFilteredPayments.filter(p => p.status === "confirmed");
  const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const mpesaTotal = confirmedPayments.filter(p => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashTotal = confirmedPayments.filter(p => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);
  const cardTotal = confirmedPayments.filter(p => p.method === "card").reduce((sum, p) => sum + (p.amount || 0), 0);

  const rangeLabel = `${moment(startDate).format("MMM D")} - ${moment(endDate).format("MMM D")}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track all transactions and reconcile payments
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => applyQuickRange(r.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  quickRange === r.key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <DateRangeFilter
            idPrefix="payments"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total (${rangeLabel})`}
          value={`KES ${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-brand-orange"
          iconBg="bg-brand-orange-50 dark:bg-brand-orange/10"
          subtitle={`${confirmedPayments.length} transactions`}
        />
        <StatCard
          title="M-Pesa"
          value={`KES ${mpesaTotal.toLocaleString()}`}
          icon={Smartphone}
          iconColor="text-brand-navy dark:text-brand-blue-light"
          iconBg="bg-brand-navy-50 dark:bg-brand-navy-mid/40"
          subtitle={`${Math.round((mpesaTotal / totalRevenue) * 100) || 0}% of total`}
        />
        <StatCard
          title="Cash"
          value={`KES ${cashTotal.toLocaleString()}`}
          icon={Banknote}
          iconColor="text-brand-blue-mid dark:text-brand-blue-light"
          iconBg="bg-brand-blue-pale/40 dark:bg-brand-blue-mid/20"
          subtitle={`${Math.round((cashTotal / totalRevenue) * 100) || 0}% of total`}
        />
        <StatCard
          title="Card"
          value={`KES ${cardTotal.toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-brand-orange-hot"
          iconBg="bg-brand-orange-100 dark:bg-brand-orange/10"
          subtitle={`${Math.round((cardTotal / totalRevenue) * 100) || 0}% of total`}
        />
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white dark:bg-slate-800 border-0 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by plate, receipt, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Tabs value={methodFilter} onValueChange={setMethodFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mpesa" className="text-green-600">M-Pesa</TabsTrigger>
              <TabsTrigger value="cash" className="text-blue-600">Cash</TabsTrigger>
              <TabsTrigger value="card" className="text-purple-600">Card</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
              <TableHead>Date & Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Banknote className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">No payments found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{moment(payment.created_date).format("MMM D, YYYY")}</p>
                      <p className="text-xs text-slate-500">{moment(payment.created_date).format("h:mm A")}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono font-medium">{payment.wash?.plate_number || "-"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-emerald-600">
                      KES {(payment.amount || 0).toLocaleString()}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.method} />
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs text-slate-500">
                      {payment.mpesa_receipt || payment.transaction_ref || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}