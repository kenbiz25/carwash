import React, { useMemo, useState } from "react";

import DashboardEmptyState from "@/components/dashboard/views/DashboardEmptyState";
import DashboardSuperAdminGate from "@/components/dashboard/views/DashboardSuperAdminGate";
import DashboardStaffView from "@/components/dashboard/views/DashboardStaffView";
import DashboardOwnerManagerView from "@/components/dashboard/views/DashboardOwnerManagerView";

import { useBusiness } from "@/lib/BusinessContext";
import { useBusinessScopedData } from "@/hooks/useBusinessScopedData";

export default function Dashboard() {
  // ✅ Hooks at top (fixes rules-of-hooks issue)
  const [revenueView, setRevenueView] = useState("week");
  const [activeTab, setActiveTab] = useState("overview");

  // Single source of truth for "which business" - the same one the Sidebar's
  // branch switcher reads and writes. Dashboard used to keep its own separate
  // selectedBusinessId (persisted to localStorage) via a different business
  // list (useUserBusinesses), which could silently drift from what the
  // Sidebar showed: switching branches in one place wouldn't move the other,
  // so a check-in started from the Dashboard could write against a stale
  // business_id while every other page had already moved to the new branch.
  const { user, businesses, currentBusiness, selectedBusinessId, setSelectedBusinessId } = useBusiness();

  // Platform role separate from business role
  const platformRole = useMemo(() => {
    // supports both shapes
    return user?.role || user?.user_role || "user";
  }, [user]);

  const businessRole = useMemo(() => {
    if (!user?.email) return "viewer";
    if (!currentBusiness) return "viewer";

    const email = user.email.toLowerCase();

    // owner_email check (backward compat)
    if (currentBusiness.owner_email?.toLowerCase() === email) return "owner";

    // members array (new schema)
    const member = currentBusiness.members?.find(
      (m) => m.email?.toLowerCase() === email
    );
    if (member?.role) return member.role;

    // legacy admin_emails list
    if (currentBusiness.admin_emails?.some((e) => e?.toLowerCase() === email))
      return "manager";

    return user.user_role || "staff";
  }, [currentBusiness, user]);

  const isSuperAdmin = platformRole === "admin";

  const data = useBusinessScopedData(selectedBusinessId);

  // 1) Super admin → gate to superadmin dashboard. Checked before the
  // "no businesses" case below: a super admin correctly has zero business
  // memberships of their own (they're platform-wide, not scoped to one
  // branch), so that check must not run first or it traps every super
  // admin on the "set up your business" empty state instead.
  if (isSuperAdmin) return <DashboardSuperAdminGate />;

  // 2) No businesses → setup CTA
  if (businesses.length === 0) return <DashboardEmptyState />;

  // 3) Only owners and managers get the full dashboard
  if (businessRole === "owner" || businessRole === "manager") {
    return (
      <DashboardOwnerManagerView
        userRole={businessRole}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        setSelectedBusinessId={setSelectedBusinessId}
        currentBusiness={currentBusiness}
        washes={data.washes}
        payments={data.payments}
        staff={data.staff}
        services={data.services}
        inventory={data.inventory}
        cctvFeeds={data.cctvFeeds}
        customers={data.customers}
        revenueView={revenueView}
        setRevenueView={setRevenueView}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        refresh={data.refresh}
        refetchWashes={data.refetchWashes}
        user={user}
      />
    );
  }

  // 4) Staff, cashier, and any unrecognised role → restricted view
  return (
    <DashboardStaffView
      user={user}
      userRole={businessRole}
      currentBusiness={currentBusiness}
      washes={data.washes}
      payments={data.payments}
      services={data.services}
      staff={data.staff}
      businessId={selectedBusinessId}
    />
  );
}