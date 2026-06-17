import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import referralService from "@/services/referralService";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderProfileId: string;
  onCreated?: () => void;
}

export default function CreateReferralModal({ open, onOpenChange, builderProfileId, onCreated }: Props) {
  const { toast } = useToast();
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("5000");
  const [maxReferrals, setMaxReferrals] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await sb
        .from("properties")
        .select("id,title")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      setProperties((data ?? []) as any);
    })();
  }, [open]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({ title: "Enter a valid referral amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await referralService.createReferralProgram(
        builderProfileId,
        propertyId || null,
        Number(amount),
        maxReferrals ? Number(maxReferrals) : null,
      );
      toast({ title: "Referral program created" });
      onOpenChange(false);
      onCreated?.();
      setAmount("5000");
      setMaxReferrals("");
      setPropertyId("");
    } catch (e: any) {
      toast({ title: "Failed to create", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Referral Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Property (optional)</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="All properties" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referral Amount (₹)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Max Referrals (optional)</Label>
            <Input type="number" min={1} value={maxReferrals} onChange={(e) => setMaxReferrals(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
