import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Provider = {
  id: string; user_id: string; company_name: string | null;
  services_offered: string[]; logo_url: string | null; rating: number;
};

export default function LoanAssistanceDialog({
  open, onOpenChange, propertyId, propertyTitle, propertyValue,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  propertyId?: string; propertyTitle?: string; propertyValue?: number;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", loan_amount: propertyValue ? Math.floor(propertyValue * 0.8) : 0,
    tenure_years: 20, monthly_income: 0,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any).from("financial_providers")
        .select("id,user_id,company_name,services_offered,logo_url,rating")
        .eq("kyc_status", "verified");
      setProviders(data ?? []);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) setForm((f) => ({
        ...f,
        full_name: u.user!.user_metadata?.full_name ?? "",
        phone: u.user!.user_metadata?.phone ?? "",
      }));
    })();
  }, [open]);

  async function apply() {
    if (!selected) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Please sign in"); return; }
    const { error } = await (supabase as any).from("financial_loan_applications").insert({
      provider_id: selected.id, buyer_id: u.user.id, buyer_name: form.full_name, buyer_phone: form.phone,
      buyer_email: u.user.email, property_id: propertyId, property_title: propertyTitle,
      property_value: propertyValue, loan_amount: form.loan_amount, tenure_months: form.tenure_years * 12,
      monthly_income: form.monthly_income, status: "new",
    });
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("financial_notifications").insert({
      provider_id: selected.id, title: "New Loan Application",
      message: `${form.full_name} applied for ₹${(form.loan_amount / 100000).toFixed(1)}L`,
      link: "/dashboard/financial/applications",
    });
    toast.success("Application submitted!");
    setSelected(null); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Apply for Loan Assistance</DialogTitle></DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No verified financial partners available right now.</p>
            ) : providers.map((p) => (
              <Card key={p.id} className="hover:border-primary transition-all">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    {p.logo_url ? <img src={p.logo_url} className="h-12 w-12 rounded object-cover" alt="" />
                      : <div className="h-12 w-12 rounded bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">{(p.company_name ?? "F")[0]}</div>}
                    <div>
                      <p className="font-semibold">{p.company_name ?? "Provider"}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(p.services_offered ?? []).slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                        <Star className="h-3 w-3 fill-amber-500" />{Number(p.rating ?? 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setSelected(p)}>Apply Now</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Applying with <b>{selected.company_name}</b></p>
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Mobile Number</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Loan Amount Required (₹)</Label><Input type="number" value={form.loan_amount} onChange={(e) => setForm({ ...form, loan_amount: Number(e.target.value) })} /></div>
            <div>
              <Label>Loan Tenure</Label>
              <Select value={String(form.tenure_years)} onValueChange={(v) => setForm({ ...form, tenure_years: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 10, 15, 20, 25, 30].map((y) => <SelectItem key={y} value={String(y)}>{y} years</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Annual Income (₹)</Label><Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} /></div>
            <div><Label>Property Value (₹)</Label><Input type="number" value={propertyValue ?? 0} disabled /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Back</Button>
              <Button onClick={apply} className="flex-1">Submit Application</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
