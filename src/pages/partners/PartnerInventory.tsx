import { useCallback, useEffect, useMemo, useState } from "react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  listRoomTypes, updateRoomPricing, listUnits, addUnits, setUnitStatus, deleteUnit,
  type RoomType, type InventoryUnit, type AvailabilityBlock,
} from "@/services/hospitality/inventoryService";
import { listBlocks, blockDates, unblock } from "@/services/hospitality/availabilityService";
import { formatUnitPrice } from "@/utils/suggestionEngine";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAYS = 14;

export default function PartnerInventory() {
  const ctx = usePartnerHotel();
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [start, setStart] = useState(iso(new Date()));
  const [form, setForm] = useState({ roomId: "", from: "", to: "", units: 1, reason: "" });
  const [unitForm, setUnitForm] = useState({ roomId: "", kind: "room", prefix: "Room ", count: 1, startAt: 101 });

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return iso(d); }), [start]);

  const load = useCallback(async () => {
    if (!ctx.hotelId) return;
    try {
      const end = days[days.length - 1];
      const [r, u, b] = await Promise.all([listRoomTypes(ctx.hotelId), listUnits(ctx.hotelId), listBlocks(ctx.hotelId, days[0], end)]);
      setRooms(r); setUnits(u); setBlocks(b);
    } catch (e: any) { toast.error(e.message); }
  }, [ctx.hotelId, days]);
  useEffect(() => { load(); }, [load]);

  const freeOn = (room: RoomType, day: string) => {
    const used = blocks.filter((b) => b.room_id === room.id && b.start_date <= day && b.end_date > day).reduce((s, b) => s + b.units, 0);
    return Math.max(0, (room.total_units ?? 1) - used);
  };

  if (ctx.loading) return <Shell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Shell>;
  if (!ctx.hotelId) return <Shell><p className="text-muted-foreground">No property linked yet.</p></Shell>;

  return (
    <Shell>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Availability calendar</CardTitle>
            <Input type="date" className="w-auto" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead><tr><th className="p-1 text-left">Room type</th>{days.map((d) => <th key={d} className="p-1 font-medium">{d.slice(8)}/{d.slice(5, 7)}</th>)}</tr></thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-1 font-medium">{r.room_name || r.room_type}</td>
                    {days.map((d) => { const f = freeOn(r, d); return (
                      <td key={d} className="p-1 text-center"><span className={`inline-block min-w-7 rounded px-1 py-0.5 ${f === 0 ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>{f}</span></td>
                    ); })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Numbers show how many are still free. Bookings, cancellations and your blocks all update this one calendar.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Block or unblock dates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-5">
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger><SelectValue placeholder="Room type" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
              <Input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
              <Input type="number" min={1} value={form.units} onChange={(e) => setForm({ ...form, units: Math.max(1, Number(e.target.value) || 1) })} />
              <Button onClick={async () => {
                if (!form.roomId) return toast.error("Choose a room type");
                try { await blockDates({ hotelId: ctx.hotelId!, roomId: form.roomId, start: form.from, end: form.to, units: form.units, reason: form.reason, userId: ctx.userId! }); toast.success("Dates blocked"); load(); }
                catch (e: any) { toast.error(e.message); }
              }}><Lock className="mr-1 h-4 w-4" />Block</Button>
            </div>
            <div className="space-y-2">
              {blocks.map((b) => {
                const r = rooms.find((x) => x.id === b.room_id);
                return (
                  <div key={b.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                    <span>{r?.room_name || r?.room_type} · {b.start_date} → {b.end_date} · {b.units}</span>
                    {b.booking_id ? <Badge>Booking</Badge> : <Button size="sm" variant="ghost" onClick={() => unblock(b.id).then(load).catch((e) => toast.error(e.message))}><Unlock className="mr-1 h-4 w-4" />Unblock</Button>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Prices & long stays</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rooms.map((r) => (
              <div key={r.id} className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                <div className="sm:col-span-1"><p className="font-medium">{r.room_name || r.room_type}</p></div>
                {([["base_price", "Per night ₹"], ["weekly_price", "Per week ₹"], ["monthly_price", "Per month ₹"], ["min_stay_nights", "Min nights"], ["total_units", "Total count"]] as const).map(([k, label]) => (
                  <div key={k}><Label className="text-xs">{label}</Label>
                    <Input type="number" min={0} defaultValue={(r as any)[k] ?? ""} onBlur={async (e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v === (r as any)[k]) return;
                      try { await updateRoomPricing(r.id, { [k]: v } as any); toast.success("Saved — customers see this right away"); load(); } catch (er: any) { toast.error(er.message); }
                    }} />
                  </div>
                ))}
                {r.monthly_price ? <p className="text-xs text-muted-foreground sm:col-span-6">Shown as {formatUnitPrice(Number(r.monthly_price), "month")}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Individual rooms, units & beds</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-6">
              <Select value={unitForm.roomId} onValueChange={(v) => setUnitForm({ ...unitForm, roomId: v })}>
                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Room type" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={unitForm.kind} onValueChange={(v) => setUnitForm({ ...unitForm, kind: v, prefix: v === "bed" ? "Bed " : v === "unit" ? "Unit " : "Room " })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="room">Room</SelectItem><SelectItem value="unit">Unit</SelectItem><SelectItem value="bed">Bed</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Label prefix" value={unitForm.prefix} onChange={(e) => setUnitForm({ ...unitForm, prefix: e.target.value })} />
              <Input type="number" min={1} placeholder="How many" value={unitForm.count} onChange={(e) => setUnitForm({ ...unitForm, count: Number(e.target.value) || 1 })} />
              <Button onClick={async () => {
                if (!unitForm.roomId) return toast.error("Choose a room type");
                try { await addUnits(ctx.hotelId!, unitForm.roomId, unitForm.kind, unitForm.prefix, unitForm.count, unitForm.kind === "room" ? unitForm.startAt : 1); toast.success("Added"); load(); }
                catch (e: any) { toast.error(e.message); }
              }}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
            {rooms.map((r) => {
              const list = units.filter((u) => u.room_id === r.id);
              if (!list.length) return null;
              return (
                <div key={r.id}>
                  <p className="mb-1 text-sm font-medium">{r.room_name || r.room_type} ({list.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((u) => (
                      <div key={u.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                        <button onClick={() => setUnitStatus(u.id, u.status === "active" ? "maintenance" : "active").then(load)} className={u.status === "active" ? "text-primary" : "text-muted-foreground line-through"}>{u.label}</button>
                        <button aria-label={`Delete ${u.label}`} onClick={() => deleteUnit(u.id).then(load)}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">Tap a label to mark it under maintenance.</p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Inventory & Calendar</h1>
        {children}
      </main>
    </div>
  );
}
