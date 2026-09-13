import React, { useState, useEffect } from "react";
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
  Layers, Truck, MapPin, Mail, Home, Check, Sparkles
} from "@/lib/icons";
import { api } from "@/api/firebaseClient";
import { toast } from "sonner";
import UpsellPrompt from "./UpsellPrompt";
import { notifyInApp, sendCheckInConfirmation } from "@/components/notifications/NotificationService";
import { scanVehiclePhoto } from "@/lib/visionClient";
import VehicleIcon from "../common/VehicleIcon";

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

// price_suv/price_van only mean "SUV/Van price" for a vehicle-tiered
// service - for a per-unit or variant-priced one they mean something else
// entirely (e.g. "Premium rate", "Option B"), so only substitute them when
// the vehicle_type picked here actually applies. A service saved before
// pricing_kind existed has no value for it, which always meant vehicle
// tiers back then - default it that way, not to "flat" (see ProductCatalogue.jsx).
const getServicePrice = (service, vehicleType) => {
  const kind = service.pricing_kind || "vehicle";
  if (kind !== "vehicle") return service.price_kes;
  let price = service.price_kes;
  if (vehicleType === "suv" && service.price_suv) price = service.price_suv;
  if (["van", "truck", "bus"].includes(vehicleType) && service.price_van) price = service.price_van;
  return price;
};

// A service with no vehicle_types set applies to every vehicle (most add-ons
// and engine/interior services aren't vehicle-size-specific) - one is only
// excluded once it's been explicitly tagged and the current vehicle isn't in
// that list, e.g. "Basic Wash (SUV)" shouldn't show up for a saloon.
const appliesToVehicle = (service, vehicleType) =>
  !service.vehicle_types?.length || service.vehicle_types.includes(vehicleType);

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
  businessId, services = [], staff = [], onSuccess, user, business,
  open: controlledOpen, onOpenChange: controlledOnOpenChange,
  defaultType = "vehicle",
  // A wash someone already started with "Save & Finish Later" (see
  // handleSaveForLater) - when set, this dialog edits that record instead of
  // creating a new one, pre-filled with whatever was captured so far, so a
  // manager or any other staff member can pick up where the first person
  // left off instead of starting over.
  editingWash = null,
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
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  // Pre-fill from a pending entry being finished, instead of starting blank.
  useEffect(() => {
    if (!open || !editingWash) return;
    setCheckInType(editingWash.type || "vehicle");
    setFormData({ ...emptyForm, ...editingWash });
    setActiveTab(editingWash.services?.length ? "assign" : "services");
  }, [open, editingWash?.id]);

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
      const price = getServicePrice(service, formData.vehicle_type);
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

  // Switching vehicle type can make an already-picked service disappear from
  // the list (e.g. an SUV-only wash after switching to saloon) - drop it from
  // the total too, rather than silently keep charging for something that no
  // longer shows as selected anywhere in the form.
  useEffect(() => {
    if (checkInType !== "vehicle" || formData.services.length === 0) return;
    setFormData(prev => {
      const kept = prev.services.filter(s => {
        const service = services.find(svc => svc.id === s.service_id);
        return !service || appliesToVehicle(service, formData.vehicle_type);
      });
      return kept.length === prev.services.length ? prev : { ...prev, services: kept };
    });
  }, [formData.vehicle_type]);

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

  // Scans one photo of the vehicle to auto-fill plate/type/make/model/color
  // instead of typing them in - the same photo is also saved as a "before"
  // photo, so the Photos tab doesn't need it taken again unless more are
  // wanted. AI guesses are left in the (still-editable) fields for staff to
  // confirm, never submitted blind - a misread plate would misbill someone.
  const handleScanVehiclePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanningPhoto(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photos_before: [...prev.photos_before, file_url],
        photos_proof: [...prev.photos_proof, {
          url: file_url, type: "before",
          uploaded_by: user?.email,
          uploaded_at: new Date().toISOString(),
        }],
      }));

      const fields = await scanVehiclePhoto(file_url);
      const matchedMake = vehicleMakes.find(m => m.toLowerCase() === fields.vehicle_make?.toLowerCase());
      setFormData(prev => ({
        ...prev,
        plate_number: fields.plate_number || prev.plate_number,
        vehicle_type: fields.vehicle_type || prev.vehicle_type,
        vehicle_make: matchedMake || (fields.vehicle_make ? "Other" : prev.vehicle_make),
        vehicle_model: matchedMake
          ? (fields.vehicle_model || prev.vehicle_model)
          : [fields.vehicle_make, fields.vehicle_model].filter(Boolean).join(" ") || prev.vehicle_model,
        vehicle_color: fields.vehicle_color || prev.vehicle_color,
      }));
      toast.success("Filled in from the photo - please double-check before continuing");
    } catch (err) {
      toast.error(err.message || "Couldn't read that photo - fill the details in manually");
    }
    setScanningPhoto(false);
  };

  const removePhoto = (index) => {
    const photoUrl = formData.photos_before[index];
    setFormData(prev => ({
      ...prev,
      photos_before: prev.photos_before.filter((_, i) => i !== index),
      photos_proof: prev.photos_proof.filter(p => p.url !== photoUrl)
    }));
  };

  // Captures just the Details tab and queues the car for anyone (a manager
  // or any other staff member) to finish later from the Washes board - the
  // whole point being that a fast-paced, wet-handed front desk shouldn't
  // have to pick services or take photos before moving on to the next car.
  const handleSaveForLater = async () => {
    if (checkInType === "vehicle" && !formData.plate_number.trim()) {
      toast.error("Please enter plate number");
      return;
    }
    if (checkInType === "carpet" && !formData.customer_name.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    setLoading(true);
    const ref = checkInType === "carpet"
      ? (formData.carpet_reference || generateCarpetRef())
      : formData.plate_number.toUpperCase();

    const draftWash = await api.entities.Wash.create({
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
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      photos_before: formData.photos_before,
      photos_proof: formData.photos_proof,
      services: [],
      amount_due: 0,
      checked_in_by: user?.email,
      entry_time: new Date().toISOString(),
      status: "waiting",
      entry_status: "pending",
    });
    sendCheckInConfirmation(draftWash, business).catch(() => {});

    toast.success("Saved - anyone can finish this from the Washes board");
    setFormData({ ...emptyForm });
    setLoading(false);
    setOpen(false);
    onSuccess?.();
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

    const sharedFields = {
      type: checkInType,
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
      bay_number: formData.bay_number ? parseInt(formData.bay_number) : null,
      notes: formData.notes,
      damage_notes: formData.damage_notes,
      photos_before: formData.photos_before,
      photos_proof: formData.photos_proof,
      amount_due: totalAmount,
      entry_status: "complete",
    };

    // Finishing a pending entry someone else started - update that record
    // (keeping its original entry_time/checked_in_by/wash_number) instead of
    // creating a second one for the same car.
    const newWash = editingWash
      ? await api.entities.Wash.update(editingWash.id, { ...sharedFields, completed_by: user?.email })
      : await api.entities.Wash.create({
          ...sharedFields,
          business_id: businessId,
          wash_number: generateWashNumber(),
          checked_in_by: user?.email,
          entry_time: new Date().toISOString(),
          status: "waiting",
        });

    // Only a brand-new, fully-filled-out check-in counts as "just arrived" -
    // finishing a pending entry already sent this when it was first queued
    // (see handleSaveForLater).
    if (!editingWash) {
      sendCheckInConfirmation(newWash, business).catch(() => {});
    }

    if (staffMember?.user_email) {
      notifyInApp({
        businessId,
        recipientEmails: [staffMember.user_email],
        title: "New job assigned to you",
        message: `${ref} - ${formData.services.map((s) => s.name).join(", ")}`,
        referenceType: "wash",
        referenceId: newWash.id,
      }).catch(() => {});
    }

    toast.success(
      editingWash
        ? "Entry completed!"
        : checkInType === "carpet" ? "Carpet job checked in!" : "Vehicle checked in successfully!"
    );
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
    if (checkInType === "vehicle" && !appliesToVehicle(service, formData.vehicle_type)) return acc;
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
          variant="brand" className="shadow-lg shadow-brand-blue-mid/25"
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

        {editingWash && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Finishing an entry {editingWash.checked_in_by ? `started by ${editingWash.checked_in_by}` : "started earlier"} -
            pick services, add photos, and assign staff to complete it.
          </div>
        )}

        {/* Type toggle - lets staff switch to a carpet drop-off from the same
            dialog, regardless of which button opened it. */}
        {(
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
                  <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue-mid/40 bg-brand-blue-mid/5 hover:bg-brand-blue-mid/10 transition-colors py-3 px-4 cursor-pointer text-sm font-medium text-brand-blue-mid">
                    {scanningPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reading photo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Scan Vehicle Photo - auto-fills plate, type, make, model, color
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={scanningPhoto}
                      onChange={handleScanVehiclePhoto}
                    />
                  </label>

                  <div className="space-y-2">
                    <Label>Plate Number *</Label>
                    <div className="relative">
                      <Input
                        placeholder="KAA 123B"
                        value={formData.plate_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                        onBlur={handlePlateBlur}
                        className="uppercase font-mono text-2xl h-14 text-center tracking-wider"
                        autoFocus
                      />
                      {loadingRepeat && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Big tappable icons instead of a dropdown - easier to hit
                      with wet or gloved hands than picking from a menu. */}
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {vehicleTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, vehicle_type: type.value }))}
                          className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-1 transition-all ${
                            formData.vehicle_type === type.value
                              ? "border-brand-blue-mid bg-brand-blue-mid/10 dark:bg-brand-blue-mid/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <VehicleIcon type={type.value} size="default" />
                          <span className="text-[11px] font-medium text-center leading-tight">{type.label}</span>
                        </button>
                      ))}
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
                      <p className="text-xs text-slate-400">Auto-generated - editable</p>
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

                  {/* Carpet Size - visual card selector */}
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

              <div className="flex justify-end gap-2">
                {!editingWash && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleSaveForLater}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save &amp; Finish Later
                  </Button>
                )}
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
                      const displayPrice = getServicePrice(service, formData.vehicle_type);

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
