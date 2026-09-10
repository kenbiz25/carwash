import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronLeft, Car, CheckCircle2 } from "lucide-react";
import JobWizardStepper from "./JobWizardStepper.jsx";
import PhotoUploadGrid from "./PhotoUploadGrid.jsx";

const DRIVE_IN_SERVICES = [
  { name: "Exterior Wash Only", price_key: "price_kes" },
  { name: "Full Wash + Vacuum", price_key: "price_kes" },
  { name: "Interior Deep Clean (Carpets + Seats)", price_key: "price_kes" },
  { name: "Engine Bay Cleaning", price_key: "price_kes" },
  { name: "Wax / Polish", price_key: "price_kes" },
  { name: "Wheel & Tire Shine", price_key: "price_kes" },
  { name: "Dashboard & Trim Polish", price_key: "price_kes" },
  { name: "Odor Removal", price_key: "price_kes" },
  { name: "Headlight Restoration", price_key: "price_kes" },
];

// Picks the catalogue price for the selected vehicle type — mirrors EnhancedCheckIn.jsx
// so drive-in and quick check-in always charge the same, owner-configured price.
function getServicePrice(svc, vehicleType) {
  let price = svc.price_kes;
  if (vehicleType === "suv" && svc.price_suv) price = svc.price_suv;
  if (["van", "truck", "bus"].includes(vehicleType) && svc.price_van) price = svc.price_van;
  return price;
}

const IN_PROGRESS_STATUSES_DRIVE_IN = [
  "Washing Exterior",
  "Vacuum & Interior",
  "Carpet Shampoo / Extraction",
  "Drying / Final Touches",
  "Quality Check",
];

const QUALITY_CHECKS_DRIVE_IN = [
  "No streaks on windows",
  "Carpets dry & fresh smell",
  "Tires dressed",
  "Dashboard wiped",
  "Customer satisfied",
];

const STEPS = ["Intake", "In Progress", "Completion"];

export default function DriveInWizard({ order, services, staff, onSave, onClose }) {
  const catalogueServices = services.length > 0 ? services.filter(s => s.is_active !== false) : [];
  const startStep = order?.status === "in_progress" ? 1 : order?.status === "ready" || order?.status === "collected" ? 2 : 0;

  const [step, setStep] = useState(startStep);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    flow_type: "drive_in",
    customer_name: order?.customer_name || "",
    customer_phone: order?.customer_phone || "",
    plate_number: order?.plate_number || "",
    vehicle_type: order?.vehicle_type || "saloon",
    vehicle_make: order?.vehicle_make || "",
    vehicle_color: order?.vehicle_color || "",
    services_selected: order?.services_selected || [],
    special_requests: order?.special_requests || "",
    bay_number: order?.bay_number || "",
    allocated_worker_id: order?.allocated_worker_id || "",
    allocated_worker_name: order?.allocated_worker_name || "",
    photos_before: order?.photos_before || [],
    photos_during: order?.photos_during || [],
    photos_after: order?.photos_after || [],
    amount: order?.amount || 0,
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
    date_to_collect: order?.date_to_collect || "",
    date_collected: order?.date_collected || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Prices are captured at selection time (see toggleService), so switching vehicle
  // type after services are already picked would otherwise leave them charging the
  // stale saloon/SUV/van price. Re-price every already-selected service whenever the
  // vehicle type changes, as long as the job hasn't started yet.
  useEffect(() => {
    if (step !== 0 || form.services_selected.length === 0) return;
    setForm(f => ({
      ...f,
      services_selected: f.services_selected.map(sel => {
        const svc = catalogueServices.find(s => s.name === sel.name);
        return svc ? { ...sel, price: getServicePrice(svc, f.vehicle_type) } : sel;
      }),
    }));
  }, [form.vehicle_type]);

  const toggleService = (svcName, price) => {
    const existing = form.services_selected.find(s => s.name === svcName);
    if (existing) {
      set("services_selected", form.services_selected.filter(s => s.name !== svcName));
    } else {
      const newList = [...form.services_selected, { name: svcName, price: price || 0 }];
      set("services_selected", newList);
    }
  };

  const calcTotal = () => {
    return form.services_selected.reduce((acc, s) => acc + (s.price || 0), 0);
  };

  const handleWorkerChange = (id) => {
    const w = staff.find(s => s.id === id);
    if (w) { set("allocated_worker_id", id); set("allocated_worker_name", w.name); }
  };

  const addStatusHistory = (newStatus, note = "") => {
    const entry = { status: newStatus, note, at: new Date().toISOString() };
    return [...(form.status_history || []), entry];
  };

  const goNext = () => {
    if (step === 0) {
      const total = calcTotal();
      const depositPaid = Number(form.deposit_paid) || 0;
      const payStatus = depositPaid >= total ? "paid" : depositPaid > 0 ? "partial" : "unpaid";
      const history = addStatusHistory("in_progress");
      setForm(f => ({ ...f, amount: total, status: "in_progress", payment_status: payStatus, amount_paid: depositPaid, status_history: history }));
    } else if (step === 1) {
      const history = addStatusHistory("ready", form.in_progress_status);
      setForm(f => ({ ...f, status: "ready", status_history: history }));
    }
    setStep(s => s + 1);
  };

  const handleCollect = async () => {
    setSaving(true);
    const totalPaid = Number(form.deposit_paid || 0) + Number(form.amount_paid || 0);
    const payStatus = totalPaid >= form.amount ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
    const history = addStatusHistory("collected", "Customer collected");
    const finalForm = {
      ...form,
      status: "collected",
      payment_status: payStatus,
      amount_paid: totalPaid,
      date_collected: new Date().toISOString(),
      status_history: history,
    };
    await onSave(finalForm);
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const isServiceSelected = (name) => form.services_selected.some(s => s.name === name);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-emerald-500" />
            {order ? "Update Drive-In Wash" : "New Drive-In Wash"}
          </DialogTitle>
        </DialogHeader>

        <JobWizardStepper steps={STEPS} currentStep={step} />

        {/* STEP 0: Intake */}
        {step === 0 && (
          <div className="space-y-5">
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Vehicle Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label>Plate Number *</Label>
                  <Input required value={form.plate_number} onChange={e => set("plate_number", e.target.value.toUpperCase())} placeholder="KAB 123A" className="font-mono text-lg" />
                </div>
                <div className="space-y-1">
                  <Label>Vehicle Type</Label>
                  <Select value={form.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["saloon","suv","van","pickup","other"].map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Make / Model</Label>
                  <Input value={form.vehicle_make} onChange={e => set("vehicle_make", e.target.value)} placeholder="Toyota Prado" />
                </div>
                <div className="space-y-1">
                  <Label>Color</Label>
                  <Input value={form.vehicle_color} onChange={e => set("vehicle_color", e.target.value)} placeholder="White" />
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name (optional)</Label>
                  <Input value={form.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="John Kamau" />
                </div>
                <div className="space-y-1">
                  <Label>Phone (for "ready" notification)</Label>
                  <Input value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="07XX XXX XXX" />
                </div>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Services</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(catalogueServices.length > 0 ? catalogueServices : DRIVE_IN_SERVICES.map(s => ({ name: s.name, price_kes: 0 }))).map((svc, i) => {
                  const selected = isServiceSelected(svc.name);
                  const price = getServicePrice(svc, form.vehicle_type);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleService(svc.name, price)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${selected ? "text-emerald-700" : "text-slate-700"}`}>{svc.name}</p>
                        {price > 0 && <p className="text-xs text-slate-400">KES {price.toLocaleString()}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.services_selected.length > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">{form.services_selected.length} service(s) selected</span>
                  <span className="text-lg font-bold text-emerald-700">KES {calcTotal().toLocaleString()}</span>
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Special Requests / Notes</p>
              <Textarea rows={2} value={form.special_requests} onChange={e => set("special_requests", e.target.value)} placeholder='e.g. "heavy mud on mats", "pet hair on seats"' />
            </section>

            <PhotoUploadGrid
              photos={form.photos_before}
              onChange={p => set("photos_before", p)}
              label="Before Photos (3–6 recommended)"
              slots={["Front exterior", "Rear + side", "Interior / seats", "Carpets close-up"]}
            />

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Staff & Bay</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Assign Staff</Label>
                  <Select value={form.allocated_worker_id} onValueChange={handleWorkerChange}>
                    <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Bay Number</Label>
                  <Input type="number" value={form.bay_number} onChange={e => set("bay_number", e.target.value)} placeholder="1" />
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
                  <Label>Reference</Label>
                  <Input value={form.deposit_ref} onChange={e => set("deposit_ref", e.target.value)} placeholder="M-Pesa ref" />
                </div>
              </div>
            </section>

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                onClick={goNext}
                disabled={!form.plate_number || form.services_selected.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8"
              >
                Start Job <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: In Progress */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="font-semibold text-slate-800 dark:text-white">{form.plate_number} · {form.vehicle_type}</p>
              <p className="text-sm text-slate-500">{form.services_selected.map(s => s.name).join(", ")}</p>
            </div>

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Stage</p>
              <div className="grid grid-cols-1 gap-2">
                {IN_PROGRESS_STATUSES_DRIVE_IN.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("in_progress_status", s)}
                    className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${form.in_progress_status === s ? "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <PhotoUploadGrid
              photos={form.photos_during}
              onChange={p => set("photos_during", p)}
              label="Progress Photos (optional)"
              slots={["After vacuum", "Clean carpets", "Mid-process"]}
            />

            <section>
              <Label>Issues / Notes</Label>
              <Textarea rows={2} value={form.issues_found} onChange={e => set("issues_found", e.target.value)} className="mt-1" placeholder='e.g. "found tear on driver mat"' />
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

        {/* STEP 2: Completion */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-700">Job Complete – Ready for Handover</p>
                <p className="text-sm text-slate-500">{form.plate_number} · {form.services_selected.length} service(s)</p>
              </div>
            </div>

            <PhotoUploadGrid
              photos={form.photos_after}
              onChange={p => set("photos_after", p)}
              label="Final Proof Photos (required)"
              slots={["Clean exterior", "Clean interior / carpets", "Any damage found"]}
            />

            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quality Checklist</p>
              <div className="space-y-2">
                {QUALITY_CHECKS_DRIVE_IN.map(chk => (
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
                <div className="flex justify-between"><span className="text-slate-500">Total amount:</span><span className="font-semibold">KES {form.amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Deposit paid:</span><span>KES {(Number(form.deposit_paid)||0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold border-t mt-2 pt-2"><span>Balance due:</span><span className="text-emerald-600">KES {(form.amount - (Number(form.deposit_paid)||0)).toLocaleString()}</span></div>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Receipt Preview</p>
              <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 font-mono text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <p className="font-bold text-center text-sm text-slate-800 dark:text-white">CAR WASH RECEIPT</p>
                <p>Plate: {form.plate_number} | {form.vehicle_type?.toUpperCase()}</p>
                {form.services_selected.map((s,i) => <p key={i}>• {s.name}{s.price > 0 ? ` — KES ${s.price}` : ""}</p>)}
                <p className="border-t pt-1 font-bold">Total: KES {form.amount.toLocaleString()}</p>
                <p>Paid: KES {((Number(form.deposit_paid)||0)+(Number(form.amount_paid)||0)).toLocaleString()}</p>
                <p className="text-center pt-1 text-slate-400">Thank you for choosing us!</p>
              </div>
            </section>

            <section>
              <Label>Handover Notes</Label>
              <Textarea rows={2} value={form.handover_notes} onChange={e => set("handover_notes", e.target.value)} className="mt-1" placeholder="Any notes for customer..." />
            </section>

            <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-600">
              📱 SMS placeholder: "Your {form.vehicle_type} ({form.plate_number}) is clean & ready for collection{form.bay_number ? ` – Bay ${form.bay_number}` : ""}. Amount: KES {form.amount.toLocaleString()}. Thank you!"
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