import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loadPropertyWizard, wizardReadiness } from "@/services/hospitality/propertySetupService";
import { CATEGORY_BY_KEY } from "@/config/hospitalityCategories";
import { onboardingSteps, listingStatus, type OnboardingInput } from "@/lib/partnerOnboarding";
import { Button } from "@/components/ui/button";
import PropertyPhoto from "./PropertyPhoto";
import { TYPE_PHOTO, DEFAULT_PHOTO, onboardingCopy } from "@/config/propertyTypeOnboarding";
import { Check, Lock, ArrowRight, ShieldCheck, FileText, UserCheck, Phone, ListChecks, Building2, Home, BedDouble, Upload, Rocket, IdCard, Landmark, Users, Loader2 } from "lucide-react";

const STATUS_TEXT: Record<string, string> = { profile_completed: "Profile Completed", property_setup: "Property Setup", under_verification: "Under Verification", changes_requested: "Changes Requested", rejected: "Rejected", approved: "Approved", live: "Live" };

export default function PartnerOnboardingHome({ hotelId, onOpenOverview }: { hotelId: string | null; onOpenOverview?: () => void }) {
  const { user } = useAuth();
  const [wizard, setWizard] = useState<Awaited<ReturnType<typeof loadPropertyWizard>> | null>(null);
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const [w, acct] = await Promise.all([hotelId ? loadPropertyWizard(hotelId) : Promise.resolve(null), user ? (supabase as any).from("partner_accounts").select("display_name").eq("owner_user_id", user.id).maybeSingle() : Promise.resolve({ data: null })]);
      setWizard(w); setAccountName(acct?.data?.display_name ?? "");
    } catch { setError("Could not load your setup progress. Please try again."); } finally { setLoading(false); }
  }, [hotelId, user]);
  useEffect(() => { void load(); const t = window.setInterval(load, 30000); window.addEventListener("partner-property-updated", load); return () => { window.clearInterval(t); window.removeEventListener("partner-property-updated", load); }; }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <div role="alert" className="py-12 text-center">{error}<Button onClick={load} className="ml-3">Retry</Button></div>;

  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const profile = meta.partner_business_profile ?? {};
  const types: string[] = wizard?.form.property.business_types.length ? wizard.form.property.business_types : profile.property_type ? [profile.property_type] : [];
  const typeLabel = types.map(t => CATEGORY_BY_KEY[t]?.label ?? t.replace(/_/g, " ")).join(", ") || "Property";
  const copy = onboardingCopy(types[0]);
  const ready = wizard ? wizardReadiness(wizard.form, wizard.overview) : [];
  const docs = wizard?.form.documents ?? {};
  const input: OnboardingInput = {
    accountCreated: !!user, contactVerified: !!user?.email_confirmed_at && meta.phone_verified === true,
    propertyTypeChosen: types.length > 0, businessProfile: !!profile.saved_at || !!accountName,
    hasProperty: !!wizard, inventoryReady: !!ready[5], documentsReady: !!ready[2], bankReady: !!ready[8],
    applicationStatus: wizard?.application?.status ?? null, isLive: !!wizard?.overview.hotel.is_active,
  };
  const states = onboardingSteps(input);
  const status = listingStatus(input);
  const setup = hotelId ? `/partners/property-setup?hotel=${hotelId}` : "/partners/property-setup";
  const name = meta.full_name || profile.owner_name || user?.email?.split("@")[0] || "Partner";
  const business = wizard?.overview.hotel.name || accountName || profile.hotel_name || "Your business";
  const cover = wizard?.overview.hotel.images?.[0] || TYPE_PHOTO[types[0]] || DEFAULT_PHOTO;
  const steps = [
    { t: "Create Partner Account", d: "Your Jaaga partner account is created.", i: UserCheck },
    { t: "Verify Contact", d: input.contactVerified ? "Mobile and email verified." : "Verify your email and mobile number.", i: Phone, to: "/partners/register" },
    { t: "Choose Property Type", d: `${typeLabel} selected.`, i: ListChecks, to: "/partners/register" },
    { t: "Business Profile", d: input.businessProfile ? "Your business profile is completed." : "Add your business details.", i: Building2, to: "/partners/register" },
    { t: "Add Property Details", d: `Add your ${typeLabel} property, location and basic information.`, i: Home, to: setup, cta: wizard ? "Edit Property" : "Add Property", lock: "" },
    { t: copy.inventoryTitle, d: copy.inventoryDesc, i: BedDouble, to: hotelId ? "/partners/rooms" : setup, cta: "Configure", lock: "After adding property" },
    { t: "Upload Documents & Bank Details", d: "Submit KYC, business and bank details for verification.", i: Upload, to: setup, cta: "Upload", lock: "After configuring rooms" },
    { t: "Submit for Verification", d: "Our Jaaga team will review and verify your details.", i: ShieldCheck, to: setup, cta: "Submit", lock: "After documents & bank" },
    { t: "Go Live on Jaaga", d: "Once verified, your property will be live and available for bookings.", i: Rocket, to: hotelId ? "/partners/dashboard" : setup, cta: "Track", lock: "After approval" },
  ];
  const statusSteps = ["Profile Completed", "Property Setup", "Under Verification", "Go Live"];
  const statusIdx = { profile_completed: 0, property_setup: 1, changes_requested: 1, rejected: 1, under_verification: 2, approved: 3, live: 3 }[status];
  const docRows = [
    { l: "Identity Proof (Aadhaar / PAN)", i: IdCard, ok: !!docs.identity_proof_url || !!docs.id_proof_url },
    { l: "Business Proof (GSTIN / Registration / Udyam)", i: Building2, ok: !!docs.business_registration_url },
    { l: "Property Proof (Lease / Ownership / Agreement)", i: Home, ok: !!docs.address_proof_url },
    ...copy.proofs.map(l => ({ l, i: FileText, ok: !!docs.trade_license_url })),
    { l: "Bank Account Details (for settlements)", i: Landmark, ok: !!ready[8] },
  ];
  const top = ["Account Created", "Contact Verified", `Property Type (${typeLabel})`, "Business Profile", "Property Setup & Verification", "Go Live"];
  const topDone = [states[0], states[1], states[2], states[3], states[7], states[8]].map(s => s === "done");

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-2xl border border-border bg-accent">
      <div className="relative z-10 max-w-xl p-6"><span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{typeLabel} {copy.owner}</span><h1 className="text-2xl font-bold">Welcome, {name}! 👋</h1><p className="mt-2 text-sm text-muted-foreground">Your {typeLabel} partner dashboard for <strong className="text-foreground">{business}</strong> is ready. Complete the setup below to get verified, go live on Jaaga Stays and {copy.listingGoal}.</p></div>
      {cover && <div className="absolute inset-y-0 right-0 hidden w-2/5 md:block"><PropertyPhoto src={cover} alt={business} /></div>}
    </section>
    <ol className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">{top.map((t, n) => { const current = !topDone[n] && topDone.slice(0, n).every(Boolean); return <li key={t} className={`flex flex-1 min-w-[140px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${current ? "bg-accent text-primary" : ""}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${topDone[n] || current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{topDone[n] ? <Check className="h-4 w-4" /> : n + 1}</span>{t}</li>; })}</ol>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-start gap-3"><FileText className="h-8 w-8 text-primary" /><div className="flex-1"><h2 className="text-lg font-bold">Get Your {typeLabel} Listed on Jaaga Stays</h2><p className="text-xs text-muted-foreground">Complete these steps. Once you submit, our team will verify and activate your property.</p></div>{onOpenOverview && <Button size="sm" variant="outline" onClick={onOpenOverview}>Property overview</Button>}</div>
        <ul className="space-y-2">{steps.map((s, n) => { const st = states[n]; return <li key={s.t} className={`flex items-center gap-3 rounded-xl border border-border p-3 ${st === "action" ? "bg-accent/50" : ""}`}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${st === "done" ? "bg-primary text-primary-foreground" : st === "action" ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{st === "done" ? <Check className="h-4 w-4" /> : n + 1}</span>
          <s.i className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1"><strong className="block text-sm">{s.t}</strong><p className="text-xs text-muted-foreground">{s.d}</p></div>
          {st === "done" ? <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-primary">✓ Completed</span> : st === "action" && s.to ? <Button size="sm" asChild><Link to={s.to}>{s.cta ?? "Complete"}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button> : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{s.lock}</span>}
        </li>; })}</ul>
      </section>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4"><h2 className="mb-4 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-primary" />Verification & Listing Status</h2>
          <div className="grid grid-cols-4 gap-1 text-center text-xs">{statusSteps.map((s, n) => <div key={s}><span className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full ${n < statusIdx ? "bg-primary text-primary-foreground" : n === statusIdx ? "border-2 border-primary text-primary" : "bg-muted"}`}>{n < statusIdx ? <Check className="h-4 w-4" /> : null}</span>{s}</div>)}</div>
          <p className="mt-3 text-sm">Current status: <strong className={status === "rejected" || status === "changes_requested" ? "text-destructive" : "text-primary"}>{STATUS_TEXT[status]}</strong></p>
          {wizard?.application?.rejection_reason && <p className="mt-1 text-xs text-destructive">{wizard.application.rejection_reason}</p>}
          {!wizard && <div className="mt-3 flex items-center gap-3 rounded-xl bg-accent p-3"><div className="flex-1"><strong className="text-sm">No Property Added Yet</strong><p className="text-xs text-muted-foreground">Add your first property to start verification and listing.</p></div><Button size="sm" asChild><Link to={setup}>Add Property</Link></Button></div>}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4"><h2 className="mb-3 flex items-center gap-2 font-bold"><FileText className="h-5 w-5 text-primary" />Documents & Bank Details <span className="text-xs font-normal text-muted-foreground">(required for verification)</span></h2>
          <ul className="space-y-2">{docRows.map(r => <li key={r.l} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><r.i className="h-4 w-4" /><span className="flex-1">{r.l}</span><span className={`rounded px-2 py-0.5 font-semibold ${r.ok ? "bg-accent text-primary" : "bg-destructive/10 text-destructive"}`}>{r.ok ? "Uploaded" : "Required"}</span></li>)}</ul>
          {wizard && <Button size="sm" variant="outline" className="mt-3 w-full" asChild><Link to={setup}>Manage documents & bank</Link></Button>}
        </section>
        <section className="rounded-2xl border border-border bg-accent p-4"><h2 className="mb-3 font-bold">How Verification & Go Live Works?</h2><div className="grid grid-cols-3 gap-2 text-center text-xs">{[[FileText, "Submit property, documents and bank details"], [Users, "Jaaga team review (1–3 working days)"], [Rocket, "Go live — your property is listed"]].map(([I, t]: any) => <div key={t} className="rounded-xl bg-card p-3"><I className="mx-auto mb-1 h-6 w-6 text-primary" />{t}</div>)}</div></section>
      </div>
    </div>
  </div>;
}
