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
import { Eye, Lock, Mail, MapPin, Phone, Search as SearchIcon, Wallet as WalletIcon } from "lucide-react";

type Lead = {
  id: string; lead_type: string; customer_name: string; requirement: string | null;
  budget: number | null; location: string | null; city: string | null;
  contact_email: string | null; contact_phone: string | null;
  price: number; is_purchased: boolean; purchased_by_provider_id: string | null;
  created_at: string;
};

const TAB_TYPES: Record<string, string | null> = {
  all: null, buyer: "buyer", investor: "investor",
  agent_referral: "agent_referral", builder_referral: "builder_referral", hotel_financing: "hotel_financing",
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
    if (!u.user) { setLoading(false); return; }
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
      const { data: tm2 } = await (supabase as any).from("financial_team_members")
        .select("id,name").eq("provider_id", prov.id).eq("is_active", true);
      setTeam(tm2 ?? []);
    } else setTeam(tm ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = (supabase as any).channel("fin-leads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "financial_leads" },
        (p: any) => setLeads((cur) => [p.new as Lead, ...cur]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => leads.filter((l) => {
    if (TAB_TYPES[tab] && l.lead_type !== TAB_TYPES[tab]) return false;
    if (search && !`${l.location ?? ""} ${l.city ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (l.budget && Number(l.budget) > maxBudget) return false;
    return true;
  }), [leads, tab, search, maxBudget]);

  async function buy(id: string, price: number) {
    if (walletBalance < price) { toast.error("Insufficient wallet balance"); return; }
    const { data, error } = await (supabase as any).rpc("purchase_financial_lead", { _lead_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success(`Lead unlocked (-₹${price})`);
    setWalletBalance((b) => b - price);
    load();
  }

  async function assignRM(leadId: string, rmId: string) {
    const rm = team.find((t) => t.id === rmId);
    // Lightweight: store via notification (no FK column on leads)
    await (supabase as any).from("financial_notifications").insert({
      provider_id: providerId, title: "RM Assigned",
      message: `${rm?.name ?? "RM"} assigned to lead ${leadId.slice(0, 8)}`,
      link: "/dashboard/financial/leads",
    });
    toast.success(`Assigned to ${rm?.name}`);
  }

  return (
    <FinancialLayout title="Lead Marketplace" subtitle="Unlock verified buyer & investor leads">
      {walletBalance < 500 && (
        <Card className="border-red-500/40 bg-red-950/30">
          <CardContent className="flex items-center gap-3 py-3">
            <WalletIcon className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-200">Low wallet balance: ₹{walletBalance.toFixed(0)}. Top up to keep purchasing leads.</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-500/20 bg-black/40 backdrop-blur-md">
        <CardContent className="p-4 grid md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search location"
              className="pl-9 bg-black/40 border-amber-500/20" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Max Budget</span><span>₹{(maxBudget / 100000).toFixed(1)} L</span>
            </div>
            <Slider value={[maxBudget]} max={20000000} step={100000}
              onValueChange={(v) => setMaxBudget(v[0])} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-black/40 border border-amber-500/20 flex-wrap h-auto">
          {Object.keys(TAB_TYPES).map((k) => (
            <TabsTrigger key={k} value={k} className="data-[state=active]:bg-amber-500 data-[state=active]:text-black capitalize">
              {k.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 bg-zinc-900" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-amber-500/20 bg-black/40"><CardContent className="py-12 text-center text-zinc-400">No leads match your filters.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((l) => {
            const unlocked = l.is_purchased && l.purchased_by_provider_id === providerId;
            return (
              <Card key={l.id} className="border-amber-500/20 bg-black/50 backdrop-blur-md hover:border-amber-400/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg text-amber-100">{l.customer_name}</CardTitle>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 capitalize">{l.lead_type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(l.created_at).toLocaleString()}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-zinc-300">{l.requirement || "—"}</p>
                  <div className="flex flex-wrap gap-3 text-zinc-400 text-xs">
                    {l.budget && <span>💰 ₹{(Number(l.budget) / 100000).toFixed(1)}L</span>}
                    {l.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.location}</span>}
                  </div>
                  <div className={`space-y-1 ${unlocked ? "" : "blur-sm select-none"}`}>
                    <p className="flex items-center gap-2 text-zinc-200"><Phone className="h-3 w-3" />{l.contact_phone || "—"}</p>
                    <p className="flex items-center gap-2 text-zinc-200"><Mail className="h-3 w-3" />{l.contact_email || "—"}</p>
                  </div>
                  {unlocked ? (
                    <div className="flex gap-2">
                      <Select onValueChange={(v) => assignRM(l.id, v)}>
                        <SelectTrigger className="bg-black/40 border-amber-500/30"><SelectValue placeholder="Assign RM" /></SelectTrigger>
                        <SelectContent>
                          {team.length === 0 ? <SelectItem value="none" disabled>No team members</SelectItem>
                            : team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : l.is_purchased ? (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-500"><Lock className="h-3 w-3 mr-1" />Sold to another provider</Badge>
                  ) : (
                    <Button onClick={() => buy(l.id, Number(l.price))}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold">
                      <Eye className="h-4 w-4 mr-2" />Purchase Lead for ₹{Number(l.price).toFixed(0)}
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
