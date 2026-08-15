// Purchased add-ons for a reservation, with fulfillment status control.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Row = {
  id: string;
  addon_id: string | null;
  addon_title: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_amount: number;
  status: string;
  hotel_addons?: { title: string; unit: string } | null;
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export default function BookingAddonsPanel({ bookingId }: { bookingId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("hotel_booking_addons")
        .select("*, hotel_addons(title, unit)")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (!cancelled) { setRows((data ?? []) as Row[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  const setStatus = async (row: Row, status: string) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status } : x)));
    const { error } = await (supabase as any)
      .from("hotel_booking_addons").update({ status }).eq("id", row.id);
    if (error) { setRows(prev); toast.error(error.message); }
    else toast.success("Add-on status updated");
  };

  if (loading) return <Skeleton className="h-16 w-full rounded-md" />;
  if (!rows.length) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Add-ons purchased</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border border-border/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.addon_title || r.hotel_addons?.title || "Add-on"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.quantity} × {money(r.unit_price)}
                  {(r.unit || r.hotel_addons?.unit) ? ` · ${(r.unit || r.hotel_addons?.unit)!.replace("_", " ")}` : ""}
                  {Number(r.tax_amount) > 0 ? ` · tax ${money(r.tax_amount)}` : ""}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{money(r.total_price)}</p>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
              <SelectTrigger className="mt-2 h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
