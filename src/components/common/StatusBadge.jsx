import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  waiting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  washing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  mpesa: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cash: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  card: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusLabels = {
  waiting: "Waiting",
  washing: "Washing",
  done: "Done",
  paid: "Paid",
  cancelled: "Cancelled",
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  refunded: "Refunded",
  mpesa: "M-Pesa",
  cash: "Cash",
  card: "Card",
};

export default function StatusBadge({ status, className }) {
  return (
    <Badge className={cn(
      "font-medium border-0 capitalize",
      statusStyles[status] || "bg-slate-100 text-slate-700",
      className
    )}>
      {statusLabels[status] || status}
    </Badge>
  );
}