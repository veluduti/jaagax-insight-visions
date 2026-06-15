import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowUpRight } from "lucide-react";

interface Offer {
  id: string;
  partner: string;
  headline: string;
  rate: string;
  tenure: string;
  highlight?: string;
  cta_url?: string;
}

// Curated list (would be backed by a `loan_offers` table in production)
const OFFERS: Offer[] = [
  {
    id: "hdfc-home",
    partner: "HDFC",
    headline: "Home Loan @ 8.40%",
    rate: "8.40% p.a.",
    tenure: "Up to 30 yrs",
    highlight: "Zero processing fee for JAAGAX users",
  },
  {
    id: "sbi-lap",
    partner: "SBI",
    headline: "Loan Against Property",
    rate: "9.10% p.a.",
    tenure: "Up to 15 yrs",
    highlight: "Quick approval in 72h",
  },
  {
    id: "icici-bt",
    partner: "ICICI",
    headline: "Balance Transfer + Top-up",
    rate: "8.55% p.a.",
    tenure: "Flexible",
    highlight: "Switch & save up to ₹4 lakh",
  },
];

export default function LoanOffersAlert() {
  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="h-5 w-5 text-amber-500" /> Loan Offers For You
        </CardTitle>
        <CardDescription>Curated home loan and investment offers from verified partners.</CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-3">
        {OFFERS.map((o) => (
          <div key={o.id} className="p-3 rounded-lg border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                {o.partner}
              </Badge>
              <span className="text-xs font-semibold text-emerald-600">{o.rate}</span>
            </div>
            <p className="font-semibold text-sm">{o.headline}</p>
            <p className="text-xs text-muted-foreground">{o.tenure}</p>
            {o.highlight && <p className="text-[11px] text-amber-700 dark:text-amber-400">✨ {o.highlight}</p>}
            <Button size="sm" variant="outline" className="w-full">
              View offer <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
