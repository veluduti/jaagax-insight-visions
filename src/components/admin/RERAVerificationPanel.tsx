import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

interface Row {
  id: string;
  property_id: string;
  user_id: string;
  rera_number: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  property?: { title: string; city: string; locality: string } | null;
}

export default function RERAVerificationPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectFor, setRejectFor] = useState<Row | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rera_verifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load RERA submissions"); setLoading(false); return; }

    const propIds = Array.from(new Set((data || []).map((r: any) => r.property_id)));
    const { data: props } = propIds.length
      ? await supabase.from("properties").select("id, title, city, locality").in("id", propIds)
      : { data: [] as any[] };
    const propMap = new Map((props || []).map((p: any) => [p.id, p]));

    const enriched = (data || []).map((r: any) => ({ ...r, property: propMap.get(r.property_id) || null }));
    setRows(enriched as Row[]);

    // Duplicate counts per RERA number
    const counts: Record<string, number> = {};
    (data || []).forEach((r: any) => { counts[r.rera_number] = (counts[r.rera_number] || 0) + 1; });
    setDuplicates(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => filter === "all" ? true : r.status === filter);

  const approve = async (row: Row) => {
    setActing(row.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rera_verifications")
        .update({ status: "approved", admin_notes: null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;

      await supabase.from("properties").update({
        verified: true,
        verification_status: "approved",
        rera_id: row.rera_number,
        rera_document_url: row.document_url,
      }).eq("id", row.property_id);

      await supabase.from("notifications").insert({
        user_id: row.user_id,
        type: "rera",
        title: "✅ RERA Verified",
        message: `Your listing "${row.property?.title || "Property"}" is now RERA Verified and live.`,
        link: `/property/${row.property_id}`,
      });

      toast.success("Approved & listing is live");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    } finally { setActing(null); }
  };

  const reject = async () => {
    if (!rejectFor) return;
    if (!rejectNote.trim()) { toast.error("Please provide a rejection reason"); return; }
    setActing(rejectFor.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rera_verifications")
        .update({ status: "rejected", admin_notes: rejectNote.trim(), reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", rejectFor.id);
      if (error) throw error;

      await supabase.from("properties").update({
        verified: false,
        verification_status: "rejected",
        rejection_reason: rejectNote.trim(),
      }).eq("id", rejectFor.property_id);

      await supabase.from("notifications").insert({
        user_id: rejectFor.user_id,
        type: "rera",
        title: "RERA Submission Rejected",
        message: `Your RERA submission was rejected. Reason: ${rejectNote.trim()}`,
        link: `/dashboard/builder`,
      });

      toast.success("Rejected & user notified");
      setRejectFor(null); setRejectNote("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Rejection failed");
    } finally { setActing(null); }
  };

  const StatusBadge = ({ s }: { s: Row["status"] }) => {
    if (s === "approved") return <Badge className="bg-green-500/15 text-green-700 border-green-500/40"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const counts = {
    pending: rows.filter(r => r.status === "pending").length,
    approved: rows.filter(r => r.status === "approved").length,
    rejected: rows.filter(r => r.status === "rejected").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> RERA Verification Dashboard</CardTitle>
            <CardDescription>Review and approve property RERA submissions</CardDescription>
          </div>
          <div className="flex gap-1">
            {(["pending", "approved", "rejected", "all"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && <span className="ml-1 text-xs opacity-70">({counts[f]})</span>}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            No {filter !== "all" ? filter : ""} submissions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>RERA Number</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.property?.title || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.property?.locality}, {r.property?.city}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{r.rera_number}</div>
                      {duplicates[r.rera_number] > 1 && (
                        <Badge variant="outline" className="mt-1 text-xs border-amber-500/50 text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />Used {duplicates[r.rera_number]}x
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a href={r.document_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                        <FileText className="h-4 w-4" /> View
                      </a>
                    </TableCell>
                    <TableCell><StatusBadge s={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                      {r.admin_notes && r.status === "rejected" && (
                        <div className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={r.admin_notes}>
                          Reason: {r.admin_notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => approve(r)} disabled={acting === r.id}>
                            {acting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setRejectFor(r); setRejectNote(""); }}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.reviewed_at ? `Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}` : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject RERA Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason. The user will be notified and can re-upload.
            </p>
            <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. RERA number does not match the certificate. Please re-upload a clear copy." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!!acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
