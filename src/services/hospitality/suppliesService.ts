import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export type SupplyItem = { id: string; hotel_id: string; name: string; sku: string | null; category_key: string; location: string | null; unit: string; current_stock: number; min_level: number; reorder_level: number; unit_cost: number; supplier_id: string | null; last_purchase_at: string | null };
export type Supplier = { id: string; name: string; phone: string | null; email: string | null; category_keys: string[] };
export type Movement = { id: string; item_id: string; kind: "inward" | "outward" | "adjust"; quantity: number; unit_cost: number | null; reference: string | null; note: string | null; balance_after: number | null; created_at: string };
export type PurchaseOrder = { id: string; supplier_id: string | null; po_number: string; status: string; lines: { item_id: string; qty: number; unit_cost: number }[]; total: number; expected_at: string | null; received_at: string | null; created_at: string };

const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };

export async function loadSupplies(hotelId: string) {
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  const [items, suppliers, movements, pos] = await Promise.all([
    db.from("hotel_supply_items").select("*").eq("hotel_id", hotelId).order("name"),
    db.from("hotel_supply_suppliers").select("*").eq("hotel_id", hotelId).order("name"),
    db.from("hotel_supply_movements").select("*").eq("hotel_id", hotelId).gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
    db.from("hotel_purchase_orders").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
  ]);
  return { items: ok(items) as SupplyItem[], suppliers: ok(suppliers) as Supplier[], movements: ok(movements) as Movement[], orders: ok(pos) as PurchaseOrder[] };
}

export async function saveItem(hotelId: string, item: Partial<SupplyItem>) {
  const { id, current_stock, ...rest } = item;
  if (!rest.name?.trim() || !rest.category_key) throw new Error("Name and category are required");
  if (id) ok(await db.from("hotel_supply_items").update(rest).eq("id", id));
  else {
    const row = ok(await db.from("hotel_supply_items").insert({ ...rest, hotel_id: hotelId }).select("id").single()) as { id: string };
    if (Number(current_stock) > 0) await recordMovement(hotelId, row.id, "inward", Number(current_stock), rest.unit_cost ?? null, "Opening stock");
  }
}
export const deleteItem = async (id: string) => { ok(await db.from("hotel_supply_items").delete().eq("id", id)); };

export async function recordMovement(hotelId: string, itemId: string, kind: Movement["kind"], quantity: number, unitCost: number | null, note?: string) {
  if (!(quantity > 0) && kind !== "adjust") throw new Error("Enter a quantity above zero");
  if (kind === "adjust" && !(quantity >= 0)) throw new Error("Enter the counted stock");
  ok(await db.from("hotel_supply_movements").insert({ hotel_id: hotelId, item_id: itemId, kind, quantity, unit_cost: unitCost, note: note || null }));
}

export async function saveSupplier(hotelId: string, s: Partial<Supplier>) {
  if (!s.name?.trim()) throw new Error("Supplier name is required");
  const { id, ...rest } = s;
  ok(id ? await db.from("hotel_supply_suppliers").update(rest).eq("id", id) : await db.from("hotel_supply_suppliers").insert({ ...rest, hotel_id: hotelId }));
}

export async function createPurchaseOrder(hotelId: string, supplierId: string | null, lines: PurchaseOrder["lines"], status: "requested" | "ordered", expectedAt?: string) {
  const clean = lines.filter(l => l.item_id && l.qty > 0);
  if (!clean.length) throw new Error("Add at least one item with a quantity");
  const total = clean.reduce((s, l) => s + l.qty * (l.unit_cost || 0), 0);
  const po_number = `PO-${Date.now().toString().slice(-6)}`;
  ok(await db.from("hotel_purchase_orders").insert({ hotel_id: hotelId, supplier_id: supplierId, lines: clean, total, status, po_number, expected_at: expectedAt || null }));
}
export const setPoStatus = async (id: string, status: string) => { ok(await db.from("hotel_purchase_orders").update({ status }).eq("id", id)); };
export const receivePurchaseOrder = async (id: string) => { const r = await db.rpc("receive_purchase_order", { _po: id }); if (r.error) throw new Error(r.error.message); };
