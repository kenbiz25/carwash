import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Search, BookOpen, Package, Loader2, Save } from "@/lib/icons";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";

const CATEGORIES = {
  exterior_wash: "Exterior Wash",
  interior_clean: "Interior Clean",
  detailing: "Detailing",
  mechanical: "Mechanical",
  add_on: "Add-On",
  package: "Package",
};

const CAT_COLORS = {
  exterior_wash: "bg-blue-100 text-blue-700",
  interior_clean: "bg-purple-100 text-purple-700",
  detailing: "bg-amber-100 text-amber-700",
  mechanical: "bg-slate-100 text-slate-700",
  add_on: "bg-green-100 text-green-700",
  package: "bg-pink-100 text-pink-700",
};

// Purely a labeling concern — price_kes/price_suv/price_van stay the same
// three numeric fields no matter which kind is picked, so DriveInWizard and
// EnhancedCheckIn's price-picking logic never has to know this exists. This
// only controls what the catalogue calls those fields: most of the pricelist
// isn't actually "Saloon/SUV/Van" (matatus, lorries, carpet-per-m², air
// freshener scent options all reuse the same three numbers for something
// else entirely), and showing them all under vehicle-type labels was the
// dishonest/confusing part.
const PRICING_KINDS = {
  vehicle: { label: "Vehicle-tiered (Saloon/SUV/Van)", tiers: ["Saloon", "SUV", "Van"] },
  unit: { label: "Per-unit rate (e.g. per m²)", tiers: ["Rate", "Premium rate"] },
  variant: { label: "Variant-based (e.g. scent/type)", tiers: ["Option A", "Option B", "Option C"] },
  flat: { label: "Flat rate", tiers: [] },
};
// A service saved before "pricing_kind" existed has no value for it at all -
// back then price_suv/price_van always meant literal SUV/Van prices, so an
// absent pricing_kind must default to "vehicle", never "flat". Getting this
// wrong is what silently zeroed out real SUV/Van prices on save (see
// openEdit below) - a service explicitly saved as "flat" still means flat.
const pricingKindOf = (svc) => PRICING_KINDS[svc?.pricing_kind] || PRICING_KINDS.vehicle;

// Which vehicles a service shows up for during check-in - an empty list
// means "every vehicle type" (most add-ons and engine/interior work aren't
// vehicle-size-specific), matching EnhancedCheckIn.jsx's vehicleTypes.
const VEHICLE_TYPES = [
  { value: "saloon", label: "Saloon/Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van/Minibus" },
  { value: "pickup", label: "Pickup" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "other", label: "Other" },
];

const EMPTY = {
  name: "", category: "exterior_wash", description: "", price_kes: "",
  price_suv: "", price_van: "", duration_minutes: "", is_active: true, is_package: false,
  pricing_kind: "flat", vehicle_types: [],
};

export default function ProductCatalogue() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { user, currentBusiness: business } = useBusiness();
  const businessId = business?.id;

  // Owner, manager, or super admin can edit prices/services.
  const email = user?.email?.toLowerCase();
  const memberRole = business?.members?.find((m) => m.email?.toLowerCase() === email)?.role;
  const canEdit =
    business?.owner_email?.toLowerCase() === email ||
    ["owner", "manager"].includes(memberRole) ||
    business?.admin_emails?.some((e) => e?.toLowerCase() === email) ||
    user?.role === "admin";

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", businessId],
    queryFn: () => api.entities.Service.filter({ business_id: businessId }, "sort_order", 200),
    enabled: !!businessId,
  });

  const filtered = services.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setFormOpen(true); };
  const openEdit = (svc) => {
    // Same "flat" trap as pricingKindOf above - a service with no pricing_kind
    // yet is a pre-existing vehicle-tiered one, not a flat-rate one. Defaulting
    // to "flat" here hid the SUV/Van price fields from the form entirely, so
    // saving (even for an unrelated change like the description) sent
    // price_suv/price_van as 0 and wiped the real prices.
    setForm({ ...EMPTY, ...svc, pricing_kind: svc.pricing_kind || "vehicle", vehicle_types: svc.vehicle_types || [] });
    setEditItem(svc);
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const tierCount = PRICING_KINDS[form.pricing_kind]?.tiers.length || 0;
    const payload = {
      ...form,
      price_kes: Number(form.price_kes) || 0,
      price_suv: tierCount >= 2 ? (Number(form.price_suv) || 0) : 0,
      price_van: tierCount >= 3 ? (Number(form.price_van) || 0) : 0,
      duration_minutes: Number(form.duration_minutes) || 0,
      business_id: businessId,
    };
    if (editItem) {
      await api.entities.Service.update(editItem.id, payload);
      toast.success("Service updated");
    } else {
      await api.entities.Service.create(payload);
      toast.success("Service added to catalogue");
    }
    queryClient.invalidateQueries({ queryKey: ["services", businessId] });
    setFormOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await api.entities.Service.delete(id);
    queryClient.invalidateQueries({ queryKey: ["services", businessId] });
    toast.success("Service removed");
  };

  const toggleActive = async (svc) => {
    await api.entities.Service.update(svc.id, { is_active: !svc.is_active });
    queryClient.invalidateQueries({ queryKey: ["services", businessId] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Product Catalogue
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Services & pricing for {business?.name || "your car wash"}</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} variant="gradient">
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No services found</p>
          {canEdit && <Button variant="outline" className="mt-4" onClick={openCreate}>Add First Service</Button>}
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>2nd Tier</TableHead>
                  <TableHead>3rd Tier</TableHead>
                  <TableHead>Duration</TableHead>
                  {canEdit && <TableHead>Active</TableHead>}
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(svc => {
                  const kind = pricingKindOf(svc);
                  return (
                  <TableRow key={svc.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${!svc.is_active ? "opacity-50" : ""}`}>
                    <TableCell>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{svc.name}</p>
                      {svc.description && <p className="text-xs text-slate-500 line-clamp-1">{svc.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {svc.is_package && <Badge className="bg-pink-100 text-pink-700 border-0 text-[10px] px-1.5 py-0">Package</Badge>}
                        {svc.vehicle_types?.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                            {svc.vehicle_types.map((v) => VEHICLE_TYPES.find((vt) => vt.value === v)?.label || v).join(", ")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${CAT_COLORS[svc.category] || ""} border-0 text-[10px] px-1.5 py-0 whitespace-nowrap`}>
                        {CATEGORIES[svc.category] || svc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {kind.tiers[0] && <p className="text-[10px] text-slate-400 leading-none mb-0.5">{kind.tiers[0]}</p>}
                      <p className="font-semibold">KES {(svc.price_kes || 0).toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {svc.price_suv ? (
                        <>
                          {kind.tiers[1] && <p className="text-[10px] text-slate-400 leading-none mb-0.5">{kind.tiers[1]}</p>}
                          <p>KES {svc.price_suv.toLocaleString()}</p>
                        </>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {svc.price_van ? (
                        <>
                          {kind.tiers[2] && <p className="text-[10px] text-slate-400 leading-none mb-0.5">{kind.tiers[2]}</p>}
                          <p>KES {svc.price_van.toLocaleString()}</p>
                        </>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{svc.duration_minutes ? `${svc.duration_minutes} min` : "-"}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Switch checked={svc.is_active !== false} onCheckedChange={() => toggleActive(svc)} />
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(svc)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(svc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Service" : "Add to Catalogue"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label>Service Name *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Carpet Wash" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Est. Duration (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="30" />
                <p className="text-[11px] text-slate-400">A rough estimate for wait times - this is hand-washing, not a timed machine cycle, so actual time will vary.</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's included in this service..." />
            </div>
            <div className="space-y-1">
              <Label>Pricing type</Label>
              <Select value={form.pricing_kind} onValueChange={v => setForm(f => ({ ...f, pricing_kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRICING_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                What the price columns mean for this service - most of the pricelist isn't
                actually about vehicle size (matatus, lorries, carpet-per-m², air freshener
                scents all use the same price fields for something else).
              </p>
            </div>
            {(() => {
              const tiers = PRICING_KINDS[form.pricing_kind]?.tiers || [];
              const fieldFor = (idx, key) => (
                <div className="space-y-1" key={key}>
                  <Label>{tiers[idx] ? `Price – ${tiers[idx]} (KES)` : "Price (KES)"}{idx === 0 && " *"}</Label>
                  <Input
                    required={idx === 0}
                    type="number"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={idx === 0 ? "500" : idx === 1 ? "700" : "900"}
                  />
                </div>
              );
              return (
                <div className={tiers.length > 1 ? "grid grid-cols-3 gap-3" : ""}>
                  {fieldFor(0, "price_kes")}
                  {tiers.length >= 2 && fieldFor(1, "price_suv")}
                  {tiers.length >= 3 && fieldFor(2, "price_van")}
                </div>
              );
            })()}
            <div className="space-y-1">
              <Label>Applies to</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VEHICLE_TYPES.map((vt) => (
                  <label key={vt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.vehicle_types.includes(vt.value)}
                      onCheckedChange={(checked) => setForm(f => ({
                        ...f,
                        vehicle_types: checked
                          ? [...f.vehicle_types, vt.value]
                          : f.vehicle_types.filter((v) => v !== vt.value),
                      }))}
                    />
                    {vt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Leave everything unchecked for a service that applies to any vehicle (most
                add-ons, engine/interior work). Check specific types to only show this service
                during check-in when that vehicle type is selected - e.g. "Basic Wash (SUV)"
                should only check Saloon off and SUV on, so it doesn't clutter a saloon's list.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Is Package?</Label>
              <Switch checked={form.is_package} onCheckedChange={v => setForm(f => ({ ...f, is_package: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} variant="gradient">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editItem ? "Save Changes" : "Add Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}