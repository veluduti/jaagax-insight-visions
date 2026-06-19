import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Camera, MapPin, FileCheck, Upload, CheckCircle2, XCircle, Clock,
  Navigation as NavigationIcon, Loader2, ShieldCheck, Building2, Video, FileText,
} from "lucide-react";
import { AgentAssignmentActions } from "@/components/agent/AgentAssignmentActions";
import { PropertyStatusBadge } from "@/components/property/PropertyStatusBadge";

interface AssignedProperty {
  id: string;
  title: string;
  address: string | null;
  locality: string | null;
  city: string | null;
  price: number;
  images: string[] | null;
  lifecycle_status: string | null;
  rera_id: string | null;
  created_at: string | null;
}

interface GeoPhoto { url: string; lat: number; lng: number; captured_at: string }

const AgentVerificationDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<AssignedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AssignedProperty | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    photos: [] as string[],
    geoPhotos: [] as GeoPhoto[],
    videoUrl: null as string | null,
    reportUrl: null as string | null,
    remarks: "",
  });

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data, error } = await (supabase.from as any)("properties")
        .select("id, title, address, locality, city, price, images, lifecycle_status, rera_id, created_at")
        .eq("assigned_agent_id", user.id)
        .in("lifecycle_status", [
          "agent_assigned","agent_accepted","visit_scheduled","under_verification","verification_submitted",
        ])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProperties((data || []) as AssignedProperty[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAssigned(); }, []);

  const startVerify = (p: AssignedProperty) => {
    setActive(p);
    setForm({ photos: [], geoPhotos: [], videoUrl: null, reportUrl: null, remarks: "" });
  };

  const uploadFile = async (f: File, folder: string) => {
    const path = `verifications/${active!.id}/${folder}/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("rera-documents").upload(path, f);
    if (error) throw error;
    return supabase.storage.from("rera-documents").getPublicUrl(path).data.publicUrl;
  };

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>, geo = false) => {
    const files = e.target.files;
    if (!files || !active) return;
    try {
      const gps: { lat: number; lng: number } | null = geo
        ? await new Promise((res) => navigator.geolocation.getCurrentPosition(
            (pos) => res({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => res(null), { enableHighAccuracy: true, timeout: 10000 }
          ))
        : null;
      if (geo && !gps) { toast.error("Could not capture GPS"); return; }
      for (const f of Array.from(files)) {
        const url = await uploadFile(f, geo ? "geo" : "photos");
        if (geo && gps) {
          setForm((p) => ({ ...p, geoPhotos: [...p.geoPhotos, { url, lat: gps.lat, lng: gps.lng, captured_at: new Date().toISOString() }] }));
        } else {
          setForm((p) => ({ ...p, photos: [...p.photos, url] }));
        }
      }
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    }
  };

  const uploadOne = async (e: React.ChangeEvent<HTMLInputElement>, kind: "video" | "report") => {
    const f = e.target.files?.[0];
    if (!f || !active) return;
    try {
      const url = await uploadFile(f, kind);
      setForm((p) => ({ ...p, ...(kind === "video" ? { videoUrl: url } : { reportUrl: url }) }));
      toast.success(`${kind} uploaded`);
    } catch (err: any) { toast.error(err?.message || "Upload failed"); }
  };

  const submit = async () => {
    if (!active) return;
    if (form.photos.length === 0) return toast.error("Upload at least one verification photo");
    if (form.geoPhotos.length === 0) return toast.error("Upload at least one geo-tagged photo");
    if (!form.remarks.trim()) return toast.error("Add remarks");
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-verification-report", {
        body: {
          property_id: active.id,
          photos: form.photos,
          geo_photos: form.geoPhotos,
          video_url: form.videoUrl,
          remarks: form.remarks,
          report_url: form.reportUrl,
        },
      });
      if (error) throw error;
      toast.success("Verification submitted for final approval");
      setActive(null);
      fetchAssigned();
    } catch (e: any) {
      toast.error(e?.message || "Submit failed");
    } finally { setSubmitting(false); }
  };

  const formatPrice = (price: number) => {
    if (!price) return "—";
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  const canSubmit = (status: string | null) =>
    status === "agent_accepted" || status === "visit_scheduled" || status === "under_verification";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container-padding max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold">My Verification Tasks</h1>
            </div>
            <p className="text-muted-foreground">Accept assignments, visit properties, upload geo-tagged proof, and submit reports.</p>
          </div>

          {active && (
            <Card className="mb-8 border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> Verifying: {active.title}</CardTitle>
                    <CardDescription>{active.address || `${active.locality}, ${active.city}`}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActive(null)}><XCircle className="w-4 h-4 mr-1" /> Close</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Price:</span><p className="font-medium">{formatPrice(active.price)}</p></div>
                  <div><span className="text-muted-foreground">RERA:</span><p className="font-medium">{active.rera_id || "Not provided"}</p></div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Verification photos</Label>
                  <Button variant="outline" onClick={() => photoRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Upload photos</Button>
                  <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e, false)} />
                  <span className="text-xs text-muted-foreground ml-2">{form.photos.length} uploaded</span>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><NavigationIcon className="w-4 h-4" /> Geo-tagged photos (auto GPS)</Label>
                  <Button variant="outline" onClick={() => document.getElementById(`geo-${active.id}`)?.click()}><MapPin className="w-4 h-4 mr-2" /> Capture geo photo</Button>
                  <input id={`geo-${active.id}`} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e, true)} />
                  <span className="text-xs text-muted-foreground ml-2">{form.geoPhotos.length} captured</span>
                  {form.geoPhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {form.geoPhotos.map((g, i) => (
                        <div key={i} className="relative">
                          <img src={g.url} alt={`geo-${i}`} className="w-20 h-20 object-cover rounded border" />
                          <Badge className="absolute -bottom-1 left-0 text-[9px]">{g.lat.toFixed(3)},{g.lng.toFixed(3)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Video className="w-4 h-4" /> Verification video (optional)</Label>
                    <Button variant="outline" onClick={() => videoRef.current?.click()}>{form.videoUrl ? "✓ Uploaded — replace" : "Upload video"}</Button>
                    <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => uploadOne(e, "video")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Verification report (PDF)</Label>
                    <Button variant="outline" onClick={() => reportRef.current?.click()}>{form.reportUrl ? "✓ Uploaded — replace" : "Upload report"}</Button>
                    <input ref={reportRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadOne(e, "report")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verification remarks</Label>
                  <Textarea rows={4} placeholder="Field observations, concerns, condition notes..." value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
                </div>

                <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  Submit for Final Approval
                </Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
            </div>
          ) : properties.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">No active tasks</h3>
              <p className="text-muted-foreground mb-4">You have no pending verification assignments.</p>
              <Button onClick={() => navigate("/dashboard/agent")}>Back to Dashboard</Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {properties.map((p) => (
                <Card key={p.id} className={`hover:shadow-lg transition-all ${active?.id === p.id ? "ring-2 ring-primary" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{p.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {p.locality || "—"}, {p.city || "—"}</CardDescription>
                      </div>
                      <PropertyStatusBadge status={p.lifecycle_status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Price:</span><span className="font-medium">{formatPrice(p.price)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">RERA:</span><span className="font-medium">{p.rera_id ? "Provided" : "Missing"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Assigned:</span><span className="font-medium">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</span></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {p.lifecycle_status === "agent_assigned" && (
                        <AgentAssignmentActions propertyId={p.id} onChanged={fetchAssigned} />
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => window.open(`/property/${p.id}`, "_blank")}><Building2 className="w-4 h-4 mr-1" /> View</Button>
                        <Button onClick={() => startVerify(p)} disabled={active?.id === p.id || !canSubmit(p.lifecycle_status)}>
                          <FileCheck className="w-4 h-4 mr-1" />
                          {active?.id === p.id ? "Editing" : "Verify"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AgentVerificationDashboard;
