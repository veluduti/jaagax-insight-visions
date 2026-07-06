import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { ShoppingBag, Minus, Plus, Trash2, MapPin, Leaf, Search, PackageCheck } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;
const CART_KEY = "nl_cart_v1";

type Crop = {
  id: string;
  name: string;
  variety: string | null;
  price_per_kg: number | null;
  hero_image_url: string | null;
  description: string | null;
  status: string | null;
  plot_id: string;
};
type Farm = {
  id: string;
  name: string;
  slug: string;
  certification: string | null;
  farming_method: string | null;
  hero_image_url: string | null;
};
type ListingRow = Crop & { farm: Farm };
type CartItem = {
  crop_id: string;
  farm_id: string;
  farm_name: string;
  item_name: string;
  price_per_kg: number;
  quantity_kg: number;
  image?: string | null;
};

const DELIVERY_FEE = 49;

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("nl-cart-updated"));
}

export default function NLMarketplace() {
  const navigate = useNavigate();
  const { user, profile } = useNLAuth();
  const [tab, setTab] = useState<"browse" | "cart" | "checkout">("browse");
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(loadCart());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // fetch crops (available produce) then their plot -> farm
      const { data: crops } = await sb
        .from("nl_crops")
        .select("*")
        .not("price_per_kg", "is", null)
        .order("created_at", { ascending: false })
        .limit(120);
      const cropList: Crop[] = crops || [];
      if (!cropList.length) {
        if (alive) { setListings([]); setLoading(false); }
        return;
      }
      const plotIds = Array.from(new Set(cropList.map((c) => c.plot_id).filter(Boolean)));
      const { data: plots } = await sb.from("nl_plots").select("id, farm_id").in("id", plotIds);
      const farmIds = Array.from(new Set((plots || []).map((p: any) => p.farm_id)));
      const { data: farms } = await sb
        .from("nl_farms")
        .select("id, name, slug, certification, farming_method, hero_image_url")
        .in("id", farmIds);
      const farmMap = new Map<string, Farm>();
      (farms || []).forEach((f: any) => farmMap.set(f.id, f));
      const plotFarm = new Map<string, string>();
      (plots || []).forEach((p: any) => plotFarm.set(p.id, p.farm_id));

      const rows: ListingRow[] = cropList
        .map((c) => {
          const fid = plotFarm.get(c.plot_id);
          const farm = fid ? farmMap.get(fid) : undefined;
          return farm ? { ...c, farm } : null;
        })
        .filter(Boolean) as ListingRow[];
      if (alive) { setListings(rows); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const h = () => setCart(loadCart());
    window.addEventListener("nl-cart-updated", h);
    return () => window.removeEventListener("nl-cart-updated", h);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return listings;
    const q = query.toLowerCase();
    return listings.filter((l) =>
      [l.name, l.variety, l.farm.name, l.farm.certification, l.farm.farming_method]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [listings, query]);

  const addToCart = (l: ListingRow) => {
    const price = Number(l.price_per_kg) || 0;
    const next = [...cart];
    const idx = next.findIndex((i) => i.crop_id === l.id);
    if (idx >= 0) next[idx] = { ...next[idx], quantity_kg: next[idx].quantity_kg + 1 };
    else next.push({
      crop_id: l.id,
      farm_id: l.farm.id,
      farm_name: l.farm.name,
      item_name: `${l.name}${l.variety ? ` — ${l.variety}` : ""}`,
      price_per_kg: price,
      quantity_kg: 1,
      image: l.hero_image_url,
    });
    setCart(next);
    saveCart(next);
    toast.success("Added to cart");
  };

  const updateQty = (crop_id: string, delta: number) => {
    const next = cart
      .map((i) => (i.crop_id === crop_id ? { ...i, quantity_kg: Math.max(0, i.quantity_kg + delta) } : i))
      .filter((i) => i.quantity_kg > 0);
    setCart(next);
    saveCart(next);
  };
  const removeItem = (crop_id: string) => {
    const next = cart.filter((i) => i.crop_id !== crop_id);
    setCart(next);
    saveCart(next);
  };

  const cartByFarm = useMemo(() => {
    const m = new Map<string, { farm_id: string; farm_name: string; items: CartItem[]; subtotal: number }>();
    cart.forEach((i) => {
      const key = i.farm_id;
      const line = i.price_per_kg * i.quantity_kg;
      if (!m.has(key)) m.set(key, { farm_id: i.farm_id, farm_name: i.farm_name, items: [], subtotal: 0 });
      const g = m.get(key)!;
      g.items.push(i);
      g.subtotal += line;
    });
    return Array.from(m.values());
  }, [cart]);

  const grandSubtotal = cartByFarm.reduce((s, g) => s + g.subtotal, 0);
  const grandDelivery = cartByFarm.length * DELIVERY_FEE;
  const grandTotal = grandSubtotal + grandDelivery;

  return (
    <NLLayout>
      <section className="pt-16 md:pt-24 pb-8" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container">
          <Eyebrow>Volume 7 · Organic Marketplace</Eyebrow>
          <H1>Fresh from the grove <span style={{ fontStyle: "italic" }}>to your table.</span></H1>
          <Lede className="mt-6">Buy single-farm organic produce. No middlemen, no cold-storage weeks. Order today, harvested this week.</Lede>
        </div>
      </section>

      <section className="py-8" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b" style={{ borderColor: "hsl(var(--nl-forest)/0.2)" }}>
            {[
              { k: "browse", label: "Browse produce" },
              { k: "cart", label: `Cart (${cart.length})` },
              { k: "checkout", label: "Checkout" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`px-5 py-3 text-sm uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                  tab === t.k
                    ? "border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-forest))]"
                    : "border-transparent text-[hsl(var(--nl-ink)/0.6)] hover:text-[hsl(var(--nl-ink))]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Browse */}
          {tab === "browse" && (
            <div className="mt-8">
              <div className="relative max-w-md mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--nl-muted))]" />
                <input
                  className="nl-input pl-10"
                  placeholder="Search tomatoes, spinach, farm name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-sm text-[hsl(var(--nl-muted))]">Loading fresh listings…</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
                  <Leaf className="h-6 w-6 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
                  <div className="nl-serif text-2xl mb-1">Nothing in season yet</div>
                  <div className="text-sm text-[hsl(var(--nl-muted))]">Farmers are still logging harvests — check back soon.</div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((l) => (
                    <div key={l.id} className="border overflow-hidden flex flex-col" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
                      <div className="aspect-[4/3] overflow-hidden bg-[hsl(var(--nl-cream))]">
                        {l.hero_image_url ? (
                          <img src={l.hero_image_url} alt={l.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Leaf className="h-8 w-8 opacity-40" style={{ color: "hsl(var(--nl-forest))" }} />
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col gap-3 flex-1">
                        <div className="nl-eyebrow">{l.farm.certification || l.farm.farming_method || "Organic"}</div>
                        <h3 className="nl-serif text-2xl leading-tight">
                          {l.name}
                          {l.variety && <span className="text-[hsl(var(--nl-ink)/0.6)] italic text-lg"> · {l.variety}</span>}
                        </h3>
                        <div className="text-xs text-[hsl(var(--nl-muted))] flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {l.farm.name}
                        </div>
                        {l.description && (
                          <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] line-clamp-2">{l.description}</p>
                        )}
                        <div className="mt-auto flex items-end justify-between pt-2">
                          <div>
                            <div className="nl-serif text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>
                              ₹{Number(l.price_per_kg || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-[hsl(var(--nl-muted))]">per kg</div>
                          </div>
                          <button onClick={() => addToCart(l)} className="nl-btn nl-btn-primary text-xs">
                            <ShoppingBag className="h-3.5 w-3.5 mr-2" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          {tab === "cart" && (
            <div className="mt-8">
              {cart.length === 0 ? (
                <div className="p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
                  <ShoppingBag className="h-6 w-6 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
                  <div className="nl-serif text-2xl mb-1">Your basket is empty</div>
                  <button onClick={() => setTab("browse")} className="mt-4 nl-btn nl-btn-outline">Browse produce</button>
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {cartByFarm.map((g) => (
                      <div key={g.farm_id} className="border p-6" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
                        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                          <div>
                            <div className="nl-eyebrow">From</div>
                            <div className="nl-serif text-xl">{g.farm_name}</div>
                          </div>
                          <div className="text-xs text-[hsl(var(--nl-muted))]">₹{DELIVERY_FEE} delivery</div>
                        </div>
                        <div className="space-y-4">
                          {g.items.map((i) => (
                            <div key={i.crop_id} className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-[hsl(var(--nl-cream))] overflow-hidden shrink-0">
                                {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium">{i.item_name}</div>
                                <div className="text-xs text-[hsl(var(--nl-muted))]">₹{i.price_per_kg}/kg</div>
                              </div>
                              <div className="flex items-center border" style={{ borderColor: "hsl(var(--nl-forest)/0.3)" }}>
                                <button onClick={() => updateQty(i.crop_id, -1)} className="p-2 hover:bg-[hsl(var(--nl-cream))]"><Minus className="h-3 w-3" /></button>
                                <span className="px-3 text-sm w-12 text-center">{i.quantity_kg} kg</span>
                                <button onClick={() => updateQty(i.crop_id, 1)} className="p-2 hover:bg-[hsl(var(--nl-cream))]"><Plus className="h-3 w-3" /></button>
                              </div>
                              <div className="w-20 text-right text-sm font-medium">₹{(i.price_per_kg * i.quantity_kg).toLocaleString()}</div>
                              <button onClick={() => removeItem(i.crop_id)} className="p-1 text-[hsl(var(--nl-muted))] hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between text-sm" style={{ borderColor: "hsl(var(--nl-forest)/0.15)" }}>
                          <span className="text-[hsl(var(--nl-muted))]">Subtotal</span>
                          <span className="font-medium">₹{g.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border p-6 h-fit sticky top-24" style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest))" }}>
                    <div className="nl-eyebrow" style={{ color: "hsl(var(--nl-cream)/0.7)" }}>Order summary</div>
                    <div className="mt-4 space-y-2 text-sm">
                      <Row k="Items subtotal" v={`₹${grandSubtotal.toLocaleString()}`} />
                      <Row k={`Delivery (${cartByFarm.length} farm${cartByFarm.length > 1 ? "s" : ""})`} v={`₹${grandDelivery.toLocaleString()}`} />
                    </div>
                    <div className="mt-6 pt-6 border-t flex justify-between items-baseline" style={{ borderColor: "hsl(var(--nl-cream)/0.2)" }}>
                      <div className="nl-eyebrow">Total</div>
                      <div className="nl-serif text-3xl">₹{grandTotal.toLocaleString()}</div>
                    </div>
                    <button onClick={() => setTab("checkout")} className="mt-6 w-full nl-btn" style={{ background: "hsl(var(--nl-cream))", color: "hsl(var(--nl-forest))" }}>
                      Proceed to checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkout */}
          {tab === "checkout" && (
            <CheckoutPanel
              cart={cart}
              cartByFarm={cartByFarm}
              subtotal={grandSubtotal}
              delivery={grandDelivery}
              total={grandTotal}
              user={user}
              profile={profile}
              onPlaced={(orderIds) => {
                saveCart([]);
                setCart([]);
                toast.success("Order placed!");
                navigate("/natural-living/my-orders");
              }}
              goSignIn={() => navigate("/natural-living/auth?next=/natural-living/marketplace")}
            />
          )}
        </div>
      </section>
    </NLLayout>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "hsl(var(--nl-cream)/0.75)" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function CheckoutPanel({
  cart, cartByFarm, subtotal, delivery, total, user, profile, onPlaced, goSignIn,
}: any) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(profile?.city || "");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="mt-8 p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
        <div className="nl-serif text-2xl mb-1">Your basket is empty</div>
        <div className="text-sm text-[hsl(var(--nl-muted))]">Add produce before checking out.</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mt-8 p-12 border text-center" style={{ borderColor: "hsl(var(--nl-forest)/0.2)", background: "hsl(var(--nl-cream-deep))" }}>
        <div className="nl-serif text-2xl mb-2">Sign in to place your order</div>
        <div className="text-sm text-[hsl(var(--nl-muted))] mb-6">Your basket is saved — you'll return right here.</div>
        <button onClick={goSignIn} className="nl-btn nl-btn-primary">Sign in / Create account</button>
      </div>
    );
  }

  const placeOrders = async () => {
    if (!address.trim()) return toast.error("Delivery address is required");
    if (!phone.trim()) return toast.error("Contact phone is required");
    setPlacing(true);
    try {
      const createdIds: string[] = [];
      for (const g of cartByFarm) {
        const { data: order, error: oErr } = await sb
          .from("nl_orders")
          .insert({
            customer_user_id: user.id,
            farm_id: g.farm_id,
            subtotal: g.subtotal,
            delivery_fee: DELIVERY_FEE,
            total_amount: g.subtotal + DELIVERY_FEE,
            delivery_address: address,
            delivery_city: city || null,
            delivery_pincode: pincode || null,
            contact_phone: phone,
            notes: notes || null,
          })
          .select("id")
          .single();
        if (oErr || !order) throw oErr || new Error("Order failed");
        const items = g.items.map((i: CartItem) => ({
          order_id: order.id,
          crop_id: i.crop_id,
          item_name: i.item_name,
          quantity_kg: i.quantity_kg,
          price_per_kg: i.price_per_kg,
          line_total: i.price_per_kg * i.quantity_kg,
        }));
        const { error: iErr } = await sb.from("nl_order_items").insert(items);
        if (iErr) throw iErr;
        createdIds.push(order.id);
      }
      onPlaced(createdIds);
    } catch (e: any) {
      toast.error(e?.message || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mt-8 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 border p-6 space-y-5" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest)/0.2)" }}>
        <div className="nl-serif text-2xl">Delivery details</div>
        <div>
          <label className="nl-eyebrow block mb-2">Address</label>
          <textarea className="nl-input min-h-[90px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, apartment, landmark" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="nl-eyebrow block mb-2">City</label>
            <input className="nl-input" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="nl-eyebrow block mb-2">Pincode</label>
            <input className="nl-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="nl-eyebrow block mb-2">Contact phone</label>
          <input className="nl-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="nl-eyebrow block mb-2">Delivery notes (optional)</label>
          <textarea className="nl-input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, preferred time…" />
        </div>
      </div>

      <div className="border p-6 h-fit space-y-4" style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest))" }}>
        <div className="nl-eyebrow" style={{ color: "hsl(var(--nl-cream)/0.7)" }}>Placing {cartByFarm.length} order{cartByFarm.length > 1 ? "s" : ""}</div>
        <div className="text-xs" style={{ color: "hsl(var(--nl-cream)/0.7)" }}>Each farm ships & bills separately.</div>
        <div className="space-y-2 text-sm">
          <Row k="Items subtotal" v={`₹${subtotal.toLocaleString()}`} />
          <Row k="Delivery" v={`₹${delivery.toLocaleString()}`} />
        </div>
        <div className="pt-4 border-t flex justify-between items-baseline" style={{ borderColor: "hsl(var(--nl-cream)/0.2)" }}>
          <div className="nl-eyebrow">Total</div>
          <div className="nl-serif text-3xl">₹{total.toLocaleString()}</div>
        </div>
        <button disabled={placing} onClick={placeOrders} className="w-full nl-btn disabled:opacity-60" style={{ background: "hsl(var(--nl-cream))", color: "hsl(var(--nl-forest))" }}>
          <PackageCheck className="h-4 w-4 mr-2" /> {placing ? "Placing…" : "Place order"}
        </button>
        <div className="text-[10px] uppercase tracking-widest opacity-70">Pay on delivery · UPI on arrival</div>
      </div>
    </div>
  );
}
