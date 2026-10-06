import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Route, Users, Phone, MapPin, Star, CheckCircle2, Search, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlanPropertyList from "@/components/smartvisit/PlanPropertyList";
import {
  getMyAgent, listMyPlans, savePlan, setPlanStatus, listAgentSelectableProperties, listPlanBookings,
  updateBooking, statusLabel, inr, errMsg, type SmartVisitPlan, type SmartVisitBooking, type PlanProperty,
} from "@/services/smartVisitService";

const emptyForm = {
  title: "", description: "", city: "", visit_date: "", start_time: "10:00 AM", meeting_point: "",
  price_meeting_point: 600, price_home_pickup: 800, max_seats: 6, property_ids: [] as string[],
};

const statusVariant = (s: string) =>
  s === "approved" || s === "completed" ? "default" : s === "rejected" || s === "cancelled" ? "destructive" : "secondary";

export default function AgentSmartVisits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Awaited<ReturnType<typeof getMyAgent>>>(null);
  const [plans, setPlans] = useState<SmartVisitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<PlanProperty[]>([]);
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const a = await getMyAgent(user.id);
    setAgent(a);
    if (a) setPlans(await listMyPlans(user.id).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!formOpen || !user) return;
    const t = setTimeout(() => listAgentSelectableProperties(user.id, search).then(setOptions), 300);
    return () => clearTimeout(t);
  }, [formOpen, search, user?.id]);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm, city: agent?.city || "" }); setFormOpen(true); };
  const openEdit = (p: SmartVisitPlan) => {
    setEditId(p.id);
    setForm({
      title: p.title, description: p.description || "", city: p.city || "", visit_date: p.visit_date,
      start_time: p.start_time, meeting_point: p.meeting_point || "", price_meeting_point: Number(p.price_meeting_point),
      price_home_pickup: Number(p.price_home_pickup), max_seats: p.max_seats, property_ids: p.property_ids || [],
    });
    setFormOpen(true);
  };

  const toggleProp = (id: string) => setForm((f) => ({
    ...f, property_ids: f.property_ids.includes(id) ? f.property_ids.filter((x) => x !== id) : [...f.property_ids, id],
  }));

  const submit = async () => {
    if (!user || !agent) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!form.title.trim()) return toast.error("Please add a title");
    if (!form.visit_date || form.visit_date < today) return toast.error("Please pick a future date");
    if (!form.meeting_point.trim()) return toast.error("Please add a meeting point");
    if (!form.property_ids.length) return toast.error("Add at least one property to visit");
    if (form.price_meeting_point <= 0 || form.price_home_pickup <= 0) return toast.error("Prices must be more than 0");
    if (form.max_seats < 1) return toast.error("Seats must be at least 1");
    setSaving(true);
    try {
      await savePlan({
        ...(editId ? { id: editId, status: "pending_review" } : { agent_id: agent.id, agent_user_id: user.id }),
        ...form, title: form.title.trim(),
      } as any);
      toast.success(editId ? "Plan updated and sent for approval" : "Plan sent to the global admin for approval");
      setFormOpen(false);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, s: "cancelled" | "completed") => {
    try { await setPlanStatus(id, s); toast.success(s === "cancelled" ? "Plan cancelled" : "Plan marked completed"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!loading && !agent) {
    return (
      <div className="min-h-screen bg-background"><Navigation />
        <div className="container mx-auto px-4 pt-24 text-center">
          <p className="text-muted-foreground mb-4">Only registered agents can create Smart Visit plans.</p>
          <Button onClick={() => navigate("/agent/register")}>Register as agent</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-24 max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/agent")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Route className="h-5 w-5 text-primary" />Smart Visit Plans</h1>
              <p className="text-xs text-muted-foreground">Group site visits with pickup & drop. Plans go live after admin approval.</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Create Smart Visit Plan</Button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : plans.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No plans yet. Create your first Smart Visit plan.</CardContent></Card>
        ) : plans.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{p.visit_date} · {p.start_time} · {p.city || "N/A"} · {p.property_ids.length} properties · {p.max_seats} seats</p>
                </div>
                <Badge variant={statusVariant(p.status) as any}>{statusLabel[p.status] || p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Meeting point: <b>{inr(p.price_meeting_point)}</b>/person · Home pickup: <b>{inr(p.price_home_pickup)}</b>/person</p>
              {p.status === "rejected" && p.rejection_reason && (
                <p className="text-sm text-destructive">Rejected by admin: {p.rejection_reason}</p>
              )}
              {p.admin_notes && <p className="text-xs text-muted-foreground">Admin note: {p.admin_notes}</p>}
              <div className="flex flex-wrap gap-2">
                {(p.status === "pending_review" || p.status === "rejected") && (
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>{p.status === "rejected" ? "Edit & resubmit" : "Edit"}</Button>
                )}
                {p.status === "approved" && (
                  <>
                    <Button size="sm" onClick={() => setOpenPlan(openPlan === p.id ? null : p.id)}><Users className="h-4 w-4 mr-1" />Bookings</Button>
                    <Button size="sm" variant="outline" onClick={() => changeStatus(p.id, "completed")}><CheckCircle2 className="h-4 w-4 mr-1" />Mark trip completed</Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Cancel this plan? All customers will be notified.") && changeStatus(p.id, "cancelled")}>Cancel plan</Button>
                  </>
                )}
                {p.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => setOpenPlan(openPlan === p.id ? null : p.id)}><Users className="h-4 w-4 mr-1" />Bookings & ratings</Button>
                )}
              </div>
              {openPlan === p.id && <PlanBookings plan={p} />}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Smart Visit plan" : "Create Smart Visit plan"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunday 2BHK tour – Gachibowli" /></div>
            <div><Label>Trip details</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What customers will see, duration, refreshments…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Max seats</Label><Input type="number" min={1} value={form.max_seats} onChange={(e) => setForm({ ...form, max_seats: Number(e.target.value) })} /></div>
              <div><Label>Visit date</Label><Input type="date" value={form.visit_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></div>
              <div><Label>Start time</Label><Input value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            </div>
            <div><Label>Meeting point (single pickup place)</Label><Input value={form.meeting_point} onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} placeholder="Metro station gate 2, Hitech City" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price per person – meeting point (₹)</Label><Input type="number" value={form.price_meeting_point} onChange={(e) => setForm({ ...form, price_meeting_point: Number(e.target.value) })} /></div>
              <div><Label>Price per person – home pickup (₹)</Label><Input type="number" value={form.price_home_pickup} onChange={(e) => setForm({ ...form, price_home_pickup: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Properties to visit ({form.property_ids.length} selected)</Label>
              <div className="relative mt-1">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your or live properties" />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {options.length === 0 && <p className="text-xs text-muted-foreground">No properties found.</p>}
                {options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted">
                    <input type="checkbox" checked={form.property_ids.includes(o.id)} onChange={() => toggleProp(o.id)} />
                    <span className="truncate">{o.title || "Property"} <span className="text-muted-foreground">· {[o.locality, o.city].filter(Boolean).join(", ")}</span></span>
                  </label>
                ))}
              </div>
              {form.property_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.property_ids.map((id, i) => (
                    <Badge key={id} variant="secondary" className="gap-1">Stop {i + 1}
                      <Trash2 className="h-3 w-3 cursor-pointer" onClick={() => toggleProp(id)} /></Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Close</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Sending…" : "Send for approval"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanBookings({ plan }: { plan: SmartVisitPlan }) {
  const [rows, setRows] = useState<SmartVisitBooking[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { pickup_time: string; agent_message: string }>>({});
  const load = () => listPlanBookings(plan.id).then((r) => {
    setRows(r);
    setDrafts(Object.fromEntries(r.map((b) => [b.id, { pickup_time: b.pickup_time || "", agent_message: b.agent_message || "" }])));
  });
  useEffect(() => { load(); }, [plan.id]);

  const act = async (b: SmartVisitBooking, patch: Partial<SmartVisitBooking>, msg: string) => {
    try { await updateBooking(b.id, patch); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (!rows) return <p className="text-xs text-muted-foreground">Loading bookings…</p>;
  const active = rows.filter((r) => r.status !== "cancelled");
  const revenue = active.reduce((s, r) => s + Number(r.total_amount), 0);
  const rated = rows.filter((r) => r.rating);

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <Badge variant="outline">{active.reduce((s, r) => s + r.seats, 0)}/{plan.max_seats} seats booked</Badge>
        <Badge variant="outline">Collect: {inr(revenue)}</Badge>
        {rated.length > 0 && <Badge variant="outline"><Star className="h-3 w-3 mr-1" />{(rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length).toFixed(1)} ({rated.length})</Badge>}
      </div>
      <PlanPropertyList ids={plan.property_ids} />
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
      {rows.map((b) => (
        <div key={b.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-sm">{b.customer_name || "Customer"} · {b.seats} seat(s)</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{b.contact_phone || "N/A"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />
                {b.pickup_type === "home" ? `Home pickup: ${b.pickup_address}` : `Meeting point: ${plan.meeting_point}`}
                {b.drop_address ? ` · Drop: ${b.drop_address}` : ""}</p>
              <p className="text-xs">{inr(b.price_per_person)} × {b.seats} = <b>{inr(b.total_amount)}</b></p>
            </div>
            <Badge variant={statusVariant(b.status) as any}>{statusLabel[b.status] || b.status}</Badge>
          </div>
          {b.interested_to_buy && <p className="text-xs text-primary font-medium">Interested to buy{b.interest_note ? `: ${b.interest_note}` : ""}</p>}
          {b.rating && <p className="text-xs flex items-center gap-1"><Star className="h-3 w-3 text-primary" />{b.rating}/5 {b.review ? `– "${b.review}"` : ""}</p>}
          {["booked", "confirmed", "picked_up"].includes(b.status) && (
            <>
              <div className="grid sm:grid-cols-[140px_1fr] gap-2">
                <Input placeholder="Pickup time" value={drafts[b.id]?.pickup_time || ""} onChange={(e) => setDrafts({ ...drafts, [b.id]: { ...drafts[b.id], pickup_time: e.target.value } })} />
                <Input placeholder="Trip details for customer (vehicle, contact, route…)" value={drafts[b.id]?.agent_message || ""} onChange={(e) => setDrafts({ ...drafts, [b.id]: { ...drafts[b.id], agent_message: e.target.value } })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => {
                  const d = drafts[b.id];
                  if (!d?.pickup_time.trim()) return toast.error("Add a pickup time");
                  act(b, { ...d, status: b.status === "booked" ? "confirmed" : b.status }, "Trip details sent to customer");
                }}>Send time & trip details</Button>
                {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => act(b, { status: "picked_up" }, "Marked picked up")}>Picked up</Button>}
                {b.status === "picked_up" && <Button size="sm" variant="outline" onClick={() => act(b, { status: "completed" }, "Visit completed – customer can now rate you")}>Dropped & completed</Button>}
                {b.status === "confirmed" && <Button size="sm" variant="ghost" onClick={() => act(b, { status: "no_show" }, "Marked no-show")}>No show</Button>}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
