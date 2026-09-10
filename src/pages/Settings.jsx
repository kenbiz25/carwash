import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PlaceAutocomplete from "@/components/common/PlaceAutocomplete";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Building2,
  Smartphone,
  Bell,
  Save,
  Loader2,
  Users,
  Plus,
  X,
  Crown,
  ShieldCheck,
  CreditCard,
  UserCircle,
  Key,
  Eye,
  EyeOff,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

// Role config: all available roles for team members
const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    color:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Crown,
  },
  manager: {
    label: "Manager",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    icon: ShieldCheck,
  },
  cashier: {
    label: "Cashier",
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: CreditCard,
  },
  staff: {
    label: "Employee",
    color:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300",
    icon: UserCircle,
  },
};

// Migrate old schema (owner_email + admin_emails) into the new members array
function normalizeMembersFromBusiness(biz) {
  if (biz?.members && biz.members.length > 0) return biz.members;

  const members = [];
  if (biz?.owner_email) members.push({ email: biz.owner_email, role: "owner" });

  (biz?.admin_emails || []).forEach((email) => {
    if (!members.find((m) => m.email === email))
      members.push({ email, role: "manager" });
  });

  return members;
}

// basic email validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Generate a token client-side (ok for “invite link” UX) — backend should still validate
function makeInviteToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Settings() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  const [paymentConfig, setPaymentConfig] = useState({
    mpesa: {
      consumer_key: '',
      consumer_secret: '',
      passkey: '',
      callback_url: '',
      environment: 'sandbox',
    },
    stripe: {
      publishable_key: '',
      secret_key: '',
      webhook_secret: '',
      mode: 'test',
    },
    methods: {
      mpesa_enabled: true,
      cash_enabled: true,
      stripe_enabled: false,
      default_method: 'mpesa',
    },
  });

  const [businessForm, setBusinessForm] = useState({
    name: "",
    location: "",
    city: "",
    phone: "",
    bays_count: "",
    description: "",
    mpesa_till: "",
    mpesa_shortcode: "",
    members: [], // [{ email, role }]
    notifications: {
      paymentConfirmations: true,
      carReady: true,
      dailySummary: true,
      lowStockAlerts: true,
    },
  });

  const [newMember, setNewMember] = useState({ email: "", role: "manager" });

  // Snapshot of members loaded from DB (used to detect newly added emails on Save)
  const originalMembersRef = useRef(new Set()); // Set<string> of emails
  const originalBusinessIdRef = useRef(null); // helps avoid snapshot confusion on business switch

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  const { data: business, refetch: refetchBusiness } = useQuery({
    queryKey: ["business", user?.business_id, user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      if (!user?.business_id) {
        const businesses = await api.entities.Business.filter({
          created_by: user.email,
        });
        return businesses[0] || null;
      }
      const businesses = await api.entities.Business.filter({ id: user.business_id });
      return businesses[0] || null;
    },
  });

  useEffect(() => {
    if (business) {
      const members = normalizeMembersFromBusiness(business);

      setBusinessForm({
        name: business.name || "",
        location: business.location || "",
        city: business.city || "",
        phone: business.phone || "",
        bays_count: business.bays_count?.toString?.() || "",
        description: business.description || "",
        mpesa_till: business.mpesa_till || "",
        mpesa_shortcode: business.mpesa_shortcode || "",
        members,
        notifications: business.notifications || {
          paymentConfirmations: true,
          carReady: true,
          dailySummary: true,
          lowStockAlerts: true,
        },
      });

      // Only refresh the snapshot if we are looking at a new/changed business record
      if (originalBusinessIdRef.current !== business.id) {
        originalBusinessIdRef.current = business.id;
        originalMembersRef.current = new Set(members.map((m) => m.email));
      }

      // Load saved payment config if it exists
      if (business.payment_config) {
        setPaymentConfig((prev) => ({
          mpesa: { ...prev.mpesa, ...(business.payment_config.mpesa || {}) },
          stripe: { ...prev.stripe, ...(business.payment_config.stripe || {}) },
          methods: { ...prev.methods, ...(business.payment_config.methods || {}) },
        }));
      }
    } else if (user?.email) {
      // New business: pre-populate current user as owner
      const defaultMembers = [{ email: user.email, role: "owner" }];

      setBusinessForm((prev) => ({
        ...prev,
        members: defaultMembers,
      }));

      // snapshot: only owner at start
      originalBusinessIdRef.current = null;
      originalMembersRef.current = new Set(defaultMembers.map((m) => m.email));
    }
  }, [business, user]);

  // ✅ Determine role reliably, then navigate away after saving
  const getMyRole = () => {
    const email = user?.email?.toLowerCase();
    if (!email) return user?.user_role || user?.role || "staff";

    return (
      user?.user_role ||
      businessForm.members.find((m) => m.email?.toLowerCase() === email)?.role ||
      user?.role ||
      "staff"
    );
  };

  const navigateToDesignatedPage = () => {
    const role = getMyRole();

    // If you ever use platform admin routes
    if (role === "admin") {
      navigate(createPageUrl("SuperAdminDashboard"));
      return;
    }

    // Business operators
    if (role === "owner" || role === "manager") {
      navigate(createPageUrl("BusinessManager"));
      return;
    }

    // Default for staff/cashier/etc.
    navigate(createPageUrl("Dashboard"));
  };

  const handleAddMember = () => {
    const email = newMember.email.trim().toLowerCase();

    if (!email) {
      toast.error("Enter an email address");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (businessForm.members.find((m) => m.email === email)) {
      toast.error("This person is already in the team");
      return;
    }

    setBusinessForm((prev) => ({
      ...prev,
      members: [...prev.members, { email, role: newMember.role }],
    }));

    setNewMember({ email: "", role: "manager" });
  };

  const handleRemoveMember = (email) => {
    const owners = businessForm.members.filter((m) => m.role === "owner");
    const memberToRemove = businessForm.members.find((m) => m.email === email);

    if (memberToRemove?.role === "owner" && owners.length <= 1) {
      toast.error("Cannot remove the only owner");
      return;
    }

    setBusinessForm((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.email !== email),
    }));
  };

  const handleChangeMemberRole = (email, newRole) => {
    const owners = businessForm.members.filter((m) => m.role === "owner");
    const member = businessForm.members.find((m) => m.email === email);

    if (member?.role === "owner" && newRole !== "owner" && owners.length <= 1) {
      toast.error("Cannot remove the only owner. Add another owner first.");
      return;
    }

    setBusinessForm((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.email === email ? { ...m, role: newRole } : m
      ),
    }));
  };

  /**
   * Invite newly added emails.
   * Strategy:
   *  - detect new emails vs originalMembersRef snapshot
   *  - call one of your api methods:
   *      1) api.invites.sendBusinessInvites
   *      2) api.entities.BusinessInvite.create (for each)
   *      3) api.functions.sendBusinessInvites
   */
  const inviteNewMembers = async ({ businessId, businessName }) => {
    const inviterEmail = user?.email;
    if (!inviterEmail) return;

    const currentEmails = businessForm.members.map((m) => m.email);
    const originalEmails = originalMembersRef.current || new Set();

    // New emails added since last DB snapshot
    const newEmails = currentEmails.filter(
      (email) => !originalEmails.has(email) && email !== inviterEmail
    );

    if (newEmails.length === 0) return;

    // Build invite payload
    const invites = newEmails.map((email) => {
      const member = businessForm.members.find((m) => m.email === email);
      return {
        email,
        role: member?.role || "staff",
        business_id: businessId,
        business_name: businessName || "",
        invited_by: inviterEmail,
        token: makeInviteToken(),
        status: "pending",
        created_at: new Date().toISOString(),
      };
    });

    // Try preferred methods in order
    try {
      if (api?.invites?.sendBusinessInvites) {
        await api.invites.sendBusinessInvites({
          businessId,
          businessName,
          inviterEmail,
          invites,
        });
      } else if (api?.functions?.sendBusinessInvites) {
        await api.functions.sendBusinessInvites({
          businessId,
          businessName,
          inviterEmail,
          invites,
        });
      } else if (api?.entities?.BusinessInvite?.create) {
        // Create invite documents (backend function can send email onCreate)
        for (const inv of invites) {
          await api.entities.BusinessInvite.create(inv);
        }
      } else {
        // No invite mechanism wired
        console.warn(
          "[Settings] No invite method found. Wire one of: api.invites.sendBusinessInvites | api.functions.sendBusinessInvites | api.entities.BusinessInvite.create",
          invites
        );
        toast.message("Saved, but invite sending is not wired yet (see console).");
        return;
      }

      toast.success(`Invites sent to: ${newEmails.join(", ")}`);
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error("Business saved, but invites failed: " + msg);
    }
  };

  const handleSaveBusiness = async () => {
    if (!businessForm.name?.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (!user?.email) {
      toast.error("Could not read your account email — please sign out and back in.");
      return;
    }

    // Validate member emails before saving
    for (const m of businessForm.members) {
      if (!m?.email || !isValidEmail(m.email)) {
        toast.error(`Invalid team email: ${m?.email || "(empty)"}`);
        return;
      }
    }

    setSaving(true);

    try {
      // Derive backward-compat fields from members
      const ownerEmails = businessForm.members
        .filter((m) => m.role === "owner")
        .map((m) => m.email);

      const adminEmails = businessForm.members
        .filter((m) => m.role === "manager")
        .map((m) => m.email);

      const payload = {
        name: businessForm.name,
        location: businessForm.location,
        city: businessForm.city,
        phone: businessForm.phone,
        bays_count: businessForm.bays_count
          ? Number.parseInt(businessForm.bays_count, 10) || null
          : null,
        description: businessForm.description,
        mpesa_till: businessForm.mpesa_till,
        mpesa_shortcode: businessForm.mpesa_shortcode,
        members: businessForm.members,
        // flat array for Firestore array-contains queries (used by useUserBusinesses)
        member_emails: businessForm.members.map((m) => m.email.toLowerCase()),
        notifications: businessForm.notifications,

        // backward compat
        admin_emails: adminEmails,
        owner_email: ownerEmails[0] || user.email,
      };

      if (business) {
        await api.entities.Business.update(business.id, payload);

        // Send invites AFTER successful update
        await inviteNewMembers({
          businessId: business.id,
          businessName: payload.name,
        });

        // Update snapshot (so we don’t re-invite on next save)
        originalMembersRef.current = new Set(
          businessForm.members.map((m) => m.email)
        );

        toast.success("Settings saved! Redirecting…");

        // ✅ leave settings after successful update
        setTimeout(() => navigateToDesignatedPage(), 400);
      } else {
        // Ensure creator is in members as owner
        let members = businessForm.members;
        if (!members.find((m) => m.email === user.email)) {
          members = [{ email: user.email, role: "owner" }, ...members];
        }

        const newBusiness = await api.entities.Business.create({
          ...payload,
          members,
          owner_email: user.email,
          created_by: user.email,
          is_active: true,
          subscription_plan: "free",
        });

        await api.auth.updateMe({
          business_id: newBusiness.id,
          user_role: "owner",
        });

        // Send invites AFTER successful create
        await inviteNewMembers({
          businessId: newBusiness.id,
          businessName: payload.name,
        });

        // Update snapshot
        originalBusinessIdRef.current = newBusiness.id;
        originalMembersRef.current = new Set(members.map((m) => m.email));

        refetchUser();

        toast.success("Business created! Redirecting…");

        // ✅ leave settings after successful create
        setTimeout(() => navigateToDesignatedPage(), 500);
        return;
      }
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error("Failed to save: " + msg);
    } finally {
      setSaving(false);
      refetchBusiness();
    }
  };

  const handleSavePaymentConfig = async () => {
    if (!business?.id) {
      toast.error('Save your business details first');
      return;
    }
    setSavingPayment(true);
    try {
      await api.entities.Business.update(business.id, {
        payment_config: paymentConfig,
      });
      toast.success('Payment configuration saved');
    } catch (err) {
      toast.error('Failed to save: ' + (err?.message || err));
    } finally {
      setSavingPayment(false);
    }
  };

  const toggleSecret = (key) =>
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your car wash business settings
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="business">
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="mpesa">
            <Smartphone className="h-4 w-4 mr-2" />
            M-Pesa
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* ── Business Settings ─────────────────────────────── */}
        <TabsContent value="business">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Set up your car wash details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="e.g., Premium Auto Spa"
                    value={businessForm.name}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="07XX XXX XXX"
                    value={businessForm.phone}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location / Address</Label>
                  <PlaceAutocomplete
                    value={businessForm.location}
                    onChange={(val) =>
                      setBusinessForm({ ...businessForm, location: val })
                    }
                    placeholder="Search for address in Kenya…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g., Nairobi"
                    value={businessForm.city}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Wash Bays</Label>
                <Input
                  type="number"
                  placeholder="3"
                  value={businessForm.bays_count}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      bays_count: e.target.value,
                    })
                  }
                  className="max-w-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Tell customers about your car wash..."
                  value={businessForm.description}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSaveBusiness}
                className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team Members ──────────────────────────────────── */}
        <TabsContent value="team">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Team Members & Roles</CardTitle>
              <CardDescription>
                Add owners, managers, cashiers, and employees. Each role controls
                what they can see and do in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <div
                    key={key}
                    className={`rounded-lg border px-3 py-2 text-xs ${cfg.color}`}
                  >
                    <p className="font-semibold">{cfg.label}</p>
                    <p className="opacity-80 mt-0.5">
                      {key === "owner" && "Full access, all reports"}
                      {key === "manager" && "Staff, services, reports"}
                      {key === "cashier" && "Payments & check-ins"}
                      {key === "staff" && "Wash operations only"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add member form */}
              <div className="space-y-2">
                <Label>Add Team Member</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    className="flex-1"
                  />
                  <Select
                    value={newMember.role}
                    onValueChange={(val) =>
                      setNewMember((prev) => ({ ...prev, role: val }))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Members list */}
              <div className="space-y-2">
                <Label>Current Team ({businessForm.members.length})</Label>
                {businessForm.members.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No team members yet. Add one above.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {businessForm.members.map((member) => {
                      const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;
                      const isCurrentUser = member.email === user?.email;

                      return (
                        <div
                          key={member.email}
                          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                        >
                          {/* Avatar initial */}
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {member.email[0].toUpperCase()}
                            </span>
                          </div>

                          {/* Email */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {member.email}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-slate-400 font-normal">
                                  (You)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Role selector */}
                          <Select
                            value={member.role}
                            onValueChange={(val) =>
                              handleChangeMemberRole(member.email, val)
                            }
                          >
                            <SelectTrigger className={`w-28 h-7 text-xs border ${cfg.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_CONFIG).map(([key, c]) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Remove button */}
                          <button
                            onClick={() => handleRemoveMember(member.email)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                            title="Remove member"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveBusiness}
                className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Team Settings (Invites will send)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── M-Pesa Settings ───────────────────────────────── */}
        <TabsContent value="mpesa">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-green-600" />
                </div>
                M-Pesa Integration
              </CardTitle>
              <CardDescription>
                Configure Safaricom Daraja API for STK Push payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Production Integration
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Full M-Pesa integration requires backend functions and Daraja API
                  credentials. Contact support for enterprise setup.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>M-Pesa Till Number</Label>
                  <Input
                    placeholder="e.g., 123456"
                    value={businessForm.mpesa_till}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        mpesa_till: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Your Lipa na M-Pesa Buy Goods till number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Shortcode</Label>
                  <Input
                    placeholder="e.g., 174379"
                    value={businessForm.mpesa_shortcode}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        mpesa_shortcode: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    For STK Push (Paybill or Till shortcode)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">API Credentials (For Production)</h4>
                <p className="text-sm text-slate-500">
                  These are stored securely — contact support to configure:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                  <li>Consumer Key</li>
                  <li>Consumer Secret</li>
                  <li>Passkey</li>
                  <li>Callback URL</li>
                </ul>
              </div>

              <Button
                onClick={handleSaveBusiness}
                className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save M-Pesa Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments Configuration ────────────────────────── */}
        <TabsContent value="payments" className="space-y-6">

          {/* M-Pesa Daraja API */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-green-600" />
                </div>
                M-Pesa Daraja API
              </CardTitle>
              <CardDescription>
                STK Push credentials from{" "}
                <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer" className="text-brand-blue-mid underline">
                  developer.safaricom.co.ke
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
                <Key className="h-4 w-4 inline mr-1" />
                These credentials are stored in your business record. For production, migrate secrets to Cloud Functions environment variables.
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'consumer_key',    label: 'Consumer Key',    secret: true  },
                  { key: 'consumer_secret', label: 'Consumer Secret', secret: true  },
                  { key: 'passkey',         label: 'Passkey',         secret: true  },
                  { key: 'callback_url',    label: 'Callback URL',    secret: false },
                ].map(({ key, label, secret }) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <div className="relative">
                      <Input
                        type={secret && !showSecrets[`mpesa_${key}`] ? 'password' : 'text'}
                        placeholder={key === 'callback_url' ? 'https://your-domain.com/mpesa/callback' : `Enter ${label}`}
                        value={paymentConfig.mpesa[key]}
                        onChange={(e) => setPaymentConfig((p) => ({ ...p, mpesa: { ...p.mpesa, [key]: e.target.value } }))}
                        className={secret ? 'pr-10' : ''}
                      />
                      {secret && (
                        <button type="button" onClick={() => toggleSecret(`mpesa_${key}`)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                          {showSecrets[`mpesa_${key}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 max-w-xs">
                <Label>Environment</Label>
                <Select
                  value={paymentConfig.mpesa.environment}
                  onValueChange={(v) => setPaymentConfig((p) => ({ ...p, mpesa: { ...p.mpesa, environment: v } }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stripe */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-violet-600" />
                </div>
                Stripe
              </CardTitle>
              <CardDescription>Card payment credentials from your Stripe dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                Secret key is sensitive. In production, store it only in Cloud Functions environment variables — never expose it to the browser.
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'publishable_key', label: 'Publishable Key (pk_…)',   secret: false },
                  { key: 'secret_key',      label: 'Secret Key (sk_…)',        secret: true  },
                  { key: 'webhook_secret',  label: 'Webhook Secret (whsec_…)', secret: true  },
                ].map(({ key, label, secret }) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <div className="relative">
                      <Input
                        type={secret && !showSecrets[`stripe_${key}`] ? 'password' : 'text'}
                        placeholder={`Enter ${label}`}
                        value={paymentConfig.stripe[key]}
                        onChange={(e) => setPaymentConfig((p) => ({ ...p, stripe: { ...p.stripe, [key]: e.target.value } }))}
                        className={secret ? 'pr-10' : ''}
                      />
                      {secret && (
                        <button type="button" onClick={() => toggleSecret(`stripe_${key}`)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                          {showSecrets[`stripe_${key}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 max-w-xs">
                <Label>Mode</Label>
                <Select
                  value={paymentConfig.stripe.mode}
                  onValueChange={(v) => setPaymentConfig((p) => ({ ...p, stripe: { ...p.stripe, mode: v } }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Enable or disable methods available at checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'mpesa_enabled',  label: 'M-Pesa',  desc: 'Lipa na M-Pesa (STK Push or Till)'   },
                { key: 'cash_enabled',   label: 'Cash',    desc: 'Accept physical cash payments'        },
                { key: 'stripe_enabled', label: 'Stripe',  desc: 'Card payments via Stripe'             },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                  <Switch
                    checked={!!paymentConfig.methods[key]}
                    onCheckedChange={(v) => setPaymentConfig((p) => ({ ...p, methods: { ...p.methods, [key]: v } }))}
                  />
                </div>
              ))}

              <div className="space-y-1 max-w-xs">
                <Label>Default Payment Method</Label>
                <Select
                  value={paymentConfig.methods.default_method}
                  onValueChange={(v) => setPaymentConfig((p) => ({ ...p, methods: { ...p.methods, default_method: v } }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSavePaymentConfig}
            disabled={savingPayment}
            className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
          >
            {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Payment Configuration
          </Button>
        </TabsContent>

        {/* ── Notifications Settings ────────────────────────── */}
        <TabsContent value="notifications">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure SMS, WhatsApp, and email notifications
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  {
                    key: "paymentConfirmations",
                    label: "Payment Confirmations",
                    desc: "Send SMS when payment is received",
                  },
                  {
                    key: "carReady",
                    label: "Car Ready Notifications",
                    desc: "Notify customer when their car is done",
                  },
                  {
                    key: "dailySummary",
                    label: "Daily Summary",
                    desc: "Send daily revenue report to owner",
                  },
                  {
                    key: "lowStockAlerts",
                    label: "Low Stock Alerts",
                    desc: "Alert when inventory items are low",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>

                    <Switch
                      checked={!!businessForm.notifications?.[item.key]}
                      onCheckedChange={(v) =>
                        setBusinessForm((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            [item.key]: v,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  SMS & WhatsApp Integration
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  SMS notifications require Africa's Talking or Twilio integration.
                  WhatsApp Business API can be configured for automated messages.
                </p>
              </div>

              <Button
                onClick={handleSaveBusiness}
                className="bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}