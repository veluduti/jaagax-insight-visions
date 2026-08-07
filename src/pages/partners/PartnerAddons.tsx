import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Utensils,
  Car,
  Mountain,
  Sparkles,
  Package,
  Coffee,
  Wine,
  Dumbbell,
  Wifi,
  Tv,
  ShoppingBag,
  Tag,
  TrendingUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
type Addon = {
  id: string;
  hotel_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  is_active: boolean;
  is_taxable: boolean;
  tax_rate: number | null;
  max_quantity: number | null;
  min_quantity: number | null;
  availability_start: string | null;
  availability_end: string | null;
  days_available: number[] | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Category = {
  value: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
};

const CATEGORIES: Category[] = [
  {
    value: "fnb",
    label: "Food & Beverage",
    icon: Utensils,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  {
    value: "breakfast",
    label: "Breakfast",
    icon: Coffee,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  {
    value: "transport",
    label: "Transport",
    icon: Car,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "experience",
    label: "Experiences",
    icon: Mountain,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    value: "wellness",
    label: "Wellness & Spa",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  {
    value: "entertainment",
    label: "Entertainment",
    icon: Tv,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10 border-pink-500/20",
  },
  {
    value: "amenities",
    label: "Amenities",
    icon: Wifi,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    value: "other",
    label: "Other",
    icon: Package,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-muted",
  },
];

const UNIT_OPTIONS = [
  { value: "per_booking", label: "Per Booking" },
  { value: "per_guest", label: "Per Guest" },
  { value: "per_night", label: "Per Night" },
  { value: "per_person", label: "Per Person" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function PartnerAddons() {
  const { loading, hotelId } = usePartnerHotel();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [draft, setDraft] = useState<Partial<Addon>>({
    title: "",
    description: "",
    category: "fnb",
    price: 0,
    unit: "per_booking",
    is_active: true,
    is_taxable: false,
    tax_rate: null,
    max_quantity: null,
    min_quantity: 1,
    availability_start: null,
    availability_end: null,
    days_available: [],
    sort_order: 0,
  });

  const load = async () => {
    if (!hotelId) return;
    try {
      const { data, error } = await supabase
        .from("hotel_addons")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      setAddons(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load add-ons");
    }
  };

  useEffect(() => {
    load();
  }, [hotelId]);

  const validateDraft = (draft: Partial<Addon>): string[] => {
    const errors: string[] = [];
    if (!draft.title?.trim()) errors.push("Title is required");
    if (!draft.price || draft.price < 0) errors.push("Price must be greater than 0");
    if (draft.min_quantity && draft.min_quantity < 0) errors.push("Minimum quantity cannot be negative");
    if (draft.max_quantity && draft.max_quantity < (draft.min_quantity || 0)) {
      errors.push("Maximum quantity must be greater than minimum quantity");
    }
    return errors;
  };

  const save = async () => {
    if (!hotelId) {
      toast.error("Hotel not found");
      return;
    }

    const errors = validateDraft(draft);
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...draft,
        hotel_id: hotelId,
        price: Number(draft.price),
        tax_rate: draft.is_taxable ? Number(draft.tax_rate) || 0 : null,
        days_available: draft.days_available || [],
      };

      let result;
      if (draft.id) {
        result = await supabase.from("hotel_addons").update(payload).eq("id", draft.id);
      } else {
        result = await supabase.from("hotel_addons").insert([payload]);
      }

      if (result.error) throw result.error;

      toast.success(draft.id ? "Add-on updated successfully" : "Add-on created successfully");
      setOpen(false);
      resetDraft();
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to save add-on");
    } finally {
      setIsSaving(false);
    }
  };

  const resetDraft = () => {
    setDraft({
      title: "",
      description: "",
      category: "fnb",
      price: 0,
      unit: "per_booking",
      is_active: true,
      is_taxable: false,
      tax_rate: null,
      max_quantity: null,
      min_quantity: 1,
      availability_start: null,
      availability_end: null,
      days_available: [],
      sort_order: 0,
    });
  };

  const edit = (addon: Addon) => {
    setDraft(addon);
    setOpen(true);
  };

  const confirmDelete = (addon: Addon) => {
    setSelectedAddon(addon);
    setDeleteDialogOpen(true);
  };

  const del = async () => {
    if (!selectedAddon) return;

    try {
      const { error } = await supabase.from("hotel_addons").delete().eq("id", selectedAddon.id);

      if (error) throw error;

      toast.success("Add-on deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedAddon(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete add-on");
    }
  };

  const toggle = async (addon: Addon) => {
    try {
      const { error } = await supabase.from("hotel_addons").update({ is_active: !addon.is_active }).eq("id", addon.id);

      if (error) throw error;
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const toggleDay = (day: number) => {
    const current = draft.days_available || [];
    setDraft({
      ...draft,
      days_available: current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    });
  };

  const getCategoryDetails = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[0];
  };

  const getUnitLabel = (unitValue: string) => {
    return UNIT_OPTIONS.find((u) => u.value === unitValue)?.label || unitValue;
  };

  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      addon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (addon.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && addon.is_active) ||
      (activeTab === "inactive" && !addon.is_active);
    return matchesSearch && matchesTab;
  });

  const sortedAddons = filteredAddons.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });

  const stats = {
    total: addons.length,
    active: addons.filter((a) => a.is_active).length,
    categories: new Set(addons.map((a) => a.category)).size,
    totalRevenue: addons.reduce((sum, a) => sum + a.price, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PartnerNav />
      <PartnerSubNav />

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-400">Upsell Management</p>
              <h1 className="text-3xl font-bold tracking-tight">Add-ons & Upsells</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage additional services to increase revenue per booking
              </p>
            </div>
            <Button
              onClick={() => {
                resetDraft();
                setOpen(true);
              }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Add-on
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Total Add-ons</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{stats.categories}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Avg. Price</p>
              <p className="text-2xl font-bold">₹{Math.round(stats.totalRevenue / stats.total || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search add-ons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All ({addons.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({addons.filter((a) => a.is_active).length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({addons.filter((a) => !a.is_active).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Add-ons Grid */}
        {sortedAddons.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No add-ons yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Create your first add-on to start increasing revenue per booking
              </p>
              <Button
                onClick={() => {
                  resetDraft();
                  setOpen(true);
                }}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Add-on
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedAddons.map((addon) => {
              const category = getCategoryDetails(addon.category);
              const CategoryIcon = category.icon;

              return (
                <Card
                  key={addon.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-lg border",
                    !addon.is_active && "opacity-60",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={cn("rounded-lg p-1.5", category.bgColor)}>
                            <CategoryIcon className={cn("h-4 w-4", category.color)} />
                          </div>
                          <h4 className="font-semibold truncate">{addon.title}</h4>
                        </div>
                        {addon.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{addon.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {category.label}
                      </Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">
                        ₹{addon.price} / {getUnitLabel(addon.unit)}
                      </Badge>
                      {addon.is_taxable && (
                        <Badge variant="outline" className="text-xs">
                          +{addon.tax_rate}% GST
                        </Badge>
                      )}
                      {addon.max_quantity && addon.max_quantity > 1 && (
                        <Badge variant="outline" className="text-xs">
                          Max {addon.max_quantity}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addon.is_active}
                          onCheckedChange={() => toggle(addon)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className="text-xs text-muted-foreground">{addon.is_active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => edit(addon)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => confirmDelete(addon)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit" : "Create"} Add-on</DialogTitle>
            <DialogDescription>
              {draft.id
                ? "Update your add-on details and availability"
                : "Add a new service or amenity to offer to your guests"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={draft.title || ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g., Continental Breakfast"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={draft.description || ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Describe what this add-on includes..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      return (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={draft.unit} onValueChange={(v) => setDraft({ ...draft, unit: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price || ""}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={draft.min_quantity || ""}
                  onChange={(e) => setDraft({ ...draft, min_quantity: Number(e.target.value) })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={draft.max_quantity || ""}
                  onChange={(e) => setDraft({ ...draft, max_quantity: Number(e.target.value) || null })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Tax */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is-taxable"
                  checked={draft.is_taxable || false}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      is_taxable: checked,
                      tax_rate: checked ? 18 : null,
                    })
                  }
                />
                <Label htmlFor="is-taxable">Taxable</Label>
              </div>
              {draft.is_taxable && (
                <div className="flex-1 max-w-[150px]">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={draft.tax_rate || ""}
                    onChange={(e) => setDraft({ ...draft, tax_rate: Number(e.target.value) })}
                    placeholder="Tax %"
                  />
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <Label>Available Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm transition-all",
                      (draft.days_available || []).includes(day.value)
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty for available all days</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available From</Label>
                <Input
                  type="date"
                  value={draft.availability_start || ""}
                  onChange={(e) => setDraft({ ...draft, availability_start: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Available Until</Label>
                <Input
                  type="date"
                  value={draft.availability_end || ""}
                  onChange={(e) => setDraft({ ...draft, availability_end: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={draft.sort_order || 0}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the list</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {draft.id ? "Update" : "Create"} Add-on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Add-on</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedAddon?.title}</span>? This action
              cannot be undone and will remove this add-on from all bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={del} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Save icon component
const Save = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
