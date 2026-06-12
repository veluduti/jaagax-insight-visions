import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MarkAsSoldButton({ propertyId, onDone }: { propertyId: string; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    const sb: any = supabase;
    const { error } = await sb.rpc("mark_property_sold", { _property_id: propertyId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Property marked as sold");
    onDone?.();
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Mark as Sold
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this property as sold?</AlertDialogTitle>
          <AlertDialogDescription>
            The listing will be taken off live search and a "SOLD" badge will appear on the card. This can't be undone from the dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={handle} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {busy ? "Marking…" : "Yes, mark as sold"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
