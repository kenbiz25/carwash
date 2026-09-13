import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X } from "@/lib/icons";

export default function UpsellPrompt({ selectedServices = [], allServices = [], vehicleType = "saloon", onAddService, onDismiss }) {
  // Get service IDs that are commonly upsold together
  const selectedIds = selectedServices.map(s => s.service_id || s.id);
  
  // Find potential upsells based on what's selected
  const getUpsells = () => {
    const upsells = [];
    const hasExterior = selectedServices.some(s => s.category === "exterior_wash");
    const hasInterior = selectedServices.some(s => s.category === "interior_clean");
    const hasWax = selectedServices.some(s => s.name?.toLowerCase().includes("wax"));
    const hasTire = selectedServices.some(s => s.name?.toLowerCase().includes("tire"));
    
    // If exterior wash but no interior
    if (hasExterior && !hasInterior) {
      const interior = allServices.find(s => 
        s.category === "interior_clean" && 
        s.is_active && 
        !selectedIds.includes(s.id) &&
        s.name?.toLowerCase().includes("vacuum")
      );
      if (interior) upsells.push({ ...interior, reason: "Complete your wash with interior vacuum" });
    }
    
    // If wash but no wax
    if (hasExterior && !hasWax) {
      const wax = allServices.find(s => 
        s.is_active && 
        !selectedIds.includes(s.id) &&
        (s.name?.toLowerCase().includes("wax") || s.name?.toLowerCase().includes("polish"))
      );
      if (wax) upsells.push({ ...wax, reason: "Protect your paint with a shine" });
    }
    
    // If no tire service
    if (!hasTire) {
      const tire = allServices.find(s => 
        s.is_active && 
        !selectedIds.includes(s.id) &&
        s.name?.toLowerCase().includes("tire")
      );
      if (tire) upsells.push({ ...tire, reason: "Make your tires look brand new" });
    }
    
    // Add air freshener if not selected
    const airFresh = allServices.find(s => 
      s.is_active && 
      !selectedIds.includes(s.id) &&
      s.name?.toLowerCase().includes("freshener")
    );
    if (airFresh && upsells.length < 3) {
      upsells.push({ ...airFresh, reason: "Leave with a fresh scent" });
    }
    
    return upsells.slice(0, 3);
  };

  const upsells = getUpsells();
  
  if (upsells.length === 0) return null;

  const getPrice = (service) => {
    if (vehicleType === "suv" && service.price_suv) return service.price_suv;
    if (["van", "truck", "bus"].includes(vehicleType) && service.price_van) return service.price_van;
    return service.price_kes;
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-800 dark:text-amber-200">Recommended Add-Ons</span>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {upsells.map((service) => (
          <div 
            key={service.id}
            className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{service.name}</p>
              <p className="text-xs text-slate-500">{service.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-600">
                +KES {getPrice(service)?.toLocaleString()}
              </span>
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onAddService(service)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}