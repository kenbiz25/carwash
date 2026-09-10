import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Crown, Users, Calendar, CreditCard, Edit, Trash2, Loader2,
  Check, Infinity, Gift
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { useBusiness } from "@/lib/BusinessContext";

const suggestedPlans = [
  {
    name: "Basic Monthly",
    price_monthly: 2000,
    price_yearly: 20000,
    included_washes: 4,
    discount_percent: 5,
    benefits: ["4 exterior washes per month", "5% off additional services", "Priority queue"]
  },
  {
    name: "Premium Monthly",
    price_monthly: 4000,
    price_yearly: 40000,
    included_washes: 8,
    discount_percent: 10,
    benefits: ["8 exterior washes per month", "4 interior cleans", "10% off all services", "Priority queue", "Free tire dressing"]
  },
  {
    name: "Unlimited",
    price_monthly: 7500,
    price_yearly: 75000,
    included_washes: -1,
    discount_percent: 15,
    benefits: ["Unlimited exterior washes", "8 interior cleans", "15% off detailing", "VIP priority", "Free air freshener monthly"]
  }
];

export default function Memberships() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_monthly: "",
    price_yearly: "",
    included_washes: "",
    discount_percent: "",
    benefits: []
  });
  const [newBenefit, setNewBenefit] = useState("");

  const { currentBusiness: business } = useBusiness();

  const { data: memberships = [], refetch } = useQuery({
    queryKey: ["memberships", business?.id],
    queryFn: () => api.entities.Membership.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions", business?.id],
    queryFn: () => api.entities.CustomerSubscription.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const activeSubscriptions = subscriptions.filter(s => s.status === "active");

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly || "",
        included_washes: plan.included_washes,
        discount_percent: plan.discount_percent || "",
        benefits: plan.benefits || []
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "", description: "", price_monthly: "", price_yearly: "",
        included_washes: "", discount_percent: "", benefits: []
      });
    }
    setDialogOpen(true);
  };

  const handleQuickAdd = async (suggested) => {
    await api.entities.Membership.create({
      business_id: business.id,
      ...suggested,
      is_active: true
    });
    toast.success(`${suggested.name} plan added`);
    refetch();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price_monthly) {
      toast.error("Please fill in plan name and monthly price");
      return;
    }

    setSaving(true);
    const data = {
      ...formData,
      price_monthly: parseFloat(formData.price_monthly),
      price_yearly: formData.price_yearly ? parseFloat(formData.price_yearly) : null,
      included_washes: parseInt(formData.included_washes) || 0,
      discount_percent: parseFloat(formData.discount_percent) || 0
    };

    if (editingPlan) {
      await api.entities.Membership.update(editingPlan.id, data);
      toast.success("Plan updated");
    } else {
      await api.entities.Membership.create({ ...data, business_id: business.id, is_active: true });
      toast.success("Plan created");
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (planId) => {
    if (!confirm("Delete this membership plan?")) return;
    await api.entities.Membership.delete(planId);
    toast.success("Plan deleted");
    refetch();
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({ ...prev, benefits: [...prev.benefits, newBenefit.trim()] }));
      setNewBenefit("");
    }
  };

  const removeBenefit = (index) => {
    setFormData(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== index) }));
  };

  const existingPlanNames = memberships.map(m => m.name.toLowerCase());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Membership Plans</h1>
          <p className="text-slate-500">Create recurring subscription plans for loyal customers</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{memberships.length}</p>
                <p className="text-xs text-slate-500">Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubscriptions.length}</p>
                <p className="text-xs text-slate-500">Active Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  KES {activeSubscriptions.reduce((sum, s) => {
                    const plan = memberships.find(m => m.id === s.membership_id);
                    return sum + (plan?.price_monthly || 0);
                  }, 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {subscriptions.filter(s => {
                    const renewDate = moment(s.next_billing_date);
                    return renewDate.isBetween(moment(), moment().add(7, 'days'));
                  }).length}
                </p>
                <p className="text-xs text-slate-500">Renewals This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Your Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="suggested">Suggested Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          {memberships.length === 0 ? (
            <Card className="p-12 text-center">
              <Crown className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold mb-2">No membership plans yet</h3>
              <p className="text-slate-500 mb-4">Create plans or check suggested templates</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {memberships.map((plan) => (
                <Card key={plan.id} className="bg-white dark:bg-slate-800 border-0 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        {plan.description && <p className="text-sm text-slate-500">{plan.description}</p>}
                      </div>
                      <Crown className="h-6 w-6 text-amber-500" />
                    </div>

                    <div className="mb-4">
                      <p className="text-3xl font-bold text-emerald-600">
                        KES {plan.price_monthly?.toLocaleString()}
                        <span className="text-sm font-normal text-slate-500">/month</span>
                      </p>
                      {plan.price_yearly && (
                        <p className="text-sm text-slate-500">
                          or KES {plan.price_yearly.toLocaleString()}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        {plan.included_washes === -1 ? (
                          <><Infinity className="h-4 w-4 text-emerald-500" /><span>Unlimited washes</span></>
                        ) : (
                          <><Check className="h-4 w-4 text-emerald-500" /><span>{plan.included_washes} washes/month</span></>
                        )}
                      </div>
                      {plan.discount_percent > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Gift className="h-4 w-4 text-emerald-500" />
                          <span>{plan.discount_percent}% off additional services</span>
                        </div>
                      )}
                      {plan.benefits?.slice(0, 3).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(plan)}>
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 text-center">
                      {subscriptions.filter(s => s.membership_id === plan.id && s.status === "active").length} active subscribers
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          {subscriptions.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold mb-2">No subscribers yet</h3>
              <p className="text-slate-500">Customers can subscribe to plans at checkout</p>
            </Card>
          ) : (
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Plan</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Washes Used</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Next Billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-t">
                        <td className="p-4">
                          <p className="font-medium">{sub.customer_name || "Customer"}</p>
                          <p className="text-sm text-slate-500">{sub.customer_phone}</p>
                        </td>
                        <td className="p-4">{sub.membership_name}</td>
                        <td className="p-4">
                          <Badge className={sub.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {sub.washes_remaining === -1 ? "Unlimited" : `${sub.washes_used || 0} / ${(sub.washes_used || 0) + (sub.washes_remaining || 0)}`}
                        </td>
                        <td className="p-4 text-sm">{moment(sub.next_billing_date).format("MMM D, YYYY")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggested" className="mt-4">
          <p className="text-slate-600 mb-4">Quick-add these popular membership templates:</p>
          <div className="grid md:grid-cols-3 gap-4">
            {suggestedPlans.filter(p => !existingPlanNames.includes(p.name.toLowerCase())).map((plan, index) => (
              <Card key={index} className="p-4 bg-white dark:bg-slate-800 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => handleQuickAdd(plan)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <Plus className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-emerald-600 font-bold text-xl mb-2">KES {plan.price_monthly.toLocaleString()}/mo</p>
                <div className="space-y-1">
                  {plan.benefits.slice(0, 3).map((b, i) => (
                    <p key={i} className="text-xs text-slate-500 flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />{b}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Membership Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input placeholder="e.g., Premium Monthly" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What's included..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Price (KES) *</Label>
                <Input type="number" placeholder="2000" value={formData.price_monthly} onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price (KES)</Label>
                <Input type="number" placeholder="20000" value={formData.price_yearly} onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Washes Included (-1 = unlimited)</Label>
                <Input type="number" placeholder="4" value={formData.included_washes} onChange={(e) => setFormData({ ...formData, included_washes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Discount on Extras (%)</Label>
                <Input type="number" placeholder="10" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Benefits</Label>
              <div className="flex gap-2">
                <Input placeholder="Add a benefit..." value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())} />
                <Button type="button" variant="outline" onClick={addBenefit}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.benefits.map((benefit, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {benefit}
                    <button onClick={() => removeBenefit(index)} className="ml-1 hover:text-red-500">×</button>
                  </Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}