import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Camera, MapPin, FileCheck, Upload, CheckCircle2,
  XCircle, Clock, Navigation as NavigationIcon, Loader2, ShieldCheck, Building2
} from "lucide-react";

interface PendingProperty {
  id: string;
  title: string;
  address: string | null;
  locality: string | null;
  city: string | null;
  price: number;
  images: string[] | null;
  verification_status: string;
  verified: boolean | null;
  rera_id: string | null;
  created_at: string | null;
  builder_id: string | null;
}

const AgentVerificationDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingProperty | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    locationOk: false,
    documentsOk: false,
    photosOk: false,
    notes: "",
    photos: [] as string[],
    gps: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Properties needing verification: not verified yet
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, address, locality, city, price, images, verification_status, verified, rera_id, created_at, builder_id")
        .or("verified.is.null,verified.eq.false")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setProperties((data || []) as PendingProperty[]);
    } catch (e: any) {
      console.error("Verifications fetch error:", e);
      toast.error(e?.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const startVerify = (p: PendingProperty) => {
    setActive(p);
    setForm({
      locationOk: false,
      documentsOk: false,
      photosOk: false,
      notes: "",
      photos: [],
      gps: null,
    });
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({ ...p, gps: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
        toast.success("GPS captured");
        setCapturing(false);
      },
      (err) => {
        toast.error("Location error: " + err.message);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !active) return;
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (f) => {
          const path = `verifications/${active.id}/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
          const { error } = await supabase.storage.from("rera-documents").upload(path, f);
          if (error) throw error;
          const { data } = supabase.storage.from("rera-documents").getPublicUrl(path);
          return data.publicUrl;
        })
      );
      setForm((p) => ({ ...p, photos: [...p.photos, ...urls] }));
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    }
  };

  const submit = async () => {
    if (!active) return;
    if (!form.gps) return toast.error("Capture GPS location first");
    if (form.photos.length === 0) return toast.error("Upload at least one photo");
    if (!form.locationOk || !form.documentsOk || !form.photosOk) {
      return toast.error("Complete the verification checklist");
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          verified: true,
          verification_status: "verified",
          latitude: form.gps.lat,
          longitude: form.gps.lng,
          updated_at: new Date().toISOString(),
        })
        .eq("id", active.id);

      if (error) throw error;
      toast.success("Property verified successfully!");
      setActive(null);
      fetchPending();
    } catch (e: any) {
      toast.error(e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return "—";
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16">
        <div className="container-padding max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold">Property Verifications</h1>
            </div>
            <p className="text-muted-foreground">
              Visit pending properties, capture GPS &amp; photos, and verify listings to earn trust points.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{properties.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{form.photos.length}</p>
                <p className="text-xs text-muted-foreground">Photos Captured</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{form.gps ? "✓" : "—"}</p>
                <p className="text-xs text-muted-foreground">GPS Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Active form */}
          {active && (
            <Card className="mb-8 border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      Verifying: {active.title}
                    </CardTitle>
                    <CardDescription>
                      {active.address || `${active.locality}, ${active.city}`}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
                    <XCircle className="w-4 h-4 mr-1" /> Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <p className="font-medium">{formatPrice(active.price)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RERA ID:</span>
                    <p className="font-medium">{active.rera_id || "Not provided"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <NavigationIcon className="w-4 h-4" /> GPS Location
                  </Label>
                  <div className="flex gap-3 items-center flex-wrap">
                    <Button variant="outline" onClick={captureGPS} disabled={capturing}>
                      {capturing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                      Capture Location
                    </Button>
                    {form.gps && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        ✓ {form.gps.lat.toFixed(5)}, {form.gps.lng.toFixed(5)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Site Photos
                  </Label>
                  <div className="flex gap-3 items-center flex-wrap">
                    <Button variant="outline" onClick={() => fileRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Upload Photos
                    </Button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
                    <span className="text-sm text-muted-foreground">{form.photos.length} uploaded</span>
                  </div>
                  {form.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {form.photos.map((p, i) => (
                        <img key={i} src={p} alt={`shot ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Verification Checklist</Label>
                  {[
                    { k: "locationOk", l: "Property location matches the listed address" },
                    { k: "documentsOk", l: "Builder/owner documents are valid (RERA, ownership)" },
                    { k: "photosOk", l: "Listed photos accurately represent the property" },
                  ].map((c) => (
                    <div key={c.k} className="flex items-center gap-3">
                      <Checkbox
                        id={c.k}
                        checked={(form as any)[c.k]}
                        onCheckedChange={(v) => setForm((p) => ({ ...p, [c.k]: !!v }))}
                      />
                      <Label htmlFor={c.k} className="font-normal">{c.l}</Label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Field Notes</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    placeholder="Observations, concerns, neighborhood notes..."
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  Mark Property as Verified
                </Button>
              </CardContent>
            </Card>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground mb-4">No properties pending verification right now.</p>
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
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {p.locality || "—"}, {p.city || "—"}
                        </CardDescription>
                      </div>
                      <Badge className="bg-yellow-500 shrink-0">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">{formatPrice(p.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RERA:</span>
                        <span className="font-medium">{p.rera_id ? "Provided" : "Missing"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Listed:</span>
                        <span className="font-medium">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button variant="outline" onClick={() => window.open(`/property/${p.id}`, "_blank")}>
                        <Building2 className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button onClick={() => startVerify(p)} disabled={active?.id === p.id}>
                        <FileCheck className="w-4 h-4 mr-1" />
                        {active?.id === p.id ? "Editing" : "Verify"}
                      </Button>
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
