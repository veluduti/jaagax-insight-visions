import { useCallback, useEffect, useMemo, useState } from "react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Phone, CalendarClock, LogOut, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import {
  loadLongStays, addResident, giveNotice, moveOut, generateMonthDues, markRentPaid,
  type LongStay, type RentDue, type WaitlistEntry,
} from "@/services/hospitality/longStayService";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);
const blank = { resident_name: "", resident_phone: "", resident_email: "", unit_label: "", move_in: today(), monthly_rent: "", deposit: "", rent_due_day: "5" };

export default function PartnerLongStays() {
  const { loading, hotelId } = usePartnerHotel();
  const [data, setData] = useState<{ stays: LongStay[]; dues: RentDue[]; waitlist: WaitlistEntry[] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState<{ stay: LongStay; date: string } | null>(null);

  const load = useCallback(() => { if (hotelId) loadLongStays(hotelId).then(setData).catch((e) => toast.error(e.message)); }, [hotelId]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast.success(msg); load(); } catch (e: any) { toast.error(e.message); } };

  const current = useMemo(() => (data?.stays ?? []).filter((s) => s.status !== "moved_out"), [data]);
  const moveIns = current.filter((s) => s.move_in > today());
  const leaving = current.filter((s) => s.status === "notice");
  const unpaid = (data?.dues ?? []).filter((d) => d.status === "due");
  const nameOf = (id: string) => data?.stays.find((s) => s.id === id)?.resident_name ?? "Resident";

  const save = async () => {
    if (!hotelId) return;
    if (!form.resident_name.trim()) return toast.error("Enter the resident's name");
    if (!(Number(form.monthly_rent) > 0)) return toast.error("Enter the monthly rent");
    if (form.resident_phone && !/^\d{10}$/.test(form.resident_phone)) return toast.error("Enter a 10-digit phone number");
    await run(() => addResident({
      hotel_id: hotelId, room_id: null, unit_label: form.unit_label || null, resident_name: form.resident_name.trim(),
      resident_phone: form.resident_phone || null, resident_email: form.resident_email || null, move_in: form.move_in,
      monthly_rent: Number(form.monthly_rent), deposit: Number(form.deposit) || 0, rent_due_day: Number(form.rent_due_day) || 5, notes: null,
    } as any), "Resident added");
    setAdding(false); setForm(blank);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto max-w-3xl px-3 py-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Long stays & residents</h1>
            <p className="text-sm text-muted-foreground">Monthly residents, rent, move-ins, move-outs and people waiting for a room.</p>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />Add resident</Button>
        </div>

        {loading || !data ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["Residents", current.length], ["Moving in", moveIns.length], ["Leaving", leaving.length], ["Rent due", unpaid.length]].map(([l, v]) => (
                <Card key={l as string}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold">{v}</div></CardContent></Card>
              ))}
            </div>
            <Tabs defaultValue="residents">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="residents">Residents</TabsTrigger>
                <TabsTrigger value="rent">Rent</TabsTrigger>
                <TabsTrigger value="waitlist">Waitlist ({data.waitlist.filter((w) => w.status === "waiting").length})</TabsTrigger>
              </TabsList>

              <TabsContent value="residents" className="space-y-2">
                {current.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No residents yet. Add your first monthly resident.</p>}
                {current.map((s) => (
                  <Card key={s.id}><CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.resident_name}</div>
                        <div className="text-xs text-muted-foreground">{s.unit_label ? `Room ${s.unit_label} · ` : ""}{inr(s.monthly_rent)}/month · deposit {inr(s.deposit)}</div>
                        <div className="text-xs text-muted-foreground">Moved in {s.move_in}{s.move_out ? ` · leaving ${s.move_out}` : ""}</div>
                      </div>
                      <Badge variant={s.status === "notice" ? "destructive" : s.move_in > today() ? "secondary" : "default"}>
                        {s.status === "notice" ? "On notice" : s.move_in > today() ? "Moving in" : "Living here"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.resident_phone && <Button asChild size="sm" variant="outline"><a href={`tel:${s.resident_phone}`}><Phone className="mr-1 h-4 w-4" />Call</a></Button>}
                      {s.status === "active" && <Button size="sm" variant="outline" onClick={() => setNotice({ stay: s, date: today() })}><CalendarClock className="mr-1 h-4 w-4" />Notice to leave</Button>}
                      <Button size="sm" variant="ghost" onClick={() => run(() => moveOut(s), "Marked as moved out")}><LogOut className="mr-1 h-4 w-4" />Move out</Button>
                    </div>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="rent" className="space-y-2">
                <Button size="sm" variant="outline" className="mt-2" onClick={() => run(async () => { const n = await generateMonthDues(hotelId!, current); if (!n) throw new Error("No current residents"); }, "This month's rent added")}>
                  <IndianRupee className="mr-1 h-4 w-4" />Add this month's rent
                </Button>
                {data.dues.length === 0 && <p className="text-sm text-muted-foreground">No rent lines yet.</p>}
                {data.dues.slice(0, 60).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div>
                      <div className="text-sm font-medium">{nameOf(d.stay_id)} · {inr(d.amount)}</div>
                      <div className="text-xs text-muted-foreground">Due {d.due_date}{d.status === "due" && d.due_date < today() ? " · overdue" : ""}</div>
                    </div>
                    {d.status === "paid" ? <Badge variant="secondary">Paid</Badge> :
                      <Button size="sm" onClick={() => run(() => markRentPaid(d), "Rent marked paid")}>Mark paid</Button>}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="waitlist" className="space-y-2">
                <p className="mt-2 text-sm text-muted-foreground">Guests who wanted a room when you were full. They're told automatically when a room frees up.</p>
                {data.waitlist.length === 0 && <p className="text-sm text-muted-foreground">Nobody is waiting.</p>}
                {data.waitlist.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                    <span>{w.check_in} → {w.check_out} · {w.guests} guest(s)</span>
                    <Badge variant={w.status === "waiting" ? "default" : "secondary"} className="capitalize">{w.status}</Badge>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add resident</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {([["resident_name", "Name"], ["resident_phone", "Phone (10 digits)"], ["resident_email", "Email"], ["unit_label", "Room / bed"], ["move_in", "Move-in date"], ["monthly_rent", "Monthly rent (₹)"], ["deposit", "Deposit (₹)"], ["rent_due_day", "Rent due on day"]] as const).map(([k, l]) => (
              <div key={k} className="grid gap-1">
                <Label htmlFor={k}>{l}</Label>
                <Input id={k} type={k === "move_in" ? "date" : ["monthly_rent", "deposit", "rent_due_day"].includes(k) ? "number" : "text"}
                  value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <Button onClick={save}>Save resident</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notice} onOpenChange={(o) => !o && setNotice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>When is {notice?.stay.resident_name} leaving?</DialogTitle></DialogHeader>
          <Input type="date" value={notice?.date ?? ""} onChange={(e) => notice && setNotice({ ...notice, date: e.target.value })} />
          <Button onClick={async () => { if (notice) { await run(() => giveNotice(notice.stay, notice.date), "Move-out date saved"); setNotice(null); } }}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
