import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, FileText, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeTableSubscription } from "@/hooks/useRealtimeTableSubscription";

interface PendingProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  type: string | null;
  price: number;
  area_sqft: number | null;
  description: string | null;
  images: any;
  agent_notes: string | null;
  original_snapshot: any;
  agent_data: any;
  field_verification: any;
  assigned_agent_id: string | null;
  submitted_by: string | null;
  agent_submitted_at: string | null;
}

const fmtPrice = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Number(n).toLocaleString("en-IN")}`;

export default function AgentVerifiedReviewPanel() {
  const [items, setItems] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<PendingProperty | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingProperty | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, city, locality, type, price, area_sqft, description, images, agent_notes, original_snapshot, agent_data, field_verification, assigned_agent_id, submitted_by, agent_submitted_at")
      .eq("verification_status", "agent_verified_pending")
      .order("agent_submitted_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  useRealtimeTableSubscription({
    channelName: "admin-agent-verified-panel",
    tables: ["properties"],
    onChange: () => { void fetchItems(); },
  });

  const handleApprove = async (p: PendingProperty) => {
    // Lock final_data from agent_data (fallback to current top-level fields if agent didn't fill JSONB).
    const finalData = p.agent_data ?? {
      basic_information: { title: p.title, property_type: p.type },
      location_details: { city: p.city, locality: p.locality },
      price: p.price,
      area_sqft: p.area_sqft,
      description: p.description,
      images: p.images,
    };
    const { error } = await supabase
      .from("properties")
      .update({
        verification_status: "approved",
        verified: true,
        rejection_reason: null,
        final_data: finalData,
        is_live: true,
        published_at: new Date().toISOString(),
      } as any)
      .eq("id", p.id);
    if (error) return toast.error(error.message);

    const notifs: any[] = [];
    if (p.submitted_by) {
      notifs.push({
        user_id: p.submitted_by,
        type: "property_approved",
        title: "Your property is now live ✅",
        message: `"${p.title}" has been approved by admin and is now visible to buyers.`,
        link: `/property/${p.id}`,
      });
    }
    // Notify the assigned agent
    if (p.assigned_agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("user_id")
        .eq("id", p.assigned_agent_id)
        .maybeSingle();
      if (agent?.user_id) {
        notifs.push({
          user_id: agent.user_id,
          type: "property_approved",
          title: "Property approved 🎉",
          message: `"${p.title}" — the property you verified has been approved by admin and is now live.`,
          link: `/property/${p.id}`,
        });
      }
    }
    if (notifs.length) await supabase.from("notifications").insert(notifs);

    setItems(prev => prev.filter(x => x.id !== p.id));
    setReviewTarget(null);
    toast.success("Property approved & published");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("Please provide a reason");
    const { error } = await supabase
      .from("properties")
      .update({ verification_status: "rejected", verified: false, is_live: false, rejection_reason: rejectReason.trim() } as any)
      .eq("id", rejectTarget.id);
    if (error) return toast.error(error.message);

    if (rejectTarget.submitted_by) {
      await supabase.from("notifications").insert({
        user_id: rejectTarget.submitted_by,
        type: "property_rejected",
        title: "Your property was rejected",
        message: `"${rejectTarget.title}" was rejected. Reason: ${rejectReason.trim()}`,
        link: `/dashboard/seller`,
      });
    }
    setItems(prev => prev.filter(x => x.id !== rejectTarget.id));
    setRejectTarget(null);
    setReviewTarget(null);
    setRejectReason("");
    toast.success("Property rejected");
  };

  const Diff = ({ label, original, edited, format }: { label: string; original: any; edited: any; format?: (v: any) => string }) => {
    const fmt = format || ((v: any) => (v == null || v === "" ? "—" : String(v)));
    const changed = JSON.stringify(original) !== JSON.stringify(edited);
    return (
      <div className="grid grid-cols-2 gap-3 py-2 border-b last:border-0">
        <div>
          <p className="text-[10px] uppercase font-semibold text-muted-foreground">{label} — Seller</p>
          <p className="text-sm">{fmt(original)}</p>
        </div>
        <div className={changed ? "rounded p-2 -m-2 bg-emerald-500/10 border border-emerald-500/30" : ""}>
          <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            {label} — Agent {changed && <ArrowRight className="h-3 w-3 text-emerald-600" />}
          </p>
          <p className="text-sm font-medium">{fmt(edited)}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Agent-Verified Properties — Final Approval
          <Badge variant="outline">{items.length}</Badge>
        </CardTitle>
        <CardDescription>
          Properties verified by field agents, awaiting your final approval. Compare original seller submission with the agent's edits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl">
            <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No properties awaiting final approval.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((p) => {
              const img = (Array.isArray(p.images) && p.images[0]) || "";
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="relative h-40">
                    <img src={img} alt={p.title} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                    <Badge className="absolute top-2 right-2 bg-blue-600">
                      <Clock className="h-3 w-3 mr-1" />Agent Verified
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{p.locality}, {p.city}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div><span className="text-muted-foreground">Price:</span> <strong>{fmtPrice(p.price)}</strong></div>
                      <div><span className="text-muted-foreground">Area:</span> <strong>{p.area_sqft || "—"} sqft</strong></div>
                    </div>
                    {p.agent_notes && (
                      <p className="text-[11px] bg-muted/40 border rounded p-2 mb-3 line-clamp-2">
                        <strong>Agent:</strong> {p.agent_notes}
                      </p>
                    )}
                    <Button size="sm" className="w-full" onClick={() => setReviewTarget(p)}>
                      Compare & Review
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Agent Verification</DialogTitle>
            <DialogDescription>
              Compare the original seller submission with the agent's verified edits.
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4">
              {reviewTarget.agent_notes && (
                <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                  <p className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-300 mb-1">Agent Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{reviewTarget.agent_notes}</p>
                </div>
              )}
              <div>
                {(() => {
                  const seller = reviewTarget.original_snapshot || {};
                  const ad = reviewTarget.agent_data || {};
                  const aTitle = ad.basic_information?.title ?? reviewTarget.title;
                  const aType = ad.basic_information?.property_type ?? reviewTarget.type;
                  const aCity = ad.location_details?.city ?? reviewTarget.city;
                  const aLocality = ad.location_details?.locality ?? reviewTarget.locality;
                  const aPrice = ad.price ?? reviewTarget.price;
                  const aArea = ad.area_sqft ?? reviewTarget.area_sqft;
                  const aDesc = ad.description ?? reviewTarget.description;
                  return (
                    <>
                      <Diff label="Title" original={seller.title} edited={aTitle} />
                      <Diff label="Type" original={seller.type} edited={aType} />
                      <Diff label="City" original={seller.city} edited={aCity} />
                      <Diff label="Locality" original={seller.locality} edited={aLocality} />
                      <Diff label="Price" original={seller.price} edited={aPrice} format={fmtPrice} />
                      <Diff label="Area (sqft)" original={seller.area_sqft} edited={aArea} />
                      <Diff label="Description" original={seller.description} edited={aDesc} />
                    </>
                  );
                })()}
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">Images comparison</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] mb-1">Original ({(reviewTarget.original_snapshot?.images || []).length})</p>
                    <div className="flex gap-1 flex-wrap">
                      {(reviewTarget.original_snapshot?.images || []).slice(0, 4).map((u: string, i: number) => (
                        <img key={i} src={u} className="h-16 w-16 object-cover rounded border" alt=""  loading="lazy" decoding="async" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] mb-1">Edited ({(reviewTarget.images || []).length})</p>
                    <div className="flex gap-1 flex-wrap">
                      {(reviewTarget.images || []).slice(0, 4).map((u: string, i: number) => (
                        <img key={i} src={u} className="h-16 w-16 object-cover rounded border" alt=""  loading="lazy" decoding="async" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => reviewTarget && setRejectTarget(reviewTarget)}>
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={() => reviewTarget && handleApprove(reviewTarget)} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-1" />Approve & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && (setRejectTarget(null), setRejectReason(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>Provide a reason for rejection. This will be sent to the seller.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Property details could not be verified on-site."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
