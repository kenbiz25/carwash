import React from "react";
import moment from "moment";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Shared From/To range picker used by Payments, Reports, and the Dashboard -
// keeps start <= end <= today via min/max instead of custom validation.
export default function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, idPrefix = "date-range" }) {
  const today = moment().format("YYYY-MM-DD");
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Label htmlFor={`${idPrefix}-start`} className="text-xs text-slate-500 whitespace-nowrap">From</Label>
      <Input
        id={`${idPrefix}-start`}
        type="date"
        value={startDate}
        max={endDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="w-auto h-8"
      />
      <Label htmlFor={`${idPrefix}-end`} className="text-xs text-slate-500 whitespace-nowrap">To</Label>
      <Input
        id={`${idPrefix}-end`}
        type="date"
        value={endDate}
        min={startDate}
        max={today}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="w-auto h-8"
      />
    </div>
  );
}
