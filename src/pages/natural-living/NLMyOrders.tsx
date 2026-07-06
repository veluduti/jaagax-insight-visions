import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { Package, MapPin, ChevronRight, ShoppingBag } from "lucide-react";

const sb = supabase as any;

type Order = {
  id: string;
  farm_id: string;
  status: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_city: string | null;
  placed_at: string;
  farm_name?: string;
  items?: { item_name: string; quantity_kg: number; price_per_kg: number; line_total: number }[];
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await sb
        .from("nl_orders")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("placed_at", { ascending: false });
      const list: Order[] = data || [];
      if (list.length) {
        const farmIds = Array.from(new Set(list.map((o) => o.farm_id)));
        const { data: farms } = await sb.from("nl_farms").select("id, name").in("id", farmIds);
        const fm = new Map<string, string>();
        (farms || []).forEach((f: any) => fm.set(f.id, f.name));
        list.forEach((o) => (o.farm_name = fm.get(o.farm_id) || "Farm"));
      }
      setOrders(list);
      setLoading(false);
    })();
  }, [user]);

  const loadItems = async (orderId: string) => {
    if (expanded === orderId) return setExpanded(null);
    setExpanded(orderId);
    const target = orders.find((o) => o.id === orderId);
    if (target && !target.items) {
      const { data } = await sb.from("nl_order_items").select("*").eq("order_id", orderId);
      target.items = data || [];
      setOrders([...orders]);
    }
  };

  return (
    <section className="py-16 md:py-20" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="nl-container">
        <Eyebrow>My Orders</Eyebrow>
        <H1>Your <span style={{ fontStyle: "italic" }}>harvest history.</span></H1>
        <Lede className="mt-4">Every basket, every farm, every step of the way.</Lede>

        <div className="mt-12">
          {loading ? (
            <div className="text-sm text-[hsl(var(--nl-muted))]">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
              <ShoppingBag className="h-6 w-6 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
              <div className="nl-serif text-2xl mb-1">No orders yet</div>
              <div className="text-sm text-[hsl(var(--nl-muted))] mb-4">Explore the marketplace to place your first order.</div>
              <Link to="/natural-living/marketplace" className="nl-btn nl-btn-primary">Browse marketplace</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="border" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
                  <button onClick={() => loadItems(o.id)} className="w-full p-6 flex items-center gap-4 text-left hover:bg-[hsl(var(--nl-cream))]/40 transition-colors">
                    <div className="p-3" style={{ background: "hsl(var(--nl-forest)/0.1)" }}>
                      <Package className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="nl-serif text-lg">{o.farm_name}</span>
                        <span
                          className="text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                          style={{ borderColor: STATUS_COLOR[o.status] || "hsl(var(--nl-forest))", color: STATUS_COLOR[o.status] || "hsl(var(--nl-forest))" }}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs text-[hsl(var(--nl-muted))] mt-1 flex items-center gap-2 flex-wrap">
                        <span>{new Date(o.placed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>·</span>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[240px]">{o.delivery_city || o.delivery_address}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="nl-serif text-xl" style={{ color: "hsl(var(--nl-forest))" }}>₹{o.total_amount.toLocaleString()}</div>
                      <div className="text-xs text-[hsl(var(--nl-muted))]">incl. delivery</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-[hsl(var(--nl-muted))] transition-transform ${expanded === o.id ? "rotate-90" : ""}`} />
                  </button>
                  {expanded === o.id && (
                    <div className="px-6 pb-6 pt-2 border-t" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                      <div className="nl-eyebrow mb-3 mt-4">Items</div>
                      <div className="space-y-2">
                        {(o.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{it.item_name} <span className="text-[hsl(var(--nl-muted))]">× {it.quantity_kg} kg</span></span>
                            <span>₹{it.line_total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t space-y-1 text-sm" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                        <div className="flex justify-between text-[hsl(var(--nl-muted))]"><span>Subtotal</span><span>₹{o.subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-[hsl(var(--nl-muted))]"><span>Delivery</span><span>₹{o.delivery_fee.toLocaleString()}</span></div>
                        <div className="flex justify-between font-medium pt-2 border-t" style={{ borderColor: "hsl(var(--nl-forest)/0.1)" }}><span>Total</span><span>₹{o.total_amount.toLocaleString()}</span></div>
                      </div>
                      <div className="mt-4 text-xs text-[hsl(var(--nl-muted))]">
                        Ship to: {o.delivery_address}{o.delivery_city ? `, ${o.delivery_city}` : ""}
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

export default function NLMyOrders() {
  return (
    <NLProtectedRoute requireOnboarded>
      <NLLayout>
        <Inner />
      </NLLayout>
    </NLProtectedRoute>
  );
}
