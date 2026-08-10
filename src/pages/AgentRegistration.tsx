import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Upload, CheckCircle2, XCircle, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Form = Record<string, any>;

const STEPS = ["Personal", "Identity", "Professional", "Banking"] as const;

const UPLOAD_FIELDS = [
  { key: "aadhaar_front_url", label: "Aadhaar Front" },
  { key: "aadhaar_back_url", label: "Aadhaar Back" },
  { key: "pan_card_url", label: "PAN Card" },
  { key: "profile_photo_url", label: "Profile Photo" },
  { key: "selfie_url", label: "Selfie Verification" },
];

export default function AgentRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<any>(null);
  const [form, setForm] = useState<Form>({ terms_accepted: false, experience_years: 0 });

  const set = (patch: Form) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("agent_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setApplication(data);
        setForm(data);
      } else {
        setForm((f) => ({
          ...f,
          full_name: user.user_metadata?.name || user.user_metadata?.full_name || "",
          email: user.email || "",
          mobile: user.user_metadata?.phone || user.phone || "",
        }));
      }
      setLoading(false);
    })();
  }, [user]);

  const upload = async (field: string, file: File) => {
    if (!user) return;
    setUploading(field);
    try {
      const path = `${user.id}/agent-${field}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      set({ [field]: data?.signedUrl || path });
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!form.full_name || !form.mobile) return toast.error("Full name and mobile number are required");
    if (!form.aadhaar_number || !form.pan_number) return toast.error("Aadhaar and PAN numbers are required");
    if (!form.aadhaar_front_url || !form.aadhaar_back_url || !form.pan_card_url)
      return toast.error("Please upload Aadhaar (front & back) and PAN card");
    if (!form.terms_accepted) return toast.error("Please accept the terms & conditions");

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        full_name: form.full_name,
        mobile: form.mobile,
        email: form.email || user.email,
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        aadhaar_number: form.aadhaar_number,
        aadhaar_front_url: form.aadhaar_front_url,
        aadhaar_back_url: form.aadhaar_back_url,
        pan_number: form.pan_number,
        pan_card_url: form.pan_card_url,
        profile_photo_url: form.profile_photo_url || null,
        selfie_url: form.selfie_url || null,
        experience_years: Number(form.experience_years) || 0,
        operating_locations: form.operating_locations || null,
        languages: form.languages || null,
        rera_number: form.rera_number || null,
        agency_name: form.agency_name || null,
        account_holder_name: form.account_holder_name || null,
        account_number: form.account_number || null,
        ifsc_code: form.ifsc_code || null,
        bank_name: form.bank_name || null,
        upi_id: form.upi_id || null,
        terms_accepted: true,
        status: "pending",
        admin_remarks: null,
      };
      const { data, error } = application?.id
        ? await (supabase as any).from("agent_applications").update(payload).eq("id", application.id).select().single()
        : await (supabase as any).from("agent_applications").insert(payload).select().single();
      if (error) throw error;
      setApplication(data);
      toast.success("Application submitted — pending verification");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const status = application?.status;
  const locked = status === "pending" || status === "approved";

  const field = (key: string, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        disabled={locked}
        value={form[key] ?? ""}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </div>
  );

  const uploader = (key: string, label: string) => (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        {form[key] ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
      </div>
      <Input
        type="file"
        accept="image/*,application/pdf"
        disabled={locked || uploading === key}
        onChange={(e) => e.target.files?.[0] && upload(key, e.target.files[0])}
      />
      {uploading === key && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Agent Registration (KYC)
                </CardTitle>
                <CardDescription>
                  Complete verification to upgrade your account from Customer to Agent. Your existing data stays intact.
                </CardDescription>
              </div>
              {status === "pending" && (
                <Badge className="bg-yellow-600 gap-1">
                  <Clock className="h-3 w-3" /> Pending Verification
                </Badge>
              )}
              {status === "approved" && (
                <Badge className="bg-emerald-600 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </Badge>
              )}
              {status === "rejected" && (
                <Badge className="bg-red-600 gap-1">
                  <XCircle className="h-3 w-3" /> Rejected
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === "rejected" && application?.admin_remarks && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                <strong>Rejection remarks:</strong> {application.admin_remarks} — please update your details and resubmit.
              </div>
            )}
            {status === "pending" && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                Your application is under review. Any properties you post meanwhile are saved as drafts and will appear
                in your Agent Dashboard once approved.
              </div>
            )}
            {status === "approved" && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm flex items-center justify-between gap-3">
                <span>You are a verified Agent. Your free trial has started.</span>
                <Button size="sm" onClick={() => navigate("/dashboard/agent")}>
                  Go to Agent Dashboard
                </Button>
              </div>
            )}

            {/* Steps */}
            <div className="flex items-center gap-2 flex-wrap">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    step === i ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {field("full_name", "Full Name")}
                {field("mobile", "Mobile Number")}
                {field("email", "Email", "email")}
                {field("date_of_birth", "Date of Birth", "date")}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    disabled={locked}
                    value={form.address ?? ""}
                    onChange={(e) => set({ address: e.target.value })}
                  />
                </div>
                {field("city", "City")}
                {field("state", "State")}
                {field("pincode", "Pincode")}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("aadhaar_number", "Aadhaar Number")}
                  {field("pan_number", "PAN Number")}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {UPLOAD_FIELDS.slice(0, 3).map((u) => uploader(u.key, u.label))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {UPLOAD_FIELDS.slice(3).map((u) => uploader(u.key, u.label))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("experience_years", "Years of Experience", "number")}
                  {field("operating_locations", "Operating Locations (comma separated)")}
                  {field("languages", "Languages Known (comma separated)")}
                  {field("rera_number", "RERA Number (optional)")}
                  {field("agency_name", "Agency Name (optional)")}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("account_holder_name", "Account Holder Name")}
                  {field("account_number", "Account Number")}
                  {field("ifsc_code", "IFSC Code")}
                  {field("bank_name", "Bank Name")}
                  {field("upi_id", "UPI ID (optional)")}
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={!!form.terms_accepted}
                    disabled={locked}
                    onCheckedChange={(v) => set({ terms_accepted: !!v })}
                  />
                  <span>
                    I declare that the information and documents provided are true, and I accept the JAAGA X agent
                    terms &amp; conditions.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={saving || locked}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {status === "pending" ? "Awaiting review" : status === "approved" ? "Approved" : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
