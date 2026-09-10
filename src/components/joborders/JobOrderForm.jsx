import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

export default function JobOrderForm({ order, services, staff, onSave, onClose }) {
  const [form, setForm] = useState({
    customer_name: order?.customer_name || "",
    customer_phone: order?.customer_phone || "",
    customer_email: order?.customer_email || "",
    product_id: order?.product_id || "",
    product_name: order?.product_name || "",
    product_description: order?.product_description || "",
    date_brought: order?.date_brought ? order.date_brought.slice(0, 16) : new Date().toISOString().slice(0, 16),
    date_to_collect: order?.date_to_collect ? order.date_to_collect.slice(0, 16) : "",
    amount: order?.amount || "",
    amount_paid: order?.amount_paid || 0,
    payment_status: order?.payment_status || "unpaid",
    payment_method: order?.payment_method || "pending",
    receipt_number: order?.receipt_number || "",
    mpesa_ref: order?.mpesa_ref || "",
    allocated_worker_id: order?.allocated_worker_id || "",
    allocated_worker_name: order?.allocated_worker_name || "",
    status: order?.status || "pending",
    priority: order?.priority || "normal",
    notes: order?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleServiceChange = (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      set("product_id", serviceId);
      set("product_name", svc.name);
      set("product_description", svc.description || "");
      set("amount", svc.price_kes || "");
    }
  };

  const handleWorkerChange = (workerId) => {
    const worker = staff.find(s => s.id === workerId);
    if (worker) {
      set("allocated_worker_id", workerId);
      set("allocated_worker_name", worker.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, amount: Number(form.amount), amount_paid: Number(form.amount_paid) });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Job Order" : "New Job Order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Section */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Customer Name *</Label>
                <Input required value={form.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="e.g. John Kamau" />
              </div>
              <div className="space-y-1">
                <Label>Phone Number</Label>
                <Input value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="07XX XXX XXX" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Email (optional)</Label>
                <Input type="email" value={form.customer_email} onChange={e => set("customer_email", e.target.value)} placeholder="customer@email.com" />
              </div>
            </div>
          </div>

          {/* Product Section */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Product / Service</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.length > 0 && (
                <div className="sm:col-span-2 space-y-1">
                  <Label>Select from Catalogue</Label>
                  <Select onValueChange={handleServiceChange} value={form.product_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.is_active !== false).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — KES {s.price_kes?.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:col-span-2 space-y-1">
                <Label>Product / Service Name *</Label>
                <Input required value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="e.g. Carpet Wash" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={form.product_description} onChange={e => set("product_description", e.target.value)} placeholder="Details about the item or service..." />
              </div>
            </div>
          </div>

          {/* Dates & Priority */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dates & Priority</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Date Brought *</Label>
                <Input type="datetime-local" value={form.date_brought} onChange={e => set("date_brought", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Collection Date</Label>
                <Input type="datetime-local" value={form.date_to_collect} onChange={e => set("date_to_collect", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (KES)</Label>
                <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Amount Paid (KES)</Label>
                <Input type="number" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={v => set("payment_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Receipt Number</Label>
                <Input value={form.receipt_number} onChange={e => set("receipt_number", e.target.value)} placeholder="e.g. RCP-001" />
              </div>
              <div className="space-y-1">
                <Label>M-Pesa Reference</Label>
                <Input value={form.mpesa_ref} onChange={e => set("mpesa_ref", e.target.value)} placeholder="e.g. QKX12345AB" />
              </div>
            </div>
          </div>

          {/* Assignment & Status */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Assignment & Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Allocated Worker</Label>
                <Select value={form.allocated_worker_id} onValueChange={handleWorkerChange}>
                  <SelectTrigger><SelectValue placeholder="Assign staff..." /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Job Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready">Ready for Collection</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {order ? "Save Changes" : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}