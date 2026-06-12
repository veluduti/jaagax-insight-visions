import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function PriceDropDialog({
  propertyId, currentPrice, onDone,
}: { propertyId: string; currentPrice: number; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<number>(Math.round(currentPrice * 0.95));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!newPrice || newPrice >= currentPrice) return toast.error("New price must be lower than current price");
    setBusy(true);
    const sb: any = supabase;
    const { error } = await sb.rpc("drop_property_price", { _property_id: propertyId, _new_price: newPrice });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Price drop submitted for admin review");
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10">
          <TrendingDown className="h-3 w-3 mr-1" /> Drop Price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request price drop</DialogTitle>
          <DialogDescription>
            Current price: ₹{currentPrice.toLocaleString("en-IN")}. Once an admin approves, your new price goes live and a "Price Reduced" ribbon appears on the card.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs">New price (₹)</Label>
          <Input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(Number(e.target.value) || 0)}
            min={1}
            max={currentPrice - 1}
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={busy} onClick={submit} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {busy ? "Submitting…" : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
