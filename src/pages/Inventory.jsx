import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Loader2,
  Search,
  Phone,
  User,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: "chemicals", label: "Chemicals" },
  { value: "equipment", label: "Equipment" },
  { value: "consumables", label: "Consumables" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" }
];

const categoryColors = {
  chemicals: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  equipment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  consumables: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  utilities: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
};

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState({
    item_name: "",
    category: "consumables",
    quantity: "",
    unit: "",
    unit_cost: "",
    low_stock_threshold: "",
    usage_per_wash: "",
    supplier_name: "",
    supplier_phone: "",
    auto_deduct: true
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

  const { data: inventory = [], refetch } = useQuery({
    queryKey: ["inventory", business?.id],
    queryFn: () => api.entities.Inventory.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(i => i.quantity <= (i.low_stock_threshold || 5));

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_name: item.item_name,
        category: item.category || "consumables",
        quantity: item.quantity,
        unit: item.unit || "",
        unit_cost: item.unit_cost || "",
        low_stock_threshold: item.low_stock_threshold || "",
        usage_per_wash: item.usage_per_wash || "",
        supplier_name: item.supplier_name || "",
        supplier_phone: item.supplier_phone || "",
        auto_deduct: item.auto_deduct !== false
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_name: "",
        category: "consumables",
        quantity: "",
        unit: "",
        unit_cost: "",
        low_stock_threshold: "",
        usage_per_wash: "",
        supplier_name: "",
        supplier_phone: "",
        auto_deduct: true
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.item_name) {
      toast.error("Please enter item name");
      return;
    }

    setSaving(true);
    
    const data = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
      low_stock_threshold: formData.low_stock_threshold ? parseFloat(formData.low_stock_threshold) : null,
      usage_per_wash: formData.usage_per_wash ? parseFloat(formData.usage_per_wash) : null,
      last_restock_date: editingItem ? undefined : new Date().toISOString().split('T')[0],
      last_restock_quantity: editingItem ? undefined : parseFloat(formData.quantity) || 0
    };

    if (editingItem) {
      await api.entities.Inventory.update(editingItem.id, data);
      toast.success("Item updated");
    } else {
      await api.entities.Inventory.create({
        ...data,
        business_id: business.id
      });
      toast.success("Item added");
    }

    setSaving(false);
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    await api.entities.Inventory.delete(itemId);
    toast.success("Item deleted");
    refetch();
  };

  const handleAdjustStock = async (item, adjustment) => {
    const newQuantity = Math.max(0, item.quantity + adjustment);
    await api.entities.Inventory.update(item.id, { quantity: newQuantity });
    toast.success(`Stock ${adjustment > 0 ? 'added' : 'reduced'}`);
    refetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track consumables, chemicals, and equipment
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-emerald-500 to-cyan-500"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {lowStockItems.length} item(s) running low
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {lowStockItems.map(i => i.item_name).join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Grid */}
      {filteredInventory.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {searchQuery || categoryFilter !== "all" ? "No items found" : "No inventory items"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || categoryFilter !== "all" ? "Try different filters" : "Add items to track your stock"}
          </p>
          {!searchQuery && categoryFilter === "all" && (
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const isLowStock = item.quantity <= (item.low_stock_threshold || 5);
            const stockPercentage = item.low_stock_threshold 
              ? Math.min(100, (item.quantity / (item.low_stock_threshold * 3)) * 100)
              : 50;

            return (
              <Card 
                key={item.id} 
                className={`p-5 bg-white dark:bg-slate-800 border-0 shadow-sm ${isLowStock ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.item_name}
                    </h3>
                    <Badge className={`${categoryColors[item.category]} border-0 text-xs mt-1`}>
                      {item.category}
                    </Badge>
                  </div>
                  {isLowStock && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-slate-500">{item.unit || "units"}</span>
                    </div>
                    <Progress 
                      value={stockPercentage} 
                      className={`h-2 ${isLowStock ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                    />
                    {item.low_stock_threshold && (
                      <p className="text-xs text-slate-500 mt-1">
                        Reorder at {item.low_stock_threshold} {item.unit || "units"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {item.unit_cost && (
                      <span>KES {item.unit_cost}/{item.unit || "unit"}</span>
                    )}
                    {item.usage_per_wash && (
                      <span>• {item.usage_per_wash}/wash</span>
                    )}
                    {item.auto_deduct && (
                      <Badge variant="outline" className="text-xs">Auto-deduct</Badge>
                    )}
                  </div>
                  {item.supplier_name && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.supplier_name} {item.supplier_phone && `• ${item.supplier_phone}`}
                    </p>
                  )}
                </div>

                {/* Quick Adjust */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAdjustStock(item, -1)}
                  >
                    -1
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAdjustStock(item, 1)}
                  >
                    +1
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAdjustStock(item, 10)}
                  >
                    +10
                  </Button>
                  <div className="flex-1" />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleOpenDialog(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
              {editingItem ? "Edit Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                placeholder="e.g., Car Shampoo, Microfiber Towels"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  placeholder="e.g., liters, pieces"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost (KES)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Low Stock Alert At</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Per Wash</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={formData.usage_per_wash}
                  onChange={(e) => setFormData({ ...formData, usage_per_wash: e.target.value })}
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <Label className="text-base mb-3 block">Supplier Details</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input
                    placeholder="e.g., Kenya Chemicals Ltd"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier Phone</Label>
                  <Input
                    placeholder="07XX XXX XXX"
                    value={formData.supplier_phone}
                    onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <Label>Auto-deduct on Wash</Label>
                <p className="text-xs text-slate-500">Automatically reduce stock when wash is completed</p>
              </div>
              <Switch
                checked={formData.auto_deduct}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_deduct: checked })}
              />
            </div>
            
            <Button 
              onClick={handleSave} 
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}