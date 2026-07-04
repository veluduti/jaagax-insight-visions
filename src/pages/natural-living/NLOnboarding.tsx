import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { useNLAuth, NLRole } from "@/features/natural-living/useNLAuth";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { Loader2, Sprout, User as UserIcon, MapPin } from "lucide-react";
import { toast } from "sonner";

const ROLES: { value: NLRole; icon: any; label: string; desc: string }[] = [
  { value: "customer", icon: UserIcon, label: "Customer", desc: "Subscribe · Stay · Learn" },
  { value: "farmer", icon: Sprout, label: "Farmer", desc: "Grow · Deliver · Earn" },
  { value: "land_owner", icon: MapPin, label: "Land Owner", desc: "List · Partner · Share yield" },
];

function OnboardingInner() {
  const { user, profile, saveProfile } = useNLAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<NLRole>("customer");
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setRole(profile.role === "admin" ? "customer" : profile.role);
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setState(profile.state || "");
      if (profile.onboarding_completed) navigate("/natural-living/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const submit = async () => {
    if (!full_name || !phone || !city || !state) {
      toast.error("Please fill all fields");
      return;
    }
    setBusy(true);
    const { error } = await saveProfile({
      role,
      full_name,
      phone,
      city,
      state,
      onboarding_completed: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not save");
      return;
    }
    toast.success("Welcome to JAGAA Natural Living");
    if (role === "farmer" || role === "land_owner") {
      navigate("/natural-living/kyc");
    } else {
      navigate("/natural-living/dashboard");
    }
  };

  return (
    <NLLayout>
      <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container max-w-2xl">
          <Eyebrow>Step {step} of 2</Eyebrow>
          <H1 className="mt-3">
            {step === 1 ? (
              <>How will you <span style={{ fontStyle: "italic" }}>show up?</span></>
            ) : (
              <>Tell us <span style={{ fontStyle: "italic" }}>who you are.</span></>
            )}
          </H1>
          <Lede className="mt-6">
            {step === 1
              ? "Pick a role. You can hold multiple roles later — we just need a starting point."
              : "This helps us route orders, greetings, and community from your region."}
          </Lede>

          <div className="mt-12 p-8 md:p-10 border" style={{ background: "hsl(var(--nl-cream-deep))", borderColor: "hsl(var(--nl-forest) / 0.2)" }}>
            {step === 1 ? (
              <div className="grid gap-3">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const active = role === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`text-left p-5 border transition-colors ${
                        active
                          ? "border-[hsl(var(--nl-forest))] bg-[hsl(var(--nl-cream))]"
                          : "border-[hsl(var(--nl-forest)/0.2)] hover:border-[hsl(var(--nl-forest)/0.5)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
                        <span className="nl-serif text-2xl">{r.label}</span>
                      </div>
                      <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mt-2 ml-8">{r.desc}</p>
                    </button>
                  );
                })}
                <button onClick={() => setStep(2)} className="nl-btn nl-btn-primary mt-4 justify-center">Continue</button>
              </div>
            ) : (
              <div className="space-y-5">
                <Field label="Full name" value={full_name} onChange={setFullName} />
                <Field label="Phone (+91…)" value={phone} onChange={setPhone} type="tel" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City / Village" value={city} onChange={setCity} />
                  <Field label="State" value={state} onChange={setState} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(1)} className="nl-btn nl-btn-outline">Back</button>
                  <button disabled={busy} onClick={submit} className="nl-btn nl-btn-primary flex-1 justify-center">
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Finish setup
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-6 text-xs text-[hsl(var(--nl-muted))]">Signed in as {user?.email}</p>
        </div>
      </section>
    </NLLayout>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="nl-eyebrow block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
      />
    </div>
  );
}

export default function NLOnboarding() {
  return (
    <NLProtectedRoute>
      <OnboardingInner />
    </NLProtectedRoute>
  );
}
