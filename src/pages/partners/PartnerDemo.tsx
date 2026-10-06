import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PartnerNav from "@/components/partners/PartnerNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createDemo, deleteDemo, exitDemo, findDemoHotel, DEMO_KEY } from "@/services/hospitality/demoService";

const SCENARIOS = [
  { title: "1. Morning at the front desk", steps: "Open Today → Front Desk. Check in Ravi Kumar (arriving today) and check out Arjun Reddy. A cleaning job appears automatically.", to: "/partners/operations" },
  { title: "2. Housekeeping & repairs", steps: "Open Today → Housekeeping, start and finish a cleaning job. In Maintenance, fix the urgent AC problem.", to: "/partners/operations?tab=housekeeping" },
  { title: "3. Co-living residents & rent", steps: "Open Long Stays. Mark a rent payment as paid, see Divya leaving soon and Rahul moving in next week.", to: "/partners/long-stays" },
  { title: "4. Grow your bookings", steps: "Open Grow Bookings. Finish the listing checklist, try a price tip, and start a quick offer.", to: "/partners/growth" },
  { title: "5. Ask the helper", steps: "In Grow Bookings → Helper, ask “How can I get more bookings this month?”", to: "/partners/growth" },
  { title: "6. Bookings & calendar", steps: "See all sample bookings and which dates are taken.", to: "/partners/reservations" },
];

export default function PartnerDemo() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [has, setHas] = useState<boolean | null>(null);
  const [active, setActive] = useState(!!localStorage.getItem(DEMO_KEY));

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { nav("/partners/login"); return; }
    setHas(!!(await findDemoHotel(user.id)));
  })(); }, [nav]);

  const start = async () => {
    setBusy(true);
    try { await createDemo(); setHas(true); setActive(true); toast.success("Demo property ready"); }
    catch (e: any) { toast.error(e.message || "Could not create the demo"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Delete the demo property and all its sample data?")) return;
    setBusy(true);
    try { await deleteDemo(); setHas(false); setActive(false); toast.success("Demo deleted"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PartnerNav />
      <main className="container mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-bold">Try JAAGA with a demo property</h1>
        <p className="mb-3 text-sm text-muted-foreground">A hidden sample property with rooms, guests, residents and jobs. Customers never see it. Delete it any time.</p>
        <Card className="mb-3"><CardContent className="flex flex-wrap gap-2 p-3">
          {has === null ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : !active ? (
            <Button onClick={start} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-1 h-4 w-4" />}{has ? "Open demo property" : "Create demo property"}</Button>
          ) : (
            <Button variant="outline" onClick={() => { exitDemo(); setActive(false); toast.success("Back to your real property"); }}><LogOut className="mr-1 h-4 w-4" />Exit demo</Button>
          )}
          {has && <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="mr-1 h-4 w-4" />Delete demo</Button>}
        </CardContent></Card>

        <div className="space-y-2">
          {SCENARIOS.map((s) => (
            <Card key={s.title}><CardContent className="flex items-start justify-between gap-3 p-3">
              <div><div className="font-medium">{s.title}</div><div className="text-sm text-muted-foreground">{s.steps}</div></div>
              <Button asChild size="sm" variant="outline" disabled={!active}><Link to={active ? s.to : "#"}>Open</Link></Button>
            </CardContent></Card>
          ))}
        </div>
      </main>
    </div>
  );
}
