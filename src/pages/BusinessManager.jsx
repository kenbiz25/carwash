import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/api/firebaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlaceAutocomplete from "@/components/common/PlaceAutocomplete";
import BranchPhotoEditor from "@/components/common/BranchPhotoEditor";
import { createTeamUser, listBusinessUsers, resetTeamUserPassword, deleteTeamUser } from "@/lib/userAdminClient";
import {
  Building2,
  Phone,
  MapPin,
  Users,
  Save,
  Loader2,
  Plus,
  X,
  Crown,
  ShieldCheck,
  CreditCard,
  UserCircle,
  Car,
  Settings,
  CheckCircle,
  AlertCircle,
  Mail,
  Trash2,
} from "@/lib/icons";
import { toast } from "sonner";

const ROLE_CONFIG = {
  owner:   { label: "Owner",    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",           icon: Crown },
  manager: { label: "Manager",  color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",               icon: ShieldCheck },
  cashier: { label: "Cashier",  color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CreditCard },
  staff:   { label: "Employee", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300",             icon: UserCircle },
};

function normalizeMembersFromBusiness(biz) {
  if (biz.members && biz.members.length > 0) return biz.members;
  const members = [];
  if (biz.owner_email) members.push({ email: biz.owner_email, role: "owner" });
  (biz.admin_emails || []).forEach(email => {
    if (!members.find(m => m.email === email)) members.push({ email, role: "manager" });
  });
  return members;
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-navy-50 to-brand-blue-pale/40 dark:from-brand-navy-mid/40 dark:to-brand-blue-mid/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-brand-blue-mid dark:text-brand-blue-light" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{value || "-"}</p>
      </div>
    </div>
  );
}

export default function BusinessManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("info");

  // Primary business form state
  const [form, setForm] = useState({
    name: "", location: "", city: "", phone: "",
    bays_count: "", description: "", hours: "",
    latitude: null, longitude: null, photos: [],
    mpesa_till: "", mpesa_shortcode: "",
    members: [],
  });
  const [newMember, setNewMember] = useState({ email: "", role: "manager" });

  // My Locations state (creating a new one now lives on its own page, see
  // CreateBusiness.jsx - this only lists/edits locations that already exist)
  const [editingLocation, setEditingLocation] = useState(null);
  const [editLocForm, setEditLocForm] = useState({});
  const [savingLocation, setSavingLocation] = useState(false);
  const [changeManagerBiz, setChangeManagerBiz] = useState(null);
  const [newManagerEmail, setNewManagerEmail] = useState("");

  // Direct staff logins (username + password, created here rather than via
  // an email invite link) - backed by user-admin-server / Firebase custom
  // claims, so they work the moment that person signs in on any device.
  const [newLogin, setNewLogin] = useState({ full_name: "", loginMethod: "username", identifier: "", password: "", role: "staff" });
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [resetPasswordFor, setResetPasswordFor] = useState(null); // { uid, label } | null
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingLoginUid, setDeletingLoginUid] = useState(null);

  // The business being edited/managed here is whichever one the Sidebar's
  // branch switcher currently shows - not an independently-resolved "primary"
  // business. Using a different resolution here (this used to fall back to
  // user.business_id, or an arbitrary created_by match) meant an owner could
  // send a team invite while looking at "Kayole" in the switcher and have it
  // silently stamped with a different branch's id.
  const { user, currentBusiness: business } = useBusiness();

  // All owned locations
  const { data: allLocations = [], isLoading: locationsLoading, refetch: refetchLocations } = useQuery({
    queryKey: ["my-locations", user?.email],
    queryFn: () => api.entities.Business.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  // Creating a brand-new business is a super-admin-only action now (see
  // CreateBusiness.jsx) - an owner/manager here can still edit an existing
  // location's own info and manage its team. Owners also carry full
  // super-admin rights platform-wide, not just for their own branch.
  const isSuperAdmin =
    user?.role === "admin" || user?.user_role === "admin" ||
    user?.role === "owner" || user?.user_role === "owner";
  const isOwner = allLocations.some(loc => loc.owner_email === user?.email)
    || business?.owner_email === user?.email
    || (business?.members || []).some(m => m.email === user?.email && m.role === "owner");
  const isManager = (business?.members || []).some(m => m.email === user?.email && m.role === "manager");
  const canCreateLogins = isSuperAdmin || isOwner || isManager;

  const { data: businessLogins = [], refetch: refetchLogins, isError: loginsErrored, error: loginsError } = useQuery({
    queryKey: ["business-logins", business?.id],
    queryFn: () => listBusinessUsers(business.id),
    enabled: !!business?.id && canCreateLogins,
    retry: false,
  });

  useEffect(() => {
    if (business) {
      setForm({
        name:            business.name || "",
        location:        business.location || "",
        city:            business.city || "",
        phone:           business.phone || "",
        bays_count:      business.bays_count || "",
        description:     business.description || "",
        hours:           business.hours || "",
        latitude:        business.latitude ?? null,
        longitude:       business.longitude ?? null,
        photos:          business.photos || [],
        mpesa_till:      business.mpesa_till || "",
        mpesa_shortcode: business.mpesa_shortcode || "",
        members:         normalizeMembersFromBusiness(business),
      });
    }
  }, [business]);

  // ── Team helpers ─────────────────────────────────────────────────
  const handleAddMember = () => {
    const email = newMember.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address"); return;
    }
    if (form.members.find(m => m.email === email)) {
      toast.error("Already in the team"); return;
    }
    setForm(prev => ({ ...prev, members: [...prev.members, { email, role: newMember.role }] }));
    setNewMember({ email: "", role: "manager" });
  };

  const handleRemoveMember = (email) => {
    const owners = form.members.filter(m => m.role === "owner");
    const target = form.members.find(m => m.email === email);
    if (target?.role === "owner" && owners.length <= 1) {
      toast.error("Cannot remove the only owner"); return;
    }
    setForm(prev => ({ ...prev, members: prev.members.filter(m => m.email !== email) }));
  };

  const handleChangeRole = (email, newRole) => {
    const owners = form.members.filter(m => m.role === "owner");
    const member = form.members.find(m => m.email === email);
    if (member?.role === "owner" && newRole !== "owner" && owners.length <= 1) {
      toast.error("Add another owner before changing this role"); return;
    }
    setForm(prev => ({
      ...prev,
      members: prev.members.map(m => m.email === email ? { ...m, role: newRole } : m),
    }));
  };

  // ── Send Invitation Email ─────────────────────────────────────────
  const [sendingInviteFor, setSendingInviteFor] = useState(null);
  const handleSendInvite = async (memberEmail, memberRole) => {
    if (!business?.id) { toast.error("Save the business first"); return; }
    setSendingInviteFor(memberEmail);
    try {
      const token = crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36));
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await api.entities.Invitation.create({
        business_id: business.id,
        business_name: business.name,
        email: memberEmail,
        role: memberRole,
        token,
        invited_by_email: user?.email || '',
        status: 'pending',
        expires_date: expires,
        email_sent: false,
      });
      const inviteUrl = `${window.location.origin}/JoinBusiness?token=${token}`;
      // No email backend while running locally - copy the invite link so it can be shared manually.
      await navigator.clipboard?.writeText(inviteUrl).catch(() => {});
      toast.success(`Invite link for ${memberEmail} copied to clipboard`, {
        description: inviteUrl,
      });
    } catch (err) {
      toast.error("Failed to create invite: " + (err?.message || err));
    } finally {
      setSendingInviteFor(null);
    }
  };

  // ── Create a direct staff login (username, phone, or email + password) ──
  const handleCreateLogin = async () => {
    if (!business?.id) { toast.error("Save the business first"); return; }
    const identifier = newLogin.identifier.trim();
    const isPhone = newLogin.loginMethod === "phone";
    const isEmail = newLogin.loginMethod === "email";
    if (!identifier) {
      toast.error(isPhone ? "Enter a phone number" : isEmail ? "Enter an email address" : "Enter a username"); return;
    }
    if (!newLogin.password || newLogin.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    setCreatingLogin(true);
    try {
      await createTeamUser({
        ...(isPhone ? { phone: identifier } : isEmail ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() }),
        password: newLogin.password,
        full_name: newLogin.full_name.trim() || identifier,
        role: newLogin.role,
        business_id: business.id,
      });
      const methodLabel = isPhone ? "phone number" : isEmail ? "email" : "username";
      toast.success(`Login created for "${identifier}" - share the ${methodLabel} and password with them directly.`);
      setNewLogin({ full_name: "", loginMethod: newLogin.loginMethod, identifier: "", password: "", role: "staff" });
      refetchLogins();
    } catch (err) {
      toast.error(err?.message || "Failed to create login");
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordFor || !resetPasswordValue || resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    setResettingPassword(true);
    try {
      await resetTeamUserPassword(resetPasswordFor.uid, resetPasswordValue);
      toast.success(`Password reset for ${resetPasswordFor.label}`);
      setResetPasswordFor(null);
      setResetPasswordValue("");
    } catch (err) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteLogin = async (u, label) => {
    if (!confirm(`Permanently delete the login for ${label}? They will no longer be able to sign in, and this can't be undone.`)) return;
    setDeletingLoginUid(u.uid);
    try {
      await deleteTeamUser(u.uid);
      toast.success(`Login deleted for ${label}`);
      refetchLogins();
    } catch (err) {
      toast.error(err?.message || "Failed to delete login");
    } finally {
      setDeletingLoginUid(null);
    }
  };

  // ── Save primary business ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name) { toast.error("Business name is required"); return; }
    if (!business) { toast.error("No business found. Complete initial setup in Settings first."); return; }

    setSaving(true);
    try {
      const ownerEmails = form.members.filter(m => m.role === "owner").map(m => m.email.toLowerCase());
      const adminEmails = form.members.filter(m => m.role === "manager").map(m => m.email);

      await api.entities.Business.update(business.id, {
        name:            form.name,
        location:        form.location,
        city:            form.city,
        phone:           form.phone,
        bays_count:      form.bays_count ? parseInt(form.bays_count) : business.bays_count,
        description:     form.description,
        hours:           form.hours,
        latitude:        form.latitude,
        longitude:       form.longitude,
        photos:          form.photos,
        mpesa_till:      form.mpesa_till,
        mpesa_shortcode: form.mpesa_shortcode,
        members:         form.members,
        member_emails:   form.members.map(m => m.email.toLowerCase()),
        admin_emails:    adminEmails,
        owner_email:     ownerEmails[0] || business.owner_email,
      });
      toast.success("Business updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["userBusinesses"] });
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── My Locations handlers ─────────────────────────────────────────
  const openEditLocation = (loc) => {
    setEditingLocation(loc);
    setEditLocForm({
      name: loc.name || "",
      location: loc.location || "",
      city: loc.city || "",
      phone: loc.phone || "",
      description: loc.description || "",
      hours: loc.hours || "",
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
      photos: loc.photos || [],
      bays_count: String(loc.bays_count || ""),
    });
  };

  const handleSaveLocation = async () => {
    if (!editingLocation) return;
    setSavingLocation(true);
    try {
      await api.entities.Business.update(editingLocation.id, {
        name:        editLocForm.name,
        location:    editLocForm.location,
        city:        editLocForm.city,
        phone:       editLocForm.phone,
        description: editLocForm.description,
        hours:       editLocForm.hours,
        latitude:    editLocForm.latitude,
        longitude:   editLocForm.longitude,
        photos:      editLocForm.photos,
        bays_count:  editLocForm.bays_count ? parseInt(editLocForm.bays_count) : editingLocation.bays_count,
      });
      toast.success("Location updated!");
      setEditingLocation(null);
      refetchLocations();
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
    setSavingLocation(false);
  };

  const openChangeManager = (loc) => {
    setChangeManagerBiz(loc);
    const current = loc.members?.find(m => m.role === "manager");
    setNewManagerEmail(current?.email || "");
  };

  const handleChangeManager = async () => {
    const email = newManagerEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email"); return;
    }
    try {
      const existing = changeManagerBiz.members || [];
      const updated = existing
        .filter(m => m.role !== "manager")
        .concat({ email, role: "manager" });
      await api.entities.Business.update(changeManagerBiz.id, {
        members:       updated,
        member_emails: updated.map(m => m.email.toLowerCase()),
      });
      toast.success("Manager updated!");
      setChangeManagerBiz(null);
      setNewManagerEmail("");
      refetchLocations();
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
  };

  const sections = [
    { id: "info",      label: "Business Info",  icon: Building2 },
    { id: "team",      label: "Team",           icon: Users },
    { id: "mpesa",     label: "M-Pesa",         icon: Phone },
    { id: "locations", label: "My Locations",   icon: MapPin },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {business?.name || "My Business"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {business?.location ? `${business.location}${business.city ? ", " + business.city : ""}` : "Location not set"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Settings"))}
          >
            <Settings className="h-4 w-4 mr-2" />
            Full Settings
          </Button>
          {activeSection !== "locations" && (
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="gradient"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {business && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Building2} label="Business Name"  value={business.name} />
          <StatCard icon={Car}       label="Wash Bays"      value={business.bays_count} />
          <StatCard icon={Phone}     label="Phone"          value={business.phone} />
          <StatCard icon={Users}     label="Team Members"   value={form.members.length} />
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === s.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
            {s.id === "locations" && allLocations.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {allLocations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Business Info ─────────────────────────────────── */}
      {activeSection === "info" && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Update your car wash profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Premium Auto Spa"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="07XX XXX XXX"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Address</Label>
                <PlaceAutocomplete
                  value={form.location}
                  onChange={(val) => setForm({ ...form, location: val })}
                  onPlaceSelect={({ lat, lng }) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                  placeholder="Search for address…"
                />
                <p className="text-xs text-slate-400">
                  {form.latitude && form.longitude ? (
                    <>📍 Pinned ({form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}) - shows on the branch's public
                      page map.{" "}
                      <button type="button" className="underline hover:text-slate-600" onClick={() => setForm((f) => ({ ...f, latitude: null, longitude: null }))}>
                        Clear pin
                      </button>
                    </>
                  ) : (
                    "Pick a suggestion from the dropdown to drop a map pin - typing alone won't set one."
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g., Nairobi"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Wash Bays</Label>
                <Input
                  type="number"
                  value={form.bays_count}
                  onChange={(e) => setForm({ ...form, bays_count: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <Input
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="Open 24 hours, 7 days a week"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell customers about your car wash - services, specialties, hours…"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <BranchPhotoEditor photos={form.photos} onChange={(photos) => setForm((f) => ({ ...f, photos }))} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Team Members ─────────────────────────────────── */}
      {activeSection === "team" && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Team Members &amp; Roles</CardTitle>
            <CardDescription>
              Manage who can sign in to this business and what they can do. Looking to track
              commission rates or schedules instead? See Staff & Commissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${cfg.color}`}>
                  <p className="font-semibold">{cfg.label}</p>
                  <p className="opacity-75 mt-0.5 leading-relaxed">
                    {key === "owner"   && "Full access, all settings"}
                    {key === "manager" && "Staff, services, reports"}
                    {key === "cashier" && "Payments & check-ins"}
                    {key === "staff"   && "Wash operations only"}
                  </p>
                </div>
              ))}
            </div>

            {/* Add member */}
            <div className="space-y-2">
              <Label>Add Team Member</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember(p => ({ ...p, email: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  className="flex-1"
                />
                <Select
                  value={newMember.role}
                  onValueChange={(val) => setNewMember(p => ({ ...p, role: val }))}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
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
              <Label>Current Team ({form.members.length})</Label>
              {form.members.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No team members added yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {form.members.map((member) => {
                    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;
                    const isCurrentUser = member.email === user?.email;
                    return (
                      <div key={member.email} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-navy to-brand-blue-mid flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                          {member.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {member.email}
                            {isCurrentUser && <span className="ml-2 text-xs text-slate-400 font-normal">(You)</span>}
                          </p>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleChangeRole(member.email, val)}
                        >
                          <SelectTrigger className={`w-28 h-7 text-xs border ${cfg.color}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG).map(([key, c]) => (
                              <SelectItem key={key} value={key} className="text-xs">{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleSendInvite(member.email, member.role)}
                            disabled={sendingInviteFor === member.email}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-blue-mid hover:bg-brand-blue-mid/10 transition-colors disabled:opacity-50"
                            title={`Send invite link for ${member.email}`}
                          >
                            {sendingInviteFor === member.email
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Mail className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.email)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Direct staff logins (username + password) ──────── */}
      {activeSection === "team" && canCreateLogins && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Staff Logins</CardTitle>
            <CardDescription>
              Create a username or phone number, plus a password, for staff directly - no
              email or invite link needed. They can sign in with it from any device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loginsErrored && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{loginsError?.message || "Couldn't load staff logins."}</span>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={newLogin.full_name}
                  onChange={(e) => setNewLogin(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Jane Wanjiru"
                />
              </div>
              <div className="space-y-2">
                <Label>Login Method</Label>
                <Select
                  value={newLogin.loginMethod}
                  onValueChange={(val) => setNewLogin(p => ({ ...p, loginMethod: val, identifier: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">Username</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{newLogin.loginMethod === "phone" ? "Phone Number" : newLogin.loginMethod === "email" ? "Email" : "Username"}</Label>
                <Input
                  value={newLogin.identifier}
                  onChange={(e) => setNewLogin(p => ({ ...p, identifier: e.target.value }))}
                  placeholder={newLogin.loginMethod === "phone" ? "0757 234 111" : newLogin.loginMethod === "email" ? "jane@example.com" : "jane.w"}
                  type={newLogin.loginMethod === "phone" ? "tel" : newLogin.loginMethod === "email" ? "email" : "text"}
                  autoCapitalize="none"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="text"
                  value={newLogin.password}
                  onChange={(e) => setNewLogin(p => ({ ...p, password: e.target.value }))}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newLogin.role}
                  onValueChange={(val) => setNewLogin(p => ({ ...p, role: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).filter(([key]) => key !== "owner" || isSuperAdmin || isOwner).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateLogin} disabled={creatingLogin}>
              {creatingLogin ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {creatingLogin ? "Creating…" : "Create Login"}
            </Button>

            {businessLogins.length > 0 && (
              <div className="space-y-2">
                <Label>Logins for this branch ({businessLogins.length})</Label>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {businessLogins.map((u) => {
                    const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff;
                    const label = u.username || u.phone || u.email;
                    const methodTag = u.phone ? "Phone" : u.username ? "Username" : "Email";
                    return (
                      <div key={u.uid} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-blue-mid to-brand-blue-light flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                          {label[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {u.full_name || label}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{methodTag}: {label}</p>
                        </div>
                        <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                        <button
                          onClick={() => { setResetPasswordFor({ uid: u.uid, label }); setResetPasswordValue(""); }}
                          className="h-7 px-2 flex items-center justify-center rounded-lg text-xs text-slate-500 hover:text-brand-blue-mid hover:bg-brand-blue-mid/10 transition-colors"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => handleDeleteLogin(u, u.full_name || label)}
                          disabled={deletingLoginUid === u.uid}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Delete login"
                        >
                          {deletingLoginUid === u.uid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!import.meta.env.VITE_USER_ADMIN_API_URL && (
              <p className="text-xs text-slate-400">
                Uses the user-admin-server backend (see its README) - run it locally with
                <code className="mx-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">npm run dev</code>
                inside <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700">user-admin-server/</code>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── M-Pesa ───────────────────────────────────────── */}
      {activeSection === "mpesa" && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>M-Pesa Settings</CardTitle>
            <CardDescription>Configure your M-Pesa Till / Paybill details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>M-Pesa Till Number</Label>
                <Input
                  value={form.mpesa_till}
                  onChange={(e) => setForm({ ...form, mpesa_till: e.target.value })}
                  placeholder="e.g., 123456"
                />
                <p className="text-xs text-slate-500">Lipa na M-Pesa Buy Goods till</p>
              </div>
              <div className="space-y-2">
                <Label>M-Pesa Shortcode</Label>
                <Input
                  value={form.mpesa_shortcode}
                  onChange={(e) => setForm({ ...form, mpesa_shortcode: e.target.value })}
                  placeholder="e.g., 174379"
                />
                <p className="text-xs text-slate-500">For STK Push (Paybill or Till)</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Production Integration</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                STK Push requires Daraja API credentials (Consumer Key, Secret, Passkey, Callback URL).
                Contact support to configure these securely.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── My Locations ─────────────────────────────────── */}
      {activeSection === "locations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Locations</h2>
              <p className="text-sm text-slate-500">Each location runs its own workflows and data.</p>
            </div>
            {isSuperAdmin && (
              <Link to={createPageUrl("CreateBusiness")}>
                <Button size="sm" variant="gradient">
                  <Plus className="h-4 w-4 mr-2" /> Create Business
                </Button>
              </Link>
            )}
          </div>

          {locationsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : allLocations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No locations found</p>
              <p className="text-sm mt-1">Add a new location to manage multiple branches.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allLocations.map((loc) => {
                const manager = loc.members?.find(m => m.role === "manager");
                const isActive = loc.is_active !== false;
                const memberCount = loc.members?.length || 0;
                return (
                  <Card key={loc.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white truncate">{loc.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {loc.city || loc.location || "Location not set"}
                          </p>
                        </div>
                        <Badge className={`flex-shrink-0 border-0 ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {isActive ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                          <p className="text-slate-500">Bays</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">{loc.bays_count || 1}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                          <p className="text-slate-500">Team</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">{memberCount}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                          <p className="text-slate-500">Manager</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {manager ? manager.email.split("@")[0] : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-8"
                          onClick={() => openEditLocation(loc)}
                        >
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-8"
                          onClick={() => openChangeManager(loc)}
                        >
                          Change Manager
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Edit Location Dialog ── */}
          <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-slate-600" />
                  Manage: {editingLocation?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={editLocForm.name || ""}
                    onChange={e => setEditLocForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location / Address</Label>
                  <PlaceAutocomplete
                    value={editLocForm.location || ""}
                    onChange={(val) => setEditLocForm(p => ({ ...p, location: val }))}
                    onPlaceSelect={({ lat, lng }) => setEditLocForm(p => ({ ...p, latitude: lat, longitude: lng }))}
                    placeholder="Search for address…"
                  />
                  <p className="text-xs text-slate-400">
                    {editLocForm.latitude && editLocForm.longitude ? (
                      <>📍 Pinned ({editLocForm.latitude.toFixed(5)}, {editLocForm.longitude.toFixed(5)}).{" "}
                        <button type="button" className="underline hover:text-slate-600" onClick={() => setEditLocForm(p => ({ ...p, latitude: null, longitude: null }))}>
                          Clear pin
                        </button>
                      </>
                    ) : (
                      "Pick a suggestion from the dropdown to drop a map pin - typing alone won't set one."
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={editLocForm.city || ""}
                      onChange={e => setEditLocForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editLocForm.phone || ""}
                      onChange={e => setEditLocForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="07XX XXX XXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Wash Bays</Label>
                    <Input
                      type="number"
                      value={editLocForm.bays_count || ""}
                      onChange={e => setEditLocForm(p => ({ ...p, bays_count: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operating Hours</Label>
                    <Input
                      placeholder="Open 24 hours, 7 days a week"
                      value={editLocForm.hours || ""}
                      onChange={e => setEditLocForm(p => ({ ...p, hours: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={editLocForm.description || ""}
                    onChange={e => setEditLocForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos</Label>
                  <BranchPhotoEditor photos={editLocForm.photos || []} onChange={(photos) => setEditLocForm(p => ({ ...p, photos }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancel</Button>
                <Button
                  onClick={handleSaveLocation}
                  disabled={savingLocation}
                  variant="gradient"
                >
                  {savingLocation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Change Manager Dialog ── */}
          <Dialog open={!!changeManagerBiz} onOpenChange={() => setChangeManagerBiz(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Change Manager - {changeManagerBiz?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {changeManagerBiz?.members?.find(m => m.role === "manager") && (
                  <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    Current manager:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {changeManagerBiz.members.find(m => m.role === "manager").email}
                    </span>
                  </p>
                )}
                <div className="space-y-2">
                  <Label>New Manager Email</Label>
                  <Input
                    type="email"
                    placeholder="manager@example.com"
                    value={newManagerEmail}
                    onChange={e => setNewManagerEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleChangeManager()}
                  />
                  <p className="text-xs text-slate-500">This person will be added to the location's team as manager.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setChangeManagerBiz(null)}>Cancel</Button>
                <Button
                  onClick={handleChangeManager}
                  variant="gradient"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Update Manager
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Reset-password dialog - lives outside the per-section blocks above
          since its trigger (in the Team section's Staff Logins card) is in a
          different conditional block than this modal needs to be mounted in. */}
      <Dialog open={!!resetPasswordFor} onOpenChange={(open) => { if (!open) { setResetPasswordFor(null); setResetPasswordValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password - {resetPasswordFor?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>New Password</Label>
            <Input
              type="text"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="At least 6 characters"
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              autoFocus
            />
            <p className="text-xs text-slate-500">Share this new password with them directly.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setResetPasswordFor(null)} disabled={resettingPassword}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword} variant="gradient">
              {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {resettingPassword ? "Resetting…" : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating save bar - only for non-locations sections */}
      {activeSection !== "locations" && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="gradient"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
