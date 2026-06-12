import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  price_drop_requested_price: number;
  price_drop_requested_at: string;
  submitted_by: string;
}

export default function PriceDropQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    // @ts-ignore
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,city,locality,price,price_drop_requested_price,price_drop_requested_at,submitted_by")
      .eq("price_drop_status", "pending")
      .order("price_drop_requested_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: Row) => {
    setBusyId(r.id);
    // @ts-ignore
    const { error } = await supabase.rpc("review_price_drop", {
      _property_id: r.id, _decision: "approved", _reason: null,
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Price drop approved — ribbon is live");
    load();
  };

  const reject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) return toast.error("Please provide a reason");
    setBusyId(rejecting.id);
    // @ts-ignore
    const { error } = await supabase.rpc("review_price_drop", {
      _property_id: rejecting.id, _decision: "rejected", _reason: reason.trim(),
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Price drop rejected");
    setRejecting(null); setReason("");
    load();
  };

  return (
    <Card className="glass-panel border-border/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-orange-400" />
        <h2 className="text-lg font-semibold">Price Drop Approvals</h2>
        <Badge variant="outline" className="ml-2">{rows.length} pending</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No pending price drops.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Current → Requested</TableHead>
              <TableHead>Drop %</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const dropPct = Math.round(((r.price - r.price_drop_requested_price) / r.price) * 100);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[220px] truncate">{r.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.locality, r.city].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="line-through text-muted-foreground">₹{r.price.toLocaleString("en-IN")}</span>
                    <span className="mx-1">→</span>
                    <span className="font-semibold text-emerald-400">
                      ₹{r.price_drop_requested_price.toLocaleString("en-IN")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">-{dropPct}%</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.price_drop_requested_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => { setRejecting(r); setReason(""); }}
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject price drop</DialogTitle>
            <DialogDescription>The seller will be notified with this reason.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Requested price is unrealistically low for this locality."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              disabled={!!busyId}
              onClick={reject}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {busyId ? "Rejecting…" : "Confirm reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
