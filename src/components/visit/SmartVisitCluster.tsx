import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Loader2, MapPin, Route, Users, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { visitDateLabel, visitTimeLabel } from "@/lib/smartVisitDate";
import { listOpenPlans, getProperties, firstImage, inr, type SmartVisitPlan, type PlanProperty } from "@/services/smartVisitService";

interface SmartVisitClusterProps {
  savedProperties?: unknown[];
  onScheduleCluster?: (...args: any[]) => void;
}

const SmartVisitCluster = (_props: SmartVisitClusterProps) => {
  const [plans, setPlans] = useState<SmartVisitPlan[]>([]);
  const [props, setProps] = useState<Record<string, PlanProperty>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await listOpenPlans();
        setPlans(list);
        const ids = [...new Set(list.flatMap((p) => p.property_ids ?? []))];
        const rows = await getProperties(ids);
        setProps(Object.fromEntries(rows.map((r) => [r.id, r])));
      } catch { setPlans([]); } finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Route className="h-6 w-6" /></div>
        <div>
          <h3 className="text-xl font-semibold">Smart Visit Planner</h3>
          <p className="text-sm text-muted-foreground">Guided group site visits with a JAAGA agent — pickup and drop included.</p>
        </div>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
        : plans.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No guided visits are scheduled right now. Please check back soon.</div>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const ps = (plan.property_ids ?? []).map((id) => props[id]).filter(Boolean);
            return (
              <Link key={plan.id} to={`/smart-visits?plan=${plan.id}`} className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="gap-1 whitespace-normal"><Calendar className="h-3.5 w-3.5 shrink-0" />{visitDateLabel(plan.visit_date, true)}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5 shrink-0" />{visitTimeLabel(plan.start_time)}</span>
                </div>
                <h4 className="mt-3 font-semibold line-clamp-1">{plan.title}</h4>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {ps.slice(0, 3).map((p) => { const img = firstImage(p.images); return img ? <img key={p.id} src={img} alt="" className="h-10 w-10 rounded-full border-2 border-background object-cover" /> : <div key={p.id} className="h-10 w-10 rounded-full border-2 border-background bg-muted" />; })}
                  </div>
                  <span className="font-medium">{plan.property_ids?.length ?? 0} properties</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {plan.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{plan.city}</span>}
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{plan.max_seats} seats</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">From {inr(plan.price_meeting_point)}</Badge>
                  <Badge variant="outline" className="gap-1"><Car className="h-3.5 w-3.5" />Home pickup {inr(plan.price_home_pickup)}</Badge>
                </div>
                <Button size="sm" className="mt-4 w-full">View & book</Button>
              </Link>
            );
          })}
        </div>}
    </section>
  );
};

export default SmartVisitCluster;
