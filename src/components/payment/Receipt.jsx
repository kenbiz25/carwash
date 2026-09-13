import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, CheckCircle } from "@/lib/icons";
import { api } from "@/api/firebaseClient";
import moment from "moment";

const METHOD_LABELS = { mpesa: "M-Pesa", cash: "Cash", card: "Card" };

// A receipt number needs no server round-trip - the payment record's own id
// (already unique) is enough, just shortened and shouted for a human to read
// off a printed slip.
function receiptNumber(payment) {
  return `RCP-${(payment?.id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function Receipt({ wash, payment, businessId, open, onOpenChange }) {
  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => (await api.entities.Business.filter({ id: businessId }))[0],
    enabled: !!businessId && open,
  });

  if (!wash || !payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm print:shadow-none print:border-0">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #receipt-printable, #receipt-printable * { visibility: visible; }
            #receipt-printable {
              position: fixed; inset: 0; padding: 16px;
              width: 100%; max-width: 340px; margin: 0 auto;
            }
          }
        `}</style>

        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Payment Successful
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-printable" className="font-mono text-sm space-y-3">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-base">{business?.name || "BGO Shine Hub"}</p>
            {business?.address && <p className="text-xs text-slate-500">{business.address}</p>}
            {business?.phone && <p className="text-xs text-slate-500">Tel: {business.phone}</p>}
            <p className="text-xs text-slate-400 mt-1">{receiptNumber(payment)}</p>
            <p className="text-xs text-slate-400">{moment(payment.created_date || new Date()).format("DD MMM YYYY, h:mm A")}</p>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Plate:</span><span className="font-semibold">{wash.plate_number}</span></div>
            {wash.customer_name && (
              <div className="flex justify-between"><span className="text-slate-500">Customer:</span><span>{wash.customer_name}</span></div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            {(wash.services || []).map((s, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate pr-2">{s.name}</span>
                <span className="flex-shrink-0">{(s.price || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span>KES {(payment.amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Paid via</span>
              <span>{METHOD_LABELS[payment.method] || payment.method}</span>
            </div>
            {payment.mpesa_receipt && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>M-Pesa Ref</span>
                <span>{payment.mpesa_receipt}</span>
              </div>
            )}
            {payment.transaction_ref && !payment.mpesa_receipt && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Ref</span>
                <span>{payment.transaction_ref}</span>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 border-t border-dashed border-slate-300 pt-2">
            Thank you for choosing {business?.name || "us"}!
          </p>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />Close
          </Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
