import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { financialService, type FinancialEnquiry } from "@/services/financialService";
import EnquiryDetail from "./EnquiryDetail";
import { Banknote, Eye, Loader2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  contacted: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  documents_submitted: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  deactivated: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

export default function FinancialEnquiries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<FinancialEnquiry[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, under_review: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState<FinancialEnquiry | null>(null);

  const load = async (bpId: string) => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([financialService.getEnquiries(bpId), financialService.getEnquiryStats(bpId)]);
      setEnquiries(list);
      setStats(s);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    financialService.getBuilderProfileId(user.id).then((bp) => {
      setBuilderProfileId(bp);
      if (bp) load(bp);
      else setLoading(false);
    });
  }, [user?.id]);

  const filtered = enquiries.filter((e) => {
    if (activeTab === "all") return true;
    if (activeTab === "under_review") return e.status === "under_review" || e.status === "documents_submitted";
    return e.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" /> Financial Enquiries
          </h1>
          <p className="text-muted-foreground">Manage loan enquiries, documents, EMI discussions and advisors.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-primary" },
            { label: "New", value: stats.new, color: "text-blue-600" },
            { label: "Under Review", value: stats.under_review, color: "text-amber-600" },
            { label: "Approved", value: stats.approved, color: "text-green-600" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600" },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!builderProfileId && !loading && (
          <Card className="border-border shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Create your builder profile first to manage financial enquiries.</p>
            </CardContent>
          </Card>
        )}

        {builderProfileId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 max-w-xl">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="under_review">Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <Card className="border-border shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">No enquiries here yet.</CardContent></Card>
              ) : (
                filtered.map((e) => (
                  <Card key={e.id} className="border-border shadow-sm hover:shadow-md transition">
                    <CardContent className="p-4 flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold capitalize">{(e.enquiry_type ?? e.loan_type).replace(/_/g, " ")}</h3>
                          <Badge className={STATUS_STYLES[e.status] ?? ""}>{e.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Buyer: {e.user_id.slice(0, 8)}… · Property: {e.property_id ? e.property_id.slice(0, 8) + "…" : "—"}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                          <span>₹{Number(e.loan_amount ?? e.amount_requested ?? 0).toLocaleString()}</span>
                          {e.loan_tenure_years && <span>{e.loan_tenure_years} yrs</span>}
                          {e.interest_rate_offered && <span>{e.interest_rate_offered}%</span>}
                          <span className="text-xs">{new Date(e.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelected(e)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {selected && (
        <EnquiryDetail
          enquiry={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => builderProfileId && load(builderProfileId)}
        />
      )}
    </div>
  );
}
