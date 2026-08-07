import { useEffect, useState, useMemo } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, FileText, Lock, Mail, MapPin, Phone, Search as SearchIcon, Wallet as WalletIcon } from "lucide-react";

type DocFile = { type: string; url: string; path?: string; name?: string };
type Lead = {
  id: string;
  lead_type: string;
  customer_name: string;
  requirement: string | null;
  budget: number | null;
  location: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  price: number;
  is_purchased: boolean;
  purchased_by_provider_id: string | null;
  created_at: string;
  documents?: DocFile[] | null;
  full_details?: Record<string, any> | null;
};

const TAB_TYPES: Record<string, string | null> = {
  all: null,
  buyer: "buyer",
  investor: "investor",
  agent_referral: "agent_referral",
  builder_referral: "builder_referral",
  hotel_financing: "hotel_financing",
};

export default function FinancialLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [maxBudget, setMaxBudget] = useState(20000000);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const [{ data: prov }, { data: w }, { data: l }, { data: tm }] = await Promise.all([
      (supabase as any).from("financial_providers").select("id").eq("user_id", u.user.id).maybeSingle(),
      (supabase as any).from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
      (supabase as any).from("financial_leads").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("financial_team_members").select("id,name").eq("is_active", true),
    ]);
    setProviderId(prov?.id ?? null);
    setWalletBalance(Number(w?.balance ?? 0));
    setLeads((l ?? []) as Lead[]);
    if (prov?.id) {
      const { data: tm2 } = await (supabase as any)
        .from("financial_team_members")
        .select("id,name")
        .eq("provider_id", prov.id)
        .eq("is_active", true);
      setTeam(tm2 ?? []);
    } else setTeam(tm ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const ch = (supabase as any)
      .channel("fin-leads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "financial_leads" }, (p: any) =>
        setLeads((cur) => [p.new as Lead, ...cur]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (TAB_TYPES[tab] && l.lead_type !== TAB_TYPES[tab]) return false;
        if (search && !`${l.location ?? ""} ${l.city ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (l.budget && Number(l.budget) > maxBudget) return false;
        return true;
      }),
    [leads, tab, search, maxBudget],
  );

  async function buy(id: string, price: number) {
    if (walletBalance < price) {
      toast.error("Insufficient wallet balance");
      return;
    }
    const { data, error } = await (supabase as any).rpc("purchase_financial_lead", { _lead_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Lead unlocked (-₹${price})`);
    setWalletBalance((b) => b - price);
    load();
  }

  async function assignRM(leadId: string, rmId: string) {
    const rm = team.find((t) => t.id === rmId);
    // Lightweight: store via notification (no FK column on leads)
    await (supabase as any).from("financial_notifications").insert({
      provider_id: providerId,
      title: "RM Assigned",
      message: `${rm?.name ?? "RM"} assigned to lead ${leadId.slice(0, 8)}`,
      link: "/dashboard/financial/leads",
    });
    toast.success(`Assigned to ${rm?.name}`);
  }

  return (
    <FinancialLayout
      title="Lead Marketplace"
      subtitle={`Wallet balance: ₹${walletBalance.toLocaleString("en-IN")}`}
    >
      <Card className="border-border bg-card backdrop-blur-md">
        <CardContent className="p-4 grid md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search location"
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Max Budget</span>
              <span>₹{(maxBudget / 100000).toFixed(1)} L</span>
            </div>
            <Slider value={[maxBudget]} max={20000000} step={100000} onValueChange={(v) => setMaxBudget(v[0])} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          {Object.keys(TAB_TYPES).map((k) => (
            <TabsTrigger
              key={k}
              value={k}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
            >
              {k.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">No leads match your filters.</CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((l) => {
            const unlocked = l.is_purchased && l.purchased_by_provider_id === providerId;
            return (
              <Card key={l.id} className="border-border bg-card backdrop-blur-md hover:border-border transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg text-primary">{l.customer_name}</CardTitle>
                    <Badge className="bg-primary/10 text-primary border-border capitalize">
                      {l.lead_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-foreground">{l.requirement || "—"}</p>
                  <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
                    {l.budget && <span>💰 ₹{(Number(l.budget) / 100000).toFixed(1)}L</span>}
                    {l.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {l.location}
                      </span>
                    )}
                  </div>
                  <div className={`space-y-1 ${unlocked ? "" : "blur-sm select-none"}`}>
                    <p className="flex items-center gap-2 text-foreground">
                      <Phone className="h-3 w-3" />
                      {l.contact_phone || "—"}
                    </p>
                    <p className="flex items-center gap-2 text-foreground">
                      <Mail className="h-3 w-3" />
                      {l.contact_email || "—"}
                    </p>
                  </div>
                  {unlocked && Array.isArray(l.documents) && l.documents.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Submitted Documents
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {l.documents.map((d, i) => (
                          <a
                            key={i}
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                          >
                            <FileText className="h-3 w-3" />
                            {d.type}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {unlocked ? (
                    <div className="flex gap-2">
                      <Select onValueChange={(v) => assignRM(l.id, v)}>
                        <SelectTrigger className="bg-card border-border">
                          <SelectValue placeholder="Assign RM" />
                        </SelectTrigger>
                        <SelectContent>
                          {team.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No team members
                            </SelectItem>
                          ) : (
                            team.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : l.is_purchased ? (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1" />
                      Sold to another provider
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => buy(l.id, Number(l.price))}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Unlock Lead — ₹{Number(l.price).toLocaleString("en-IN")}
                      <WalletIcon className="h-4 w-4 ml-2 opacity-70" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </FinancialLayout>
  );
}
