import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Search, RefreshCw, Car } from "lucide-react";
import WashCard from "@/components/wash/WashCard";
import QuickCheckIn from "@/components/wash/QuickCheckIn";
import PaymentDialog from "@/components/payment/PaymentDialog";
import { notifyInApp } from "@/components/notifications/NotificationService";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";

export default function Washes() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWash, setSelectedWash] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { user, currentBusiness: business } = useBusiness();

  const { data: washes = [], refetch } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 200),
    enabled: !!business?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", business?.id],
    queryFn: () => api.entities.Staff.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const handleStatusChange = async (washId, newStatus) => {
    const updateData = { status: newStatus };

    if (newStatus === "washing") {
      updateData.start_time = new Date().toISOString();
    } else if (newStatus === "done") {
      updateData.exit_time = new Date().toISOString();
    }

    await api.entities.Wash.update(washId, updateData);

    if (newStatus === "done" && business) {
      const wash = washes.find((w) => w.id === washId);
      const payCollectors = (business.members || [])
        .filter((m) => ["owner", "manager", "cashier"].includes(m.role) && m.email?.toLowerCase() !== user?.email?.toLowerCase())
        .map((m) => m.email);
      notifyInApp({
        businessId: business.id,
        recipientEmails: payCollectors,
        title: "Wash ready for payment",
        message: `${wash?.plate_number || "Vehicle"} is done — collect payment (KES ${wash?.amount_due ?? "?"})`,
        referenceType: "wash",
        referenceId: washId,
      }).catch(() => {});
    }

    toast.success(`Wash marked as ${newStatus}`);
    refetch();
  };

  const handlePayment = (wash) => {
    setSelectedWash(wash);
    setPaymentDialogOpen(true);
  };

  const filteredWashes = washes.filter((wash) => {
    const matchesStatus = statusFilter === "all" || wash.status === statusFilter;
    const matchesSearch = !searchQuery || 
      wash.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wash.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: washes.length,
    waiting: washes.filter(w => w.status === "waiting").length,
    washing: washes.filter(w => w.status === "washing").length,
    done: washes.filter(w => w.status === "done").length,
    paid: washes.filter(w => w.status === "paid").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Washes</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage all vehicle washes and operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <QuickCheckIn 
            businessId={business?.id} 
            services={services} 
            staff={staff}
            onSuccess={refetch}
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white dark:bg-slate-800 border-0 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by plate number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto grid grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs">
                Waiting ({statusCounts.waiting})
              </TabsTrigger>
              <TabsTrigger value="washing" className="text-xs">
                Washing ({statusCounts.washing})
              </TabsTrigger>
              <TabsTrigger value="done" className="text-xs">
                Done ({statusCounts.done})
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-xs">
                Paid ({statusCounts.paid})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Washes List */}
      <div className="space-y-3">
        {filteredWashes.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
            <Car className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No washes found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Check in your first vehicle to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <QuickCheckIn 
                businessId={business?.id} 
                services={services} 
                staff={staff}
                onSuccess={refetch}
              />
            )}
          </Card>
        ) : (
          filteredWashes.map((wash) => (
            <WashCard
              key={wash.id}
              wash={wash}
              onStatusChange={handleStatusChange}
              onPayment={handlePayment}
            />
          ))
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        wash={selectedWash}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        businessId={business?.id}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["payments"] });
        }}
      />
    </div>
  );
}