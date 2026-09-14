import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Search, Bell, Moon, Sun, Settings, LogOut, User, CheckCheck, Building2, Check, ChevronDown } from "@/lib/icons";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/firebaseClient";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

function NotificationBell({ user, business }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["inAppNotifications", user?.email, business?.id],
    enabled: !!user?.email,
    refetchInterval: 15000,
    queryFn: async () => {
      const rows = await api.entities.Notification.filter(
        { recipient_email: user.email.toLowerCase(), channel: "in_app" },
        "-created_date",
        30
      );
      return business?.id ? rows.filter((n) => n.business_id === business.id) : rows;
    },
  });

  const unread = notifications.filter((n) => !n.read);

  const markRead = async (id) => {
    await api.entities.Notification.update(id, { read: true });
    queryClient.invalidateQueries({ queryKey: ["inAppNotifications"] });
  };

  const markAllRead = async () => {
    await Promise.all(unread.map((n) => api.entities.Notification.update(n.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ["inAppNotifications"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-600 dark:text-slate-400">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 bg-brand-orange text-white text-[10px] leading-4 font-bold rounded-full text-center">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-brand-blue-mid hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange mt-1.5 flex-shrink-0" />}
                  <div className={n.read ? "" : "flex-1"}>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{n.subject}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_date)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TopBar({
  user,
  role,
  business,
  hasBusiness = true,
  businesses = [],
  selectedBusinessId,
  setSelectedBusinessId,
  onMenuClick,
  darkMode,
  setDarkMode,
}) {
  const firstName = (user?.full_name || user?.email || "User").trim().split(/\s+/)[0];
  // Only owners run multiple locations — managers/staff/cashiers are scoped to one carwash.
  const showBizSwitcher = role === "owner" && businesses.length > 1;
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search plates, customers..."
              className="w-64 pl-9 bg-slate-50 dark:bg-slate-800 border-0"
            />
          </div>
        </div>
      </div>

      {/* Center - Business Name / Switcher */}
      <div className="hidden lg:block">
        {showBizSwitcher ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 h-auto py-1">
                <Building2 className="h-4 w-4 text-slate-400" />
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                    {business?.name || "Select Business"}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </p>
                  <p className="text-xs text-slate-500 -mt-0.5">{business?.location || business?.city}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {businesses.map((biz) => (
                <DropdownMenuItem
                  key={biz.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedBusinessId?.(biz.id)}
                >
                  <Check className={`mr-2 h-3.5 w-3.5 ${biz.id === selectedBusinessId ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{biz.name}</p>
                    <p className="text-xs text-slate-400 truncate">{biz.location || biz.city}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          business && (
            <div className="text-center">
              <p className="font-semibold text-slate-900 dark:text-white">{business.name}</p>
              <p className="text-xs text-slate-500">{business.location || business.city}</p>
            </div>
          )
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          className="text-slate-600 dark:text-slate-400"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <NotificationBell user={user} business={business} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profile_photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-blue-mid text-white">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {firstName}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {hasBusiness || role === "superadmin" ? (role || "staff") : "Getting started"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={createPageUrl("Profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl("Settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => api.auth.logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
