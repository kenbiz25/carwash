import React from "react";
import { Car, Truck, Bike, Bus } from "@/lib/icons";
import { cn } from "@/lib/utils";

const vehicleIcons = {
  saloon: Car,
  suv: Car,
  van: Truck,
  pickup: Truck,
  motorcycle: Bike,
  truck: Truck,
  tipper: Truck,
  bus: Bus,
  other: Car,
};

const vehicleColors = {
  saloon: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  suv: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  van: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  pickup: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  motorcycle: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
  truck: "text-slate-600 bg-slate-100 dark:bg-slate-900/30",
  tipper: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  bus: "text-red-600 bg-red-100 dark:bg-red-900/30",
  other: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
};

export default function VehicleIcon({ type = "saloon", size = "default", className }) {
  const Icon = vehicleIcons[type] || Car;
  const colorClass = vehicleColors[type] || vehicleColors.other;
  
  const sizes = {
    sm: "h-6 w-6 p-1",
    default: "h-8 w-8 p-1.5",
    lg: "h-10 w-10 p-2",
  };

  return (
    <div className={cn("rounded-lg flex items-center justify-center", colorClass, sizes[size], className)}>
      <Icon className="h-full w-full" />
    </div>
  );
}