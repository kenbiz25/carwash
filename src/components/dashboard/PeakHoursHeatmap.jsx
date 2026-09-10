import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import moment from "moment";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM to 6 PM

export default function PeakHoursHeatmap({ washes = [] }) {
  const heatmapData = useMemo(() => {
    const data = {};
    
    // Initialize grid
    days.forEach((day, dayIndex) => {
      data[dayIndex] = {};
      hours.forEach(hour => {
        data[dayIndex][hour] = 0;
      });
    });

    // Count washes per day/hour
    washes.forEach(wash => {
      const date = moment(wash.entry_time || wash.created_date);
      const dayOfWeek = date.day();
      const hour = date.hour();
      
      if (hour >= 6 && hour <= 18) {
        data[dayOfWeek][hour] = (data[dayOfWeek][hour] || 0) + 1;
      }
    });

    return data;
  }, [washes]);

  // Find max for color scaling
  const maxCount = useMemo(() => {
    let max = 0;
    Object.values(heatmapData).forEach(dayData => {
      Object.values(dayData).forEach(count => {
        if (count > max) max = count;
      });
    });
    return max || 1;
  }, [heatmapData]);

  const getColor = (count) => {
    if (count === 0) return "bg-slate-100 dark:bg-slate-800";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-emerald-100 dark:bg-emerald-900/30";
    if (intensity < 0.5) return "bg-emerald-300 dark:bg-emerald-700/50";
    if (intensity < 0.75) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-700 dark:bg-emerald-500";
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-500" />
          Peak Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Hours header */}
            <div className="flex gap-1 mb-1 pl-10">
              {hours.map(hour => (
                <div key={hour} className="w-7 text-center text-xs text-slate-500">
                  {hour}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <div className="w-8 text-xs text-slate-500 text-right pr-2">{day}</div>
                {hours.map(hour => {
                  const count = heatmapData[dayIndex]?.[hour] || 0;
                  return (
                    <div
                      key={hour}
                      className={`w-7 h-7 rounded-sm ${getColor(count)} transition-colors cursor-pointer hover:ring-2 hover:ring-emerald-400`}
                      title={`${day} ${hour}:00 - ${count} washes`}
                    >
                      {count > 0 && (
                        <span className="text-xs flex items-center justify-center h-full text-white/80">
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-4 bg-slate-100 rounded-sm" />
                <div className="w-4 h-4 bg-emerald-100 rounded-sm" />
                <div className="w-4 h-4 bg-emerald-300 rounded-sm" />
                <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                <div className="w-4 h-4 bg-emerald-700 rounded-sm" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}