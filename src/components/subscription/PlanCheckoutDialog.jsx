import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  Crown,
  Calendar,
  Shield
} from "lucide-react";
import { api } from "@/api/firebaseClient";
import { toast } from "sonner";
import { format, addDays, addMonths, addYears } from "date-fns";

const PLANS = {
  starter: {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    features: ["1 wash bay", "Unlimited washes", "Basic reports", "Manual payments", "Email support"]
  },
  pro: {
    name: "Pro",
    monthly: 1500,
    yearly: 15000,
    features: ["Unlimited bays", "Live CCTV integration", "M-Pesa STK Push", "Staff commissions", "Inventory tracking", "SMS notifications", "Priority support"]
  },
  enterprise: {
    name: "Enterprise",
    monthly: 4500,
    yearly: 45000,
    features: ["Everything in Pro", "Multi-location", "Advanced analytics", "API access", "Custom integrations", "Dedicated support", "Training included"]
  }
};

export default function PlanCheckoutDialog({ plan, open, onOpenChange, onSuccess }) {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const planData = PLANS[plan] || PLANS.starter;
  const price = billingCycle === "monthly" ? planData.monthly : planData.yearly;
  const isFree = price === 0;
  const trialDays = plan === "pro" ? 14 : 0;

  const handleSubscribe = async () => {
    if (!isFree && paymentMethod === "mpesa" && (!phone || phone.length < 10)) {
      toast.error("Please enter a valid M-Pesa phone number");
      return;
    }

    setLoading(true);

    try {
      const user = await api.auth.me();
      const now = new Date();
      
      // Calculate dates
      const trialEndsAt = trialDays > 0 ? addDays(now, trialDays) : null;
      const periodEnd = billingCycle === "monthly" 
        ? addMonths(now, 1) 
        : addYears(now, 1);

      // Create subscription
      await api.entities.BusinessSubscription.create({
        user_email: user.email,
        plan: plan,
        status: isFree ? "active" : (trialDays > 0 ? "trialing" : "active"),
        price_monthly: planData.monthly,
        billing_cycle: billingCycle,
        trial_ends_at: trialEndsAt?.toISOString(),
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
        next_billing_date: (trialEndsAt || periodEnd).toISOString().split('T')[0],
        payment_method: paymentMethod,
        mpesa_phone: phone,
        auto_renew: !isFree
      });

      // Update business subscription plan if exists
      const businesses = await api.entities.Business.filter({ owner_email: user.email });
      if (businesses.length > 0) {
        await api.entities.Business.update(businesses[0].id, {
          subscription_plan: plan
        });
      }

      // Simulate M-Pesa STK Push for paid plans without trial
      if (!isFree && trialDays === 0) {
        toast.info("M-Pesa STK Push sent to " + phone, {
          description: "Please complete payment on your phone"
        });
        // In production, you'd wait for callback
        await new Promise(r => setTimeout(r, 2000));
      }

      setSuccess(true);
      toast.success(isFree ? "Welcome to BGO Shine Hub!" : (trialDays > 0 ? "Trial started!" : "Subscription activated!"));
      
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      toast.error("Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isFree ? "Welcome to BGO Shine Hub!" : (trialDays > 0 ? "Trial Started!" : "Subscription Active!")}
            </h3>
            <p className="text-slate-500">
              {trialDays > 0 
                ? `Your ${trialDays}-day free trial has started. Enjoy all Pro features!`
                : "You're all set. Let's grow your car wash business!"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            {isFree ? "Get Started Free" : `Subscribe to ${planData.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{planData.name} Plan</h3>
                {trialDays > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 mt-1">
                    {trialDays}-day free trial
                  </Badge>
                )}
              </div>
              <div className="text-right">
                {isFree ? (
                  <p className="text-2xl font-bold text-emerald-600">Free</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-600">
                      KES {price.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">
                      {billingCycle === "monthly" ? "/month" : "/year"}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              {planData.features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  <span>{f}</span>
                </div>
              ))}
              {planData.features.length > 4 && (
                <p className="text-xs text-slate-400 mt-1">+{planData.features.length - 4} more features</p>
              )}
            </div>
          </div>

          {/* Billing Cycle - only for paid plans */}
          {!isFree && (
            <div className="space-y-3">
              <Label>Billing Cycle</Label>
              <RadioGroup value={billingCycle} onValueChange={setBillingCycle} className="grid grid-cols-2 gap-3">
                <div>
                  <RadioGroupItem value="monthly" id="monthly" className="peer sr-only" />
                  <Label
                    htmlFor="monthly"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 transition-all"
                  >
                    <Calendar className="h-5 w-5 mb-1 text-slate-600" />
                    <span className="font-medium">Monthly</span>
                    <span className="text-sm text-slate-500">KES {planData.monthly.toLocaleString()}/mo</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="yearly" id="yearly" className="peer sr-only" />
                  <Label
                    htmlFor="yearly"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 transition-all relative"
                  >
                    <Badge className="absolute -top-2 right-2 bg-emerald-500 text-white text-xs">Save 17%</Badge>
                    <Shield className="h-5 w-5 mb-1 text-slate-600" />
                    <span className="font-medium">Yearly</span>
                    <span className="text-sm text-slate-500">KES {planData.yearly.toLocaleString()}/yr</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Payment Method - only for paid plans without full trial */}
          {!isFree && (
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-3">
                <div>
                  <RadioGroupItem value="mpesa" id="pay-mpesa" className="peer sr-only" />
                  <Label
                    htmlFor="pay-mpesa"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 transition-all"
                  >
                    <Smartphone className="h-5 w-5 mb-1 text-green-600" />
                    <span className="font-medium">M-Pesa</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="card" id="pay-card" className="peer sr-only" />
                  <Label
                    htmlFor="pay-card"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50 transition-all"
                  >
                    <CreditCard className="h-5 w-5 mb-1 text-purple-600" />
                    <span className="font-medium">Card</span>
                  </Label>
                </div>
              </RadioGroup>

              {paymentMethod === "mpesa" && (
                <div className="space-y-2 mt-3">
                  <Label>M-Pesa Phone Number</Label>
                  <Input
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {trialDays > 0 && (
                    <p className="text-xs text-slate-500">
                      You won't be charged until your trial ends on {format(addDays(new Date(), trialDays), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subscribe Button */}
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Crown className="h-4 w-4 mr-2" />
            )}
            {isFree 
              ? "Get Started Free" 
              : (trialDays > 0 
                  ? `Start ${trialDays}-Day Free Trial` 
                  : `Subscribe - KES ${price.toLocaleString()}`)}
          </Button>

          {!isFree && (
            <p className="text-xs text-center text-slate-500">
              Cancel anytime. {trialDays > 0 ? "No charge during trial." : "Billed " + billingCycle + "."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}