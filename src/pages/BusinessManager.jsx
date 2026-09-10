import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/firebaseClient";
import { localDb } from "@/lib/localDb";
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
} from "lucide-react";
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
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{value || "—"}</p>
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
    bays_count: "", description: "",
    mpesa_till: "", mpesa_shortcode: "",
    members: [],
  });
  const [newMember, setNewMember] = useState({ email: "", role: "manager" });

  // My Locations state
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ name: "", city: "", bays_count: "1" });
  const [addingLocation, setAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editLocForm, setEditLocForm] = useState({});
  const [savingLocation, setSavingLocation] = useState(false);
  const [changeManagerBiz, setChangeManagerBiz] = useState(null);
  const [newManagerEmail, setNewManagerEmail] = useState("");

  // The business being edited/managed here is whichever one the Sidebar's
  // branch switcher currently shows — not an independently-resolved "primary"
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

  // Only owners (of at least one branch) and superadmins may create new branches —
  // a manager/staff/cashier has no owner_email/owner-role anywhere and shouldn't
  // be able to spin up a business they'd then own.
  const isSuperAdmin = user?.role === "admin" || user?.user_role === "admin";
  const isOwner = allLocations.some(loc => loc.owner_email === user?.email)
    || business?.owner_email === user?.email
    || (business?.members || []).some(m => m.email === user?.email && m.role === "owner");
  const canCreateBranch = isSuperAdmin || isOwner;

  useEffect(() => {
    if (business) {
      setForm({
        name:            business.name || "",
        location:        business.location || "",
        city:            business.city || "",
        phone:           business.phone || "",
        bays_count:      business.bays_count || "",
        description:     business.description || "",
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
  const handleSendInvite = async (memberEmail, memberRole) => {
    if (!business?.id) { toast.error("Save the business first"); return; }
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
      // No email backend while running locally — copy the invite link so it can be shared manually.
      await navigator.clipboard?.writeText(inviteUrl).catch(() => {});
      toast.success(`Invite link for ${memberEmail} copied to clipboard`, {
        description: inviteUrl,
      });
    } catch (err) {
      toast.error("Failed to create invite: " + (err?.message || err));
    }
  };

  // ── Save primary business ─────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name) { toast.error("Business name is required"); return; }
    if (!business) { toast.error("No business found. Complete initial setup in Settings first."); return; }

    setSaving(true);
    try {
      const ownerEmails = form.members.filter(m => m.role === "owner").map(m => m.email);
      const adminEmails = form.members.filter(m => m.role === "manager").map(m => m.email);

      await api.entities.Business.update(business.id, {
        name:            form.name,
        location:        form.location,
        city:            form.city,
        phone:           form.phone,
        bays_count:      form.bays_count ? parseInt(form.bays_count) : business.bays_count,
        description:     form.description,
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
  const handleAddLocation = async () => {
    if (!canCreateBranch) { toast.error("Only owners and super admins can create new branches"); return; }
    if (!newLocForm.name.trim()) { toast.error("Enter a business name"); return; }
    setAddingLocation(true);
    try {
      await api.entities.Business.create({
        name:          newLocForm.name.trim(),
        city:          newLocForm.city.trim(),
        slug:          localDb.slugify(newLocForm.city.trim() || newLocForm.name.trim()),
        photos:        localDb.DEFAULT_BRANCH_PHOTOS,
        bays_count:    parseInt(newLocForm.bays_count) || 1,
        owner_email:   user.email,
        members:       [{ email: user.email, role: "owner" }],
        member_emails: [user.email.toLowerCase()],
        is_active:     true,
      });
      toast.success("Location created!");
      setAddLocationOpen(false);
      setNewLocForm({ name: "", city: "", bays_count: "1" });
      refetchLocations();
      queryClient.invalidateQueries({ queryKey: ["my-locations"] });
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
    setAddingLocation(false);
  };

  const openEditLocation = (loc) => {
    setEditingLocation(loc);
    setEditLocForm({
      name: loc.name || "",
      city: loc.city || "",
      phone: loc.phone || "",
      bays_count: String(loc.bays_count || ""),
    });
  };

  const handleSaveLocation = async () => {
    if (!editingLocation) return;
    setSavingLocation(true);
    try {
      await api.entities.Business.update(editingLocation.id, {
        name:       editLocForm.name,
        city:       editLocForm.city,
        phone:      editLocForm.phone,
        bays_count: editLocForm.bays_count ? parseInt(editLocForm.bays_count) : editingLocation.bays_count,
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
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
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
                  placeholder="Search for address…"
                />
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

            <div className="space-y-2">
              <Label>Number of Wash Bays</Label>
              <Input
                type="number"
                value={form.bays_count}
                onChange={(e) => setForm({ ...form, bays_count: e.target.value })}
                placeholder="3"
                className="max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell customers about your car wash — services, specialties, hours…"
                rows={4}
              />
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
              Manage who can access this business and what they can do.
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
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
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
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-blue-mid hover:bg-brand-blue-mid/10 transition-colors"
                            title={`Send invite email to ${member.email}`}
                          >
                            <Mail className="h-4 w-4" />
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
            {canCreateBranch && (
              <Button
                onClick={() => setAddLocationOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Location
              </Button>
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
                            {manager ? manager.email.split("@")[0] : "—"}
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

          {/* ── Add Location Dialog ── */}
          <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Add New Location
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="e.g., BGO Shine Hub - Westlands"
                    value={newLocForm.name}
                    onChange={e => setNewLocForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      placeholder="e.g., Nairobi"
                      value={newLocForm.city}
                      onChange={e => setNewLocForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wash Bays</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={newLocForm.bays_count}
                      onChange={e => setNewLocForm(p => ({ ...p, bays_count: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setAddLocationOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAddLocation}
                  disabled={addingLocation}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500"
                >
                  {addingLocation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Edit Location Dialog ── */}
          <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
            <DialogContent>
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
                <div className="space-y-2">
                  <Label>Wash Bays</Label>
                  <Input
                    type="number"
                    className="max-w-xs"
                    value={editLocForm.bays_count || ""}
                    onChange={e => setEditLocForm(p => ({ ...p, bays_count: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancel</Button>
                <Button
                  onClick={handleSaveLocation}
                  disabled={savingLocation}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500"
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
                  Change Manager — {changeManagerBiz?.name}
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
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Update Manager
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Floating save bar — only for non-locations sections */}
      {activeSection !== "locations" && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
