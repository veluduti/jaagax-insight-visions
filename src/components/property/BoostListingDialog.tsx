import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  propertyId: string;
  trigger?: React.ReactNode;
  onBoosted?: () => void;
}

const PLANS = [
  { days: 7, price: 499, label: "1 Week", desc: "Quick visibility boost" },
  { days: 30, price: 1499, label: "1 Month", desc: "Best value — most popular", popular: true },
  { days: 60, price: 2499, label: "2 Months", desc: "Maximum exposure" },
];

const BoostListingDialog = ({ propertyId, trigger, onBoosted }: Props) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(30);
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    // Mock payment — in production integrate Stripe/Razorpay here.
    const ref = `MOCK_${Date.now()}`;
    const { error } = await supabase.rpc("mark_property_featured" as any, {
      _property_id: propertyId,
      _days: selected,
      _payment_ref: ref,
    });
    setPaying(false);
    if (error) {
      toast.error(error.message || "Payment failed");
      return;
    }
    toast.success(`Listing boosted for ${selected} days! 🚀`);
    setOpen(false);
    onBoosted?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" /> Boost Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Boost Your Listing
          </DialogTitle>
          <DialogDescription>
            Featured listings appear at the top of search results with a "Featured" badge.
            Get up to 5x more views.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {PLANS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setSelected(p.days)}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4 text-left transition-all",
                selected === p.days
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "hover:border-primary/40"
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.label}</span>
                  {p.popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold">₹{p.price.toLocaleString()}</div>
                {selected === p.days && <Check className="h-5 w-5 text-primary" />}
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={paying} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {paying ? "Processing..." : `Pay ₹${PLANS.find((p) => p.days === selected)?.price.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BoostListingDialog;
