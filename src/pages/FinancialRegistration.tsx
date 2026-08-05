import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, Upload, X } from "lucide-react";

const ENTITY = [
  ["individual", "Individual"],
  ["proprietorship", "Proprietorship"],
  ["partnership", "Partnership Firm"],
  ["private_limited", "Private Limited"],
];
const STATES = ["Karnataka", "Telangana", "Maharashtra", "Tamil Nadu", "Delhi", "Gujarat", "Kerala", "Andhra Pradesh"];
const CITIES = ["Bengaluru", "Hyderabad", "Mumbai", "Chennai", "Delhi", "Pune", "Ahmedabad", "Kochi"];

export default function FinancialRegistration() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        setSignedInEmail(u.email ?? "");
        setEmail(u.email ?? "");
        const meta: any = u.user_metadata ?? {};
        setFullName((prev) => prev || meta.full_name || "");
        setMobile((prev) => prev || meta.phone || "");
      }
    });
  }, []);

  // Step 2
  const [entityType, setEntityType] = useState("individual");

  // Step 3
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [rbi, setRbi] = useState("");

  // Step 4
  const [headOffice, setHeadOffice] = useState("");
  const [branches, setBranches] = useState<string[]>([""]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [opStates, setOpStates] = useState<string[]>([]);
  const [website, setWebsite] = useState("");

  function setFile(k: string, f: File | null) {
    setFiles({ ...files, [k]: f });
  }

  function toggleArr(arr: string[], set: (v: string[]) => void, v: string) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function handleSignIn() {
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) throw new Error(error?.message || "Sign in failed");
      setSignedInEmail(data.session.user.email ?? email);
      const meta: any = data.session.user.user_metadata ?? {};
      setFullName((prev) => prev || meta.full_name || "");
      setMobile((prev) => prev || meta.phone || "");
      toast.success("Signed in. Continue your registration.");
      setStep(2);
    } catch (e: any) {
      toast.error(e.message ?? "Invalid email or password");
    } finally {
      setAuthBusy(false);
    }
  }

  async function next() {
    if (step === 1) {
      if (signedInEmail) {
        if (!fullName || !mobile) {
          toast.error("Full name and mobile are required");
          return;
        }
        setStep(2);
        return;
      }
      if (authMode === "signin") {
        await handleSignIn();
        return;
      }
      if (!fullName || !mobile || !email || password.length < 6 || password !== confirm) {
        toast.error("Fill all fields. Password ≥ 6 chars and matching.");
        return;
      }
      // Create the account now so "email already registered" is caught early.
      setAuthBusy(true);
      try {
        const { data: sign, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName, role: "financial", phone: mobile },
            emailRedirectTo: `${window.location.origin}/dashboard/financial`,
          },
        });
        if (signErr) {
          if (/already|registered|exists/i.test(signErr.message)) {
            setAuthMode("signin");
            setConfirm("");
            toast.error("This email already has a JaagaX account. Sign in below to continue.");
            return;
          }
          throw signErr;
        }
        if (sign.session) {
          setSignedInEmail(sign.session.user.email ?? email);
        } else {
          const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (siErr || !si.session) {
            setAuthMode("signin");
            toast.error("Account exists. Please sign in below to continue.");
            return;
          }
          setSignedInEmail(si.session.user.email ?? email);
        }
        setStep(2);
      } catch (e: any) {
        toast.error(e.message ?? "Could not create account");
      } finally {
        setAuthBusy(false);
      }
      return;
    }
    setStep(step + 1);
  }


  async function uploadFile(userId: string, key: string): Promise<string | null> {
    const f = files[key];
    if (!f) return null;
    const path = `${userId}/${key}-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("financial-kyc").upload(path, f, { upsert: true });
    if (error) {
      toast.error(`${key} upload failed: ${error.message}`);
      return null;
    }
    return path;
  }

  async function submit() {
    if (!headOffice) {
      toast.error("Head office required");
      return;
    }
    setLoading(true);
    try {
      // Use the existing session when already signed in, otherwise create the account.
      let { data: sessionData } = await supabase.auth.getSession();
      let uid = sessionData.session?.user?.id ?? null;

      if (!uid) {
        const { data: sign, error: signErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "financial",
              phone: mobile,
            },
            emailRedirectTo: `${window.location.origin}/dashboard/financial`,
          },
        });

        // Existing account? Just sign in with the provided password.
        if (signErr && !/already/i.test(signErr.message)) throw signErr;

        uid = sign?.session?.user?.id ?? null;

        if (!uid) {
          const { data: signedIn, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr || !signedIn.session) {
            throw new Error(
              signErr
                ? "This email is already registered. Please sign in with your existing password, then complete this registration."
                : "Could not start your session. Please try signing in and complete this registration.",
            );
          }
          uid = signedIn.session.user.id;
        }
      }

      if (!uid) throw new Error("Signup failed");


      const [pan_url, gst_url, company_reg_cert_url, signatory_id_url, logo_url] = await Promise.all([
        uploadFile(uid, "pan"),
        uploadFile(uid, "gst"),
        uploadFile(uid, "company_reg"),
        uploadFile(uid, "signatory_id"),
        uploadFile(uid, "logo"),
      ]);

      const { data: prov, error: provErr } = await (supabase as any)
        .from("financial_providers")
        .insert({
          user_id: uid,
          company_name: fullName,
          entity_type: entityType,
          pan_url,
          gst_url,
          rbi_registration: rbi || null,
          company_reg_cert_url,
          signatory_id_url,
          logo_url,
          kyc_status: "submitted",
        })
        .select()
        .single();
      if (provErr) throw provErr;

      await (supabase as any).from("financial_branches").insert({
        provider_id: prov.id,
        head_office: headOffice,
        branch_locations: branches.filter(Boolean).map((b) => ({ address: b })),
        service_areas: serviceAreas,
        operating_states: opStates,
        website: website || null,
      });

      // Register a separate "financial" profile for this account (independent of any
      // hotel/customer profile the same user may already have).
      await (supabase as any)
        .from("profiles")
        .upsert({ user_id: uid, type: "financial", city: serviceAreas[0] ?? null }, { onConflict: "user_id,type" });

      await (supabase as any).rpc("submit_signup_request", {
        _user_id: uid,
        _email: email,
        _full_name: fullName,
        _city: serviceAreas[0] ?? "Bengaluru",
        _requested_role: "financial",
      });

      toast.success("Registration submitted! Redirecting...");
      setTimeout(() => nav("/dashboard/financial"), 1000);
    } catch (e: any) {
      toast.error(e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Financial Services Provider Registration</h1>
        <p className="text-muted-foreground mb-6">Step {step} of 4</p>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Account Details"}
              {step === 2 && "Professional Details"}
              {step === 3 && "KYC & Verification"}
              {step === 4 && "Branch Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <Field label="Full Name *">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-card border-border"
                  />
                </Field>
                <Field label="Mobile Number *">
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="bg-card border-border" />
                </Field>
                <Field label="Email Address *">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-card border-border"
                  />
                </Field>
                <Field label="Password *">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-card border-border"
                  />
                </Field>
                <Field label="Confirm Password *">
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="bg-card border-border"
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Entity Type">
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                {(["pan", "gst", "company_reg", "signatory_id", "logo"] as const).map((k) => (
                  <Field key={k} label={`${k.replace("_", " ").toUpperCase()} *`}>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={(e) => setFile(k, e.target.files?.[0] ?? null)}
                        className="bg-card border-border"
                      />
                      {files[k] && <span className="text-xs text-emerald-400">✓ {files[k]!.name.slice(0, 20)}</span>}
                    </div>
                  </Field>
                ))}
                <Field label="RBI Registration Number">
                  <Input
                    value={rbi}
                    onChange={(e) => setRbi(e.target.value)}
                    className="bg-card border-border"
                    placeholder="Enter RBI registration number (if applicable)"
                  />
                </Field>
              </>
            )}

            {step === 4 && (
              <>
                <Field label="Head Office Address *">
                  <Textarea
                    value={headOffice}
                    onChange={(e) => setHeadOffice(e.target.value)}
                    className="bg-card border-border"
                  />
                </Field>
                <Field label="Branch Locations">
                  {branches.map((b, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input
                        value={b}
                        onChange={(e) => {
                          const n = [...branches];
                          n[i] = e.target.value;
                          setBranches(n);
                        }}
                        placeholder={`Branch ${i + 1}`}
                        className="bg-card border-border"
                      />
                      {branches.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setBranches(branches.filter((_, x) => x !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBranches([...branches, ""])}
                    className="border-border"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Branch
                  </Button>
                </Field>
                <Field label="Service Areas">
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={serviceAreas.includes(c) ? "default" : "outline"}
                        onClick={() => toggleArr(serviceAreas, setServiceAreas, c)}
                        className={serviceAreas.includes(c) ? "bg-primary text-primary-foreground" : "border-border"}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field label="Operating States">
                  <div className="flex flex-wrap gap-2">
                    {STATES.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={opStates.includes(s) ? "default" : "outline"}
                        onClick={() => toggleArr(opStates, setOpStates, s)}
                        className={opStates.includes(s) ? "bg-primary text-primary-foreground" : "border-border"}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field label="Website URL">
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="bg-card border-border"
                  />
                </Field>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                disabled={step === 1 || loading}
                onClick={() => setStep(step - 1)}
                className="border-border"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              {step < 4 ? (
                <Button onClick={next} className="bg-primary text-primary-foreground font-semibold">
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
