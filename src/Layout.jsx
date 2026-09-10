import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/BusinessContext";
import { LayoutDashboard, Car, Banknote, Menu } from "lucide-react";
import { createPageUrl } from "@/utils";

// Pages that don't need the dashboard layout
const publicPages = ["Landing", "Help", "Login", "JoinBusiness", "CustomerPortal", "PrivacyPolicy", "TermsOfService"];

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const {
    user,
    currentBusiness,
    hasBusiness,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  } = useBusiness();

  // Derive effective role for RBAC
  const effectiveRole = React.useMemo(() => {
    if (!user) return "staff";
    if (user.role === "admin") return "superadmin";
    if (!currentBusiness) return "staff";
    const email = user.email?.toLowerCase();
    // Check new members array first (case-insensitive)
    const memberEntry = currentBusiness.members?.find((m) => m.email?.toLowerCase() === email);
    if (memberEntry) return memberEntry.role;
    // Legacy fallback (case-insensitive)
    if (currentBusiness.owner_email?.toLowerCase() === email) return "owner";
    if (currentBusiness.admin_emails?.some((e) => e?.toLowerCase() === email)) return "manager";
    const staffRole = user.user_role || "staff";
    if (staffRole === "cashier") return "cashier";
    return "staff";
  }, [user, currentBusiness]);

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Check for stored dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored === "true") {
      setDarkMode(true);
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Use public layout for certain pages
  if (publicPages.includes(currentPageName)) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentPage={currentPageName}
        userRole={effectiveRole}
        hasBusiness={hasBusiness}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        setSelectedBusinessId={setSelectedBusinessId}
      />

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        {/* Top Bar */}
        <TopBar
          user={user}
          role={effectiveRole}
          business={currentBusiness}
          onMenuClick={() => setSidebarCollapsed(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation — hidden on lg+ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-brand-navy border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { icon: LayoutDashboard, label: "Home",     page: "Dashboard" },
            { icon: Car,             label: "Washes",   page: "Washes"    },
            { icon: Banknote,        label: "Payments", page: "Payments"  },
          ].map(({ icon: Icon, label, page }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                  isActive ? "text-brand-orange" : "text-brand-blue-pale"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-brand-blue-pale transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}