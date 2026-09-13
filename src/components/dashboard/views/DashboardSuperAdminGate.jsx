import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Activity, Shield } from "@/lib/icons";

export default function DashboardSuperAdminGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
        <Activity className="h-8 w-8 text-purple-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Super Admin Panel</h2>
      <p className="text-slate-500 max-w-sm">You have platform-wide access to all car washes.</p>
      <Link to={createPageUrl("SuperAdminDashboard")}>
        <Button className="bg-gradient-to-r from-purple-500 to-indigo-500">
          <Shield className="h-4 w-4 mr-2" /> Open Super Admin Dashboard
        </Button>
      </Link>
    </div>
  );
}