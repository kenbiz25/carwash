import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Logo from "../common/Logo";
import {
  LayoutDashboard,
  Car,
  Banknote,
  Users,
  Package,
  Settings,
  Heart,
  FileText,
  LogOut,
  ChevronLeft,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Crown,
  ChevronDown,
  Building2,
  Check,
  Plus,
} from "@/lib/icons";
import { api } from "@/api/firebaseClient";

// Items shown ONLY when no business has been set up yet
const SETUP_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",     page: "Dashboard", roles: ["superadmin", "owner", "manager", "staff", "cashier"] },
  { icon: HelpCircle,      label: "Help & Support", page: "Help",     roles: ["superadmin", "owner", "manager", "staff", "cashier"] },
];

// Full menu — shown once a business exists
const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",            page: "Dashboard",           roles: ["superadmin", "owner", "manager", "staff", "cashier"] },
  { icon: Building2,       label: "My Business",          page: "BusinessManager",     roles: ["owner", "manager"] },
  { icon: Car,             label: "Active Washes",        page: "Washes",              roles: ["owner", "manager", "staff", "cashier"] },
  { icon: ClipboardList,   label: "Job Orders",           page: "JobOrders",           roles: ["owner", "manager", "staff", "cashier"] },
  { icon: Banknote,        label: "Payments",             page: "Payments",            roles: ["owner", "manager", "cashier"] },
  { icon: Users,           label: "Staff & Commissions",  page: "Staff",               roles: ["owner", "manager"] },
  { icon: BookOpen,        label: "Services & Catalogue", page: "ProductCatalogue",    roles: ["owner", "manager"] },
  { icon: Package,         label: "Inventory",            page: "Inventory",           roles: ["owner", "manager"] },
  { icon: Heart,           label: "Loyalty & Members",    page: "Loyalty",             roles: ["owner", "manager", "cashier"] },
  { icon: FileText,        label: "Reports & Analytics",  page: "Reports",             roles: ["owner", "manager", "cashier"] },
  { icon: Crown,           label: "Subscriptions",        page: "Memberships",         roles: ["owner"] },
  { icon: Settings,        label: "Settings & Users",     page: "Settings",            roles: ["owner"] },
  { icon: ShieldCheck,     label: "Super Admin",          page: "SuperAdminDashboard", roles: ["superadmin"] },
  { icon: Plus,            label: "Create Business",      page: "CreateBusiness",      roles: ["superadmin"] },
  { icon: HelpCircle,      label: "Help & Support",       page: "Help",                roles: ["superadmin", "owner", "manager", "staff", "cashier"] },
];

const ROLE_LABELS = {
  superadmin: { label: "Super Admin", color: "bg-purple-100 text-purple-700" },
  owner:      { label: "Owner",       color: "bg-amber-100 text-amber-700" },
  manager:    { label: "Manager",     color: "bg-blue-100 text-blue-700" },
  cashier:    { label: "Cashier",     color: "bg-emerald-100 text-emerald-700" },
  staff:      { label: "Staff",       color: "bg-slate-100 text-slate-600" },
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  currentPage,
  userRole = "staff",
  hasBusiness = true,
  businesses = [],
  selectedBusinessId,
  setSelectedBusinessId,
}) {
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);

  // A super admin correctly has no business of their own (they're
  // platform-wide, not scoped to one branch) - the reduced setup menu is
  // only meant for someone who genuinely hasn't set up a business yet, so
  // it must not apply to them or their own "Super Admin" link disappears.
  const menuItems = (hasBusiness || userRole === "superadmin") ? ALL_MENU_ITEMS : SETUP_MENU_ITEMS;
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));
  // Before a business exists, "role" defaults to a literal "staff" purely so
  // nav-visibility checks above have something to filter on — it doesn't
  // reflect an actual assigned role, so don't present it as one.
  const roleInfo = (!hasBusiness && userRole !== "superadmin")
    ? { label: "Getting Started", color: "bg-slate-100 text-slate-500" }
    : (ROLE_LABELS[userRole] || ROLE_LABELS.staff);

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || businesses[0];
  // Only owners run multiple locations — managers/staff/cashiers are scoped to one carwash.
  const showBizSwitcher = !collapsed && userRole === "owner" && businesses.length > 1;

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full bg-brand-navy border-r border-white/10 transition-all duration-300 flex flex-col",
        collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0 w-64"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
          <Link to="/Landing" title="Back to homepage">
            {!collapsed && <Logo size="default" />}
            {collapsed && <Logo size="sm" showText={false} />}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-brand-blue-pale hover:text-white hover:bg-white/10"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-brand-blue-pale hover:text-white hover:bg-white/10"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-2 border-b border-white/10">
            <Badge className={`${roleInfo.color} border-0 text-xs`}>
              {roleInfo.label}
            </Badge>
          </div>
        )}

        {/* Business Switcher - shown when owner has 2+ businesses */}
        {showBizSwitcher && (
          <div className="px-3 py-2 border-b border-white/10 relative">
            <button
              onClick={() => setBizDropdownOpen(prev => !prev)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors"
            >
              <Building2 className="h-4 w-4 text-brand-blue-pale flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-white truncate">
                {currentBusiness?.name || "Select Business"}
              </span>
              <ChevronDown className={cn("h-3 w-3 text-brand-blue-pale transition-transform", bizDropdownOpen && "rotate-180")} />
            </button>
            {bizDropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-brand-navy-mid rounded-lg shadow-lg border border-white/10 z-10 py-1">
                {businesses.map(biz => (
                  <button
                    key={biz.id}
                    onClick={() => {
                      setSelectedBusinessId(biz.id);
                      setBizDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors text-left"
                  >
                    <Check className={cn("h-3 w-3 flex-shrink-0", biz.id === selectedBusinessId ? "text-brand-orange" : "text-transparent")} />
                    <span className="truncate text-white">{biz.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Setup prompt */}
        {!hasBusiness && userRole !== "superadmin" && !collapsed && (
          <div className="px-4 py-3 border-b border-brand-orange/20 bg-brand-orange/10">
            <p className="text-xs text-orange-200">
              Complete your business setup in Dashboard to unlock all features.
            </p>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {visibleItems.map((item, idx) => {
              const isActive = currentPage === item.page;
              const rowClass = cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                isActive
                  ? "bg-gradient-to-r from-brand-orange to-brand-orange-hot text-white shadow-lg shadow-brand-orange/30"
                  : "text-brand-blue-pale hover:bg-white/10 hover:text-white"
              );
              const row = (
                <div className={rowClass}>
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                </div>
              );

              if (item.external) {
                return (
                  <a key={`${item.label}-${idx}`} href={item.href} target="_blank" rel="noopener noreferrer">
                    {row}
                  </a>
                );
              }

              return (
                <Link
                  key={`${item.page}-${idx}`}
                  to={createPageUrl(item.page)}
                  onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                >
                  {row}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-brand-blue-pale hover:text-red-300 hover:bg-red-500/10",
              collapsed && "justify-center"
            )}
            onClick={() => api.auth.logout()}
          >
            <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </aside>
    </>
  );
}