import { useEffect, useState } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { Package, ChevronRight, TrendingUp, IndianRupee, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

const NEXT_STATUS: Record<string, string | null> = {
  placed: "confirmed",
  confirmed: "packed",
  packed: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};
const STATUS_COLOR: Record<string, string> = {
  placed: "hsl(var(--nl-forest))",
  confirmed: "hsl(var(--nl-forest))",
  packed: "#b8860b",
  shipped: "#2563eb",
  delivered: "#16a34a",
  cancelled: "#a1a1aa",
};

function Inner() {
  const { user } = useNLAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // farms owned by user
    const { data: farms } = await sb.from("nl_farms").select("id, name").eq("owner_user_id", user.id);
    const farmIds = (farms || []).map((f: any) => f.id);
    const farmMap = new Map<string, string>();
    (farms || []).forEach((f: any) => farmMap.set(f.id, f.name));
    if (!farmIds.length) { setOrders([]); setLoading(false); return; }
    const { data } = await sb
      .from("nl_orders")
      .select("*")
      .in("farm_id", farmIds)
      .order("placed_at", { ascending: false });
    const list = (data || []).map((o: any) => ({ ...o, farm_name: farmMap.get(o.farm_id) }));
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.total_amount || 0), 0);
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  const advance = async (o: any) => {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    const patch: any = { status: next };
    if (next === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await sb.from("nl_orders").update(patch).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${next}`);
    void load();
  };

  const cancel = async (o: any) => {
    const { error } = await sb.from("nl_orders").update({ status: "cancelled" }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Order cancelled");
    void load();
  };

  const loadItems = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    const target = orders.find((o) => o.id === id);
    if (target && !target.items) {
      const { data } = await sb.from("nl_order_items").select("*").eq("order_id", id);
      target.items = data || [];
      setOrders([...orders]);
    }
  };

  return (
    <section className="py-16 md:py-20" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="nl-container">
        <Eyebrow>Farm Orders</Eyebrow>
        <H1>Incoming <span style={{ fontStyle: "italic" }}>harvest orders.</span></H1>
        <Lede className="mt-4">Manage every produce order placed to your farms — confirm, pack, ship, and mark delivered.</Lede>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatTile icon={ClipboardList} label="Total orders" value={String(orders.length)} />
          <StatTile icon={TrendingUp} label="Active" value={String(active)} />
          <StatTile icon={IndianRupee} label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} />
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="text-sm text-[hsl(var(--nl-muted))]">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
              <Package className="h-6 w-6 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
              <div className="nl-serif text-2xl mb-1">No orders yet</div>
              <div className="text-sm text-[hsl(var(--nl-muted))]">Once customers order your produce, they'll appear here.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="border" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
                  <button onClick={() => loadItems(o.id)} className="w-full p-6 flex items-center gap-4 text-left hover:bg-[hsl(var(--nl-cream))]/40">
                    <div className="p-3" style={{ background: "hsl(var(--nl-forest)/0.1)" }}>
                      <Package className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="nl-serif text-lg">{o.farm_name}</span>
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border" style={{ borderColor: STATUS_COLOR[o.status], color: STATUS_COLOR[o.status] }}>{o.status}</span>
                      </div>
                      <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
                        {new Date(o.placed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {o.delivery_city || "—"} · {o.contact_phone || "no phone"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="nl-serif text-xl" style={{ color: "hsl(var(--nl-forest))" }}>₹{o.total_amount.toLocaleString()}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-[hsl(var(--nl-muted))] transition-transform ${expanded === o.id ? "rotate-90" : ""}`} />
                  </button>

                  {expanded === o.id && (
                    <div className="px-6 pb-6 pt-2 border-t" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                      <div className="grid md:grid-cols-2 gap-6 mt-4">
                        <div>
                          <div className="nl-eyebrow mb-3">Items</div>
                          <div className="space-y-2">
                            {(o.items || []).map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span>{it.item_name} <span className="text-[hsl(var(--nl-muted))]">× {it.quantity_kg} kg</span></span>
                                <span>₹{it.line_total.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="nl-eyebrow mb-3">Delivery</div>
                          <div className="text-sm space-y-1">
                            <div>{o.delivery_address}</div>
                            {o.delivery_city && <div>{o.delivery_city} {o.delivery_pincode}</div>}
                            <div className="text-[hsl(var(--nl-muted))]">Phone: {o.contact_phone || "—"}</div>
                            {o.notes && <div className="text-[hsl(var(--nl-muted))] italic mt-2">Note: {o.notes}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {NEXT_STATUS[o.status] && (
                          <button onClick={() => advance(o)} className="nl-btn nl-btn-primary text-xs">
                            Mark as {NEXT_STATUS[o.status]}
                          </button>
                        )}
                        {o.status !== "delivered" && o.status !== "cancelled" && (
                          <button onClick={() => cancel(o)} className="nl-btn nl-btn-outline text-xs">Cancel</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-5 border" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
      <Icon className="h-4 w-4 mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
      <div className="nl-serif text-3xl" style={{ color: "hsl(var(--nl-forest))" }}>{value}</div>
      <div className="text-xs text-[hsl(var(--nl-muted))] uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

export default function NLFarmOrders() {
  return (
    <NLProtectedRoute requireOnboarded roles={["farmer", "land_owner", "admin"]}>
      <NLLayout>
        <Inner />
      </NLLayout>
    </NLProtectedRoute>
  );
}
