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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Tag, Calendar, Users, Clock, AlertCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
interface PricingRule {
  id: string;
  hotel_id: string;
  name: string;
  rule_type: "day_of_week" | "occupancy" | "lead_time" | "min_stay" | "date_range";
  adjustment_type: "percent" | "flat";
  adjustment_value: number;
  is_active: boolean;
  conditions: Record<string, any>;
  priority: number;
  created_at: string;
}

interface RuleDraft {
  name: string;
  rule_type: PricingRule["rule_type"];
  adjustment_type: PricingRule["adjustment_type"];
  adjustment_value: number;
  is_active: boolean;
  conditions: Record<string, any>;
  priority: number;
}

const RULE_TYPES = [
  { value: "day_of_week", label: "Day of week", icon: Calendar, description: "Weekend uplift or weekday discounts" },
  { value: "occupancy", label: "Occupancy-based", icon: Users, description: "Adjust rates based on room occupancy" },
  { value: "lead_time", label: "Lead time", icon: Clock, description: "Early bird or last-minute deals" },
  { value: "min_stay", label: "Minimum stay", icon: AlertCircle, description: "Discounts for longer stays" },
  { value: "date_range", label: "Date range", icon: Calendar, description: "Peak season or special events" },
];

const DISCOUNT_TYPES = [
  { value: "percent", label: "Percentage (%)" },
  { value: "flat", label: "Fixed Amount (₹)" },
];

export default function PartnerPricing() {
  const { loading, hotelId } = usePartnerHotel();
  const [tab, setTab] = useState("rules");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [openRule, setOpenRule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const [ruleDraft, setRuleDraft] = useState<RuleDraft>({
    name: "",
    rule_type: "day_of_week",
    adjustment_type: "percent",
    adjustment_value: 10,
    is_active: true,
    conditions: {},
    priority: 0,
  });

  const load = async () => {
    if (!hotelId) return;
    try {
      const r = await supabase.from("hotel_pricing_rules").select("*").eq("hotel_id", hotelId).order("priority", { ascending: false });
      if (r.error) throw r.error;
      if (r.data) setRules(r.data);
    } catch (error) {
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    load();
  }, [hotelId]);

  const validateRule = (draft: RuleDraft): string[] => {
    const errors: string[] = [];
    if (!draft.name.trim()) errors.push("Rule name is required");
    if (!draft.adjustment_value || draft.adjustment_value <= 0) {
      errors.push("Adjustment value must be greater than 0");
    }
    if (draft.adjustment_type === "percent" && draft.adjustment_value > 100) {
      errors.push("Percent adjustment cannot exceed 100%");
    }
    return errors;
  };

  const saveRule = async () => {
    if (!hotelId) {
      toast.error("Hotel not found");
      return;
    }

    const errors = validateRule(ruleDraft);
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("hotel_pricing_rules").insert([{ ...ruleDraft, hotel_id: hotelId }]);

      if (error) throw error;

      toast.success("Rule created successfully");
      setOpenRule(false);
      setRuleDraft({
        name: "",
        rule_type: "day_of_week",
        adjustment_type: "percent",
        adjustment_value: 10,
        is_active: true,
        conditions: {},
        priority: rules.length,
      });
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRule = async (rule: PricingRule) => {
    try {
      const { error } = await supabase
        .from("hotel_pricing_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);

      if (error) throw error;
      await load();
      toast.success(`Rule ${rule.is_active ? "deactivated" : "activated"}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update rule");
    }
  };

  const delRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase.from("hotel_pricing_rules").delete().eq("id", id);

      if (error) throw error;
      await load();
      toast.success("Rule deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  };

  const getRuleTypeIcon = (type: string) => {
    const found = RULE_TYPES.find((t) => t.value === type);
    return found?.icon || Tag;
  };

  const getRuleTypeLabel = (type: string) => {
    const found = RULE_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && rule.is_active) ||
      (filterActive === "inactive" && !rule.is_active);
    return matchesSearch && matchesActive;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PartnerNav />
      <PartnerSubNav />

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dynamic Pricing</h1>
            <p className="text-muted-foreground mt-1">
              Hotel rates
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                  <p className="text-3xl font-bold">{rules.filter((r) => r.is_active).length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Tag className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Main Content */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="rules" className="relative">
                Pricing Rules
                {rules.filter((r) => r.is_active).length > 0 && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {rules.filter((r) => r.is_active).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[150px] sm:w-[200px]"
              />
              <Select value={filterActive} onValueChange={(v: any) => setFilterActive(v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenRule(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Rule
              </Button>
            </div>

            {filteredRules.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Tag className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No pricing rules yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Create your first pricing rule to automatically adjust rates based on day of week, occupancy, or
                    other conditions.
                  </p>
                  <Button onClick={() => setOpenRule(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const Icon = getRuleTypeIcon(rule.rule_type);
                  return (
                    <Card
                      key={rule.id}
                      className={cn("transition-all hover:shadow-md", !rule.is_active && "opacity-60")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", rule.is_active ? "bg-primary/10" : "bg-muted")}>
                                <Icon
                                  className={cn("h-4 w-4", rule.is_active ? "text-primary" : "text-muted-foreground")}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{rule.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    Priority: {rule.priority || 0}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {getRuleTypeLabel(rule.rule_type)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {rule.adjustment_type === "percent"
                                      ? `${rule.adjustment_value}%`
                                      : `₹${rule.adjustment_value}`}
                                  </Badge>
                                  {rule.is_active ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">Active</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => delRule(rule.id)}
                              disabled={deletingId === rule.id}
                              className="h-8 w-8 p-0"
                            >
                              {deletingId === rule.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Create Rule Dialog */}
      <Dialog open={openRule} onOpenChange={setOpenRule}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Pricing Rule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name *</Label>
              <Input
                id="rule-name"
                value={ruleDraft.name}
                onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })}
                placeholder="e.g., Weekend Uplift"
              />
            </div>

            <div className="space-y-2">
              <Label>Rule Type *</Label>
              <Select
                value={ruleDraft.rule_type}
                onValueChange={(v: any) => setRuleDraft({ ...ruleDraft, rule_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select
                  value={ruleDraft.adjustment_type}
                  onValueChange={(v: any) => setRuleDraft({ ...ruleDraft, adjustment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value *</Label>
                <Input
                  type="number"
                  min="0"
                  max={ruleDraft.adjustment_type === "percent" ? 100 : undefined}
                  value={ruleDraft.adjustment_value}
                  onChange={(e) =>
                    setRuleDraft({
                      ...ruleDraft,
                      adjustment_value: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                min="0"
                value={ruleDraft.priority}
                onChange={(e) =>
                  setRuleDraft({
                    ...ruleDraft,
                    priority: Number(e.target.value),
                  })
                }
                placeholder="Higher priority rules are applied first"
              />
              <p className="text-xs text-muted-foreground">
                Higher numbers are applied first. Rules with same priority are applied in order of creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Conditions (JSON)</Label>
              <Textarea
                rows={4}
                value={JSON.stringify(ruleDraft.conditions, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || "{}");
                    setRuleDraft({ ...ruleDraft, conditions: parsed });
                  } catch {
                    // Allow invalid JSON to be edited
                  }
                }}
                placeholder='{"days": [5, 6]}'
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Examples: {"{"}"days":[5,6]{"}"} for Friday-Saturday, {"{"}"minOccupancy":3{"}"} for 3+ guests
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRule(false)}>
              Cancel
            </Button>
            <Button onClick={saveRule} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
