import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Heart,
  Phone,
  Star,
  Calendar,
  Search,
  Edit,
  Gift,
  TrendingUp
} from "@/lib/icons";
import { toast } from "sonner";
import moment from "moment";
import StatCard from "@/components/common/StatCard";
import { useBusiness } from "@/lib/BusinessContext";

export default function Loyalty() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const [saving, setSaving] = useState(false);

  const { currentBusiness: business } = useBusiness();

  const { data: customers = [], refetch } = useQuery({
    queryKey: ["loyaltyCustomers", business?.id],
    queryFn: () => api.entities.LoyaltyCustomer.filter({ business_id: business?.id }, "-visits_count", 100),
    enabled: !!business?.id,
  });

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  // Stats
  const totalCustomers = customers.length;
  const totalVisits = customers.reduce((sum, c) => sum + (c.visits_count || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const topCustomer = customers.length > 0 ? customers[0] : null;

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || "",
        phone: customer.phone,
        email: customer.email || ""
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", email: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.phone) {
      toast.error("Please enter phone number");
      return;
    }

    setSaving(true);
    
    if (editingCustomer) {
      await api.entities.LoyaltyCustomer.update(editingCustomer.id, formData);
      toast.success("Customer updated");
    } else {
      // Check if customer already exists
      const existing = customers.find(c => c.phone === formData.phone);
      if (existing) {
        toast.error("Customer with this phone already exists");
        setSaving(false);
        return;
      }

      await api.entities.LoyaltyCustomer.create({
        ...formData,
        business_id: business.id,
        visits_count: 0,
        points: 0,
        total_spent: 0
      });
      toast.success("Customer added to loyalty program");
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleAddPoints = async (customer, points) => {
    const newPoints = (customer.points || 0) + points;
    await api.entities.LoyaltyCustomer.update(customer.id, { points: newPoints });
    toast.success(`Added ${points} points`);
    refetch();
  };

  const getRewardStatus = (visits) => {
    if (visits >= 10) return { label: "VIP", color: "bg-amber-100 text-amber-700" };
    if (visits >= 5) return { label: "Gold", color: "bg-yellow-100 text-yellow-700" };
    if (visits >= 3) return { label: "Silver", color: "bg-slate-100 text-slate-700" };
    return { label: "Bronze", color: "bg-orange-100 text-orange-700" };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Loyalty Program</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track repeat customers and reward loyalty
          </p>
        </div>
        <Button 
          variant="gradient"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={Heart}
          iconColor="text-brand-orange"
          iconBg="bg-brand-orange-50 dark:bg-brand-orange/10"
        />
        <StatCard
          title="Total Visits"
          value={totalVisits}
          icon={TrendingUp}
          iconColor="text-brand-navy dark:text-brand-blue-light"
          iconBg="bg-brand-navy-50 dark:bg-brand-navy-mid/40"
        />
        <StatCard
          title="Total Spent"
          value={`KES ${totalSpent.toLocaleString()}`}
          icon={Star}
          iconColor="text-brand-blue-mid dark:text-brand-blue-light"
          iconBg="bg-brand-blue-pale/40 dark:bg-brand-blue-mid/20"
        />
        <StatCard
          title="Top Customer"
          value={topCustomer?.name || "-"}
          subtitle={topCustomer ? `${topCustomer.visits_count} visits` : ""}
          icon={Gift}
          iconColor="text-brand-orange-hot"
          iconBg="bg-brand-orange-100 dark:bg-brand-orange/10"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
          <Heart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {searchQuery ? "No customers found" : "No loyalty customers yet"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery ? "Try a different search" : "Add customers to your loyalty program"}
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => handleOpenDialog()}
              variant="gradient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Customer
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const reward = getRewardStatus(customer.visits_count || 0);
            const nextReward = customer.visits_count < 10 
              ? (customer.visits_count < 5 ? 5 - customer.visits_count : 10 - customer.visits_count)
              : 0;

            return (
              <Card 
                key={customer.id} 
                className="p-5 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white text-lg">
                      {customer.name?.charAt(0) || customer.phone?.slice(-2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {customer.name || "Customer"}
                      </h3>
                      <Badge className={`${reward.color} border-0 text-xs`}>
                        {reward.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {customer.visits_count || 0}
                    </p>
                    <p className="text-xs text-slate-500">Visits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">
                      {customer.points || 0}
                    </p>
                    <p className="text-xs text-slate-500">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-cyan-600">
                      {(customer.total_spent || 0) > 1000 
                        ? `${Math.round((customer.total_spent || 0) / 1000)}K`
                        : customer.total_spent || 0
                      }
                    </p>
                    <p className="text-xs text-slate-500">KES Spent</p>
                  </div>
                </div>

                {/* Progress to next reward */}
                {nextReward > 0 && (
                  <div className="mt-3 text-xs text-slate-500 text-center">
                    {nextReward} more visit{nextReward > 1 ? 's' : ''} to next tier
                  </div>
                )}

                {/* Last Visit */}
                {customer.last_visit_date && (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Last visit: {moment(customer.last_visit_date).fromNow()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleAddPoints(customer, 10)}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    +10 Points
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Loyalty Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="07XX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Used to identify returning customers
              </p>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                placeholder="John Kamau"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                placeholder="customer@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <Button 
              onClick={handleSave} 
              variant="gradient" className="w-full"
              disabled={saving}
            >
              {editingCustomer ? "Update Customer" : "Add to Loyalty Program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}