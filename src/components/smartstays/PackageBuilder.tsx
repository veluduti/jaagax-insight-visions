import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Send, Globe, EyeOff, Pencil, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listMyPackages, savePackage, submitPackage, publishPackage, unpublishPackage, deletePackage, previewPrice,
  getApprovalsForRevision, listHotelsForBuilder, listRooms, validateItinerary, statusText, errMsg, inr,
  type SmartStay, type Stop, type StayItem,
} from "@/services/smartStayService";

const blankStay = (s: Stop): StayItem => ({ hotel_id: "", room_id: "", check_in: s.arrival, check_out: s.departure, num_rooms: 1, adults: 2, children: 0, meal_plan: "" });
const blankStop = (): Stop => ({ destination: "", arrival: "", departure: "", notes: "", stays: [] });
const empty = { title: "", description: "", images: "", inclusions: "", cancellation_policy: "", markup: 0, valid_from: "", valid_to: "" };

function HotelRoomPicker({ stay, onChange }: { stay: StayItem; onChange: (s: StayItem) => void }) {
  const [q, setQ] = useState("");
  const [hotels, setHotels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  useEffect(() => { const t = setTimeout(() => listHotelsForBuilder(q).then(setHotels), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (stay.hotel_id) listRooms(stay.hotel_id).then(setRooms); else setRooms([]); }, [stay.hotel_id]);
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <div className="space-y-1">
        <Input placeholder="Search hotel or city" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={stay.hotel_id} onValueChange={(v) => onChange({ ...stay, hotel_id: v, room_id: "" })}>
          <SelectTrigger><SelectValue placeholder="Choose hotel" /></SelectTrigger>
          <SelectContent>{hotels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ""}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Room type</Label>
        <Select value={stay.room_id} onValueChange={(v) => onChange({ ...stay, room_id: v })} disabled={!stay.hotel_id}>
          <SelectTrigger><SelectValue placeholder="Choose room" /></SelectTrigger>
          <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type} · {inr(r.base_price)}/night · up to {r.max_occupancy ?? r.max_adults ?? 2}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function PackageBuilder({ userId }: { userId: string }) {
  const [list, setList] = useState<SmartStay[]>([]);
  const [editing, setEditing] = useState<SmartStay | null | "new">(null);
  const [form, setForm] = useState(empty);
  const [stops, setStops] = useState<Stop[]>([blankStop()]);
  const [price, setPrice] = useState<any>(null);
  const [approvals, setApprovals] = useState<Record<string, any[]>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const rows = await listMyPackages(userId).catch(() => []);
    setList(rows);
    const map: Record<string, any[]> = {};
    await Promise.all(rows.filter((r) => r.current_revision > 0).map(async (r) => { map[r.id] = await getApprovalsForRevision(r.id, r.current_revision); }));
    setApprovals(map);
  };
  useEffect(() => { load(); }, [userId]);

  const open = (p: SmartStay | "new") => {
    setEditing(p); setPrice(null);
    if (p === "new") { setForm(empty); setStops([blankStop()]); return; }
    setForm({ title: p.title, description: p.description ?? "", images: (p.images ?? []).join("\n"), inclusions: (p.inclusions ?? []).join(", "),
      cancellation_policy: p.cancellation_policy ?? "", markup: Number(p.markup), valid_from: p.valid_from ?? "", valid_to: p.valid_to ?? "" });
    setStops(p.itinerary?.length ? p.itinerary : [blankStop()]);
  };

  const setStop = (i: number, s: Stop) => setStops(stops.map((x, j) => (j === i ? s : x)));
  const payload = () => ({
    id: editing && editing !== "new" ? editing.id : undefined, title: form.title.trim(), description: form.description,
    images: form.images.split("\n").map((x) => x.trim()).filter(Boolean), inclusions: form.inclusions.split(",").map((x) => x.trim()).filter(Boolean),
    cancellation_policy: form.cancellation_policy, markup: Number(form.markup) || 0, valid_from: form.valid_from, valid_to: form.valid_to, itinerary: stops,
  });

  const check = async () => {
    const err = validateItinerary(stops); if (err) { toast.error(err); return; }
    try { setPrice(await previewPrice(stops, form.valid_from, form.valid_to)); } catch (e) { toast.error(errMsg(e)); }
  };

  const save = async (andSubmit: boolean) => {
    if (!form.title.trim()) { toast.error("Add a package title"); return; }
    const err = validateItinerary(stops); if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const id = await savePackage(payload());
      if (andSubmit) {
        const r: any = await submitPackage(id);
        toast.success(r?.pending ? `Sent to ${r.pending} hotel(s) for approval` : "All hotels approved — you can publish now");
      } else toast.success("Draft saved");
      setEditing(null); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errMsg(e)); } };

  if (editing) return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{editing === "new" ? "New Smart Stay" : "Edit Smart Stay"}</h2>
        <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
      {editing !== "new" && editing.published_revision_id && <p className="text-sm text-muted-foreground">Your live version stays bookable. Changes go live after hotels approve them again.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Goa → Gokarna 5-night coastal trip" /></div>
        <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Inclusions (comma separated)</Label><Input value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} placeholder="Breakfast, Airport pickup" /></div>
        <div><Label>Your package service fee (₹)</Label><Input type="number" min={0} value={form.markup} onChange={(e) => setForm({ ...form, markup: Number(e.target.value) })} /></div>
        <div><Label>Valid from</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
        <div><Label>Valid to</Label><Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Photo links (one per line)</Label><Textarea rows={2} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Cancellation terms</Label><Textarea rows={2} value={form.cancellation_policy} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })} /></div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Destinations</h3>
        {stops.map((s, i) => (
          <Card key={i} className="p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between"><Badge>Stop {i + 1}</Badge>
              {stops.length > 1 && <Button size="icon" variant="ghost" onClick={() => setStops(stops.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}</div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input placeholder="Destination (e.g. Goa)" value={s.destination} onChange={(e) => setStop(i, { ...s, destination: e.target.value })} />
              <div><Label className="text-xs">Arrival</Label><Input type="date" value={s.arrival} onChange={(e) => setStop(i, { ...s, arrival: e.target.value })} /></div>
              <div><Label className="text-xs">Departure</Label><Input type="date" value={s.departure} onChange={(e) => setStop(i, { ...s, departure: e.target.value })} /></div>
            </div>
            <Input placeholder="Activities / travel notes" value={s.notes ?? ""} onChange={(e) => setStop(i, { ...s, notes: e.target.value })} />
            {s.stays.map((st, k) => {
              const upd = (n: StayItem) => setStop(i, { ...s, stays: s.stays.map((x, j) => (j === k ? n : x)) });
              return (
                <div key={k} className="rounded-md border p-3 space-y-2 bg-background">
                  <div className="flex justify-between items-center text-sm font-medium">Hotel stay {k + 1}
                    <Button size="icon" variant="ghost" onClick={() => setStop(i, { ...s, stays: s.stays.filter((_, j) => j !== k) })}><Trash2 className="h-4 w-4" /></Button></div>
                  <HotelRoomPicker stay={st} onChange={upd} />
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div className="col-span-1 sm:col-span-1"><Label className="text-xs">Check-in</Label><Input type="date" value={st.check_in} onChange={(e) => upd({ ...st, check_in: e.target.value })} /></div>
                    <div><Label className="text-xs">Check-out</Label><Input type="date" value={st.check_out} onChange={(e) => upd({ ...st, check_out: e.target.value })} /></div>
                    <div><Label className="text-xs">Rooms</Label><Input type="number" min={1} value={st.num_rooms} onChange={(e) => upd({ ...st, num_rooms: +e.target.value })} /></div>
                    <div><Label className="text-xs">Adults</Label><Input type="number" min={1} value={st.adults} onChange={(e) => upd({ ...st, adults: +e.target.value })} /></div>
                    <div><Label className="text-xs">Children</Label><Input type="number" min={0} value={st.children} onChange={(e) => upd({ ...st, children: +e.target.value })} /></div>
                    <div><Label className="text-xs">Meal plan</Label>
                      <Select value={st.meal_plan || "none"} onValueChange={(v) => upd({ ...st, meal_plan: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["none", "Breakfast", "Half board", "Full board", "All inclusive"].map((m) => <SelectItem key={m} value={m}>{m === "none" ? "Room only" : m}</SelectItem>)}</SelectContent>
                      </Select></div>
                  </div>
                </div>
              );
            })}
            <Button size="sm" variant="outline" disabled={!s.arrival || !s.departure} onClick={() => setStop(i, { ...s, stays: [...s.stays, blankStay(s)] })}><Plus className="h-4 w-4 mr-1" />Add hotel stay</Button>
          </Card>
        ))}
        <Button variant="outline" onClick={() => { const last = stops[stops.length - 1]; setStops([...stops, { ...blankStop(), arrival: last?.departure ?? "" }]); }}><Plus className="h-4 w-4 mr-1" />Add destination</Button>
      </div>

      {price && (
        <Card className="p-4 text-sm space-y-1">
          {price.stays.map((s: any, i: number) => <div key={i} className="flex justify-between"><span>{s.destination} · {s.hotel_name} ({s.nights}n × {s.num_rooms})</span><span>{inr(s.amount)}</span></div>)}
          <div className="flex justify-between text-muted-foreground"><span>Taxes</span><span>{inr(price.taxes)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Your service fee</span><span>{inr(form.markup)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1"><span>Customer pays</span><span>{inr(Number(price.hotel_cost) + Number(price.taxes) + Number(form.markup || 0))}</span></div>
        </Card>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={check}>Check price</Button>
        <Button variant="secondary" disabled={busy} onClick={() => save(false)}>Save draft</Button>
        <Button disabled={busy} onClick={() => save(true)}><Send className="h-4 w-4 mr-1" />Save & send for hotel approval</Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Build multi-city packages. Each hotel approves its stay before you can publish.</p>
        <Button onClick={() => open("new")}><Plus className="h-4 w-4 mr-1" />New package</Button>
      </div>
      {list.length === 0 && <Card className="p-8 text-center text-muted-foreground">No packages yet.</Card>}
      {list.map((p) => {
        const ap = approvals[p.id] ?? [];
        return (
          <Card key={p.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.title || "Untitled"}</h3>
                <p className="text-xs text-muted-foreground">{p.public_ref} · {(p.itinerary ?? []).map((s) => s.destination).join(" → ")} · Revision {p.current_revision || "—"}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant={p.status === "published" ? "default" : "secondary"}>{statusText[p.status] ?? p.status}</Badge>
                {p.published_revision_id && p.status !== "published" && <Badge variant="outline">Older version live</Badge>}
              </div>
            </div>
            {ap.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {ap.map((a: any) => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1" title={a.reason ?? ""}>
                    {a.status === "approved" ? <CheckCircle2 className="h-3 w-3 text-primary" /> : a.status === "pending" ? <Clock className="h-3 w-3" /> : a.status === "rejected" ? <XCircle className="h-3 w-3 text-destructive" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    {a.hotel?.name}{a.reason && a.status !== "approved" ? `: ${a.reason}` : ""}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => open(p)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
              {["draft", "changes_requested", "rejected"].includes(p.status) && p.current_revision >= 0 && <Button size="sm" variant="outline" onClick={() => act(() => submitPackage(p.id), "Sent for hotel approval")}><Send className="h-4 w-4 mr-1" />Send for approval</Button>}
              {p.status === "ready" && <Button size="sm" onClick={() => act(() => publishPackage(p.id), "Package is live")}><Globe className="h-4 w-4 mr-1" />Publish</Button>}
              {p.published_revision_id && <Button size="sm" variant="ghost" onClick={() => act(() => unpublishPackage(p.id), "Package hidden from customers")}><EyeOff className="h-4 w-4 mr-1" />Unpublish</Button>}
              {!p.published_revision_id && <Button size="sm" variant="ghost" onClick={() => act(() => deletePackage(p.id), "Deleted")}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
