import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Play,
  CheckCircle,
  Banknote,
  User,
  Clock,
  X,
  Pause,
  Trash2,
  ClipboardEdit
} from "@/lib/icons";
import StatusBadge from "../common/StatusBadge";
import VehicleIcon from "../common/VehicleIcon";
import moment from "moment";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WashCard({ wash, onStatusChange, onPayment, canManageWashes, onPause, onResume, onDelete, onFinishEntry }) {
  const statusActions = {
    waiting: { label: "Start Washing", icon: Play, nextStatus: "washing" },
    washing: { label: "Mark Done", icon: CheckCircle, nextStatus: "done" },
    done: { label: "Process Payment", icon: Banknote, action: "payment" },
  };

  const isPendingEntry = wash.entry_status === "pending";
  const currentAction = statusActions[wash.status];

  return (
    <Card className="p-4 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <VehicleIcon type={wash.vehicle_type} size="lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link 
              to={createPageUrl(`WashDetails?id=${wash.id}`)}
              className="font-bold text-lg text-slate-900 dark:text-white hover:text-emerald-600 transition-colors"
            >
              {wash.plate_number}
            </Link>
            <StatusBadge status={wash.status} />
            {isPendingEntry && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                Needs Details
              </Badge>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {isPendingEntry ? "Services not picked yet" : (wash.services?.map(s => s.name).join(", ") || "No services")}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {wash.assigned_staff_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {wash.assigned_staff_name}
              </span>
            )}
            {wash.bay_number && (
              <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                Bay {wash.bay_number}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {moment(wash.entry_time || wash.created_date).fromNow()}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-bold text-lg text-emerald-600">
            KES {(wash.amount_due || 0).toLocaleString()}
          </p>
          {wash.status === 'paid' && wash.payment_method && (
            <div className="text-xs text-slate-400">
              <StatusBadge status={wash.payment_method} />
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            {isPendingEntry ? (
              <Button size="sm" onClick={() => onFinishEntry?.(wash)} className="bg-amber-600 hover:bg-amber-700">
                <ClipboardEdit className="h-3 w-3 mr-1" />Finish Entry
              </Button>
            ) : wash.status === 'paused' && canManageWashes ? (
              <Button size="sm" onClick={() => onResume?.(wash.id)} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-3 w-3 mr-1" />Resume
              </Button>
            ) : currentAction && (
              <Button
                size="sm"
                onClick={() => {
                  if (currentAction.action === "payment") {
                    onPayment?.(wash);
                  } else {
                    onStatusChange?.(wash.id, currentAction.nextStatus);
                  }
                }}
                className={wash.status === 'done'
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
                }
              >
                <currentAction.icon className="h-3 w-3 mr-1" />
                {currentAction.label}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`WashDetails?id=${wash.id}`)}>
                    View Details
                  </Link>
                </DropdownMenuItem>
                {/* Manual status overrides - hidden while paused unless you can
                    manage washes, so pausing actually holds a job in place
                    instead of being one click from being silently bypassed. */}
                {wash.status !== 'paid' && wash.status !== 'cancelled' && (wash.status !== 'paused' || canManageWashes) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onStatusChange?.(wash.id, 'waiting')}>
                      Mark as Waiting
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange?.(wash.id, 'washing')}>
                      Mark as Washing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange?.(wash.id, 'done')}>
                      Mark as Done
                    </DropdownMenuItem>
                  </>
                )}
                {wash.status === 'washing' && canManageWashes && (
                  <DropdownMenuItem className="text-orange-600" onClick={() => onPause?.(wash)}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Wash
                  </DropdownMenuItem>
                )}
                {wash.status === 'waiting' && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onStatusChange?.(wash.id, 'cancelled')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Wash
                  </DropdownMenuItem>
                )}
                {['washing', 'paused', 'done'].includes(wash.status) && canManageWashes && (
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(wash)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Wash
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}