import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, IndianRupee, Wallet, Landmark, Save } from "lucide-react";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

type Booking = {
  id: string; check_in: string; check_out: string; total_amount: number;
  status: string; num_rooms: number; booking_type: string | null;
  created_at: string; guest_name: string;
};

type Settings = {
  account_holder_name: string; bank_name: string; account_number: string;
  ifsc_code: string; upi_id: string; pan_number: string; gst_number: string;
  payout_frequency: string;
};

const emptySettings: Settings = {
  account_holder_name: "", bank_name: "", account_number: "",
  ifsc_code: "", upi_id: "", pan_number: "", gst_number: "",
  payout_frequency: "monthly",
};

const fmtInr = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const DEFAULT_COMMISSION = 15;

export default function PartnerPayouts() {
  const ctx = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ctx.loading || !ctx.hotelId) return;
    (async () => {
      setLoading(true);
      const [{ data: b }, { data: s }] = await Promise.all([
        (supabase as any).from("hotel_bookings")
          .select("id,check_in,check_out,total_amount,status,num_rooms,booking_type,created_at,guest_name")
          .eq("hotel_id", ctx.hotelId)
          .in("status", ["confirmed", "checked_in", "checked_out"])
          .order("check_out", { ascending: false }),
        (supabase as any).from("hotel_payout_settings")
          .select("*").eq("hotel_id", ctx.hotelId).maybeSingle(),
      ]);
      setBookings(b || []);
      if (s) setSettings({ ...emptySettings, ...s });
      setLoading(false);
    })();
  }, [ctx.loading, ctx.hotelId]);

  // Monthly rollup derived from bookings' check-out date
  const monthly = useMemo(() => {
    const map = new Map<string, { gross: number; count: number; period: Date }>();
    for (const b of bookings) {
      const d = parseISO(b.check_out);
      const key = format(d, "yyyy-MM");
      const monthStart = startOfMonth(d);
      const cur = map.get(key) || { gross: 0, count: 0, period: monthStart };
      cur.gross += Number(b.total_amount || 0);
      cur.count += 1;
      map.set(key, cur);
    }
    const now = new Date();
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, v]) => {
        const commission = v.gross * (DEFAULT_COMMISSION / 100);
        const net = v.gross - commission;
        const monthEnd = endOfMonth(v.period);
        const status =
          monthEnd > now ? "in_progress" :
          differenceInDays(now, monthEnd) < 7 ? "pending" : "paid";
        return {
          key, period: v.period, monthEnd, gross: v.gross, commission, net,
          count: v.count, status,
        };
      });
  }, [bookings]);

  const summary = useMemo(() => {
    const nowKey = format(new Date(), "yyyy-MM");
    const lastKey = format(subMonths(new Date(), 1), "yyyy-MM");
    const cur = monthly.find((m) => m.key === nowKey);
    const last = monthly.find((m) => m.key === lastKey);
    const upcoming = monthly.filter((m) => m.status !== "paid").reduce((s, m) => s + m.net, 0);
    const lifetime = monthly.reduce((s, m) => s + m.net, 0);
    return {
      thisMonth: cur?.net || 0,
      lastMonth: last?.net || 0,
      upcoming,
      lifetime,
    };
  }, [monthly]);

  const saveSettings = async () => {
    if (!ctx.hotelId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("hotel_payout_settings")
      .upsert({ hotel_id: ctx.hotelId, ...settings }, { onConflict: "hotel_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout details saved");
  };

  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PartnerNav /><PartnerSubNav />
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payouts & Finance</h1>
          <p className="text-sm text-muted-foreground">
            {ctx.hotelName} · Commission {DEFAULT_COMMISSION}%
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="This month (net)" value={fmtInr(summary.thisMonth)} icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Last month (net)" value={fmtInr(summary.lastMonth)} />
          <StatCard label="Upcoming payout" value={fmtInr(summary.upcoming)} icon={<IndianRupee className="h-4 w-4" />} />
          <StatCard label="Lifetime earnings" value={fmtInr(summary.lifetime)} />
        </div>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="settings">Bank & Tax details</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : monthly.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No completed bookings yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-muted-foreground">
                        <tr className="border-b border-border/60">
                          <th className="py-2 text-left">Period</th>
                          <th className="py-2 text-right">Bookings</th>
                          <th className="py-2 text-right">Gross</th>
                          <th className="py-2 text-right">Commission ({DEFAULT_COMMISSION}%)</th>
                          <th className="py-2 text-right">Net payable</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.map((m) => (
                          <tr key={m.key} className="border-b border-border/30">
                            <td className="py-3">{format(m.period, "MMM yyyy")}</td>
                            <td className="py-3 text-right">{m.count}</td>
                            <td className="py-3 text-right">{fmtInr(m.gross)}</td>
                            <td className="py-3 text-right text-red-400">-{fmtInr(m.commission)}</td>
                            <td className="py-3 text-right font-semibold text-emerald-400">{fmtInr(m.net)}</td>
                            <td className="py-3 text-right">
                              <Badge variant={m.status === "paid" ? "default" : "outline"}
                                     className={m.status === "paid"
                                       ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                       : m.status === "pending"
                                       ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                       : "bg-blue-500/15 text-blue-400 border-blue-500/30"}>
                                {m.status === "in_progress" ? "In progress" : m.status === "pending" ? "Pending" : "Paid"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Payouts are calculated from confirmed / checked-in / checked-out bookings using the check-out date.
                  Settlement is triggered ~7 days after month-end.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Landmark className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Bank account (for NEFT/RTGS settlement)</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Account holder name">
                    <Input value={settings.account_holder_name}
                      onChange={(e) => setSettings({ ...settings, account_holder_name: e.target.value })} />
                  </Field>
                  <Field label="Bank name">
                    <Input value={settings.bank_name}
                      onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })} />
                  </Field>
                  <Field label="Account number">
                    <Input value={settings.account_number}
                      onChange={(e) => setSettings({ ...settings, account_number: e.target.value })} />
                  </Field>
                  <Field label="IFSC code">
                    <Input value={settings.ifsc_code}
                      onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="UPI ID (optional)">
                    <Input value={settings.upi_id}
                      onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })} placeholder="name@bank" />
                  </Field>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-3">
                  <div className="text-sm font-medium">Tax details</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="PAN number">
                      <Input value={settings.pan_number}
                        onChange={(e) => setSettings({ ...settings, pan_number: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="GST number (optional)">
                      <Input value={settings.gst_number}
                        onChange={(e) => setSettings({ ...settings, gst_number: e.target.value.toUpperCase() })} />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveSettings} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
