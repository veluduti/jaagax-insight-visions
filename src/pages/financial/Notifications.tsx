import { useEffect, useState } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Check, Trash2 } from "lucide-react";

const TYPES = ["All", "New Lead", "Document Uploaded", "Application Update", "Subscription", "Wallet"];
const CHANNELS = ["mobile", "whatsapp", "sms", "email"];
const NOTIF_KINDS = ["new_lead", "document_uploaded", "application_update", "subscription", "wallet"];

export default function FinancialNotifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, Record<string, boolean>>>({});
  const [filter, setFilter] = useState("All");

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: prov } = await (supabase as any).from("financial_providers")
      .select("id,notification_preferences").eq("user_id", u.user.id).maybeSingle();
    if (!prov) return;
    setProviderId(prov.id);
    setPrefs(prov.notification_preferences ?? {});
    const { data: n } = await (supabase as any).from("financial_notifications")
      .select("*").eq("provider_id", prov.id).order("created_at", { ascending: false }).limit(100);
    setNotifs(n ?? []);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!providerId) return;
    const ch = (supabase as any).channel("fin-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "financial_notifications", filter: `provider_id=eq.${providerId}` },
        (p: any) => setNotifs((c) => [p.new, ...c])).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  async function markRead(id: string) {
    await (supabase as any).from("financial_notifications").update({ is_read: true }).eq("id", id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
  }
  async function markAll() {
    if (!providerId) return;
    await (supabase as any).from("financial_notifications").update({ is_read: true }).eq("provider_id", providerId);
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    toast.success("All marked read");
  }
  async function deleteOld() {
    if (!providerId) return;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    await (supabase as any).from("financial_notifications").delete().eq("provider_id", providerId).lt("created_at", cutoff);
    load(); toast.success("Old notifications deleted");
  }
  async function togglePref(kind: string, channel: string, val: boolean) {
    const next = { ...prefs, [kind]: { ...(prefs[kind] ?? {}), [channel]: val } };
    setPrefs(next);
    if (!providerId) return;
    await (supabase as any).from("financial_providers").update({ notification_preferences: next }).eq("id", providerId);
  }

  const filtered = notifs.filter((n) => {
    if (filter === "All") return true;
    return (n.title ?? "").toLowerCase().includes(filter.toLowerCase().split(" ")[0]);
  });

  return (
    <FinancialLayout title="Notifications" subtitle="Stay on top of every customer interaction">
      <Tabs defaultValue="inbox">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="settings">Channel Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={markAll} className="border-border"><Check className="h-4 w-4 mr-1" />Mark all read</Button>
              <Button variant="outline" onClick={deleteOld} className="border-red-500/30 text-red-300"><Trash2 className="h-4 w-4 mr-1" />Delete &gt; 30d</Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground"><Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />No notifications</CardContent></Card>
          ) : filtered.map((n) => (
            <Card key={n.id} className={`border-border bg-card backdrop-blur-md ${!n.is_read ? "border-l-4 border-l-amber-400" : ""}`}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-primary">{n.title}</p>
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <Badge className="bg-primary text-primary-foreground">New</Badge>}
                  {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card className="border-border bg-card backdrop-blur-md">
            <CardHeader><CardTitle className="text-primary text-base">Channel Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border text-xs uppercase tracking-wider text-primary/70">
                <span>Type</span>{CHANNELS.map((c) => <span key={c} className="text-center capitalize">{c}</span>)}
              </div>
              {NOTIF_KINDS.map((kind) => (
                <div key={kind} className="grid grid-cols-5 gap-2 items-center">
                  <span className="capitalize text-sm text-foreground">{kind.replace("_", " ")}</span>
                  {CHANNELS.map((c) => (
                    <div key={c} className="flex justify-center">
                      <Switch checked={!!prefs[kind]?.[c]} onCheckedChange={(v) => togglePref(kind, c, v)} />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FinancialLayout>
  );
}
