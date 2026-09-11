import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Wrench,
  Clock,
  Edit,
  Trash2,
  Loader2,
  Sparkles,
  Car,
  Droplets,
  Camera,
  Settings,
  Layers
} from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: "exterior_wash", label: "Exterior Wash", icon: Droplets, description: "Basic to premium exterior cleaning" },
  { value: "interior_clean", label: "Interior Clean", icon: Sparkles, description: "Vacuum, dashboard, seats, carpets" },
  { value: "detailing", label: "Detailing", icon: Car, description: "Wax, polish, ceramic coating" },
  { value: "mechanical", label: "Mechanical", icon: Settings, description: "Oil change, tire service, engine" },
  { value: "carpet_wash", label: "Carpet Wash", icon: Layers, description: "Carpets, mats and upholstery wash" },
  { value: "add_on", label: "Add-Ons", icon: Plus, description: "Individual services and extras" },
  { value: "package", label: "Packages", icon: Wrench, description: "Bundled service packages" }
];

const suggestedServices = [
  // Exterior Wash
  { name: "Basic Exterior Wash", category: "exterior_wash", price: 300, duration: 15 },
  { name: "Premium Exterior Wash", category: "exterior_wash", price: 500, duration: 25 },
  { name: "Foam Wash", category: "exterior_wash", price: 400, duration: 20 },
  { name: "Hand Wash", category: "exterior_wash", price: 350, duration: 20 },
  { name: "Exterior Pressure Wash", category: "exterior_wash", price: 450, duration: 20 },
  { name: "Touchless Wash", category: "exterior_wash", price: 350, duration: 15 },

  // Interior Clean
  { name: "Vacuuming", category: "interior_clean", price: 150, duration: 10 },
  { name: "Full Vacuuming", category: "interior_clean", price: 250, duration: 20 },
  { name: "Interior Vacuum & Dusting", category: "interior_clean", price: 300, duration: 25 },
  { name: "Full Interior Clean", category: "interior_clean", price: 600, duration: 40 },
  { name: "Dashboard Polish", category: "interior_clean", price: 200, duration: 15 },
  { name: "Leather Conditioning", category: "interior_clean", price: 400, duration: 25 },
  { name: "Carpet Shampoo", category: "interior_clean", price: 500, duration: 35 },
  { name: "Seat Shampoo", category: "interior_clean", price: 400, duration: 30 },
  { name: "Seat Cover Wash", category: "interior_clean", price: 300, duration: 25 },
  { name: "Headliner Clean", category: "interior_clean", price: 300, duration: 20 },
  { name: "Odor Removal", category: "interior_clean", price: 500, duration: 30 },

  // Detailing
  { name: "Full Body Wax", category: "detailing", price: 1500, duration: 60 },
  { name: "Clay Bar Treatment", category: "detailing", price: 800, duration: 40 },
  { name: "Buffing/Polishing", category: "detailing", price: 1500, duration: 60 },
  { name: "Paint Correction", category: "detailing", price: 3000, duration: 120 },
  { name: "Ceramic Coating", category: "detailing", price: 5000, duration: 180 },
  { name: "Headlight Restoration", category: "detailing", price: 500, duration: 30 },

  // Mechanical
  { name: "Engine Wash", category: "mechanical", price: 500, duration: 20 },
  { name: "Engine Bay Cleaning", category: "mechanical", price: 600, duration: 25 },
  { name: "Engine Dressing", category: "mechanical", price: 300, duration: 15 },
  { name: "Oil Change", category: "mechanical", price: 1500, duration: 30 },
  { name: "Wheel & Tire Shine", category: "mechanical", price: 250, duration: 15 },
  { name: "Tyre Dressing", category: "mechanical", price: 150, duration: 10 },
  { name: "Undercarriage Wash", category: "mechanical", price: 400, duration: 20 },

  // Add-Ons
  { name: "Air Freshener", category: "add_on", price: 100, duration: 5 },
  { name: "Windshield Treatment", category: "add_on", price: 200, duration: 10 },
  { name: "Pet Hair Removal", category: "add_on", price: 300, duration: 20 },
  { name: "Stain Removal", category: "add_on", price: 350, duration: 25 },
  { name: "Rim Polish", category: "add_on", price: 200, duration: 15 },
  
  // Carpet Wash
  { name: "Car Mat Wash", category: "carpet_wash", price: 150, duration: 15 },
  { name: "Car Mat Wash (Full Set)", category: "carpet_wash", price: 400, duration: 25 },
  { name: "Small Carpet Wash", category: "carpet_wash", price: 300, duration: 30 },
  { name: "Medium Carpet Wash", category: "carpet_wash", price: 500, duration: 45 },
  { name: "Large Carpet Wash", category: "carpet_wash", price: 800, duration: 60 },
  { name: "Extra Large Carpet Wash", category: "carpet_wash", price: 1200, duration: 90 },
  { name: "Carpet Steam Clean", category: "carpet_wash", price: 600, duration: 45 },
  { name: "Carpet Stain Removal", category: "carpet_wash", price: 400, duration: 30 },
  { name: "Carpet Deodorize", category: "carpet_wash", price: 200, duration: 15 },
  { name: "Upholstery Wash", category: "carpet_wash", price: 700, duration: 60 },

  // Packages
  { name: "Basic Package", category: "package", price: 500, duration: 30, description: "Exterior wash + Interior vacuum", isPackage: true },
  { name: "Premium Package", category: "package", price: 1200, duration: 60, description: "Full wash + Interior + Dashboard + Tire shine", isPackage: true },
  { name: "Full Detail Package", category: "package", price: 3500, duration: 180, description: "Complete detail + Wax + Engine + Interior deep clean", isPackage: true },
  { name: "VIP Package", category: "package", price: 5000, duration: 240, description: "Everything included + Ceramic coating + Premium wax", isPackage: true }
];

export default function Services() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    category: "exterior_wash",
    description: "",
    price_kes: "",
    price_suv: "",
    price_van: "",
    duration_minutes: "",
    commission_percent: 10,
    requires_photo_proof: false,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  const { data: business } = useQuery({
    queryKey: ["business", user?.business_id],
    queryFn: async () => {
      const businesses = await api.entities.Business.filter({ id: user?.business_id });
      return businesses[0];
    },
    enabled: !!user?.business_id,
  });

  const { data: services = [], refetch } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const handleOpenDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        category: service.category || "exterior_wash",
        description: service.description || "",
        price_kes: service.price_kes,
        price_suv: service.price_suv || "",
        price_van: service.price_van || "",
        duration_minutes: service.duration_minutes || "",
        commission_percent: service.commission_percent || 10,
        requires_photo_proof: service.requires_photo_proof || false,
        is_active: service.is_active !== false
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "", category: "exterior_wash", description: "", price_kes: "",
        price_suv: "", price_van: "", duration_minutes: "", commission_percent: 10,
        requires_photo_proof: false, is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleQuickAdd = async (suggested) => {
    await api.entities.Service.create({
      business_id: business.id,
      name: suggested.name,
      category: suggested.category,
      description: suggested.description || "",
      price_kes: suggested.price,
      duration_minutes: suggested.duration,
      commission_percent: 10,
      is_package: suggested.isPackage || false,
      is_active: true
    });
    toast.success(`${suggested.name} added`);
    refetch();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price_kes) {
      toast.error("Please fill in service name and price");
      return;
    }

    setSaving(true);
    
    const data = {
      ...formData,
      price_kes: parseFloat(formData.price_kes),
      price_suv: formData.price_suv ? parseFloat(formData.price_suv) : null,
      price_van: formData.price_van ? parseFloat(formData.price_van) : null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      commission_percent: parseFloat(formData.commission_percent)
    };

    if (editingService) {
      await api.entities.Service.update(editingService.id, data);
      toast.success("Service updated");
    } else {
      await api.entities.Service.create({
        ...data,
        business_id: business.id
      });
      toast.success("Service added");
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (serviceId) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    await api.entities.Service.delete(serviceId);
    toast.success("Service deleted");
    refetch();
  };

  const handleToggleActive = async (service) => {
    await api.entities.Service.update(service.id, { is_active: !service.is_active });
    toast.success(service.is_active ? "Service disabled" : "Service enabled");
    refetch();
  };

  const filteredServices = activeCategory === "all" 
    ? services 
    : services.filter(s => s.category === activeCategory);

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || Wrench;
  };

  const existingServiceNames = services.map(s => s.name.toLowerCase());
  const availableSuggestions = suggestedServices.filter(s => 
    !existingServiceNames.includes(s.name.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Services & Products</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure your car wash services and pricing
          </p>
        </div>
        <Button 
          variant="gradient"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Your Services</TabsTrigger>
          <TabsTrigger value="suggested">Suggested Services</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4 mt-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              All ({services.length})
            </Button>
            {categories.map(cat => {
              const count = services.filter(s => s.category === cat.value).length;
              return (
                <Button
                  key={cat.value}
                  variant={activeCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.value)}
                >
                  <cat.icon className="h-3 w-3 mr-1" />
                  {cat.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No services in this category
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Add services or check the suggested services tab
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => {
                const Icon = getCategoryIcon(service.category);
                return (
                  <Card 
                    key={service.id} 
                    className={`p-5 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all ${!service.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {service.name}
                          </h3>
                          <p className="text-xs text-slate-500 capitalize">
                            {categories.find(c => c.value === service.category)?.label || service.category}
                          </p>
                        </div>
                      </div>
                      {service.requires_photo_proof && (
                        <Badge variant="outline" className="text-xs">
                          <Camera className="h-3 w-3 mr-1" />
                          Photo
                        </Badge>
                      )}
                    </div>

                    {service.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {service.description}
                      </p>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Saloon</span>
                        <span className="font-semibold text-emerald-600">KES {service.price_kes?.toLocaleString()}</span>
                      </div>
                      {service.price_suv && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">SUV</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">KES {service.price_suv?.toLocaleString()}</span>
                        </div>
                      )}
                      {service.price_van && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Van/Truck</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">KES {service.price_van?.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-slate-500">
                      {service.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes} min
                        </span>
                      )}
                      <span>{service.commission_percent || 10}% commission</span>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleOpenDialog(service)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleActive(service)}
                      >
                        {service.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggested" className="space-y-4 mt-4">
          <p className="text-slate-600 dark:text-slate-400">
            Click to quickly add these industry-standard services to your menu:
          </p>
          
          {categories.map(category => {
            const catSuggestions = availableSuggestions.filter(s => s.category === category.value);
            if (catSuggestions.length === 0) return null;
            
            return (
              <div key={category.value}>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-emerald-600" />
                  {category.label}
                </h3>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {catSuggestions.map((suggested, index) => (
                    <Card 
                      key={index}
                      className="p-4 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md cursor-pointer transition-all"
                      onClick={() => handleQuickAdd(suggested)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{suggested.name}</p>
                          <p className="text-emerald-600 font-semibold">KES {suggested.price}</p>
                        </div>
                        <Plus className="h-5 w-5 text-emerald-500" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {availableSuggestions.length === 0 && (
            <Card className="p-8 text-center bg-white dark:bg-slate-800 border-0">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              <p className="text-slate-600">You've added all suggested services! 🎉</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Service Name *</Label>
                <Input
                  placeholder="e.g., Premium Wash"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What's included..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Saloon Price (KES) *</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={formData.price_kes}
                  onChange={(e) => setFormData({ ...formData, price_kes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>SUV Price</Label>
                <Input
                  type="number"
                  placeholder="700"
                  value={formData.price_suv}
                  onChange={(e) => setFormData({ ...formData, price_suv: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Van/Truck Price</Label>
                <Input
                  type="number"
                  placeholder="900"
                  value={formData.price_van}
                  onChange={(e) => setFormData({ ...formData, price_van: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  value={formData.commission_percent}
                  onChange={(e) => setFormData({ ...formData, commission_percent: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-500" />
                <div>
                  <Label className="text-sm">Require Photo Proof</Label>
                  <p className="text-xs text-slate-500">Staff must upload before/after photos</p>
                </div>
              </div>
              <Switch
                checked={formData.requires_photo_proof}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_photo_proof: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <Button 
              onClick={handleSave} 
              variant="gradient" className="w-full"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingService ? "Update Service" : "Add Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}