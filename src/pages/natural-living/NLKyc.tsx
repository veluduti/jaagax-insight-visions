import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { Loader2, ShieldCheck, Upload, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const ID_TYPES = ["Aadhaar", "PAN", "Voter ID", "Driving Licence", "Passport"];

function KycInner() {
  const { profile, kyc, submitKyc, uploadKycFile } = useNLAuth();
  const navigate = useNavigate();
  const [id_type, setIdType] = useState("Aadhaar");
  const [id_number, setIdNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [addrFile, setAddrFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (kyc) {
    return (
      <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container max-w-2xl">
          <Eyebrow>Verification</Eyebrow>
          <H1 className="mt-3">
            {kyc.status === "approved" ? (
              <>You're <span style={{ fontStyle: "italic" }}>verified.</span></>
            ) : kyc.status === "rejected" ? (
              <>We need a <span style={{ fontStyle: "italic" }}>closer look.</span></>
            ) : (
              <>Sit tight, <span style={{ fontStyle: "italic" }}>we're reviewing.</span></>
            )}
          </H1>
          <div className="mt-10 p-8 border" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
            <div className="flex items-center gap-3 mb-4">
              {kyc.status === "approved" ? (
                <CheckCircle2 className="h-6 w-6" style={{ color: "hsl(var(--nl-forest))" }} />
              ) : (
                <Clock className="h-6 w-6" style={{ color: "hsl(var(--nl-forest))" }} />
              )}
              <div className="nl-serif text-xl capitalize">{kyc.status}</div>
            </div>
            <p className="text-sm text-[hsl(var(--nl-ink)/0.75)]">
              {kyc.status === "approved"
                ? "You now have full access to your farmer/land-owner tools."
                : kyc.status === "rejected"
                  ? kyc.reviewer_notes || "Please contact support to re-submit."
                  : "Most reviews complete within 48 hours. We'll notify you by email."}
            </p>
            <button onClick={() => navigate("/natural-living/dashboard")} className="nl-btn nl-btn-primary mt-8">
              Go to dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }

  const submit = async () => {
    if (!id_number) return toast.error("Please enter your ID number");
    setBusy(true);
    try {
      let id_document_url: string | null = null;
      let address_proof_url: string | null = null;
      if (idFile) id_document_url = await uploadKycFile(idFile, "id");
      if (addrFile) address_proof_url = await uploadKycFile(addrFile, "address");
      const { error } = await submitKyc({ id_type, id_number, id_document_url, address_proof_url });
      if (error) throw error;
      toast.success("Submitted for verification");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="nl-container max-w-2xl">
        <Eyebrow>Verification · {profile?.role.replace("_", " ")}</Eyebrow>
        <H1 className="mt-3">
          A quick <span style={{ fontStyle: "italic" }}>KYC.</span>
        </H1>
        <Lede className="mt-6">
          Farmers and land owners are verified to protect our community and payouts. Two minutes, and you're done.
        </Lede>

        <div className="mt-12 p-8 md:p-10 border space-y-6" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
          <div>
            <label className="nl-eyebrow block mb-2">ID type</label>
            <select
              value={id_type}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
            >
              {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="nl-eyebrow block mb-2">ID number</label>
            <input
              value={id_number}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
            />
          </div>

          <FileField label="Upload ID (image or PDF)" file={idFile} onChange={setIdFile} />
          <FileField label="Address proof (optional)" file={addrFile} onChange={setAddrFile} />

          <div className="flex items-start gap-2 text-xs text-[hsl(var(--nl-muted))]">
            <ShieldCheck className="h-4 w-4 mt-0.5" style={{ color: "hsl(var(--nl-forest))" }} />
            <span>Your documents are stored privately and only visible to our verification team.</span>
          </div>

          <button disabled={busy} onClick={submit} className="nl-btn nl-btn-primary w-full justify-center">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit for verification
          </button>
          <button onClick={() => navigate("/natural-living/dashboard")} className="text-xs text-[hsl(var(--nl-muted))] hover:text-[hsl(var(--nl-forest))] block mx-auto">
            Skip for now
          </button>
        </div>
      </div>
    </section>
  );
}

function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="nl-eyebrow block mb-2">{label}</label>
      <label className="flex items-center gap-3 p-4 border border-dashed cursor-pointer hover:border-[hsl(var(--nl-forest))]" style={{ borderColor: "hsl(var(--nl-forest) / 0.4)" }}>
        <Upload className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
        <span className="text-sm text-[hsl(var(--nl-ink)/0.8)]">
          {file ? file.name : "Choose a file"}
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export default function NLKyc() {
  return (
    <NLProtectedRoute requireOnboarded>
      <NLLayout>
        <KycInner />
      </NLLayout>
    </NLProtectedRoute>
  );
}
