import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChevronRight } from "@/lib/icons";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusBadge from "../common/StatusBadge";
import VehicleIcon from "../common/VehicleIcon";
import moment from "moment";

export default function RecentWashes({ washes = [] }) {
  const recentWashes = [...washes]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          Recent Washes
        </CardTitle>
        <Link to={createPageUrl("Washes")}>
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[360px]">
          <div className="space-y-1 p-4 pt-0">
            {recentWashes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No washes yet today</p>
              </div>
            ) : (
              recentWashes.map((wash) => (
                <Link 
                  key={wash.id} 
                  to={createPageUrl(`WashDetails?id=${wash.id}`)}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                    <VehicleIcon type={wash.vehicle_type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {wash.plate_number}
                        </span>
                        <StatusBadge status={wash.status} />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {wash.services?.map(s => s.name).join(", ") || "No services"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        KES {(wash.amount_due || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {moment(wash.created_date).fromNow()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}