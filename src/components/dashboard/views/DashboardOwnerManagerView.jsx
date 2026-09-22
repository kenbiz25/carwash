import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Building2, BookOpen, Car, Banknote, TrendingUp, Loader2, CalendarDays, Users } from "@/lib/icons";
import { useCumulativeStats } from "@/hooks/useCumulativeStats";
import { defaultDateRange, isWithinDateRange } from "@/lib/dateRange";
import DateRangeFilter from "@/components/common/DateRangeFilter";

import QuickStats from "@/components/dashboard/QuickStats";
import RecentWashes from "@/components/dashboard/RecentWashes";
import LiveCCTVPreview from "@/components/dashboard/LiveCCTVPreview";
import StaffPerformance from "@/components/dashboard/StaffPerformance";
import RevenueChart from "@/components/dashboard/RevenueChart";
import MonthlyProductStats from "@/components/dashboard/MonthlyProductStats";
import PeakHoursHeatmap from "@/components/dashboard/PeakHoursHeatmap";
import AdvancedStats from "@/components/dashboard/AdvancedStats";
import BayRevenueChart from "@/components/dashboard/BayRevenueChart";
import EnhancedCheckIn from "@/components/wash/EnhancedCheckIn";

export default function DashboardOwnerManagerView({
  userRole,
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
  currentBusiness,
  washes,
  payments,
  staff,
  services,
  inventory,
  cctvFeeds,
  customers,
  revenueView,
  setRevenueView,
  activeTab,
  setActiveTab,
  refresh,
  refetchWashes,
  user,
}) {
  const cumulative = useCumulativeStats(businesses);
  const [{ startDate, endDate }, setRange] = useState(() => defaultDateRange(7));
  const setStartDate = (value) => setRange((r) => ({ ...r, startDate: value }));
  const setEndDate = (value) => setRange((r) => ({ ...r, endDate: value }));

  const filteredWashes = useMemo(() => {
    return (washes || []).filter(w => isWithinDateRange(w.entry_time || w.created_date, startDate, endDate));
  }, [washes, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return (payments || []).filter(p => isWithinDateRange(p.created_date, startDate, endDate));
  }, [payments, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              {userRole === "owner" && "👑 Owner"}
              {userRole === "manager" && "🛡️ Manager"}
              <span>•</span>
              {currentBusiness?.name || "Select business"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {businesses.length > 1 && (
            <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((biz) => (
                  <SelectItem key={biz.id} value={biz.id}>
                    {biz.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {(userRole === "owner" || userRole === "manager") && (
            <EnhancedCheckIn
              businessId={selectedBusinessId}
              services={services}
              staff={staff}
              user={user}
              business={currentBusiness}
              onSuccess={refetchWashes}
            />
          )}
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <DateRangeFilter
          idPrefix="dashboard"
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <span className="text-xs text-slate-400 ml-1">
          {filteredWashes.length} washes · KES {filteredPayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
        </span>
      </div>

      {/* Quick Links */}
      <div className="flex gap-2 flex-wrap">
        <Link to={createPageUrl("ProductCatalogue")}>
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" /> Product Catalogue
          </Button>
        </Link>
        {userRole === "owner" && (
          <Link to={createPageUrl("CustomerHistory")}>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" /> Customer History
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products/Services</TabsTrigger>
          {userRole === "owner" && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* All Locations Summary - only when owner has 2+ businesses */}
          {businesses.length > 1 && (
            <div className="rounded-2xl bg-gradient-to-r from-brand-blue-mid to-brand-blue-light p-4 text-white shadow-lg shadow-brand-blue-mid/20">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm opacity-90">All Locations Summary</p>
                <p className="text-xs opacity-75">Across {businesses.length} locations</p>
              </div>
              {cumulative.isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm opacity-75">Loading…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Washes Today", value: cumulative.totalWashesToday, icon: Car },
                    { label: "Revenue Today", value: `KES ${cumulative.totalRevenueToday.toLocaleString()}`, icon: Banknote },
                    { label: "Month Washes", value: cumulative.totalWashesMonth, icon: TrendingUp },
                    { label: "Month Revenue", value: `KES ${(cumulative.totalRevenueMonth / 1000).toFixed(1)}K`, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="h-3.5 w-3.5 opacity-80" />
                        <p className="text-xs opacity-80">{label}</p>
                      </div>
                      <p className="font-bold text-lg leading-tight">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <QuickStats washes={filteredWashes} payments={filteredPayments} staff={staff} inventory={inventory} />
          {userRole === "owner" && (
            <AdvancedStats washes={filteredWashes} payments={filteredPayments} customers={customers} />
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentWashes washes={filteredWashes} />
            </div>
            <div>
              <LiveCCTVPreview feeds={cctvFeeds} />
            </div>
          </div>

          {userRole === "owner" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Revenue Trends</h3>
                  <Tabs value={revenueView} onValueChange={setRevenueView}>
                    <TabsList className="h-8">
                      <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <RevenueChart payments={filteredPayments} viewType={revenueView} />
              </div>
              <div>
                <StaffPerformance staff={staff} washes={filteredWashes} services={services} standards={currentBusiness?.commission_standards} />
              </div>
            </div>
          )}
          {userRole === "manager" && (
            <StaffPerformance staff={staff} washes={filteredWashes} services={services} standards={currentBusiness?.commission_standards} />
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <MonthlyProductStats washes={filteredWashes} services={services} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-4">
          <AdvancedStats washes={filteredWashes} payments={filteredPayments} customers={customers} />

          <div className="grid lg:grid-cols-2 gap-6">
            <PeakHoursHeatmap washes={filteredWashes} />
            <BayRevenueChart washes={filteredWashes} baysCount={currentBusiness?.bays_count || 4} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueChart payments={filteredPayments} viewType="month" />
            <StaffPerformance staff={staff} washes={filteredWashes} services={services} standards={currentBusiness?.commission_standards} />
          </div>

          <MonthlyProductStats washes={filteredWashes} services={services} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
