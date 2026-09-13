import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, RefreshCw, Car, Loader2 } from "@/lib/icons";
import WashCard from "@/components/wash/WashCard";
import QuickCheckIn from "@/components/wash/QuickCheckIn";
import PaymentDialog from "@/components/payment/PaymentDialog";
import { notifyInApp, sendWashReadyNotification, sendWashingStartedNotification } from "@/components/notifications/NotificationService";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";

export default function Washes() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWash, setSelectedWash] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [finishingWash, setFinishingWash] = useState(null);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [reasonDialog, setReasonDialog] = useState(null); // { wash, action: 'pause' | 'delete' } | null
  const [reasonText, setReasonText] = useState("");
  const [submittingReason, setSubmittingReason] = useState(false);

  const { user, currentBusiness: business } = useBusiness();

  // Once a job has left "waiting", pausing or deleting it (with a reason) is
  // a manager-level call - see WashDetails.jsx for the full rationale.
  const email = user?.email?.toLowerCase();
  const memberRole = business?.members?.find((m) => m.email?.toLowerCase() === email)?.role;
  const canManageWashes =
    business?.owner_email?.toLowerCase() === email ||
    ["owner", "manager"].includes(memberRole) ||
    business?.admin_emails?.some((e) => e?.toLowerCase() === email) ||
    user?.role === "admin";

  const { data: washes = [], refetch } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 200),
    enabled: !!business?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }, "sort_order"),
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

    if (newStatus === "washing" && business) {
      const wash = washes.find((w) => w.id === washId);
      sendWashingStartedNotification(wash, business).catch(() => {});
    }

    if (newStatus === "done" && business) {
      const wash = washes.find((w) => w.id === washId);
      const payCollectors = (business.members || [])
        .filter((m) => ["owner", "manager", "cashier"].includes(m.role) && m.email?.toLowerCase() !== user?.email?.toLowerCase())
        .map((m) => m.email);
      notifyInApp({
        businessId: business.id,
        recipientEmails: payCollectors,
        title: "Wash ready for payment",
        message: `${wash?.plate_number || "Vehicle"} is done - collect payment (KES ${wash?.amount_due ?? "?"})`,
        referenceType: "wash",
        referenceId: washId,
      }).catch(() => {});

      // Let the customer know their car is ready too, not just staff.
      sendWashReadyNotification(wash, business).catch(() => {});
    }

    toast.success(`Wash marked as ${newStatus}`);
    refetch();
  };

  const handleResume = async (washId) => {
    // Deliberately not routed through handleStatusChange - that stamps a
    // fresh start_time on every "-> washing" transition, which would
    // overwrite the job's original start time on resume.
    await api.entities.Wash.update(washId, { status: "washing", resumed_at: new Date().toISOString() });
    toast.success("Wash resumed");
    refetch();
  };

  const handleReasonSubmit = async () => {
    if (!reasonText.trim()) { toast.error("Enter a reason"); return; }
    const { wash, action } = reasonDialog;
    setSubmittingReason(true);
    try {
      if (action === "pause") {
        await api.entities.Wash.update(wash.id, {
          status: "paused",
          pause_reason: reasonText.trim(),
          paused_at: new Date().toISOString(),
          paused_by: user?.email || "",
        });
        toast.success("Wash paused");
      } else {
        await api.entities.Wash.update(wash.id, {
          status: "cancelled",
          cancel_reason: reasonText.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.email || "",
        });
        toast.success("Wash deleted - it won't count toward today's totals");
      }
      setReasonDialog(null);
      setReasonText("");
      refetch();
    } catch (err) {
      toast.error(err?.message || "Failed to update wash");
    } finally {
      setSubmittingReason(false);
    }
  };

  const handlePayment = (wash) => {
    setSelectedWash(wash);
    setPaymentDialogOpen(true);
  };

  const handleFinishEntry = (wash) => {
    setFinishingWash(wash);
    setFinishDialogOpen(true);
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
    paused: washes.filter(w => w.status === "paused").length,
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
            user={user}
            business={business}
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
            <TabsList className="w-full md:w-auto grid grid-cols-3 sm:grid-cols-6">
              <TabsTrigger value="all" className="text-xs">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs">
                Waiting ({statusCounts.waiting})
              </TabsTrigger>
              <TabsTrigger value="washing" className="text-xs">
                Washing ({statusCounts.washing})
              </TabsTrigger>
              <TabsTrigger value="paused" className="text-xs">
                Paused ({statusCounts.paused})
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
                user={user}
                business={business}
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
              canManageWashes={canManageWashes}
              onPause={(w) => setReasonDialog({ wash: w, action: "pause" })}
              onResume={handleResume}
              onDelete={(w) => setReasonDialog({ wash: w, action: "delete" })}
              onFinishEntry={handleFinishEntry}
            />
          ))
        )}
      </div>

      {/* Finish a pending entry someone else started */}
      <QuickCheckIn
        open={finishDialogOpen}
        onOpenChange={(v) => { setFinishDialogOpen(v); if (!v) setFinishingWash(null); }}
        editingWash={finishingWash}
        businessId={business?.id}
        services={services}
        staff={staff}
        user={user}
        business={business}
        onSuccess={() => { refetch(); setFinishingWash(null); }}
      />

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

      {/* Pause / Delete reason dialog - manager-only, once a job has started */}
      <Dialog open={!!reasonDialog} onOpenChange={(open) => { if (!open) { setReasonDialog(null); setReasonText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonDialog?.action === "pause" ? "Pause this wash" : "Delete this wash"}
              {reasonDialog?.wash?.plate_number ? ` - ${reasonDialog.wash.plate_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {reasonDialog?.action === "pause"
                ? "This job has already started. Explain why work is pausing - it'll show on this job until resumed."
                : "This job has already started. Deleting it removes it from today's wash and revenue counts - explain why."}
            </p>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g. Customer left, equipment issue, duplicate entry..."
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReasonDialog(null)} disabled={submittingReason}>Cancel</Button>
            <Button
              onClick={handleReasonSubmit}
              disabled={submittingReason || !reasonText.trim()}
              className={reasonDialog?.action === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {submittingReason && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submittingReason ? "Saving…" : reasonDialog?.action === "pause" ? "Pause Job" : "Delete Job"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}