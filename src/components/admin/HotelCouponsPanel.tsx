import { useCallback, useEffect, useState } from "react";
import { loadCouponAdmin, saveCoupon, setCouponActive, type HotelCoupon } from "@/services/hospitality/couponService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

type Draft = Omit<HotelCoupon, "id" | "uses_count">;
const empty = (): Draft => ({ code: "", description: "", scope: "global", hotel_id: null, discount_type: "percent", discount_value: 10, max_discount: null, min_booking_amount: 0, min_nights: 1, max_nights: null, valid_from: null, valid_until: null, stay_from: null, stay_until: null, max_uses: null, is_active: true, eligible_hotel_ids: [], applicable_room_ids: [] });

export default function HotelCouponsPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCouponAdmin>> | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(empty);
  const [id, setId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { try { setData(await loadCouponAdmin()); } catch (e) { setError(e instanceof Error ? e.message : "Could not load coupons"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const edit = (c?: HotelCoupon) => {
    if (c) { const { id: cid, uses_count: _uses, ...fields } = c; setDraft(fields); setId(cid); }
    else { setDraft(empty()); setId(undefined); }
    setOpen(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await saveCoupon(draft, id); toast.success("Coupon saved"); setOpen(false); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save coupon"); }
    finally { setSaving(false); }
  };
  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const rooms = data.rooms.filter(r => draft.scope === "hotel" ? r.hotel_id === draft.hotel_id : !draft.eligible_hotel_ids.length || draft.eligible_hotel_ids.includes(r.hotel_id));
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Hotel coupons</h2><Button onClick={() => edit()} className="gap-2"><Plus className="h-4 w-4" />Create coupon</Button></div>
    {!data.coupons.length && <p className="text-muted-foreground">No coupons yet.</p>}
    {data.coupons.map(c => <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><strong className="break-all">{c.code}</strong><Badge variant="secondary">{c.scope === "global" ? "Global" : data.hotels.find(h => h.id === c.hotel_id)?.name || "Hotel-specific"}</Badge><Badge variant="outline">{c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`} off</Badge></div><p className="text-sm text-muted-foreground">{c.description}</p><p className="text-xs text-muted-foreground">Used {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""} · {c.min_nights}+ nights · Expires {c.valid_until || "Never"}</p></div>
      <div className="flex items-center gap-3"><Switch aria-label={`Activate ${c.code}`} checked={c.is_active} onCheckedChange={async active => { try { await setCouponActive(c.id, active); await load(); } catch { toast.error("Could not update coupon"); } }} /><Button variant="ghost" size="icon" title={`Edit ${c.code}`} aria-label={`Edit ${c.code}`} onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button></div>
    </article>)}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{id ? "Edit coupon" : "Create coupon"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="coupon-code">Code</Label><Input id="coupon-code" required minLength={3} maxLength={30} pattern="[A-Z0-9_-]{3,30}" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase().trim() })} /></div>
        <div><Label>Applies to</Label><Select value={draft.scope} onValueChange={scope => setDraft({ ...draft, scope: scope as Draft["scope"], hotel_id: null, eligible_hotel_ids: [], applicable_room_ids: [] })}><SelectTrigger aria-label="Coupon scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Global coupons</SelectItem><SelectItem value="hotel">Hotel-specific coupons</SelectItem></SelectContent></Select></div>
        <div className="sm:col-span-2"><Label htmlFor="coupon-description">Description</Label><Input id="coupon-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
        {draft.scope === "hotel" ? <div className="sm:col-span-2"><Label>Hotel</Label><Select value={draft.hotel_id || ""} onValueChange={hotel_id => setDraft({ ...draft, hotel_id, applicable_room_ids: [] })}><SelectTrigger aria-label="Coupon hotel"><SelectValue placeholder="Select hotel" /></SelectTrigger><SelectContent>{data.hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></div> : <fieldset className="sm:col-span-2 space-y-2"><legend className="text-sm font-medium">Eligible hotels (all when none selected)</legend>{data.hotels.map(h => <label key={h.id} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.eligible_hotel_ids.includes(h.id)} onCheckedChange={checked => setDraft({ ...draft, applicable_room_ids: [], eligible_hotel_ids: checked ? [...draft.eligible_hotel_ids, h.id] : draft.eligible_hotel_ids.filter(v => v !== h.id) })} />{h.name}</label>)}</fieldset>}
        <div><Label>Discount type</Label><Select value={draft.discount_type} onValueChange={discount_type => setDraft({ ...draft, discount_type: discount_type as Draft["discount_type"] })}><SelectTrigger aria-label="Discount type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percentage</SelectItem><SelectItem value="flat">Fixed amount (₹)</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="coupon-value">Discount value</Label><Input id="coupon-value" type="number" required min="0.01" step="0.01" max={draft.discount_type === "percent" ? 100 : undefined} value={draft.discount_value} onChange={e => setDraft({ ...draft, discount_value: Number(e.target.value) })} /></div>
        {([['max_discount','Maximum discount (₹)'],['min_booking_amount','Minimum room amount (₹)'],['min_nights','Minimum nights'],['max_nights','Maximum nights'],['max_uses','Total usage limit']] as const).map(([key,label]) => <div key={key}><Label htmlFor={`coupon-${key}`}>{label}</Label><Input id={`coupon-${key}`} type="number" step={key.includes('discount') || key.includes('amount') ? '0.01' : '1'} min={key === 'min_booking_amount' ? 0 : 1} value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: e.target.value ? Number(e.target.value) : key === 'min_nights' ? 1 : key === 'min_booking_amount' ? 0 : null })} /></div>)}
        {([['valid_from','Valid from'],['valid_until','Expires on'],['stay_from','Earliest check-in'],['stay_until','Latest check-out']] as const).map(([key,label]) => <div key={key}><Label htmlFor={`coupon-${key}`}>{label}</Label><Input id={`coupon-${key}`} type="date" value={draft[key] || ''} onChange={e => setDraft({ ...draft, [key]: e.target.value || null })} /></div>)}
        {!!rooms.length && <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Eligible rooms (all when none selected)</legend>{rooms.map(r => <label key={r.id} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.applicable_room_ids.includes(r.id)} onCheckedChange={checked => setDraft({ ...draft, applicable_room_ids: checked ? [...draft.applicable_room_ids, r.id] : draft.applicable_room_ids.filter(v => v !== r.id) })} />{r.room_name || r.room_type}</label>)}</fieldset>}
        <Button type="submit" disabled={saving || (draft.scope === "hotel" && !draft.hotel_id)} className="sm:col-span-2">{saving ? "Saving…" : "Save coupon"}</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}