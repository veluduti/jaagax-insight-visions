import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Clock, XCircle, Upload, FileText } from "lucide-react";

interface Sub {
  id: string;
  property_id: string;
  rera_number: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  property?: { title: string } | null;
}

export default function BuilderRERAStatus({ onUpload }: { onUpload: () => void }) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("rera_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((data || []).map((r: any) => r.property_id)));
    const { data: props } = ids.length
      ? await supabase.from("properties").select("id, title").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((props || []).map((p: any) => [p.id, p]));
    setSubs(((data || []) as any[]).map(r => ({ ...r, property: map.get(r.property_id) || null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const StatusBadge = ({ s }: { s: Sub["status"] }) => {
    if (s === "approved") return <Badge className="bg-green-500/15 text-green-700 border-green-500/40"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected — Re-upload required</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> RERA Verification Status</CardTitle>
            <CardDescription>Track every property's RERA review status</CardDescription>
          </div>
          <Button onClick={onUpload}><Upload className="h-4 w-4 mr-2" /> Submit New RERA</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : subs.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-1">No RERA submissions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Submit your RERA certificate to publish your listings.</p>
            <Button onClick={onUpload}><Upload className="h-4 w-4 mr-2" /> Upload RERA</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.property?.title || "Property"}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{s.rera_number}</div>
                  {s.status === "rejected" && s.admin_notes && (
                    <div className="text-xs text-destructive mt-1">Reason: {s.admin_notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a href={s.document_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" /> Document
                  </a>
                  <StatusBadge s={s.status} />
                  {s.status === "rejected" && (
                    <Button size="sm" variant="outline" onClick={onUpload}>
                      <Upload className="h-3 w-3 mr-1" /> Re-upload
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
