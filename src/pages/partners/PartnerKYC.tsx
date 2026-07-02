import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, FileCheck2, ImagePlus, X, ShieldCheck } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "hotel-documents";

type DocSlot = {
  key: "business_registration_url" | "gst_certificate_url" | "id_proof_url" |
       "trade_license_url" | "cancelled_cheque_url" | "address_proof_url" | "identity_proof_url";
  label: string;
  hint: string;
  required?: boolean;
};

const DOC_SLOTS: DocSlot[] = [
  { key: "gst_certificate_url", label: "GST Certificate", hint: "PDF or image", required: true },
  { key: "id_proof_url", label: "PAN Card", hint: "PDF or image", required: true },
  { key: "trade_license_url", label: "Trade License / Business Registration", hint: "Municipal / MSME", required: true },
  { key: "cancelled_cheque_url", label: "Cancelled Cheque", hint: "Clear scan of a cancelled cheque", required: true },
  { key: "address_proof_url", label: "Hotel Address Proof", hint: "Utility bill / rent agreement", required: true },
  { key: "identity_proof_url", label: "Owner Identity Proof", hint: "Aadhaar / Passport / DL", required: true },
];

export default function PartnerKYC() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const [docs, setDocs] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [bank, setBank] = useState({
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
  });
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/partners/login", { replace: true }); return; }
      setUserId(user.id);

      const snap = sessionStorage.getItem("partner_signup_snapshot");
      if (snap) setSnapshot(JSON.parse(snap));

      const { data: existing } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const app = existing?.[0];
      if (app) {
        setExistingId(app.id);
        const d: Record<string, string> = {};
        DOC_SLOTS.forEach((s) => { if (app[s.key]) d[s.key] = app[s.key]; });
        if (app.business_registration_url && !d.trade_license_url) d.trade_license_url = app.business_registration_url;
        setDocs(d);
        setPhotos(app.photos || []);
        setBank({
          bank_account_name: app.bank_account_name || "",
          bank_account_number: app.bank_account_number || "",
          bank_ifsc: app.bank_ifsc || "",
          bank_name: app.bank_name || "",
        });
      }
    })();
  }, [nav]);

  useEffect(() => {
    const filled = DOC_SLOTS.filter((s) => docs[s.key]).length;
    const bankFilled = Object.values(bank).every(Boolean) ? 1 : 0;
    const total = DOC_SLOTS.length + 1;
    setProgress(Math.round(((filled + bankFilled) / total) * 100));
  }, [docs, bank]);

  const uploadFile = useCallback(async (file: File, key: string) => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${key}-${Date.now()}.${ext}`;
    setUploading(key);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    } finally {
      setUploading(null);
    }
  }, [userId]);

  const handleDoc = async (slot: DocSlot, file: File) => {
    try {
      const path = await uploadFile(file, slot.key);
      if (path) {
        setDocs((d) => ({ ...d, [slot.key]: path }));
        toast.success(`${slot.label} uploaded`);
      }
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    }
  };

  const handlePhotos = async (files: FileList) => {
    for (const f of Array.from(files).slice(0, 10 - photos.length)) {
      try {
        const path = await uploadFile(f, "photo");
        if (path) setPhotos((p) => [...p, path]);
      } catch (e: any) {
        toast.error(`Photo upload failed: ${e.message}`);
      }
    }
  };

  const removePhoto = (p: string) => setPhotos((prev) => prev.filter((x) => x !== p));

  const submit = async () => {
    if (!userId) return;
    const missing = DOC_SLOTS.filter((s) => s.required && !docs[s.key]);
    if (missing.length) return toast.error(`Missing: ${missing.map((m) => m.label).join(", ")}`);
    if (photos.length < 3) return toast.error("Upload at least 3 hotel photos");
    if (!bank.bank_account_number || !bank.bank_ifsc) return toast.error("Complete bank details");

    setSaving(true);
    try {
      const s = snapshot || {};
      const payload: any = {
        user_id: userId,
        hotel_name: s.hotel_name || "My Hotel",
        owner_name: s.owner_name || "Owner",
        email: s.email || (await supabase.auth.getUser()).data.user?.email || null,
        phone: s.phone || null,
        business_type: s.business_type || "Independent Hotel",
        company_name: s.company_name || null,
        country: s.country || "India",
        state: s.state || null,
        city: s.city || null,
        locality: s.city || null,
        pincode: null,
        gst_number: s.gst_number || null,
        pan_number: s.pan_number || null,
        num_hotels: s.num_hotels || 1,
        num_rooms_total: s.num_rooms_total || null,
        total_rooms: s.num_rooms_total || null,
        photos,
        ...docs,
        business_registration_url: docs.trade_license_url || null,
        ...bank,
        status: "pending",
      };

      let res;
      if (existingId) {
        res = await (supabase as any).from("hotel_partner_applications").update(payload).eq("id", existingId);
      } else {
        res = await (supabase as any).from("hotel_partner_applications").insert(payload);
      }
      if (res.error) throw res.error;

      sessionStorage.removeItem("partner_signup_snapshot");
      toast.success("KYC submitted! We'll review within 24 hours.");
      nav("/partners/status", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h1 className="text-2xl font-bold">KYC verification</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Upload the required documents so our compliance team can verify your hotel.</p>
        </div>

        <Card className="mb-4 border border-emerald-500/20 bg-background/60 backdrop-blur">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Completion</span>
              <span className="font-semibold text-emerald-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <Card className="mb-4 border border-border/60 bg-background/60 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Compliance documents</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {DOC_SLOTS.map((slot) => (
              <DocUploader
                key={slot.key}
                slot={slot}
                uploaded={!!docs[slot.key]}
                uploading={uploading === slot.key}
                onFile={(f) => handleDoc(slot, f)}
                onRemove={() => setDocs((d) => { const c = { ...d }; delete c[slot.key]; return c; })}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="mb-4 border border-border/60 bg-background/60 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Hotel photos (min 3)</CardTitle></CardHeader>
          <CardContent>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 p-6 text-center transition hover:border-emerald-500/50">
              <ImagePlus className="mb-2 h-6 w-6 text-emerald-400" />
              <p className="text-sm font-medium">Click to upload hotel photos</p>
              <p className="text-xs text-muted-foreground">Up to 10 images, JPG/PNG</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handlePhotos(e.target.files)} />
            </label>
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((p) => (
                  <div key={p} className="group relative overflow-hidden rounded-md border border-border/60">
                    <StoragePreview path={p} />
                    <button onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 border border-border/60 bg-background/60 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Bank account for payouts</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div><Label>Account holder name</Label><Input value={bank.bank_account_name} onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })} /></div>
            <div><Label>Bank name</Label><Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} /></div>
            <div><Label>Account number</Label><Input value={bank.bank_account_number} onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })} /></div>
            <div><Label>IFSC code</Label><Input value={bank.bank_ifsc} onChange={(e) => setBank({ ...bank, bank_ifsc: e.target.value.toUpperCase() })} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => nav("/partners/status")}>Save & exit</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-500 text-white hover:bg-emerald-600">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for verification"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocUploader({ slot, uploaded, uploading, onFile, onRemove }: {
  slot: DocSlot; uploaded: boolean; uploading: boolean;
  onFile: (f: File) => void; onRemove: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${uploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/70 bg-background/40 hover:border-emerald-500/40"}`}>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md ${uploaded ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : uploaded ? <FileCheck2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{slot.label}{slot.required && <span className="text-red-400"> *</span>}</p>
        <p className="truncate text-xs text-muted-foreground">{uploaded ? "Uploaded" : slot.hint}</p>
      </div>
      {uploaded ? (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Ready</Badge>
      ) : null}
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

function StoragePreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
      if (data?.signedUrl) setUrl(data.signedUrl);
    })();
  }, [path]);
  return <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />;
}
