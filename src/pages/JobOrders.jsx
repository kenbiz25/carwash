import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList, Car, Clock, AlertCircle, CheckCircle2, Loader2 } from "@/lib/icons";
import DriveInWizard from "@/components/joborders/DriveInWizard.jsx";
import DropOffWizard from "@/components/joborders/DropOffWizard.jsx";
import JobOrderCard from "@/components/joborders/JobOrderCard.jsx";
import { useBusiness } from "@/lib/BusinessContext";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Waiting", icon: Clock },
  { key: "in_progress", label: "In Progress", icon: Loader2 },
  { key: "ready", label: "Ready", icon: CheckCircle2 },
  { key: "collected", label: "Collected" },
  { key: "overdue", label: "Overdue", icon: AlertCircle },
];

export default function JobOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [wizard, setWizard] = useState(null); // { type: "drive_in"|"drop_off", order: null|{} }

  const { currentBusiness: business } = useBusiness();
  const businessId = business?.id;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["job-orders", businessId],
    queryFn: () => api.entities.JobOrder.filter({ business_id: businessId }, "-created_date", 200),
    enabled: !!businessId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", businessId],
    queryFn: () => api.entities.Service.filter({ business_id: businessId }, "sort_order"),
    enabled: !!businessId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", businessId],
    queryFn: () => api.entities.Staff.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const isOverdue = (o) =>
    o.date_to_collect &&
    new Date(o.date_to_collect) < new Date() &&
    o.status !== "collected" &&
    o.status !== "cancelled";

  const filtered = orders.filter(o => {
    const matchSearch =
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search);

    if (activeTab === "overdue") return matchSearch && isOverdue(o);
    if (activeTab === "all") return matchSearch;
    return matchSearch && o.status === activeTab;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    ready: orders.filter(o => o.status === "ready").length,
    collected: orders.filter(o => o.status === "collected").length,
    overdue: orders.filter(isOverdue).length,
  };

  const handleSave = async (data) => {
    const current = wizard?.order;
    if (current?.id) {
      await api.entities.JobOrder.update(current.id, data);
    } else {
      const orderNum = `JO-${Date.now().toString().slice(-5)}`;
      await api.entities.JobOrder.create({ ...data, business_id: businessId, order_number: orderNum });
    }
    queryClient.invalidateQueries({ queryKey: ["job-orders", businessId] });
    setWizard(null);
  };

  const handleDelete = async (id) => {
    await api.entities.JobOrder.delete(id);
    queryClient.invalidateQueries({ queryKey: ["job-orders", businessId] });
  };

  const openWizard = (order) => {
    setWizard({ type: order.flow_type || "drive_in", order });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            Job Orders
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Drive-in wash jobs</p>
        </div>
        {/* New Job buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => setWizard({ type: "drive_in", order: null })}
            variant="gradient"
          >
            <Car className="h-4 w-4 mr-1.5" /> Drive-in Wash
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl p-3 text-center transition-all border ${
              activeTab === tab.key
                ? tab.key === "overdue"
                  ? "bg-red-500 text-white border-red-500 shadow-md"
                  : "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white border-transparent shadow-md"
                : tab.key === "overdue" && counts.overdue > 0
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300"
            }`}
          >
            <p className="text-xl font-bold">{counts[tab.key]}</p>
            <p className="text-[10px] font-medium mt-0.5">{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by customer, plate, phone, order#..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          Loading jobs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jobs found</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button onClick={() => setWizard({ type: "drive_in", order: null })} variant="gradient">
              <Car className="h-4 w-4 mr-1.5" /> New Drive-in
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(order => (
            <JobOrderCard
              key={order.id}
              order={order}
              isOverdue={isOverdue(order)}
              onOpen={() => openWizard(order)}
              onDelete={() => handleDelete(order.id)}
              onStatusChange={async (status) => {
                await api.entities.JobOrder.update(order.id, { status });
                queryClient.invalidateQueries({ queryKey: ["job-orders", businessId] });
              }}
            />
          ))}
        </div>
      )}

      {/* Wizards */}
      {wizard?.type === "drive_in" && (
        <DriveInWizard
          order={wizard.order}
          services={services}
          staff={staff}
          onSave={handleSave}
          onClose={() => setWizard(null)}
        />
      )}
      {wizard?.type === "drop_off" && (
        <DropOffWizard
          order={wizard.order}
          services={services}
          staff={staff}
          onSave={handleSave}
          onClose={() => setWizard(null)}
        />
      )}
    </div>
  );
}