import type { longStayQuote } from "@/lib/longStayPricing";

type Quote = ReturnType<typeof longStayQuote>;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Rent breakdown for PG / Hostel / Co-living. Advance and refundable deposit are separate lines. */
export default function LongStayBreakdown({ quote: q, compact }: { quote: Quote; compact?: boolean }) {
  const per = q.plan === "monthly" ? "month" : "week";
  const rows: [string, number, string?][] = [
    [`Rent (first ${per})`, q.periodRent],
    ...(q.perPeriodExtras ? [[`Utilities / food / services per ${per}`, q.perPeriodExtras] as [string, number]] : []),
    ...(q.oneTimeFees ? [["One-time fees", q.oneTimeFees] as [string, number]] : []),
    ...(q.tax ? [[`Tax (${q.taxPct}%)`, q.tax] as [string, number]] : []),
    ...(q.advance ? [["Advance rent (adjusted later)", q.advance] as [string, number]] : []),
    ...(q.deposit ? [[q.depositRefundable ? "Security deposit (refundable)" : "Security deposit", q.deposit] as [string, number]] : []),
  ];
  return (
    <div className={`rounded-md border border-border/60 bg-background/60 ${compact ? "p-2" : "p-3"} text-xs space-y-1`}>
      <div className="flex flex-wrap gap-x-3 text-muted-foreground">
        {q.monthly > 0 && <span><b className="text-foreground">{inr(q.monthly)}</b>/month{q.monthlyIsDerived ? " (from weekly)" : ""}</span>}
        {q.weekly > 0 && <span><b className="text-foreground">{inr(q.weekly)}</b>/week</span>}
        {q.minMonths > 0 && <span>Min {q.minMonths} month{q.minMonths > 1 ? "s" : ""}</span>}
        {q.noticeDays > 0 && <span>{q.noticeDays}-day notice</span>}
      </div>
      {rows.map(([l, v]) => (
        <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{inr(v)}</span></div>
      ))}
      <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
        <span>Due at move-in</span><span>{inr(q.dueAtBooking)}</span>
      </div>
      <p className="text-muted-foreground">Then {inr(q.recurring)} per {per}. Final amount is confirmed at checkout.</p>
    </div>
  );
}
