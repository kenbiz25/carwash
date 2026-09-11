import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Car, User, Clock, Banknote, Camera, Play, CheckCircle, X, Loader2, Phone,
  Upload, Image, AlertTriangle, Star, Pause, Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusBadge from "@/components/common/StatusBadge";
import VehicleIcon from "@/components/common/VehicleIcon";
import PaymentDialog from "@/components/payment/PaymentDialog";
import moment from "moment";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";

export default function WashDetails() {
  const queryClient = useQueryClient();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoType, setPhotoType] = useState("after");
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [reasonDialog, setReasonDialog] = useState(null); // { action: 'pause' | 'delete' } | null
  const [reasonText, setReasonText] = useState("");
  const [submittingReason, setSubmittingReason] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const washId = urlParams.get("id");

  const { user, currentBusiness: business } = useBusiness();

  // Once a job has left "waiting", pausing it or deleting it (with a reason,
  // so it's clear later why work stopped) is a manager-level call - a staff
  // member who started a wash shouldn't be able to unilaterally abandon or
  // erase it. Before it's started, the plain Cancel button below still works
  // for anyone, same as it always has (correcting a mistaken check-in).
  const email = user?.email?.toLowerCase();
  const memberRole = business?.members?.find((m) => m.email?.toLowerCase() === email)?.role;
  const canManageWashes =
    business?.owner_email?.toLowerCase() === email ||
    ["owner", "manager"].includes(memberRole) ||
    business?.admin_emails?.some((e) => e?.toLowerCase() === email) ||
    user?.role === "admin";

  const { data: wash, isLoading, refetch } = useQuery({
    queryKey: ["wash", washId],
    queryFn: async () => {
      const washes = await api.entities.Wash.filter({ id: washId });
      return washes[0];
    },
    enabled: !!washId,
  });

  const { data: payment } = useQuery({
    queryKey: ["washPayment", washId],
    queryFn: async () => {
      const payments = await api.entities.Payment.filter({ wash_id: washId });
      return payments[0];
    },
    enabled: !!washId,
  });

  const handleStatusChange = async (newStatus) => {
    const updateData = { status: newStatus };
    
    if (newStatus === "washing") {
      updateData.start_time = new Date().toISOString();
    } else if (newStatus === "done") {
      updateData.exit_time = new Date().toISOString();
    }

    await api.entities.Wash.update(washId, updateData);
    toast.success(`Status updated to ${newStatus}`);
    refetch();
  };

  const handleResume = async () => {
    await api.entities.Wash.update(washId, { status: "washing", resumed_at: new Date().toISOString() });
    toast.success("Wash resumed");
    refetch();
  };

  const handleReasonSubmit = async () => {
    if (!reasonText.trim()) { toast.error("Enter a reason"); return; }
    setSubmittingReason(true);
    try {
      if (reasonDialog.action === "pause") {
        await api.entities.Wash.update(washId, {
          status: "paused",
          pause_reason: reasonText.trim(),
          paused_at: new Date().toISOString(),
          paused_by: user?.email || "",
        });
        toast.success("Wash paused");
      } else {
        await api.entities.Wash.update(washId, {
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

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    
    const newPhotos = [...(wash.photos_proof || [])];
    const afterPhotos = [...(wash.photos_after || [])];

    for (const file of files) {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      
      newPhotos.push({
        url: file_url,
        type: photoType,
        service_id: selectedServiceId,
        uploaded_by: user?.email,
        uploaded_at: new Date().toISOString()
      });

      if (photoType === "after") {
        afterPhotos.push(file_url);
      }
    }

    await api.entities.Wash.update(washId, { 
      photos_proof: newPhotos,
      photos_after: afterPhotos
    });
    
    toast.success("Photo uploaded");
    setUploadingPhoto(false);
    setPhotoDialogOpen(false);
    refetch();
  };

  const handleServiceStatusUpdate = async (serviceIndex, newStatus) => {
    const services = [...wash.services];
    services[serviceIndex] = {
      ...services[serviceIndex],
      status: newStatus,
      ...(newStatus === "in_progress" ? { started_at: new Date().toISOString() } : {}),
      ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {})
    };
    
    await api.entities.Wash.update(washId, { services });
    toast.success("Service updated");
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!wash) {
    return (
      <div className="text-center py-12">
        <Car className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Wash not found</h2>
        <Link to={createPageUrl("Washes")}>
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Washes</Button>
        </Link>
      </div>
    );
  }

  const serviceStatusColors = {
    pending: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Washes")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <VehicleIcon type={wash.vehicle_type} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{wash.plate_number}</h1>
                {wash.wash_number && (
                  <Badge variant="outline" className="font-mono">{wash.wash_number}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={wash.status} />
                {wash.vehicle_make && <span className="text-sm text-slate-500">{wash.vehicle_make}</span>}
                {wash.vehicle_model && <span className="text-sm text-slate-500">{wash.vehicle_model}</span>}
                {wash.vehicle_color && <span className="text-sm text-slate-500">• {wash.vehicle_color}</span>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => { setPhotoType("after"); setSelectedServiceId(null); setPhotoDialogOpen(true); }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Add Photo
          </Button>
          
          {wash.status === "waiting" && (
            <Button onClick={() => handleStatusChange("washing")} className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />Start Washing
            </Button>
          )}
          {wash.status === "washing" && (
            <Button onClick={() => handleStatusChange("done")} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-2" />Mark Done
            </Button>
          )}
          {wash.status === "washing" && canManageWashes && (
            <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setReasonDialog({ action: "pause" })}>
              <Pause className="h-4 w-4 mr-2" />Pause
            </Button>
          )}
          {wash.status === "paused" && canManageWashes && (
            <Button onClick={handleResume} className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />Resume
            </Button>
          )}
          {wash.status === "done" && (
            <Button onClick={() => setPaymentDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Banknote className="h-4 w-4 mr-2" />Process Payment
            </Button>
          )}
          {wash.status === "waiting" && (
            <Button variant="outline" onClick={() => handleStatusChange("cancelled")}>
              <X className="h-4 w-4 mr-2" />Cancel
            </Button>
          )}
          {["washing", "paused", "done"].includes(wash.status) && canManageWashes && (
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setReasonDialog({ action: "delete" })}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          )}
        </div>
      </div>

      {wash.status === "paused" && wash.pause_reason && (
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <Pause className="h-4 w-4" />Paused
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">{wash.pause_reason}</p>
            {wash.paused_by && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                by {wash.paused_by} - {moment(wash.paused_at).fromNow()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {wash.status === "cancelled" && wash.cancel_reason && (
        <Card className="bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />Deleted - excluded from today's totals
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{wash.cancel_reason}</p>
            {wash.cancelled_by && (
              <p className="text-xs text-slate-400 mt-1">
                by {wash.cancelled_by} - {moment(wash.cancelled_at).fromNow()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services Card with Individual Tracking */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              {wash.services?.length > 0 ? (
                <div className="space-y-3">
                  {wash.services.map((service, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          <Badge className={`${serviceStatusColors[service.status || 'pending']} border-0 text-xs`}>
                            {service.status || 'pending'}
                          </Badge>
                        </div>
                        <span className="text-emerald-600 font-semibold">
                          KES {(service.price || 0).toLocaleString()}
                        </span>
                      </div>
                      
                      {service.staff_name && (
                        <p className="text-xs text-slate-500 mb-2">Staff: {service.staff_name}</p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {service.status !== "completed" && wash.status !== "paid" && (
                          <>
                            {service.status !== "in_progress" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleServiceStatusUpdate(index, "in_progress")}
                              >
                                <Play className="h-3 w-3 mr-1" />Start
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleServiceStatusUpdate(index, "completed")}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />Complete
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setPhotoType("after"); setSelectedServiceId(service.service_id); setPhotoDialogOpen(true); }}
                        >
                          <Camera className="h-3 w-3 mr-1" />Photo
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  {wash.discount_amount > 0 && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Discount {wash.discount_reason && `(${wash.discount_reason})`}</span>
                      <span>-KES {wash.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      KES {((wash.amount_due || 0) - (wash.discount_amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No services selected</p>
              )}
            </CardContent>
          </Card>

          {/* Photos Gallery */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-slate-500" />
                Photo Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Before Photos */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Before</h4>
                  <div className="flex flex-wrap gap-2">
                    {wash.photos_before?.map((photo, index) => (
                      <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt={`Before ${index + 1}`} className="w-24 h-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                    {(!wash.photos_before || wash.photos_before.length === 0) && (
                      <p className="text-sm text-slate-400">No before photos</p>
                    )}
                  </div>
                </div>

                {/* After Photos */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">After</h4>
                  <div className="flex flex-wrap gap-2">
                    {wash.photos_after?.map((photo, index) => (
                      <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt={`After ${index + 1}`} className="w-24 h-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                    {(!wash.photos_after || wash.photos_after.length === 0) && (
                      <p className="text-sm text-slate-400">No after photos</p>
                    )}
                  </div>
                </div>

                {/* All Photos with Metadata */}
                {wash.photos_proof?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">All Photo Proof ({wash.photos_proof.length})</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {wash.photos_proof.map((photo, index) => (
                        <div key={index} className="relative group">
                          <a href={photo.url} target="_blank" rel="noopener noreferrer">
                            <img src={photo.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                          </a>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg">
                            <span className="capitalize">{photo.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Damage Notes */}
          {wash.damage_notes && (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Pre-existing Damage Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-700 dark:text-amber-300">{wash.damage_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* General Notes */}
          {wash.notes && (
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400">{wash.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-slate-500" />Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Checked In</p>
                    <p className="text-xs text-slate-500">{moment(wash.entry_time || wash.created_date).format("MMM D, h:mm A")}</p>
                    {wash.checked_in_by && <p className="text-xs text-slate-400">by {wash.checked_in_by}</p>}
                  </div>
                </div>
                {wash.start_time && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Started Washing</p>
                      <p className="text-xs text-slate-500">{moment(wash.start_time).format("MMM D, h:mm A")}</p>
                    </div>
                  </div>
                )}
                {wash.exit_time && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">{wash.status === "paid" ? "Completed & Paid" : "Completed"}</p>
                      <p className="text-xs text-slate-500">{moment(wash.exit_time).format("MMM D, h:mm A")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-slate-500" />Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wash.customer_name && <div><p className="text-sm text-slate-500">Name</p><p className="font-medium">{wash.customer_name}</p></div>}
                {wash.customer_phone && <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{wash.customer_phone}</p></div>}
                {!wash.customer_name && !wash.customer_phone && <p className="text-slate-400">No customer info</p>}
              </div>
            </CardContent>
          </Card>

          {/* Staff & Bay */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wash.assigned_staff_name && <div><p className="text-sm text-slate-500">Primary Staff</p><p className="font-medium">{wash.assigned_staff_name}</p></div>}
                {wash.bay_number && <div><p className="text-sm text-slate-500">Bay</p><Badge variant="outline">Bay {wash.bay_number}</Badge></div>}
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          {payment && (
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-green-500" />Payment</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div><p className="text-sm text-slate-500">Amount</p><p className="text-xl font-bold text-emerald-600">KES {(payment.amount || 0).toLocaleString()}</p></div>
                  <div><p className="text-sm text-slate-500">Method</p><StatusBadge status={payment.method} /></div>
                  {payment.mpesa_receipt && <div><p className="text-sm text-slate-500">M-Pesa Receipt</p><p className="font-mono text-sm">{payment.mpesa_receipt}</p></div>}
                  <div><p className="text-sm text-slate-500">Status</p><StatusBadge status={payment.status} /></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Feedback */}
          {wash.customer_feedback && (
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" />Feedback</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < (wash.customer_feedback.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  ))}
                </div>
                {wash.customer_feedback.comment && <p className="text-sm text-slate-600">{wash.customer_feedback.comment}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Photo Upload Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Photo Proof</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Photo Type</Label>
              <div className="flex gap-2">
                {["before", "during", "after", "damage"].map(type => (
                  <Button
                    key={type}
                    variant={photoType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPhotoType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="photo-upload"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                {uploadingPhoto ? (
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-emerald-600" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600">Click to upload photos</p>
                    <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pause / Delete reason dialog - manager-only, once a job has started */}
      <Dialog open={!!reasonDialog} onOpenChange={(open) => { if (!open) { setReasonDialog(null); setReasonText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog?.action === "pause" ? "Pause this wash" : "Delete this wash"}</DialogTitle>
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

      {/* Payment Dialog */}
      <PaymentDialog
        wash={wash}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        businessId={wash.business_id}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["washPayment", washId] });
        }}
      />
    </div>
  );
}