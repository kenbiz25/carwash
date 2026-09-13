import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "@/lib/icons";

export default function JobWizardStepper({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              idx < currentStep
                ? "bg-emerald-500 border-emerald-500 text-white"
                : idx === currentStep
                  ? "bg-white border-emerald-500 text-emerald-600"
                  : "bg-white border-slate-200 text-slate-400"
            )}>
              {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span className={cn(
              "text-[10px] mt-1 text-center max-w-[64px] leading-tight",
              idx === currentStep ? "text-emerald-600 font-semibold" : "text-slate-400"
            )}>{step}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn(
              "h-0.5 flex-1 mx-1 mt-[-12px]",
              idx < currentStep ? "bg-emerald-400" : "bg-slate-200"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}