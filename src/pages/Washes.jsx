import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { api } from "@/api/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, RefreshCw, Car, Loader2, Calendar } from "@/lib/icons";
import WashCard from "@/components/wash/WashCard";
import QuickCheckIn from "@/components/wash/QuickCheckIn";
import PaymentDialog from "@/components/payment/PaymentDialog";
import { notifyInApp, sendWashReadyNotification, sendWashingStartedNotification } from "@/components/notifications/NotificationService";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";
import { canManageBusiness } from "@/lib/permissions";

// Kanban columns, left to right in workflow order - Paid/Cancelled are
// terminal states so they're visually de-emphasized rather than removed
// (still useful to glance at without leaving the board).
const KANBAN_COLUMNS = [
  { key: "waiting", label: "Waiting", accent: "border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10" },
  { key: "washing", label: "Washing", accent: "border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/10" },
  { key: "paused", label: "Paused", accent: "border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-900/10" },
  { key: "done", label: "Done", accent: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10" },
  { key: "paid", label: "Paid", accent: "border-green-200 dark:border-green-900/50 bg-green-50/40 dark:bg-green-900/10" },
  { key: "cancelled", label: "Cancelled", accent: "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40" },
];

export default function Washes() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  // Defaults to today so the board opens on what's actually happening right
  // now - "" means "all dates", for pulling up a past day's jobs.
  const [dateFilter, setDateFilter] = useState(moment().format("YYYY-MM-DD"));
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
  const canManageWashes = canManageBusiness(user, business);

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
    const matchesSearch = !searchQuery ||
      wash.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wash.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter ||
      moment(wash.entry_time || wash.created_date).format("YYYY-MM-DD") === dateFilter;
    return matchesSearch && matchesDate;
  });

  const columns = KANBAN_COLUMNS.map((col) => ({
    ...col,
    washes: filteredWashes.filter((w) => w.status === col.key),
  }));

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

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
            />
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
                All dates
              </Button>
            )}
            {!dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter(moment().format("YYYY-MM-DD"))}>
                Today
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Kanban board - one column per status, sized to its own content so
          a quiet queue (e.g. nothing washing right now) doesn't leave a
          tall empty box the way a fixed-height column would. */}
      {filteredWashes.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
          <Car className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No washes found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {washes.length === 0
              ? "Check in your first vehicle to get started"
              : "Try adjusting your filters"}
          </p>
          {washes.length === 0 && (
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
        <div className="flex gap-4 overflow-x-auto pb-2 items-start">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`flex-shrink-0 w-[19rem] rounded-xl border ${col.accent} p-3`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.label}</h3>
                <Badge variant="outline" className="bg-white/70 dark:bg-slate-900/40">{col.washes.length}</Badge>
              </div>
              {col.washes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Empty</p>
              ) : (
                <div className="space-y-3">
                  {col.washes.map((wash) => (
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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