import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeIndianRupee, Building2, User } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  currentPrice?: number | null;
  defaultSaleType?: "individual" | "agency";
  onDone?: () => void;
}

export default function AgentMarkSoldDialog({
  open, onOpenChange, propertyId, propertyTitle, currentPrice, defaultSaleType = "individual", onDone,
}: Props) {
  const [saleType, setSaleType] = useState<"individual" | "agency">(defaultSaleType);
  const [soldPrice, setSoldPrice] = useState<string>(currentPrice ? String(currentPrice) : "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("mark_property_sold", {
        _property_id: propertyId,
        _sale_type: saleType,
        _sold_price: soldPrice ? Number(soldPrice) : null,
      });
      if (error) throw error;
      toast.success("Property marked as sold");
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "Could not mark as sold");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark property as sold</DialogTitle>
          <DialogDescription>
            "{propertyTitle}" will move to your Sold Properties and be removed from live search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Sale type</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["individual", "Individual", User],
                ["agency", "Agency", Building2],
              ] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSaleType(val)}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    saleType === val
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <BadgeIndianRupee className="h-3.5 w-3.5" /> Final sale price (₹)
            </Label>
            <Input
              type="number"
              min={0}
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              placeholder="Enter closing price"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {busy ? "Saving…" : "Confirm sold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
