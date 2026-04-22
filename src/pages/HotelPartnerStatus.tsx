import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Clock, XCircle, Hotel, Plus } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function HotelPartnerStatus() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?redirect=/hotels/partner/status"); return; }
    const { data } = await supabase
      .from("hotel_partner_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/20 text-emerald-300"><ShieldCheck className="h-3 w-3 mr-1" /> Verified Partner</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Needs Revision</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-300"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Partner Applications</h1>
            <p className="text-muted-foreground text-sm">Track verification status of your hotel listings</p>
          </div>
          <Button variant="premium" onClick={() => navigate("/hotels/partner")}><Plus className="h-4 w-4" /> New Application</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : apps.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Hotel className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No applications yet</p>
            <Button variant="premium" onClick={() => navigate("/hotels/partner")}>Apply Now</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {apps.map((a) => (
              <Card key={a.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{a.hotel_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{a.locality}, {a.city} · {a.business_type}</p>
                  </div>
                  {statusBadge(a.status)}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Submitted {new Date(a.created_at).toLocaleDateString()}</p>
                  {a.status === "rejected" && a.rejection_reason && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-destructive">
                      <strong>Reason:</strong> {a.rejection_reason}
                    </div>
                  )}
                  {a.status === "approved" && a.approved_hotel_id && (
                    <Button variant="outline" size="sm" onClick={() => window.open(`/hotels/${a.approved_hotel_id}`, "_blank", "noopener,noreferrer")}>View Live Listing</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
