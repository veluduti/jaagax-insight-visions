import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, XCircle, Clock, Eye, FileText, RefreshCw, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function HotelPartnersPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  useEffect(() => {
    load();
    const channel = supabase
      .channel("hotel_partner_apps_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_partner_applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hotel_partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setApps(data || []);
    setLoading(false);
  };

  const review = async (decision: "approved" | "rejected") => {
    if (!reviewing) return;
    if (decision === "rejected" && !reason.trim()) return toast.error("Provide a rejection reason");
    setActing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("hotel_partner_applications")
      .update({
        status: decision,
        rejection_reason: decision === "rejected" ? reason : null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reviewing.id);
    if (error) { setActing(false); return toast.error(error.message); }

    // Fire-and-forget applicant email
    try {
      await supabase.functions.invoke("hotel-partner-notify", {
        body: { applicationId: reviewing.id, decision, reason: decision === "rejected" ? reason : undefined },
      });
    } catch (e) {
      console.warn("[HotelPartners] notify email failed", e);
    }

    setActing(false);
    toast.success(decision === "approved" ? "Hotel approved, published & applicant emailed" : "Application rejected & applicant emailed");
    setReviewing(null); setReason("");
    load();
  };

  const signedDocUrl = async (path: string) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("hotel-documents").createSignedUrl(path, 60 * 10);
    return data?.signedUrl || null;
  };

  const openDoc = async (path: string) => {
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Cannot open document");
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/20 text-emerald-300"><ShieldCheck className="h-3 w-3 mr-1" /> Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
  };

  const pending = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Hotel Partner Applications</CardTitle>
            <CardDescription>Verify and approve incoming partner hotel registrations</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <h3 className="font-semibold mb-2 text-amber-400">Pending ({pending.length})</h3>
              <ApplicationsTable apps={pending} statusBadge={statusBadge} onView={setViewing} onReview={(a) => { setReviewing(a); setReason(""); }} />
              <h3 className="font-semibold mt-6 mb-2">Reviewed ({reviewed.length})</h3>
              <ApplicationsTable apps={reviewed} statusBadge={statusBadge} onView={setViewing} />
            </>
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.hotel_name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Owner" value={viewing.owner_name} />
                <Info label="Type" value={viewing.business_type} />
                <Info label="Email" value={viewing.email} />
                <Info label="Phone" value={viewing.phone} />
                <Info label="City" value={viewing.city} />
                <Info label="Locality" value={viewing.locality} />
                <Info label="Pincode" value={viewing.pincode} />
                <Info label="Total Rooms" value={String(viewing.total_rooms)} />
                <Info label="Price Range" value={`₹${viewing.price_min} – ₹${viewing.price_max}`} />
                <Info label="Check-in / out" value={`${viewing.check_in_time} / ${viewing.check_out_time}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Address</p>
                <p>{viewing.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Room Types</p>
                <div className="flex flex-wrap gap-1">{(viewing.room_types || []).map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}</div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Amenities</p>
                <div className="flex flex-wrap gap-1">{(viewing.amenities || []).map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}</div>
              </div>
              {viewing.photos?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Photos ({viewing.photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewing.photos.map((p: string, i: number) => <img key={i} src={p} alt="" className="aspect-video object-cover rounded-md"  loading="lazy" decoding="async" />)}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Documents</p>
                {viewing.business_registration_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.business_registration_url)}><FileText className="h-3 w-3 mr-1" /> Business Registration</Button>}
                {viewing.id_proof_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.id_proof_url)} className="ml-2"><FileText className="h-3 w-3 mr-1" /> ID Proof</Button>}
                {viewing.gst_certificate_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.gst_certificate_url)} className="ml-2"><FileText className="h-3 w-3 mr-1" /> GST</Button>}
              </div>
              {viewing.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button variant="premium" onClick={() => { setReviewing(viewing); setViewing(null); }}>Review</Button>
                </div>
              )}
              {viewing.status === "rejected" && viewing.rejection_reason && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-destructive text-sm">
                  <strong>Rejection reason:</strong> {viewing.rejection_reason}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review: {reviewing?.hotel_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Approving will create a live partner hotel and notify the owner. Rejecting will require a reason.</p>
            <Textarea placeholder="Rejection reason (only if rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="destructive" disabled={acting} onClick={() => review("rejected")}>{acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}</Button>
              <Button variant="premium" disabled={acting} onClick={() => review("approved")}>{acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & Publish"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-muted-foreground text-xs">{label}</p><p>{value || "—"}</p></div>;
}

function ApplicationsTable({ apps, statusBadge, onView, onReview }: any) {
  if (apps.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No applications</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hotel</TableHead><TableHead>Location</TableHead><TableHead>Owner</TableHead>
          <TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((a: any) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.hotel_name}<div className="text-xs text-muted-foreground">{a.business_type}</div></TableCell>
            <TableCell>{a.locality}, {a.city}</TableCell>
            <TableCell>{a.owner_name}<div className="text-xs text-muted-foreground">{a.phone}</div></TableCell>
            <TableCell>{statusBadge(a.status)}</TableCell>
            <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="text-right space-x-1">
              <Button size="sm" variant="ghost" onClick={() => onView(a)}><Eye className="h-3 w-3" /></Button>
              {onReview && <Button size="sm" variant="premium" onClick={() => onReview(a)}>Review</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
