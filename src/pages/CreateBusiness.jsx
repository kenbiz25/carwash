import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { localDb } from "@/lib/localDb";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlaceAutocomplete from "@/components/common/PlaceAutocomplete";
import BranchPhotoEditor from "@/components/common/BranchPhotoEditor";
import { createTeamUser } from "@/lib/userAdminClient";
import { Building2, MapPin, Users, Check, Loader2, Plus, X, ArrowLeft, ArrowRight } from "@/lib/icons";
import { toast } from "sonner";

const STEPS = [
  { n: 1, label: "Business Name", icon: Building2 },
  { n: 2, label: "Details", icon: MapPin },
  { n: 3, label: "Employees", icon: Users },
];

const ROLE_LABELS = { owner: "Owner", manager: "Manager", cashier: "Cashier", staff: "Staff" };

const RESET_EMPLOYEE = { full_name: "", loginMethod: "username", identifier: "", password: "", role: "owner" };

export default function CreateBusiness() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "", location: "", city: "Nairobi", phone: "", description: "",
    hours: "Open 24 hours, 7 days a week", latitude: null, longitude: null,
    photos: [], bays_count: "1", slug: "", slugEdited: false, copyServicesFrom: "none",
  });

  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState(RESET_EMPLOYEE);

  const { data: existingBusinesses = [] } = useQuery({
    queryKey: ["all-businesses-for-copy"],
    queryFn: () => api.entities.Business.list(null, 200),
  });

  const handleNameChange = (name) => {
    setForm((f) => ({ ...f, name, slug: f.slugEdited ? f.slug : localDb.slugify(name) }));
  };

  const addEmployee = () => {
    const identifier = newEmployee.identifier.trim();
    if (!newEmployee.full_name.trim()) { toast.error("Enter their name"); return; }
    if (!identifier) { toast.error(`Enter a ${newEmployee.loginMethod}`); return; }
    if (!newEmployee.password || newEmployee.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setEmployees((list) => [...list, { ...newEmployee, identifier }]);
    setNewEmployee(RESET_EMPLOYEE);
  };

  const removeEmployee = (idx) => setEmployees((list) => list.filter((_, i) => i !== idx));

  const hasOwner = employees.some((e) => e.role === "owner");

  const handleFinish = async () => {
    if (employees.length === 0) { toast.error("Add at least one employee - usually the owner - before finishing"); return; }
    if (!hasOwner) { toast.error('At least one employee needs the "Owner" role'); return; }

    setCreating(true);
    const results = [];
    try {
      const ownerEntry = employees.find((e) => e.role === "owner");
      const ownerEmail = ownerEntry.loginMethod === "email" ? ownerEntry.identifier.toLowerCase() : null;

      const created = await api.entities.Business.create({
        name: form.name.trim(),
        location: form.location.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
        hours: form.hours.trim() || "Open 24 hours, 7 days a week",
        latitude: form.latitude,
        longitude: form.longitude,
        slug: form.slug.trim() || localDb.slugify(form.name),
        photos: form.photos.length ? form.photos : localDb.DEFAULT_BRANCH_PHOTOS,
        bays_count: parseInt(form.bays_count) || 1,
        owner_email: ownerEmail,
        members: [],
        member_emails: [],
        is_active: true,
      });

      if (form.copyServicesFrom !== "none") {
        const sourceServices = await api.entities.Service.filter({ business_id: form.copyServicesFrom });
        await Promise.all(
          sourceServices.map((svc) => {
            const { id: _id, business_id: _businessId, created_date: _created, updated_date: _updated, ...rest } = svc;
            return api.entities.Service.create({ ...rest, business_id: created.id });
          })
        );
      }

      for (const emp of employees) {
        try {
          await createTeamUser({
            ...(emp.loginMethod === "phone" ? { phone: emp.identifier }
              : emp.loginMethod === "email" ? { email: emp.identifier.toLowerCase() }
              : { username: emp.identifier.toLowerCase() }),
            password: emp.password,
            full_name: emp.full_name,
            role: emp.role,
            business_id: created.id,
          });
          results.push({ name: emp.full_name, ok: true });
        } catch (err) {
          results.push({ name: emp.full_name, ok: false, error: err?.message });
        }
      }

      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        toast.error(`Business created, but ${failed.length} login(s) failed: ${failed.map((f) => `${f.name} (${f.error})`).join("; ")}`);
      } else {
        toast.success(`"${form.name}" created with ${employees.length} login(s) - ready to activate whenever you are.`);
      }
      queryClient.invalidateQueries({ queryKey: ["my-locations"] });
      queryClient.invalidateQueries({ queryKey: ["all-businesses"] });
      navigate(createPageUrl("BusinessManager"));
    } catch (err) {
      toast.error("Failed to create business: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Business</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Set up a brand-new branch from scratch - name, details, then its first logins.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === s.n ? "bg-brand-blue-mid text-white" : step > s.n ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
            }`}>
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>What's this business called?</CardTitle>
            <CardDescription>Its public page URL is derived from this - you can adjust it below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., BGO Shine Hub - Kasarani"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Page URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 whitespace-nowrap">yoursite.com/</span>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugEdited: true }))}
                  placeholder="kasarani"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="brand"
                disabled={!form.name.trim()}
                onClick={() => setStep(2)}
              >
                Next: Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Branch Details</CardTitle>
            <CardDescription>Shown on this branch's own public page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Address</Label>
                <PlaceAutocomplete
                  value={form.location}
                  onChange={(val) => setForm((f) => ({ ...f, location: val }))}
                  onPlaceSelect={({ lat, lng }) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                  placeholder="Search for address…"
                />
                <p className="text-xs text-slate-400">
                  {form.latitude && form.longitude
                    ? `Pinned (${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)})`
                    : "Pick a suggestion from the dropdown to drop a map pin."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Nairobi" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <Input value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} placeholder="Open 24 hours, 7 days a week" />
              </div>
              <div className="space-y-2">
                <Label>Wash Bays</Label>
                <Input type="number" min="1" value={form.bays_count} onChange={(e) => setForm((f) => ({ ...f, bays_count: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell customers about this branch…"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <BranchPhotoEditor photos={form.photos} onChange={(photos) => setForm((f) => ({ ...f, photos }))} />
            </div>

            {existingBusinesses.length > 0 && (
              <div className="space-y-2">
                <Label>Copy Services From</Label>
                <Select value={form.copyServicesFrom} onValueChange={(val) => setForm((f) => ({ ...f, copyServicesFrom: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start with an empty catalogue</SelectItem>
                    {existingBusinesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button variant="brand" onClick={() => setStep(3)}>
                Next: Employees <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Who works here?</CardTitle>
            <CardDescription>
              Create their logins now - at least one Owner is required. Everyone else (manager, cashier, staff)
              can also be added here or later from My Business → Team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newEmployee.full_name} onChange={(e) => setNewEmployee((p) => ({ ...p, full_name: e.target.value }))} placeholder="Jane Wanjiru" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newEmployee.role} onValueChange={(val) => setNewEmployee((p) => ({ ...p, role: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Login Method</Label>
                <Select value={newEmployee.loginMethod} onValueChange={(val) => setNewEmployee((p) => ({ ...p, loginMethod: val, identifier: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">Username</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{newEmployee.loginMethod === "phone" ? "Phone Number" : newEmployee.loginMethod === "email" ? "Email" : "Username"}</Label>
                <Input
                  value={newEmployee.identifier}
                  onChange={(e) => setNewEmployee((p) => ({ ...p, identifier: e.target.value }))}
                  placeholder={newEmployee.loginMethod === "phone" ? "0757 234 111" : newEmployee.loginMethod === "email" ? "jane@example.com" : "jane.w"}
                  autoCapitalize="none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Password</Label>
                <Input type="text" value={newEmployee.password} onChange={(e) => setNewEmployee((p) => ({ ...p, password: e.target.value }))} placeholder="At least 6 characters" />
              </div>
            </div>
            <Button onClick={addEmployee} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Add to list
            </Button>

            {employees.length > 0 && (
              <div className="space-y-2">
                <Label>Will be created ({employees.length})</Label>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {employees.map((emp, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{emp.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{emp.loginMethod}: {emp.identifier}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[emp.role]}</Badge>
                      <button onClick={() => removeEmployee(i)} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {!hasOwner && (
                  <p className="text-xs text-amber-600">At least one of these needs the "Owner" role before you can finish.</p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={creating}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button variant="brand" onClick={handleFinish} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {creating ? "Creating…" : "Finish & Create Business"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
