import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PartnerNav from "@/components/partners/PartnerNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogIn, LogOut, Phone, Sparkles as Broom, Wrench, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadFrontDesk, checkIn, checkOut, loadTasks, createTask, setTaskStatus, type OpsBooking, type OpsTask,
} from "@/services/hospitality/operationsService";

type Tab = "frontdesk" | "housekeeping" | "maintenance";

export default function PartnerOperations() {
  const { loading, hotelId } = usePartnerHotel();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "frontdesk";

  return (
    <div className="min-h-screen bg-background pb-24">
      <PartnerNav />
      <main className="container mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-bold">Today's operations</h1>
        <p className="mb-3 text-sm text-muted-foreground">Arrivals, departures, cleaning and repairs in one place.</p>
        {loading || !hotelId ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : (
          <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="frontdesk">Front Desk</TabsTrigger>
              <TabsTrigger value="housekeeping">Housekeeping</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            <TabsContent value="frontdesk"><FrontDesk hotelId={hotelId} /></TabsContent>
            <TabsContent value="housekeeping"><TaskBoard hotelId={hotelId} kind="housekeeping" /></TabsContent>
            <TabsContent value="maintenance"><TaskBoard hotelId={hotelId} kind="maintenance" /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function FrontDesk({ hotelId }: { hotelId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadFrontDesk>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const load = useCallback(() => loadFrontDesk(hotelId).then(setData).catch((e) => toast.error(e.message)), [hotelId]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<void>, msg: string) => {
    setBusy(id);
    try { await fn(); toast.success(msg); await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  if (!data) return <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-primary" />;
  const Section = ({ title, rows, render, empty }: { title: string; rows: OpsBooking[]; render: (b: OpsBooking) => JSX.Element; empty: string }) => (
    <section className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">{title} <span className="text-muted-foreground">({rows.length})</span></h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="space-y-2">{rows.map(render)}</div>}
    </section>
  );
  const Guest = ({ b, children }: { b: OpsBooking; children: React.ReactNode }) => (
    <Card><CardContent className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{b.guest_name || "Guest"}</div>
          <div className="text-xs text-muted-foreground">{b.room_type || "Room"}{b.room_number ? ` · #${b.room_number}` : ""} · {b.num_guests || 1} guest(s)</div>
          {b.special_requests && <div className="mt-1 text-xs">Note: {b.special_requests}</div>}
        </div>
        <Badge variant={b.payment_status === "paid" ? "default" : "secondary"} className="capitalize">{b.payment_status || "unpaid"}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {b.guest_phone && <Button asChild size="sm" variant="outline"><a href={`tel:${b.guest_phone}`}><Phone className="mr-1 h-4 w-4" />Call</a></Button>}
        {children}
      </div>
    </CardContent></Card>
  );

  return (
    <div>
      <Section title="Arriving today" rows={data.arrivals} empty="No arrivals left today." render={(b) => (
        <Guest key={b.id} b={b}>
          <Input className="h-9 w-28" placeholder="Room no." value={rooms[b.id] ?? b.room_number ?? ""} onChange={(e) => setRooms({ ...rooms, [b.id]: e.target.value })} />
          <Button size="sm" disabled={busy === b.id} onClick={() => act(b.id, () => checkIn(b, rooms[b.id]), "Guest checked in")}><LogIn className="mr-1 h-4 w-4" />Check in</Button>
        </Guest>
      )} />
      <Section title="Leaving today" rows={data.departures} empty="No departures left today." render={(b) => (
        <Guest key={b.id} b={b}>
          <Button size="sm" disabled={busy === b.id} onClick={() => act(b.id, () => checkOut(hotelId, b), "Checked out · cleaning task created")}><LogOut className="mr-1 h-4 w-4" />Check out</Button>
        </Guest>
      )} />
      <Section title="Staying now" rows={data.inHouse.filter((b) => !data.departures.some((d) => d.id === b.id))} empty="No guests in house." render={(b) => (
        <Guest key={b.id} b={b}><span className="text-xs text-muted-foreground">Leaves {b.check_out}</span></Guest>
      )} />
    </div>
  );
}

function TaskBoard({ hotelId, kind }: { hotelId: string; kind: OpsTask["kind"] }) {
  const [tasks, setTasks] = useState<OpsTask[] | null>(null);
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [priority, setPriority] = useState("normal");
  const load = useCallback(() => loadTasks(hotelId, kind).then(setTasks).catch((e) => toast.error(e.message)), [hotelId, kind]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return toast.error(kind === "maintenance" ? "Describe the problem" : "Enter a task");
    try { await createTask({ hotel_id: hotelId, kind, title: title.trim(), room_label: room.trim() || null, priority }); setTitle(""); setRoom(""); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const move = async (t: OpsTask, s: "open" | "in_progress" | "done") => {
    try { await setTaskStatus(t, s); load(); } catch (e: any) { toast.error(e.message); }
  };

  const Icon = kind === "maintenance" ? Wrench : Broom;
  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done").slice(0, 10);

  return (
    <div className="mt-4 space-y-4">
      <Card><CardContent className="grid gap-2 p-3 sm:grid-cols-[1fr_7rem_7rem_auto]">
        <Input placeholder={kind === "maintenance" ? "What's broken? e.g. AC not cooling" : "Task e.g. Deep clean"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">Urgent</SelectItem></SelectContent>
        </Select>
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>
      </CardContent></Card>

      {!tasks ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> : (
        <>
          <h2 className="text-sm font-semibold">To do ({open.length})</h2>
          {open.length === 0 && <p className="text-sm text-muted-foreground">All clear. Nothing waiting.</p>}
          {open.map((t) => (
            <Card key={t.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.room_label ? `Room ${t.room_label} · ` : ""}{new Date(t.created_at).toLocaleString()}</div>
                </div>
                {t.priority === "high" && <Badge variant="destructive">Urgent</Badge>}
                {t.status === "in_progress" && <Badge variant="secondary">In progress</Badge>}
              </div>
              <div className="flex gap-2">
                {t.status === "open" && <Button size="sm" variant="outline" onClick={() => move(t, "in_progress")}>Start</Button>}
                <Button size="sm" onClick={() => move(t, "done")}><CheckCircle2 className="mr-1 h-4 w-4" />Done</Button>
              </div>
            </CardContent></Card>
          ))}
          {done.length > 0 && <>
            <h2 className="pt-2 text-sm font-semibold text-muted-foreground">Recently done</h2>
            {done.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                <span>{t.title}{t.room_label ? ` · Room ${t.room_label}` : ""}</span>
                <Button size="sm" variant="ghost" onClick={() => move(t, "open")}>Reopen</Button>
              </div>
            ))}
          </>}
        </>
      )}
    </div>
  );
}
