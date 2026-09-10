import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronLeft, Package, CheckCircle2 } from "lucide-react";
import JobWizardStepper from "./JobWizardStepper.jsx";
import PhotoUploadGrid from "./PhotoUploadGrid.jsx";

const DROP_OFF_ITEMS = ["Car floor mats", "Boot mat", "Home/office room carpets", "Rugs / runners", "Upholstery pieces", "Other"];
const CONDITION_OPTIONS = ["Heavy mud", "Pet urine / odor", "Food stains", "Dye transfer risk", "Delicate fabric"];
const IN_PROGRESS_STATUSES = [
  "Shaking / Pre-vacuum",
  "Pre-treatment / Spot cleaning",
  "Hot Water Extraction / Shampoo",
  "Rinse & Extract",
  "Drying",
  "Protectant / Deodorizer applied",
  "Ready for Inspection",
];
const QUALITY_CHECKS = [
  "No visible stains (or noted)",
  "Fresh odor",
  "Dry to touch",
  "Items match intake count",
];

const STEPS = ["Drop-off Intake", "Cleaning Progress", "Ready & Collection"];

export default function DropOffWizard({ order, services, staff, onSave, onClose }) {
  const startStep = order?.status === "in_progress" ? 1 : order?.status === "ready" || order?.status === "collected" ? 2 : 0;
  const [step, setStep] = useState(startStep);
  const [saving, setSaving] = useState(false);

  const defaultCollect = () => {
    const now = new Date();
    now.setHours(17, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    flow_type: "drop_off",
    customer_name: order?.customer_name || "",
    customer_phone: order?.customer_phone || "",
    customer_email: order?.customer_email || "",
    plate_number: order?.plate_number || "",
    drop_off_items: order?.drop_off_items || [],
    carpet_size: order?.carpet_size || "",
    items_count: order?.items_count || 1,
    items_description: order?.items_description || "",
    condition_on_arrival: order?.condition_on_arrival || [],
    special_requests: order?.special_requests || "",
    allocated_worker_id: order?.allocated_worker_id || "",
    allocated_worker_name: order?.allocated_worker_name || "",
    photos_before: order?.photos_before || [],
    photos_during: order?.photos_during || [],
    photos_after: order?.photos_after || [],
    amount: order?.amount || "",
    deposit_paid: order?.deposit_paid || 0,
    deposit_method: order?.deposit_method || "none",
    deposit_ref: order?.deposit_ref || "",
    amount_paid: order?.amount_paid || 0,
    payment_method: order?.payment_method || "pending",
    payment_status: order?.payment_status || "unpaid",
    receipt_number: order?.receipt_number || "",
    mpesa_ref: order?.mpesa_ref || "",
    status: order?.status || "pending",
    in_progress_status: order?.in_progress_status || "",
    quality_checklist: order?.quality_checklist || {},
    issues_found: order?.issues_found || "",
    handover_notes: order?.handover_notes || "",
    status_history: order?.status_history || [],
    priority: order?.priority || "normal",
    notes: order?.notes || "",
    date_brought: order?.date_brought || new Date().toISOString(),
    date_to_collect: order?.date_to_collect ? order.date_to_collect.slice(0, 16) : defaultCollect(),
    date_collected: order?.date_collected || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleItem = (item) => {
    const list = form.drop_off_items.includes(item)
      ? form.drop_off_items.filter(i => i !== item)
      : [...form.drop_off_items, item];
    set("drop_off_items", list);
  };

  const toggleCondition = (cond) => {
    const list = form.condition_on_arrival.includes(cond)
      ? form.condition_on_arrival.filter(c => c !== cond)
      : [...form.condition_on_arrival, cond];
    set("condition_on_arrival", list);
  };

  const handleWorkerChange = (id) => {
    const w = staff.find(s => s.id === id);
    if (w) { set("allocated_worker_id", id); set("allocated_worker_name", w.name); }
  };

  const addHistory = (newStatus, note = "") => {
    return [...(form.status_history || []), { status: newStatus, note, at: new Date().toISOString() }];
  };

  const goNext = () => {
    if (step === 0) {
      const history = addHistory("in_progress");
      setForm(f => ({ ...f, status: "in_progress", status_history: history }));
    } else if (step === 1) {
      const history = addHistory("ready");
      setForm(f => ({ ...f, status: "ready", status_history: history }));
    }
    setStep(s => s + 1);
  };

  const handleCollect = async () => {
    setSaving(true);
    const totalPaid = (Number(form.deposit_paid)||0) + (Number(form.amount_paid)||0);
    const payStatus = totalPaid >= Number(form.amount) ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
    const history = addHistory("collected", "Customer collected");
    await onSave({
      ...form,
      status: "collected",
      payment_status: payStatus,
      amount_paid: totalPaid,
      date_collected: new Date().toISOString(),
      status_history: history,
    });
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            {order ? "Update Drop-off Job" : "New Drop-off Job"}
          </DialogTitle>
        </DialogHeader>

        <JobWizardStepper steps={STEPS} currentStep={step} />

        {/* STEP 0: Drop-off Intake */}
        {step === 0 && (
          <div className="space-y-5">
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input required value={form.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="Jane Wanjiku" />
                </div>
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input required value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="07XX XXX XXX" />
                </div>
                <div className="space-y-1">
                  <Label>Email (optional)</Label>
                  <Input value={form.customer_email} onChange={e => set("customer_email", e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-1">
                  <Label>Vehicle Plate (if mats from car)</Label>
                  <Input value={form.plate_number} onChange={e => set("plate_number", e.target.value.toUpperCase())} placeholder="KAB 123A" className="font-mono" />
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Items Brought In</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {DROP_OFF_ITEMS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm text-left transition-all ${form.drop_off_items.includes(item) ? "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${form.drop_off_items.includes(item) ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                      {form.drop_off_items.includes(item) && <div className="h-2 w-2 rounded-sm bg-white" />}
                    </div>
                    {item}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Number of Pieces</Label>
                  <Input type="number" min={1} value={form.items_count} onChange={e => set("items_count", e.target.value)} placeholder="4" />
                </div>
                <div className="space-y-1">
                  <Label>Carpet / Rug Size</Label>
                  <Select value={form.carpet_size} onValueChange={v => set("carpet_size", v)}>
                    <SelectTrigger><SelectValue placeholder="Select size…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (2×3 ft / door mat)</SelectItem>
                      <SelectItem value="medium">Medium (4×6 ft)</SelectItem>
                      <SelectItem value="large">Large (6×9 ft)</SelectItem>
                      <SelectItem value="xlarge">X-Large (8×10 ft+)</SelectItem>
                      <SelectItem value="mixed">Mixed sizes</SelectItem>
                      <SelectItem value="na">N/A (car mats only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={form.items_description} onChange={e => set("items_description", e.target.value)} placeholder='e.g. "4 mats + 2 rugs"' />
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Condition on Arrival</p>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_OPTIONS.map(cond => (
                  <div key={cond} className="flex items-center gap-2">
                    <Checkbox
                      id={cond}
                      checked={form.condition_on_arrival.includes(cond)}
                      onCheckedChange={() => toggleCondition(cond)}
                    />
                    <label htmlFor={cond} className="text-sm text-slate-700 cursor-pointer">{cond}</label>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Label>Special Instructions</Label>
              <Textarea rows={2} value={form.special_requests} onChange={e => set("special_requests", e.target.value)} className="mt-1" placeholder='e.g. "avoid high heat on wool", "focus on red wine stain area"' />
            </section>

            <PhotoUploadGrid
              photos={form.photos_before}
              onChange={p => set("photos_before", p)}
              label="Before Photos (mandatory – 1 per major item)"
              slots={["Overall pile", "Stains close-up", "Damage areas"]}
            />

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Collection Date & Quoted Price</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Promised Collection</Label>
                  <Input type="datetime-local" value={form.date_to_collect} onChange={e => set("date_to_collect", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Quoted Amount (KES)</Label>
                  <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="500" />
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
                <div className="space-y-1">
                  <Label>Assign Staff</Label>
                  <Select value={form.allocated_worker_id} onValueChange={handleWorkerChange}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Deposit (optional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Amount (KES)</Label>
                  <Input type="number" value={form.deposit_paid} onChange={e => set("deposit_paid", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={form.deposit_method} onValueChange={v => set("deposit_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ref</Label>
                  <Input value={form.deposit_ref} onChange={e => set("deposit_ref", e.target.value)} placeholder="ref" />
                </div>
              </div>
            </section>

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                onClick={goNext}
                disabled={!form.customer_name || !form.customer_phone}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8"
              >
                Start Drop-off Job <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: Cleaning Progress */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="font-semibold text-slate-800 dark:text-white">{form.customer_name} · {form.customer_phone}</p>
              <p className="text-sm text-slate-500">{form.items_description || form.drop_off_items.join(", ")}</p>
            </div>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Stage</p>
              <div className="space-y-2">
                {IN_PROGRESS_STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("in_progress_status", s)}
                    className={`w-full p-3 rounded-xl border text-left text-sm font-medium transition-all ${form.in_progress_status === s ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <PhotoUploadGrid
              photos={form.photos_during}
              onChange={p => set("photos_during", p)}
              label="Progress Photos"
              slots={["After stain treatment", "Final clean close-up"]}
            />

            <section>
              <Label>Issues Found</Label>
              <Textarea rows={2} value={form.issues_found} onChange={e => set("issues_found", e.target.value)} className="mt-1" placeholder='e.g. "permanent dye stain – cannot remove 100%"' />
            </section>

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(0)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={handleSaveDraft}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Progress
                </Button>
                <Button type="button" onClick={goNext} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  Mark Ready <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Ready & Collection */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-700">Ready for Pickup</p>
                <p className="text-sm text-slate-500">{form.customer_name} — {form.items_description || `${form.items_count} item(s)`}</p>
              </div>
            </div>

            <PhotoUploadGrid
              photos={form.photos_after}
              onChange={p => set("photos_after", p)}
              label="Final Proof Photos (required)"
              slots={["All items clean", "Close-up of treated areas", "Items counted & ready"]}
            />

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quality Checklist</p>
              <div className="space-y-2">
                {QUALITY_CHECKS.map(chk => (
                  <div key={chk} className="flex items-center gap-3">
                    <Checkbox
                      id={chk}
                      checked={!!form.quality_checklist[chk]}
                      onCheckedChange={v => set("quality_checklist", { ...form.quality_checklist, [chk]: !!v })}
                    />
                    <label htmlFor={chk} className="text-sm text-slate-700 cursor-pointer">{chk}</label>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Balance Payment</p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-semibold">KES {Number(form.amount||0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Deposit:</span><span>KES {Number(form.deposit_paid||0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold border-t mt-2 pt-2"><span>Balance:</span><span className="text-emerald-600">KES {(Number(form.amount||0)-Number(form.deposit_paid||0)).toLocaleString()}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount Collected Now (KES)</Label>
                  <Input type="number" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Receipt #</Label>
                  <Input value={form.receipt_number} onChange={e => set("receipt_number", e.target.value)} placeholder="RCP-001" />
                </div>
                <div className="space-y-1">
                  <Label>M-Pesa Ref</Label>
                  <Input value={form.mpesa_ref} onChange={e => set("mpesa_ref", e.target.value)} placeholder="QKX12345AB" />
                </div>
              </div>
            </section>

            <section>
              <Label>Handover Notes (for customer)</Label>
              <Textarea rows={2} value={form.handover_notes} onChange={e => set("handover_notes", e.target.value)} className="mt-1" placeholder='e.g. "advise air dry fully at home before placing back in car"' />
            </section>

            <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-600">
              📱 SMS placeholder: "Hi {form.customer_name}, your items are clean & ready for pickup! Amount: KES {Number(form.amount||0).toLocaleString()}. Thank you!"
            </section>

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button
                type="button"
                onClick={handleCollect}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Mark Collected
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}