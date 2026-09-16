import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Phone,
  Edit,
  Trash2,
  Loader2,
  Search,
  Calendar,
  Link2
} from "@/lib/icons";
import { toast } from "sonner";
import StaffSchedule from "@/components/schedule/StaffSchedule";
import { useBusiness } from "@/lib/BusinessContext";
import { listBusinessUsers } from "@/lib/userAdminClient";
import { commissionForWash, toServicesById } from "@/lib/commissions";

export default function Staff() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    user_email: "",
    role: "washer",
    commission_override: "",
    skills: []
  });
  const [saving, setSaving] = useState(false);

  const { currentBusiness: business } = useBusiness();

  const { data: staff = [], refetch } = useQuery({
    queryKey: ["staff", business?.id],
    queryFn: () => api.entities.Staff.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  // Team logins (My Business > Team) are a separate thing from this
  // commission/schedule record on purpose - a washer doesn't need app
  // access, and an owner doesn't need a commission rate. This is only here
  // so a staff record can optionally be linked to a real, existing login
  // instead of the old free-text "email for login" field, which never
  // actually granted access to anything.
  const { data: businessLogins = [] } = useQuery({
    queryKey: ["business-logins", business?.id],
    queryFn: () => listBusinessUsers(business.id),
    enabled: !!business?.id,
    retry: false,
  });

  const { data: washes = [] } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 500),
    enabled: !!business?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });
  const servicesById = toServicesById(services);

  const { data: schedules = [], refetch: refetchSchedules } = useQuery({
    queryKey: ["schedules", business?.id],
    queryFn: () => api.entities.Schedule.filter({ business_id: business?.id }, "-date", 100),
    enabled: !!business?.id,
  });

  // Calculate staff performance
  const standards = business?.commission_standards;
  const staffWithStats = staff.map(member => {
    const memberWashes = washes.filter(w => w.assigned_staff_id === member.id);
    const completedWashes = memberWashes.filter(w => ['done', 'paid'].includes(w.status));
    const totalRevenue = completedWashes.reduce((sum, w) => sum + (w.amount_due || 0), 0);
    const totalCommission = completedWashes.reduce(
      (sum, w) => sum + commissionForWash(w, { staff: member, servicesById, standards }),
      0
    );

    return {
      ...member,
      washesCompleted: completedWashes.length,
      totalRevenue,
      totalCommission: Math.round(totalCommission)
    };
  });

  const filteredStaff = staffWithStats.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone?.includes(searchQuery)
  );

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        name: member.name,
        phone: member.phone,
        user_email: member.user_email || "",
        role: member.role,
        commission_override: member.commission_override ?? "",
        skills: member.skills || []
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: "", phone: "", user_email: "", role: "washer", commission_override: "", skills: [] });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in name and phone number");
      return;
    }

    setSaving(true);

    const payload = {
      ...formData,
      commission_override: formData.commission_override === "" ? null : Number(formData.commission_override),
    };

    if (editingStaff) {
      await api.entities.Staff.update(editingStaff.id, payload);
      toast.success("Staff member updated");
    } else {
      await api.entities.Staff.create({
        ...payload,
        business_id: business.id,
        is_active: true,
        total_washes: 0,
        total_earnings: 0
      });
      toast.success("Staff member added");
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (memberId) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    await api.entities.Staff.delete(memberId);
    toast.success("Staff member removed");
    refetch();
  };

  const handleToggleActive = async (member) => {
    await api.entities.Staff.update(member.id, { is_active: !member.is_active });
    toast.success(member.is_active ? "Staff deactivated" : "Staff activated");
    refetch();
  };

  const roleColors = {
    washer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    cashier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    supervisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    manager: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track who does the washing, their schedule, and what they've earned - not the same as
            who can sign in (that's My Business → Team). Standard commission rates and per-service
            overrides live on the Commissions page; set a per-employee override below only when this
            person's rate should differ from that.
          </p>
        </div>
        <Button 
          variant="gradient"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff List
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Staff List Tab */}
        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search staff by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Staff Grid */}
          {filteredStaff.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "No staff found" : "No staff members yet"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery ? "Try a different search" : "Add your first staff member to get started"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => handleOpenDialog()}
                  variant="gradient"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <Card 
                  key={member.id} 
                  className={`p-5 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all ${!member.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={member.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-blue-mid text-white text-lg">
                        {member.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {member.name}
                        </h3>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <Badge className={`${roleColors[member.role]} border-0 capitalize text-xs`}>
                        {member.role}
                      </Badge>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-2">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </p>
                      {(() => {
                        const linkedLogin = businessLogins.find((u) => u.email === member.user_email);
                        return linkedLogin ? (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                            <Link2 className="h-3 w-3" /> App access: {linkedLogin.role}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {member.washesCompleted}
                      </p>
                      <p className="text-xs text-slate-500">Washes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">
                        {member.commission_override != null ? `${member.commission_override}%` : "Standard"}
                      </p>
                      <p className="text-xs text-slate-500">Commission</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-cyan-600">
                        KES {member.totalCommission.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Earned</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenDialog(member)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleActive(member)}
                    >
                      {member.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <StaffSchedule 
            businessId={business?.id}
            staff={staff}
            schedules={schedules}
            onRefresh={refetchSchedules}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g., John Kamau"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="07XX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Linked App Login (optional)</Label>
              <Select
                value={formData.user_email || "none"}
                onValueChange={(value) => setFormData({ ...formData, user_email: value === "none" ? "" : value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No app access - commission tracking only</SelectItem>
                  {businessLogins.map((u) => (
                    <SelectItem key={u.uid} value={u.email}>
                      {u.full_name || u.username || u.phone || u.email} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Only matters if this person also needs to sign in - create their login first from
                My Business → Team → Staff Logins, then link it here. Most washers don't need this.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="washer">Washer</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commission Override (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Standard rate"
                  value={formData.commission_override}
                  onChange={(e) => setFormData({ ...formData, commission_override: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Leave blank to use the standard/per-service rates set on the Commissions page.
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              variant="gradient" className="w-full"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingStaff ? "Update Staff" : "Add Staff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}