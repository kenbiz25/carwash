import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Loader2,
  Camera,
  CheckCircle2,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";

export default function Profile() {
  const [saving, setSaving] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    profile_photo_url: "",
  });

  const { data: user, refetch } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  const { currentBusiness: business } = useBusiness();

  /**
   * Fetch pending invites for this user email (if invite system exists).
   * Supports:
   *  - api.invites.getMyInvites()
   *  - api.functions.getMyInvites()
   *  - api.entities.BusinessInvite.filter({ email, status: "pending" })
   */
  const { data: invites, refetch: refetchInvites } = useQuery({
    queryKey: ["myInvites", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      if (!user?.email) return [];
      const email = user.email.toLowerCase();

      // Try callable methods if present
      if (api?.invites?.getMyInvites) {
        const res = await api.invites.getMyInvites({ email });
        return res?.invites || res || [];
      }
      if (api?.functions?.getMyInvites) {
        const res = await api.functions.getMyInvites({ email });
        return res?.invites || res || [];
      }

      // Try DB entity
      if (api?.entities?.BusinessInvite?.filter) {
        const rows = await api.entities.BusinessInvite.filter({ email, status: "pending" });
        return rows || [];
      }

      return [];
    },
  });

  // pick the most relevant pending invite (you can choose latest server-side if needed)
  const pendingInvite = (invites || []).find((i) => {
    const status = (i?.status || "").toLowerCase();
    return status === "pending" || status === "" || status === "invited";
  });

  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || "",
        profile_photo_url: user.profile_photo_url || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.auth.updateMe(formData);
      toast.success("Profile updated successfully!");
      refetch();
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error("Failed to update profile: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Optional: simple size guard (5MB)
      const max = 5 * 1024 * 1024;
      if (file.size > max) {
        toast.error("Image too large. Please upload under 5MB.");
        return;
      }

      const res = await api.integrations.Core.UploadFile({ file });
      const file_url = res?.file_url;

      if (!file_url) {
        toast.error("Upload failed: no file url returned");
        return;
      }

      setFormData((prev) => ({ ...prev, profile_photo_url: file_url }));
      toast.success("Photo uploaded");
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error("Upload failed: " + msg);
    } finally {
      // allow re-uploading same file by resetting input
      e.target.value = "";
    }
  };

  /**
   * Accept invite:
   * - Update user profile: business_id + user_role
   * - Mark invite accepted (if possible)
   *
   * Supports:
   *  - api.invites.acceptInvite(...)
   *  - api.functions.acceptInvite(...)
   *  - api.entities.BusinessInvite.update(inviteId, { status: "accepted", accepted_at... })
   */
  const acceptInvite = async (invite) => {
    if (!invite) return;
    if (!user?.email) return;

    const business_id = invite.business_id || invite.businessId;
    const role = invite.role || "staff";

    if (!business_id) {
      toast.error("Invite is missing business_id");
      return;
    }

    try {
      setAcceptingInvite(true);

      // Preferred: backend handles validation and updates
      if (api?.invites?.acceptInvite) {
        await api.invites.acceptInvite({ inviteId: invite.id, token: invite.token });
      } else if (api?.functions?.acceptInvite) {
        await api.functions.acceptInvite({ inviteId: invite.id, token: invite.token });
      } else {
        // Client-side fallback (still requires rules to allow)
        await api.auth.updateMe({ business_id, user_role: role });

        // Mark invite accepted if entity exists
        if (api?.entities?.BusinessInvite?.update && invite?.id) {
          await api.entities.BusinessInvite.update(invite.id, {
            status: "accepted",
            accepted_by: user.email.toLowerCase(),
            accepted_at: new Date().toISOString(),
          });
        }
      }

      // Ensure the user profile reflects membership
      await api.auth.updateMe({ business_id, user_role: role });

      toast.success("Invitation accepted — your account has been linked to the business.");
      await refetch();
      await refetchInvites();
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error("Failed to accept invite: " + msg);
    } finally {
      setAcceptingInvite(false);
    }
  };

  // OPTIONAL: auto-accept any pending invite if user has no business yet
  useEffect(() => {
    const AUTO_ACCEPT = true; // flip to false if you prefer manual acceptance only
    if (!AUTO_ACCEPT) return;
    if (!user?.email) return;
    if (user?.business_id) return;
    if (!pendingInvite) return;

    // auto accept once
    acceptInvite(pendingInvite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.business_id, pendingInvite?.id]);

  const roleLabels = {
    owner: "Business Owner",
    manager: "Manager",
    staff: "Staff Member",
    cashier: "Cashier",
    customer: "Customer",
    admin: "Admin",
    user: "User",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your account settings</p>
      </div>

      {/* Pending Invite Card */}
      {!user?.business_id && pendingInvite && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-emerald-600" />
              Invitation Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You’ve been invited to join{" "}
              <span className="font-medium">
                {pendingInvite.business_name || "a business"}
              </span>{" "}
              as{" "}
              <span className="font-medium">
                {roleLabels[pendingInvite.role] || pendingInvite.role || "User"}
              </span>
              .
            </p>

            <Button
              onClick={() => acceptInvite(pendingInvite)}
              disabled={acceptingInvite}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {acceptingInvite ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Accept Invitation
            </Button>

            <p className="text-xs text-slate-500">
              Tip: if you don’t accept, you can still update your profile details below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Card */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.profile_photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-2xl">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors">
                <Camera className="h-4 w-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {user?.full_name || "User"}
            </h2>
            <p className="text-slate-500">{user?.email}</p>
            <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-0">
              {roleLabels[user?.user_role] || roleLabels[user?.role] || "User"}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  {user?.full_name || "-"}
                </span>
              </div>
              <p className="text-xs text-slate-500">Contact support to change your name</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">{user?.email}</span>
              </div>
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  placeholder="07XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {business && (
              <div className="space-y-2">
                <Label>Business</Label>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {business.name}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Once you log out, you'll need to sign in again to access your account.
          </p>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => api.auth.logout()}
          >
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}