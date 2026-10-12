import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Status = "pending" | "passed" | "failed";
interface Check { id: string; title: string; how: string }

const CHECKS: Check[] = [
  { id: "cancellation", title: "Cancellation policies", how: "Open a hotel, pick dates, check deadline, refundable status and charges per rate before confirming." },
  { id: "board", title: "Board bases", how: "Each rate shows its meal plan (Room Only, B&B, Half/Full Board, All Inclusive) as returned." },
  { id: "taxes", title: "Taxes and fees", how: "Room price, taxes, fees, pay-at-property items and total are shown separately and match the booking." },
  { id: "remarks", title: "Remarks", how: "Hotel remarks and rate/booking remarks are shown and kept through checkout." },
  { id: "special", title: "Special requests", how: "Enter a request at checkout (e.g. high floor) and confirm it appears on the booking." },
  { id: "photos", title: "Photos", how: "Hotel and room photos load on desktop and mobile; missing images show a placeholder." },
  { id: "facilities", title: "Facilities", how: "Hotel facilities and room-level facilities are listed." },
  { id: "e2e", title: "End-to-end booking", how: "Search → hotel → room/rate → guest details → book → confirmation → booking appears in My Bookings. Retrying does not duplicate." },
];

const KEY = "jaagax_hg_stage2_checklist";

export default function HyperGuestCertification() {
  const [state, setState] = useState<Record<string, { status: Status; notes: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);

  const set = (id: string, patch: Partial<{ status: Status; notes: string }>) =>
    setState((s) => ({ ...s, [id]: { status: "pending", notes: "", ...s[id], ...patch } }));

  const counts = CHECKS.reduce((a, c) => { a[state[c.id]?.status ?? "pending"]++; return a; }, { pending: 0, passed: 0, failed: 0 } as Record<Status, number>);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HyperGuest Stage 2 checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mark each item only after checking it yourself. Nothing is marked Passed automatically. Use{" "}
          <Link to="/hotels" className="text-primary underline">Hotels</Link> for searching and{" "}
          <Link to="/dashboard" className="text-primary underline">your dashboard</Link> for booking history.
        </p>
        <div className="flex gap-2 mt-3 text-xs">
          <Badge variant="secondary">Pending {counts.pending}</Badge>
          <Badge>Passed {counts.passed}</Badge>
          <Badge variant="destructive">Failed {counts.failed}</Badge>
        </div>
      </div>
      {CHECKS.map((c) => {
        const cur = state[c.id] ?? { status: "pending" as Status, notes: "" };
        return (
          <Card key={c.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-foreground">{c.title}</h2>
                <p className="text-xs text-muted-foreground">{c.how}</p>
              </div>
              <div className="flex gap-1">
                {(["pending", "passed", "failed"] as Status[]).map((s) => (
                  <Button key={s} size="sm" variant={cur.status === s ? (s === "failed" ? "destructive" : "default") : "outline"}
                    onClick={() => set(c.id, { status: s })} className="capitalize">{s}</Button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Notes (optional)" value={cur.notes} onChange={(e) => set(c.id, { notes: e.target.value })} rows={2} />
          </Card>
        );
      })}
    </div>
  );
}
