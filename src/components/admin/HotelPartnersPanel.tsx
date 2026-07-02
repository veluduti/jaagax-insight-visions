import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, XCircle, Clock, Eye, FileText, RefreshCw, Lock, LogIn, Search, X } from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function HotelPartnersPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

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

  const counts = useMemo(() => ({
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  }), [apps]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => a.city && set.add(a.city));
    return Array.from(set).sort();
  }, [apps]);

  const businessTypes = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => a.business_type && set.add(a.business_type));
    return Array.from(set).sort();
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = apps.slice();
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (cityFilter !== "all") list = list.filter((a) => a.city === cityFilter);
    if (businessFilter !== "all") list = list.filter((a) => a.business_type === businessFilter);
    if (q) {
      list = list.filter((a) =>
        [a.hotel_name, a.owner_name, a.email, a.phone, a.city, a.locality, a.pincode]
          .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [apps, statusFilter, cityFilter, businessFilter, query, sort]);

  const clearFilters = () => {
    setQuery(""); setCityFilter("all"); setBusinessFilter("all"); setSort("newest"); setStatusFilter("pending");
  };

  const activeFilterCount =
    (query ? 1 : 0) + (cityFilter !== "all" ? 1 : 0) + (businessFilter !== "all" ? 1 : 0);

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
        <CardContent className="space-y-4">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all" className="gap-1">All <Badge variant="outline" className="ml-1">{counts.all}</Badge></TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">Pending <Badge variant="outline" className="ml-1">{counts.pending}</Badge></TabsTrigger>
              <TabsTrigger value="approved" className="gap-1">Approved <Badge variant="outline" className="ml-1">{counts.approved}</Badge></TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1">Rejected <Badge variant="outline" className="ml-1">{counts.rejected}</Badge></TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-2 md:grid-cols-[1fr_180px_180px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hotel, owner, email, phone, pincode..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={businessFilter} onValueChange={setBusinessFilter}>
              <SelectTrigger><SelectValue placeholder="Business type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All business types</SelectItem>
                {businessTypes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            {(activeFilterCount > 0 || statusFilter !== "pending") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                Showing {filtered.length} of {apps.length} application{apps.length === 1 ? "" : "s"}
              </div>
              <ApplicationsTable
                apps={filtered}
                statusBadge={statusBadge}
                onView={setViewing}
                onReview={(a: any) => { setReviewing(a); setReason(""); }}
              />
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
                <Info label="Business Type" value={viewing.business_type} />
                <Info label="Email" value={viewing.email} />
                <Info label="Phone" value={viewing.phone} />
                <Info label="City" value={viewing.city} />
                <Info label="Locality" value={viewing.locality} />
                <Info label="Pincode" value={viewing.pincode} />
                <Info label="Coordinates" value={viewing.latitude && viewing.longitude ? `${Number(viewing.latitude).toFixed(5)}, ${Number(viewing.longitude).toFixed(5)}` : "—"} />
                <Info label="Total Rooms" value={String(viewing.total_rooms ?? 0)} />
                <Info label="Price Range" value={`₹${viewing.price_min ?? 0} – ₹${viewing.price_max ?? 0}`} />
                <Info label="Check-in / out" value={`${viewing.check_in_time || "—"} / ${viewing.check_out_time || "—"}`} />
                <Info label="24h Check-in" value={viewing.check_in_24h ? "Yes" : "No"} />
                <Info label="24h Front Desk" value={viewing.front_desk_24h ? "Yes" : "No"} />
                <Info label="Submitted" value={new Date(viewing.created_at).toLocaleString()} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Address</p>
                <p>{viewing.address || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Room Types</p>
                <div className="flex flex-wrap gap-1">{(viewing.room_types || []).map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}</div>
              </div>

              {Array.isArray(viewing.room_categories) && viewing.room_categories.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Room Inventory ({viewing.room_categories.length} categories)</p>
                  <div className="space-y-2">
                    {viewing.room_categories.map((rc: any, i: number) => (
                      <div key={i} className="rounded-md border border-border p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{rc.custom_room_name || rc.room_type}</p>
                          <Badge variant="outline">{rc.room_count} rooms</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <Info label="Base Price" value={`₹${rc.base_price ?? "—"}`} />
                          <Info label="Weekend" value={rc.weekend_price ? `₹${rc.weekend_price}` : "—"} />
                          <Info label="Occupancy" value={String(rc.max_occupancy ?? "—")} />
                          <Info label="Size" value={rc.room_size_sqft ? `${rc.room_size_sqft} sqft` : "—"} />
                          <Info label="Extra Bed" value={rc.extra_bed_available ? "Yes" : "No"} />
                          <Info label="Children" value={rc.children_allowed ? "Allowed" : "No"} />
                        </div>
                        {rc.amenities?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rc.amenities.map((a: string) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs mb-1">Property Amenities</p>
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
                <div className="flex flex-wrap gap-2">
                  {viewing.business_registration_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.business_registration_url)}><FileText className="h-3 w-3 mr-1" /> Business Reg.</Button>}
                  {viewing.trade_license_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.trade_license_url)}><FileText className="h-3 w-3 mr-1" /> Trade License</Button>}
                  {viewing.gst_certificate_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.gst_certificate_url)}><FileText className="h-3 w-3 mr-1" /> GST</Button>}
                  {viewing.id_proof_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.id_proof_url)}><FileText className="h-3 w-3 mr-1" /> PAN</Button>}
                  {viewing.identity_proof_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.identity_proof_url)}><FileText className="h-3 w-3 mr-1" /> Identity Proof</Button>}
                  {viewing.address_proof_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.address_proof_url)}><FileText className="h-3 w-3 mr-1" /> Address Proof</Button>}
                  {viewing.cancelled_cheque_url && <Button size="sm" variant="outline" onClick={() => openDoc(viewing.cancelled_cheque_url)}><FileText className="h-3 w-3 mr-1" /> Cancelled Cheque</Button>}
                </div>
                {(viewing.gst_number || viewing.pan_number || viewing.company_name || viewing.bank_account_number) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-xs">
                    {viewing.company_name && <Info label="Company" value={viewing.company_name} />}
                    {viewing.gst_number && <Info label="GST No." value={viewing.gst_number} />}
                    {viewing.pan_number && <Info label="PAN No." value={viewing.pan_number} />}
                    {viewing.num_hotels && <Info label="Hotels" value={String(viewing.num_hotels)} />}
                    {viewing.bank_name && <Info label="Bank" value={viewing.bank_name} />}
                    {viewing.bank_account_name && <Info label="A/C Name" value={viewing.bank_account_name} />}
                    {viewing.bank_account_number && <Info label="A/C No." value={viewing.bank_account_number} />}
                    {viewing.bank_ifsc && <Info label="IFSC" value={viewing.bank_ifsc} />}
                  </div>
                )}
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
          <TableHead>Status</TableHead><TableHead>PMS</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((a: any) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.hotel_name}<div className="text-xs text-muted-foreground">{a.business_type}</div></TableCell>
            <TableCell>{a.locality}, {a.city}</TableCell>
            <TableCell>{a.owner_name}<div className="text-xs text-muted-foreground">{a.phone}</div></TableCell>
            <TableCell>{statusBadge(a.status)}</TableCell>
            <TableCell className="text-xs">
              {a.pms_setup_completed
                ? <span className="text-emerald-400">{a.pms_provider || "Configured"}</span>
                : <span className="text-muted-foreground">Not set</span>}
            </TableCell>
            <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="text-right space-x-1">
              <Button size="sm" variant="ghost" onClick={() => onView(a)}><Eye className="h-3 w-3" /></Button>
              {onReview && a.status === "pending" && <Button size="sm" variant="premium" onClick={() => onReview(a)}>Review</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
