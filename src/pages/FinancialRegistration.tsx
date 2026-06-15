import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, Upload, X } from "lucide-react";

const SERVICES = ["Home Loan", "Mortgage", "NBFC", "Property Legal Services", "Property Valuation Services", "Investment Advisory", "Credit Score Services"];
const ENTITY = [["individual", "Individual"], ["proprietorship", "Proprietorship"], ["partnership", "Partnership Firm"], ["private_limited", "Private Limited"]];
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

  // Step 2
  const [entityType, setEntityType] = useState("individual");
  const [services, setServices] = useState<string[]>([]);

  // Step 3
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [rbi, setRbi] = useState("");

  // Step 4
  const [headOffice, setHeadOffice] = useState("");
  const [branches, setBranches] = useState<string[]>([""]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [opStates, setOpStates] = useState<string[]>([]);
  const [website, setWebsite] = useState("");

  function setFile(k: string, f: File | null) { setFiles({ ...files, [k]: f }); }
  function toggleService(s: string) { setServices((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]); }
  function toggleArr(arr: string[], set: (v: string[]) => void, v: string) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function next() {
    if (step === 1) {
      if (!fullName || !mobile || !email || password.length < 6 || password !== confirm) {
        toast.error("Fill all fields. Password ≥ 6 chars and matching."); return;
      }
    }
    if (step === 2 && services.length === 0) { toast.error("Pick at least one service"); return; }
    if (step === 3 && services.includes("NBFC") && !rbi) { toast.error("RBI registration required for NBFC"); return; }
    setStep(step + 1);
  }

  async function uploadFile(userId: string, key: string): Promise<string | null> {
    const f = files[key]; if (!f) return null;
    const path = `${userId}/${key}-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("financial-kyc").upload(path, f, { upsert: true });
    if (error) { toast.error(`${key} upload failed: ${error.message}`); return null; }
    return path;
  }

  async function submit() {
    if (!headOffice) { toast.error("Head office required"); return; }
    setLoading(true);
    try {
      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, role: "financial", phone: mobile },
          emailRedirectTo: `${window.location.origin}/dashboard/financial` },
      });
      if (signErr) throw signErr;
      const uid = sign.user?.id;
      if (!uid) throw new Error("Signup failed");

      const [pan_url, gst_url, company_reg_cert_url, signatory_id_url, logo_url] = await Promise.all([
        uploadFile(uid, "pan"), uploadFile(uid, "gst"),
        uploadFile(uid, "company_reg"), uploadFile(uid, "signatory_id"), uploadFile(uid, "logo"),
      ]);

      const { data: prov, error: provErr } = await (supabase as any).from("financial_providers").insert({
        user_id: uid, company_name: fullName, entity_type: entityType, services_offered: services,
        pan_url, gst_url, rbi_registration: rbi || null, company_reg_cert_url, signatory_id_url, logo_url,
        kyc_status: "submitted",
      }).select().single();
      if (provErr) throw provErr;

      await (supabase as any).from("financial_branches").insert({
        provider_id: prov.id, head_office: headOffice,
        branch_locations: branches.filter(Boolean).map((b) => ({ address: b })),
        service_areas: serviceAreas, operating_states: opStates, website: website || null,
      });

      await (supabase as any).rpc("submit_signup_request", {
        _user_id: uid, _email: email, _full_name: fullName, _city: serviceAreas[0] ?? "Bengaluru",
        _requested_role: "financial",
      });

      toast.success("Registration submitted! Redirecting...");
      setTimeout(() => nav("/dashboard/financial"), 1000);
    } catch (e: any) {
      toast.error(e.message ?? "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-amber-950/20 text-zinc-100">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent mb-2">
          Financial Services Provider Registration
        </h1>
        <p className="text-zinc-400 mb-6">Step {step} of 4</p>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded ${s <= step ? "bg-gradient-to-r from-amber-500 to-yellow-600" : "bg-zinc-800"}`} />
          ))}
        </div>

        <Card className="border-amber-500/30 bg-black/50 backdrop-blur-md">
          <CardHeader><CardTitle className="text-amber-200">
            {step === 1 && "Account Details"}
            {step === 2 && "Professional Details"}
            {step === 3 && "KYC & Verification"}
            {step === 4 && "Branch Details"}
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (<>
              <Field label="Full Name *"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              <Field label="Mobile Number *"><Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              <Field label="Email Address *"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              <Field label="Password *"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              <Field label="Confirm Password *"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
            </>)}

            {step === 2 && (<>
              <Field label="Entity Type">
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="bg-black/40 border-amber-500/20"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Services Offered">
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-amber-500/5">
                      <Checkbox checked={services.includes(s)} onCheckedChange={() => toggleService(s)} />{s}
                    </label>
                  ))}
                </div>
              </Field>
            </>)}

            {step === 3 && (<>
              {(["pan", "gst", "company_reg", "signatory_id", "logo"] as const).map((k) => (
                <Field key={k} label={`${k.replace("_", " ").toUpperCase()} *`}>
                  <div className="flex items-center gap-2">
                    <Input type="file" onChange={(e) => setFile(k, e.target.files?.[0] ?? null)}
                      className="bg-black/40 border-amber-500/20 file:text-amber-300" />
                    {files[k] && <span className="text-xs text-emerald-400">✓ {files[k]!.name.slice(0, 20)}</span>}
                  </div>
                </Field>
              ))}
              {services.includes("NBFC") && (
                <Field label="RBI Registration Number *"><Input value={rbi} onChange={(e) => setRbi(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              )}
            </>)}

            {step === 4 && (<>
              <Field label="Head Office Address *"><Textarea value={headOffice} onChange={(e) => setHeadOffice(e.target.value)} className="bg-black/40 border-amber-500/20" /></Field>
              <Field label="Branch Locations">
                {branches.map((b, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input value={b} onChange={(e) => { const n = [...branches]; n[i] = e.target.value; setBranches(n); }}
                      placeholder={`Branch ${i + 1}`} className="bg-black/40 border-amber-500/20" />
                    {branches.length > 1 && <Button size="icon" variant="ghost" onClick={() => setBranches(branches.filter((_, x) => x !== i))}><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setBranches([...branches, ""])} className="border-amber-500/30">
                  <Plus className="h-4 w-4 mr-1" />Add Branch
                </Button>
              </Field>
              <Field label="Service Areas">
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => (
                    <Button key={c} type="button" size="sm" variant={serviceAreas.includes(c) ? "default" : "outline"}
                      onClick={() => toggleArr(serviceAreas, setServiceAreas, c)}
                      className={serviceAreas.includes(c) ? "bg-amber-500 text-black" : "border-amber-500/30"}>{c}</Button>
                  ))}
                </div>
              </Field>
              <Field label="Operating States">
                <div className="flex flex-wrap gap-2">
                  {STATES.map((s) => (
                    <Button key={s} type="button" size="sm" variant={opStates.includes(s) ? "default" : "outline"}
                      onClick={() => toggleArr(opStates, setOpStates, s)}
                      className={opStates.includes(s) ? "bg-amber-500 text-black" : "border-amber-500/30"}>{s}</Button>
                  ))}
                </div>
              </Field>
              <Field label="Website URL"><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="bg-black/40 border-amber-500/20" /></Field>
            </>)}

            <div className="flex justify-between pt-4">
              <Button variant="outline" disabled={step === 1 || loading} onClick={() => setStep(step - 1)} className="border-amber-500/30">
                <ArrowLeft className="h-4 w-4 mr-1" />Back
              </Button>
              {step < 4 ? (
                <Button onClick={next} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold">
                  Next<ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><Upload className="h-4 w-4 mr-2" />Submit Registration</>}
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
      <Label className="text-sm text-amber-200 mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
