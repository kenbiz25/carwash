import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Smartphone, 
  Banknote, 
  CreditCard, 
  Loader2,
  CheckCircle
} from "lucide-react";
import { api } from "@/api/firebaseClient";
import { toast } from "sonner";
import { sendPaymentConfirmation } from "@/components/notifications/NotificationService";

export default function PaymentDialog({ wash, open, onOpenChange, businessId, onSuccess }) {
  const [method, setMethod] = useState("mpesa");
  const [phone, setPhone] = useState(wash?.customer_phone || "");
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState(null); // 'pending' | 'success' | 'failed'

  const handleMpesaSTKPush = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setMpesaStatus("pending");

    // Simulate STK Push - In production, this would call your M-Pesa API
    // The actual integration would use Safaricom Daraja API
    toast.info("STK Push sent to " + phone, {
      description: "Customer will receive M-Pesa prompt on their phone"
    });

    // Simulate waiting for callback
    setTimeout(async () => {
      // In production, this would be triggered by M-Pesa callback
      setMpesaStatus("success");
      
      // Create payment record
      await api.entities.Payment.create({
        business_id: businessId,
        wash_id: wash.id,
        amount: wash.amount_due,
        method: "mpesa",
        phone_number: phone,
        transaction_ref: `MPESA${Date.now()}`,
        mpesa_receipt: `QHL${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        status: "confirmed"
      });

      // Update wash status
      await api.entities.Wash.update(wash.id, {
        status: "paid",
        amount_paid: wash.amount_due,
        payment_method: "mpesa",
        exit_time: new Date().toISOString()
      });

      setLoading(false);
      toast.success("Payment confirmed!");
      
      // Send SMS notification to customer
      if (wash.customer_phone) {
        sendPaymentConfirmation(wash, { amount: wash.amount_due, mpesa_receipt: `QHL${Math.random().toString(36).substr(2, 8).toUpperCase()}` }, null);
      }
      
      // Update loyalty points (10 points per 100 KES)
      if (wash.customer_phone) {
        const customers = await api.entities.LoyaltyCustomer.filter({ phone: wash.customer_phone, business_id: businessId });
        if (customers[0]) {
          const pointsEarned = Math.floor(wash.amount_due / 100) * 10;
          await api.entities.LoyaltyCustomer.update(customers[0].id, {
            points: (customers[0].points || 0) + pointsEarned,
            total_spent: (customers[0].total_spent || 0) + wash.amount_due,
            visits_count: (customers[0].visits_count || 0) + 1,
            last_visit_date: new Date().toISOString()
          });
        }
      }
      
      onSuccess?.();
      setTimeout(() => onOpenChange(false), 1500);
    }, 3000);
  };

  const handleCashPayment = async () => {
    setLoading(true);

    await api.entities.Payment.create({
      business_id: businessId,
      wash_id: wash.id,
      amount: wash.amount_due,
      method: "cash",
      transaction_ref: transactionRef || `CASH${Date.now()}`,
      status: "confirmed"
    });

    await api.entities.Wash.update(wash.id, {
      status: "paid",
      amount_paid: wash.amount_due,
      payment_method: "cash",
      exit_time: new Date().toISOString()
    });

    setLoading(false);
    toast.success("Cash payment recorded!");
    
    // Update loyalty
    if (wash.customer_phone) {
      const customers = await api.entities.LoyaltyCustomer.filter({ phone: wash.customer_phone, business_id: businessId });
      if (customers[0]) {
        const pointsEarned = Math.floor(wash.amount_due / 100) * 10;
        await api.entities.LoyaltyCustomer.update(customers[0].id, {
          points: (customers[0].points || 0) + pointsEarned,
          total_spent: (customers[0].total_spent || 0) + wash.amount_due,
          visits_count: (customers[0].visits_count || 0) + 1,
          last_visit_date: new Date().toISOString()
        });
      }
    }
    
    onSuccess?.();
    onOpenChange(false);
  };

  const handleCardPayment = async () => {
    if (!transactionRef) {
      toast.error("Please enter card transaction reference");
      return;
    }

    setLoading(true);

    await api.entities.Payment.create({
      business_id: businessId,
      wash_id: wash.id,
      amount: wash.amount_due,
      method: "card",
      transaction_ref: transactionRef,
      status: "confirmed"
    });

    await api.entities.Wash.update(wash.id, {
      status: "paid",
      amount_paid: wash.amount_due,
      payment_method: "card",
      exit_time: new Date().toISOString()
    });

    setLoading(false);
    toast.success("Card payment recorded!");
    
    // Update loyalty
    if (wash.customer_phone) {
      const customers = await api.entities.LoyaltyCustomer.filter({ phone: wash.customer_phone, business_id: businessId });
      if (customers[0]) {
        const pointsEarned = Math.floor(wash.amount_due / 100) * 10;
        await api.entities.LoyaltyCustomer.update(customers[0].id, {
          points: (customers[0].points || 0) + pointsEarned,
          total_spent: (customers[0].total_spent || 0) + wash.amount_due,
          visits_count: (customers[0].visits_count || 0) + 1,
          last_visit_date: new Date().toISOString()
        });
      }
    }
    
    onSuccess?.();
    onOpenChange(false);
  };

  if (!wash) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Process Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wash Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-lg">{wash.plate_number}</p>
                <p className="text-sm text-slate-500">
                  {wash.services?.map(s => s.name).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Amount Due</p>
                <p className="text-2xl font-bold text-emerald-600">
                  KES {(wash.amount_due || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          {mpesaStatus !== "success" && (
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-3 gap-3">
                <div>
                  <RadioGroupItem value="mpesa" id="mpesa" className="peer sr-only" />
                  <Label
                    htmlFor="mpesa"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 dark:peer-data-[state=checked]:bg-green-900/20 transition-all"
                  >
                    <Smartphone className="h-6 w-6 mb-2 text-green-600" />
                    <span className="font-medium">M-Pesa</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/20 transition-all"
                  >
                    <Banknote className="h-6 w-6 mb-2 text-blue-600" />
                    <span className="font-medium">Cash</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="card" id="card" className="peer sr-only" />
                  <Label
                    htmlFor="card"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50 dark:peer-data-[state=checked]:bg-purple-900/20 transition-all"
                  >
                    <CreditCard className="h-6 w-6 mb-2 text-purple-600" />
                    <span className="font-medium">Card</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* M-Pesa Status */}
          {mpesaStatus === "success" && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-lg text-green-600">Payment Successful!</p>
              <p className="text-slate-500">M-Pesa payment confirmed</p>
            </div>
          )}

          {/* M-Pesa Form */}
          {method === "mpesa" && mpesaStatus !== "success" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Phone Number</Label>
                <Input
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={mpesaStatus === "pending"}
                />
                <p className="text-xs text-slate-500">
                  STK Push will be sent to this number
                </p>
              </div>

              {mpesaStatus === "pending" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Waiting for payment...
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      Customer should enter M-Pesa PIN on their phone
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleMpesaSTKPush}
                disabled={loading || mpesaStatus === "pending"}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading || mpesaStatus === "pending" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                {mpesaStatus === "pending" ? "Waiting for Confirmation..." : "Send M-Pesa Request"}
              </Button>
            </div>
          )}

          {/* Cash Form */}
          {method === "cash" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reference (Optional)</Label>
                <Input
                  placeholder="Receipt number or notes"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCashPayment}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4 mr-2" />
                )}
                Record Cash Payment
              </Button>
            </div>
          )}

          {/* Card Form */}
          {method === "card" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Transaction Reference *</Label>
                <Input
                  placeholder="Card transaction ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCardPayment}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Record Card Payment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}