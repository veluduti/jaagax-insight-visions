import { useState } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, H2, CTA } from "@/features/natural-living/ui";
import { toast } from "sonner";

const PARTNER_TYPES = [
  { key: "farmer", label: "Farmer", copy: "I grow crops and want direct access to customers." },
  { key: "land_owner", label: "Land Owner", copy: "I have unused agricultural land and want to activate it." },
  { key: "corporate", label: "Corporate", copy: "We want to run CSR, adoption or offset programs." },
  { key: "school", label: "School", copy: "We want to bring students on village visits and programs." },
  { key: "expert", label: "Expert", copy: "I consult on organic farming, Ayurveda or wellness." },
  { key: "coordinator", label: "Village Coordinator", copy: "I want to represent my village on JAGAA." },
];

export default function NLPartner() {
  const [type, setType] = useState("farmer");
  const [form, setForm] = useState({ name: "", email: "", phone: "", org: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }
    toast.success("Thank you. A JAGAA coordinator will reach you within 48 hours.");
    setForm({ name: "", email: "", phone: "", org: "", message: "" });
  };

  return (
    <NLLayout>
      <PageHeader
        eyebrow="Partner With Us"
        title="There is a role for you on this land."
        lede="Whether you steward a piece of land, cook, teach, guide or lead a company — JAGAA is built to make room for you. Tell us who you are and how you'd like to work with us."
      />

      <Section>
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <Eyebrow>I am a…</Eyebrow>
            <div className="mt-6 flex flex-col gap-2">
              {PARTNER_TYPES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setType(p.key)}
                  className={`text-left p-4 border transition-all ${
                    type === p.key
                      ? "border-[hsl(var(--nl-forest))] bg-[hsl(var(--nl-cream-deep))]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--nl-forest))]"
                  }`}
                >
                  <div className="nl-serif text-lg">{p.label}</div>
                  <div className="text-xs text-[hsl(var(--nl-ink)/0.7)] mt-1">{p.copy}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="md:col-span-7 space-y-5">
            <Eyebrow>Tell us about you</Eyebrow>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
              <Field label="Phone (WhatsApp)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Organisation / Village" value={form.org} onChange={(v) => setForm({ ...form, org: v })} />
            </div>
            <Field label="Message" value={form.message} onChange={(v) => setForm({ ...form, message: v })} multiline />
            <button type="submit" className="nl-btn nl-btn-primary">
              Send introduction
            </button>
            <p className="text-xs text-[hsl(var(--nl-muted))]">
              A JAGAA coordinator will reach out within 48 hours. Your details are used only to reply — never sold or shared.
            </p>
          </form>
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Prefer to talk to someone directly?"
          copy="Our partnership team responds on WhatsApp and email."
          primary={{ label: "Contact page", to: "/natural-living/contact" }}
        />
      </Section>
    </NLLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="nl-eyebrow block mb-2">{label}{required && " *"}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.35)] py-2 focus:outline-none focus:border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-ink))]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.35)] py-2 focus:outline-none focus:border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-ink))]"
        />
      )}
    </label>
  );
}
