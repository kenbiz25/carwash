import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Car, Camera, X, Loader2, Upload, AlertTriangle, UserCheck,
  Layers, Truck, MapPin, Mail, Home, Check
} from "lucide-react";
import { api } from "@/api/firebaseClient";
import { toast } from "sonner";
import UpsellPrompt from "./UpsellPrompt";
import { notifyInApp } from "@/components/notifications/NotificationService";

const vehicleTypes = [
  { value: "saloon", label: "Saloon/Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van/Minibus" },
  { value: "pickup", label: "Pickup" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "other", label: "Other" },
];

const vehicleMakes = [
  "Toyota", "Honda", "Nissan", "Mazda", "Subaru", "Mercedes", "BMW", "Volkswagen",
  "Isuzu", "Mitsubishi", "Hyundai", "Kia", "Ford", "Land Rover", "Jeep", "Other"
];

const serviceCategories = {
  exterior_wash: "Exterior Wash",
  interior_clean: "Interior Clean",
  detailing: "Detailing",
  mechanical: "Mechanical",
  carpet_wash: "Carpet Wash",
  add_on: "Add-Ons",
  package: "Packages"
};

const carpetSizes = [
  { value: "small", label: "Small", sublabel: "Car mat / floor mat", color: "border-sky-300 bg-sky-50 text-sky-700" },
  { value: "medium", label: "Medium", sublabel: "Bedroom carpet", color: "border-violet-300 bg-violet-50 text-violet-700" },
  { value: "large", label: "Large", sublabel: "Living room carpet", color: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "extra_large", label: "Extra Large", sublabel: "Hall / custom size", color: "border-rose-300 bg-rose-50 text-rose-700" },
];

const generateCarpetRef = () => {
  const d = new Date();
  const datePart = d.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `CARP-${datePart}-${random}`;
};

const emptyForm = {
  // vehicle fields
  plate_number: "",
  vehicle_type: "saloon",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_color: "",
  // carpet fields
  carpet_reference: "",
  carpet_count: 1,
  carpet_size: "medium",
  item_description: "",
  // delivery/collection
  delivery_type: "walkin",   // "walkin" | "delivery"
  pickup_date: "",           // date customer brings item (delivery orders)
  delivery_date: "",         // date item will be ready/delivered
  customer_email: "",
  customer_residence: "",
  // shared
  customer_name: "",
  customer_phone: "",
  services: [],
  assigned_staff_id: "",
  bay_number: "",
  notes: "",
  damage_notes: "",
  photos_before: [],
  photos_proof: []
};

export default function EnhancedCheckIn({
  businessId, services = [], staff = [], onSuccess, user,
  open: controlledOpen, onOpenChange: controlledOnOpenChange,
  defaultType = "vehicle"
}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    if (!val) {
      setFormData({ ...emptyForm });
      setCheckInType(defaultType);
      setPrevWash(null);
      setShowAutofill(false);
      setActiveTab("details");
    }
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  };

  const [checkInType, setCheckInType] = useState(defaultType);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [prevWash, setPrevWash] = useState(null);
  const [showAutofill, setShowAutofill] = useState(false);
  const [loadingRepeat, setLoadingRepeat] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const handleTypeSwitch = (type) => {
    setCheckInType(type);
    setFormData(prev => ({
      ...prev,
      services: [],
      carpet_reference: type === "carpet" && !prev.carpet_reference ? generateCarpetRef() : prev.carpet_reference,
    }));
    setActiveTab("details");
  };

  // Lookup by plate (vehicle mode)
  const handlePlateBlur = async () => {
    const plate = formData.plate_number.trim();
    if (!plate || plate.length < 3 || !businessId) return;
    setLoadingRepeat(true);
    setPrevWash(null);
    setShowAutofill(false);
    try {
      const results = await api.entities.Wash.filter(
        { business_id: businessId, plate_number: plate.toUpperCase() },
        "-created_date", 1
      );
      if (results?.[0]?.customer_name) {
        setPrevWash(results[0]);
        setShowAutofill(true);
      }
    } catch (_) {}
    setLoadingRepeat(false);
  };

  // Lookup by phone (both modes)
  const handlePhoneBlur = async () => {
    const phone = formData.customer_phone.trim();
    if (!phone || phone.length < 9 || !businessId) return;
    if (showAutofill) return; // already showing from plate lookup
    setLoadingRepeat(true);
    try {
      const results = await api.entities.Wash.filter(
        { business_id: businessId, customer_phone: phone },
        "-created_date", 1
      );
      if (results?.[0]?.customer_name) {
        setPrevWash(results[0]);
        setShowAutofill(true);
      }
    } catch (_) {}
    setLoadingRepeat(false);
  };

  const applyAutofill = () => {
    if (!prevWash) return;
    setFormData(prev => ({
      ...prev,
      customer_name: prevWash.customer_name || prev.customer_name,
      customer_phone: prevWash.customer_phone || prev.customer_phone,
      ...(checkInType === "vehicle" ? {
        vehicle_type: prevWash.vehicle_type || prev.vehicle_type,
        vehicle_make: prevWash.vehicle_make || prev.vehicle_make,
        vehicle_model: prevWash.vehicle_model || prev.vehicle_model,
        vehicle_color: prevWash.vehicle_color || prev.vehicle_color,
      } : {
        carpet_size: prevWash.carpet_size || prev.carpet_size,
        carpet_count: prevWash.carpet_count || prev.carpet_count,
      }),
    }));
    setShowAutofill(false);
    toast.success("Customer details filled in");
  };

  const handleServiceToggle = (service) => {
    setFormData(prev => {
      const exists = prev.services.find(s => s.service_id === service.id);
      if (exists) {
        return { ...prev, services: prev.services.filter(s => s.service_id !== service.id) };
      }
      let price = service.price_kes;
      if (formData.vehicle_type === 'suv' && service.price_suv) price = service.price_suv;
      if (['van', 'truck', 'bus'].includes(formData.vehicle_type) && service.price_van) price = service.price_van;
      return {
        ...prev,
        services: [...prev.services, {
          service_id: service.id,
          name: service.name,
          category: service.category,
          price,
          status: "pending"
        }]
      };
    });
  };

  const totalAmount = formData.services.reduce((sum, s) => sum + (s.price || 0), 0);

  const handlePhotoUpload = async (e, type = "before") => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      if (type === "before") {
        setFormData(prev => ({ ...prev, photos_before: [...prev.photos_before, file_url] }));
      }
      setFormData(prev => ({
        ...prev,
        photos_proof: [...prev.photos_proof, {
          url: file_url, type,
          uploaded_by: user?.email,
          uploaded_at: new Date().toISOString()
        }]
      }));
    }
    toast.success("Photo uploaded");
  };

  const removePhoto = (index) => {
    const photoUrl = formData.photos_before[index];
    setFormData(prev => ({
      ...prev,
      photos_before: prev.photos_before.filter((_, i) => i !== index),
      photos_proof: prev.photos_proof.filter(p => p.url !== photoUrl)
    }));
  };

  const generateWashNumber = () => {
    const date = new Date();
    const datePart = date.toISOString().slice(2, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `W${datePart}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (checkInType === "vehicle" && !formData.plate_number.trim()) {
      toast.error("Please enter plate number");
      setActiveTab("details");
      return;
    }
    if (checkInType === "carpet" && !formData.customer_name.trim()) {
      toast.error("Please enter customer name");
      setActiveTab("details");
      return;
    }
    if (formData.services.length === 0) {
      toast.error("Please select at least one service");
      setActiveTab("services");
      return;
    }

    setLoading(true);
    const staffMember = staff.find(s => s.id === formData.assigned_staff_id);
    const ref = checkInType === "carpet"
      ? (formData.carpet_reference || generateCarpetRef())
      : formData.plate_number.toUpperCase();

    const newWash = await api.entities.Wash.create({
      business_id: businessId,
      type: checkInType,
      wash_number: generateWashNumber(),
      plate_number: ref,
      ...(checkInType === "vehicle" && {
        vehicle_type: formData.vehicle_type,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_color: formData.vehicle_color,
      }),
      ...(checkInType === "carpet" && {
        carpet_count: formData.carpet_count,
        carpet_size: formData.carpet_size,
        item_description: formData.item_description,
        delivery_type: formData.delivery_type,
        ...(formData.delivery_type === "delivery" && {
          pickup_date: formData.pickup_date,
          delivery_date: formData.delivery_date,
          customer_email: formData.customer_email,
          customer_residence: formData.customer_residence,
        }),
      }),
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      services: formData.services,
      assigned_staff_id: formData.assigned_staff_id,
      assigned_staff_name: staffMember?.name || "",
      checked_in_by: user?.email,
      bay_number: formData.bay_number ? parseInt(formData.bay_number) : null,
      notes: formData.notes,
      damage_notes: formData.damage_notes,
      photos_before: formData.photos_before,
      photos_proof: formData.photos_proof,
      amount_due: totalAmount,
      entry_time: new Date().toISOString(),
      status: "waiting"
    });

    if (staffMember?.user_email) {
      notifyInApp({
        businessId,
        recipientEmails: [staffMember.user_email],
        title: "New job assigned to you",
        message: `${ref} — ${formData.services.map((s) => s.name).join(", ")}`,
        referenceType: "wash",
        referenceId: newWash.id,
      }).catch(() => {});
    }

    toast.success(checkInType === "carpet" ? "Carpet job checked in!" : "Vehicle checked in successfully!");
    setFormData({ ...emptyForm });
    setPrevWash(null);
    setShowAutofill(false);
    setActiveTab("details");
    setCheckInType(defaultType);
    setLoading(false);
    setOpen(false);
    onSuccess?.();
  };

  // Group services by category; for carpet mode show only carpet_wash + add_on
  const groupedServices = services.reduce((acc, service) => {
    if (service.is_active === false) return acc;
    const cat = service.category || "add_on";
    if (checkInType === "carpet" && !["carpet_wash", "add_on"].includes(cat)) return acc;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  // Shared autofill banner
  const AutofillBanner = () => showAutofill && prevWash ? (
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <UserCheck className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Returning customer: {prevWash.customer_name}
            </p>
            <p className="text-amber-600 dark:text-amber-300 text-xs mt-0.5">
              Last visit:{" "}
              {prevWash.created_date
                ? new Date(prevWash.created_date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
                : "-"}
              {prevWash.services?.length > 0 && ` · ${prevWash.services.map(s => s.name).join(", ")}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setShowAutofill(false)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button type="button" size="sm" variant="outline"
        className="mt-2 border-amber-400 text-amber-700 hover:bg-amber-100 text-xs h-7"
        onClick={applyAutofill}
      >
        Autofill details
      </Button>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <Button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light text-white shadow-lg shadow-brand-blue-mid/25"
        >
          <Plus className="h-4 w-4 mr-2" />
          {defaultType === "carpet" ? "Carpet Check-In" : "Check-In Vehicle"}
        </Button>
      )}

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {checkInType === "carpet"
              ? <Layers className="h-5 w-5 text-brand-orange" />
              : <Car className="h-5 w-5 text-brand-blue-mid" />}
            {checkInType === "carpet" ? "Carpet Check-In" : "Vehicle Check-In"}
          </DialogTitle>
        </DialogHeader>

        {/* Type toggle — carpets are paused for now (carwash is the primary product);
            re-enable by rendering this when a second type is offered again. */}
        {defaultType === "carpet" && (
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeSwitch("vehicle")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                checkInType === "vehicle"
                  ? "bg-white dark:bg-slate-700 shadow text-brand-blue-mid"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Car className="h-4 w-4" />
              Vehicle Wash
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch("carpet")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                checkInType === "carpet"
                  ? "bg-white dark:bg-slate-700 shadow text-brand-orange"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Layers className="h-4 w-4" />
              Carpet Wash
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="assign">Assign</TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="space-y-4 mt-4">

              {checkInType === "vehicle" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plate Number *</Label>
                      <div className="relative">
                        <Input
                          placeholder="KAA 123B"
                          value={formData.plate_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                          onBlur={handlePlateBlur}
                          className="uppercase font-mono text-lg"
                          autoFocus
                        />
                        {loadingRepeat && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Vehicle Type</Label>
                      <Select
                        value={formData.vehicle_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <AutofillBanner />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Make</Label>
                      <Select
                        value={formData.vehicle_make}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_make: value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
                        <SelectContent>
                          {vehicleMakes.map((make) => (
                            <SelectItem key={make} value={make}>{make}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input
                        placeholder="e.g., Corolla"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        placeholder="e.g., White"
                        value={formData.vehicle_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_color: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        placeholder="Customer name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Input
                          placeholder="07XX XXX XXX"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                          onBlur={handlePhoneBlur}
                        />
                        {loadingRepeat && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Carpet Details ── */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Reference No.</Label>
                      <Input
                        className="font-mono"
                        value={formData.carpet_reference}
                        onChange={(e) => setFormData(prev => ({ ...prev, carpet_reference: e.target.value }))}
                        placeholder="Auto-generated"
                        autoFocus
                      />
                      <p className="text-xs text-slate-400">Auto-generated — editable</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Item Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.carpet_count}
                        onChange={(e) => setFormData(prev => ({ ...prev, carpet_count: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  {/* Carpet Size — visual card selector */}
                  <div className="space-y-2">
                    <Label>Carpet / Mat Size *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {carpetSizes.map(size => (
                        <button
                          key={size.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, carpet_size: size.value }))}
                          className={`rounded-xl border-2 p-3 text-center transition-all ${
                            formData.carpet_size === size.value
                              ? size.color + " shadow-sm"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <p className="font-semibold text-sm">{size.label}</p>
                          <p className="text-xs opacity-75 mt-0.5">{size.sublabel}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Item Description</Label>
                    <Input
                      placeholder="e.g., 2 car mats + 1 bedroom carpet"
                      value={formData.item_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, item_description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input
                        placeholder="Customer name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Input
                          placeholder="07XX XXX XXX"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                          onBlur={handlePhoneBlur}
                        />
                        {loadingRepeat && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AutofillBanner />

                  {/* Delivery / Collection toggle */}
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, delivery_type: "walkin" }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          formData.delivery_type === "walkin"
                            ? "border-brand-blue-mid bg-brand-blue-mid/10 text-brand-blue-mid"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        Walk-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, delivery_type: "delivery" }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          formData.delivery_type === "delivery"
                            ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                        Collection & Delivery
                      </button>
                    </div>
                  </div>

                  {/* Delivery extra fields */}
                  {formData.delivery_type === "delivery" && (
                    <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4 space-y-4">
                      <p className="text-xs font-semibold text-brand-orange uppercase tracking-wide flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> Delivery Details
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Collection Date</Label>
                          <Input
                            type="date"
                            value={formData.pickup_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
                          />
                          <p className="text-xs text-slate-400">When customer drops off items</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Ready / Delivery Date</Label>
                          <Input
                            type="date"
                            value={formData.delivery_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                          />
                          <p className="text-xs text-slate-400">When items will be ready</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                          </Label>
                          <Input
                            type="email"
                            placeholder="customer@email.com"
                            value={formData.customer_email}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Home className="h-3.5 w-3.5 text-slate-400" /> Residence / Address
                          </Label>
                          <Input
                            placeholder="e.g., Westlands, Nairobi"
                            value={formData.customer_residence}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_residence: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab("services")}>
                  Next: Select Services
                </Button>
              </div>
            </TabsContent>

            {/* ── Services Tab ── */}
            <TabsContent value="services" className="space-y-4 mt-4">
              {checkInType === "carpet" && Object.keys(groupedServices).length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium">No carpet wash services configured yet.</p>
                  <p className="mt-1 text-xs">Go to Services page and add services with the "Carpet Wash" category.</p>
                </div>
              )}

              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-slate-500">{serviceCategories[category] || category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryServices.map((service) => {
                      const isSelected = formData.services.some(s => s.service_id === service.id);
                      let displayPrice = service.price_kes;
                      if (formData.vehicle_type === 'suv' && service.price_suv) displayPrice = service.price_suv;
                      if (['van', 'truck', 'bus'].includes(formData.vehicle_type) && service.price_van) displayPrice = service.price_van;

                      return (
                        <div
                          key={service.id}
                          onClick={() => handleServiceToggle(service)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-brand-blue-mid bg-brand-blue-mid/10 dark:bg-brand-blue-mid/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-primary"}`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{service.name}</p>
                              <p className="text-brand-blue-mid font-semibold">KES {displayPrice?.toLocaleString()}</p>
                              {service.requires_photo_proof && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  <Camera className="h-3 w-3 mr-1" />Photo Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {checkInType === "vehicle" && Object.keys(groupedServices).length === 0 && (
                <p className="text-slate-500 text-center py-4">No services configured</p>
              )}

              {formData.services.length > 0 && checkInType === "vehicle" && (
                <UpsellPrompt
                  selectedServices={formData.services}
                  allServices={services}
                  vehicleType={formData.vehicle_type}
                  onAddService={handleServiceToggle}
                />
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-brand-blue-mid">KES {totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>Back</Button>
                  <Button type="button" onClick={() => setActiveTab("photos")}>Next: Photos</Button>
                </div>
              </div>
            </TabsContent>

            {/* ── Photos Tab ── */}
            <TabsContent value="photos" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" />
                    Before Photos (Recommended)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.photos_before.map((photo, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue-mid transition-colors">
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-xs text-slate-400 mt-1">Add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e, "before")} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {checkInType === "carpet"
                      ? "Take photos of the carpets/mats before washing"
                      : "Take photos of the vehicle condition before washing"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {checkInType === "carpet" ? "Condition Notes" : "Pre-existing Damage Notes"}
                  </Label>
                  <Textarea
                    placeholder={checkInType === "carpet"
                      ? "Note carpet condition, stains, or special instructions..."
                      : "Note any existing scratches, dents, or damage..."}
                    value={formData.damage_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, damage_notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    placeholder="Any special instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("services")}>Back</Button>
                <Button type="button" onClick={() => setActiveTab("assign")}>Next: Assign</Button>
              </div>
            </TabsContent>

            {/* ── Assign Tab ── */}
            <TabsContent value="assign" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign Staff</Label>
                  <Select
                    value={formData.assigned_staff_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_staff_id: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {staff.filter(s => s.is_active !== false).map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bay / Station</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={formData.bay_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, bay_number: e.target.value }))}
                  />
                </div>
              </div>

              {/* Summary */}
              <Card className="p-4 bg-slate-50 dark:bg-slate-800">
                <h4 className="font-semibold mb-3">Check-In Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {checkInType === "carpet" ? (
                    <>
                      <div>
                        <span className="text-slate-500">Reference:</span>{" "}
                        <span className="font-mono font-semibold">{formData.carpet_reference || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Items:</span>{" "}
                        <span>{formData.carpet_count} × {carpetSizes.find(s => s.value === formData.carpet_size)?.label || formData.carpet_size}</span>
                      </div>
                      {formData.delivery_type === "delivery" && (
                        <>
                          <div>
                            <span className="text-slate-500">Service:</span>{" "}
                            <span className="text-brand-orange font-medium">Collection & Delivery</span>
                          </div>
                          {formData.delivery_date && (
                            <div>
                              <span className="text-slate-500">Ready by:</span>{" "}
                              <span>{new Date(formData.delivery_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500">Plate:</span>{" "}
                        <span className="font-mono font-semibold">{formData.plate_number || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Type:</span>{" "}
                        <span className="capitalize">{formData.vehicle_type}</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-500">Customer:</span>{" "}
                    <span>{formData.customer_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Services:</span>{" "}
                    <span>{formData.services.length} selected</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Photos:</span>{" "}
                    <span>{formData.photos_before.length} uploaded</span>
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="text-2xl font-bold text-brand-blue-mid">KES {totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("photos")}>Back</Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className={`${checkInType === "carpet"
                      ? "bg-gradient-to-r from-brand-orange to-brand-orange-hot hover:opacity-90"
                      : "bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                    }`}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {checkInType === "carpet" ? "Check In Carpet" : "Check In Vehicle"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
