import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Calendar, UserCheck, Receipt, Car, Package, Clock, Image, ChevronRight } from "@/lib/icons";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_STYLES = {
  pending:     "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready:       "bg-emerald-100 text-emerald-700",
  collected:   "bg-slate-100 text-slate-500",
  cancelled:   "bg-red-100 text-red-700",
};

const PAYMENT_STYLES = {
  unpaid:   "bg-red-100 text-red-700",
  partial:  "bg-orange-100 text-orange-700",
  paid:     "bg-emerald-100 text-emerald-700",
  refunded: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS = {
  pending:     "Waiting",
  in_progress: "In Progress",
  ready:       "Ready",
  collected:   "Collected",
  cancelled:   "Cancelled",
};

export default function JobOrderCard({ order, isOverdue, onOpen, onDelete, onStatusChange }) {
  const isDriveIn = order.flow_type === "drive_in" || !order.flow_type;
  const balanceDue = (order.amount || 0) - (order.amount_paid || 0);
  const photoCount = (order.photos_before?.length || 0) + (order.photos_during?.length || 0) + (order.photos_after?.length || 0);
  const servicesList = order.services_selected?.map(s => s.name).join(", ") || order.product_name || "";

  return (
    <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer
      ${order.priority === "vip" ? "border-l-4 border-l-purple-500" : ""}
      ${order.priority === "urgent" ? "border-l-4 border-l-orange-400" : ""}
      ${isOverdue ? "ring-2 ring-red-300 ring-offset-1" : ""}
    `}>
      <CardContent className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDriveIn ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {isDriveIn ? <><Car className="h-3 w-3" /> Drive-in</> : <><Package className="h-3 w-3" /> Drop-off</>}
              </span>
              <span className="font-mono text-[10px] text-slate-400">{order.order_number}</span>
              {order.priority !== "normal" && (
                <Badge className={`text-[10px] border-0 px-1.5 ${order.priority === "vip" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                  {order.priority?.toUpperCase()}
                </Badge>
              )}
              {isOverdue && (
                <Badge className="text-[10px] border-0 bg-red-100 text-red-700">⚠ OVERDUE</Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{order.customer_name}</h3>
            <p className="text-xs text-slate-500">{order.customer_phone}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Service / Items summary */}
        <div
          onClick={onOpen}
          className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDriveIn && order.plate_number && (
            <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">{order.plate_number} · {order.vehicle_type?.toUpperCase()}</p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{servicesList || order.items_description || "No services listed"}</p>
          {order.in_progress_status && (
            <p className="text-xs text-blue-600 font-medium mt-1">↳ {order.in_progress_status}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>In: {order.date_brought ? format(new Date(order.date_brought), "d MMM HH:mm") : "-"}</span>
          </div>
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{order.date_to_collect ? format(new Date(order.date_to_collect), "d MMM HH:mm") : "-"}</span>
          </div>
        </div>

        {/* Worker & photos */}
        <div className="flex items-center justify-between">
          {order.allocated_worker_name ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>{order.allocated_worker_name}</span>
            </div>
          ) : <div />}
          {photoCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Image className="h-3 w-3" /> {photoCount} photos
            </div>
          )}
        </div>

        {/* Payment row */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 dark:text-white text-sm">KES {(order.amount || 0).toLocaleString()}</span>
            {balanceDue > 0 && order.status !== "collected" && (
              <span className="text-xs text-red-500 ml-2">Bal: KES {balanceDue.toLocaleString()}</span>
            )}
          </div>
          <Badge className={`${PAYMENT_STYLES[order.payment_status] || ""} border-0 text-xs`}>
            {order.payment_status === "paid" ? "✓ Paid" : order.payment_status || "unpaid"}
          </Badge>
        </div>

        {/* Status + Open button */}
        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Waiting</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={onOpen}
            className={`flex-shrink-0 h-8 ${isDriveIn ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600"} text-white`}
          >
            Open <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}