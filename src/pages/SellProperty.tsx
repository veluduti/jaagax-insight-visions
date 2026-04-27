import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Sparkles, ChevronLeft, CheckCircle2, Loader2, Wand2, ArrowRight,
  ImagePlus, X, MessageCircle,
} from "lucide-react";
import CityAutocomplete from "@/components/auth/CityAutocomplete";

/* ============================================================
   Types matching the orchestrator edge function
   ============================================================ */
type FieldDef = {
  id: string;
  section: string;
  question: string;
  input:
    | "text" | "textarea" | "number" | "phone" | "email"
    | "single" | "multi" | "yesno" | "media"
    | "city" | "locality" | "price_unit";
  options?: string[];
  optional?: boolean;
};

type NextResp =
  | { done: true }
  | {
      done: false;
      field: FieldDef;
      suggestions: string[];
      progress: { filled: number; total: number };
    };

const phoneRE = /^[6-9]\d{9}$/;
const pinRE = /^\d{6}$/;

function isEmpty(v: any) {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    // price_unit object
    return !v.unit || !v.area || !v.pricePerUnit;
  }
  return false;
}

function validate(field: FieldDef, value: any): string | null {
  if (field.optional && isEmpty(value)) return null;
  if (isEmpty(value)) return "This field is required";
  if (field.input === "phone" && !phoneRE.test(String(value))) return "Enter a valid 10-digit mobile number";
  if (field.input === "email") {
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(String(value))) return "Enter a valid email";
  }
  if (field.input === "number" && isNaN(Number(value))) return "Enter a valid number";
  if (field.id === "pincode" && !pinRE.test(String(value))) return "Enter a valid 6-digit PIN";
  if (field.input === "price_unit") {
    if (isNaN(Number(value.area)) || Number(value.area) <= 0) return "Enter a valid area";
    if (isNaN(Number(value.pricePerUnit)) || Number(value.pricePerUnit) <= 0) return "Enter a valid price per unit";
  }
  return null;
}

export default function SellProperty() {
  const navigate = useNavigate();
  const [state, setState] = useState<Record<string, any>>({});
  const [field, setField] = useState<FieldDef | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ filled: number; total: number }>({ filled: 0, total: 1 });
  const [value, setValue] = useState<any>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<{ field: FieldDef; value: any }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* fetch user contact pre-fill */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("name, phone, email").eq("user_id", user.id).maybeSingle();
      if (profile) {
        setState((s) => ({
          ...s,
          contact_name: profile.name || s.contact_name,
          contact_mobile: profile.phone || s.contact_mobile,
          contact_email: profile.email || s.contact_email,
        }));
      }
    })();
  }, []);

  /* ask orchestrator for the next question */
  const fetchNext = async (currentState: Record<string, any>) => {
    setLoadingNext(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<NextResp>(
        "ai-conversational-listing",
        { body: { state: currentState } }
      );
      if (fnErr) throw fnErr;
      if (!data) throw new Error("No response");

      if ((data as any).done) {
        setDone(true);
        setField(null);
      } else {
        const d = data as Extract<NextResp, { done: false }>;
        setField(d.field);
        setSuggestions(d.suggestions || []);
        setProgress(d.progress);
        const existing = currentState[d.field.id];
        if (existing !== undefined && existing !== null) {
          setValue(existing);
        } else if (d.field.input === "multi") {
          setValue([]);
        } else if (d.field.input === "price_unit") {
          setValue({ unit: "sq ft", area: "", pricePerUnit: "" });
        } else {
          setValue("");
        }
      }
    } catch (e: any) {
      setError(e.message || "Could not load next question");
    } finally {
      setLoadingNext(false);
    }
  };

  useEffect(() => {
    fetchNext({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* handle next */
  const onNext = async () => {
    if (!field) return;
    const v = field.input === "yesno" ? value : value;
    const err = validate(field, v);
    if (err) { setError(err); return; }
    const newState = { ...state, [field.id]: v };
    setHistory((h) => [...h, { field, value: v }]);
    setState(newState);
    await fetchNext(newState);
  };

  const onBack = async () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    const newHist = history.slice(0, -1);
    setHistory(newHist);
    const cleared = { ...state };
    delete cleared[prev.field.id];
    setState(cleared);
    setDone(false);
    await fetchNext(cleared);
  };

  /* media upload */
  const handleFiles = async (files: FileList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to upload");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [...(state.media_urls || [])];
      for (const file of Array.from(files).slice(0, 10)) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("property-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      setState((s) => ({ ...s, media_urls: urls }));
      toast.success(`${urls.length} file(s) ready`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* final submit */
  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        navigate("/auth");
        return;
      }

      // Map the conversational state into the properties table schema.
      const payload: any = {
        user_id: user.id,
        title: state.title || `${state.bhk || ""} ${state.type || "Property"} in ${state.locality || state.city || ""}`.trim(),
        description: state.description || null,
        type: state.type || null,
        listing_type: (state.purpose || "sale").toLowerCase(),
        listed_by: (state.listed_by || "owner").toLowerCase(),
        price: state.expected_price ? Number(state.expected_price) : null,
        price_per_sqft: state.price_per_sqft ? Number(state.price_per_sqft) : null,
        area_sqft: state.built_up || state.super_built_up || state.carpet_area || state.plot_area || null,
        bhk: state.bhk || null,
        bedrooms: state.bhk ? parseInt(String(state.bhk)) || null : null,
        bathrooms: state.bathrooms ? Number(state.bathrooms) : null,
        balconies: state.balconies ? Number(state.balconies) : null,
        floor_number: state.floor_number ? Number(state.floor_number) : null,
        total_floors: state.total_floors ? Number(state.total_floors) : null,
        country: state.country || "India",
        state: state.state || null,
        city: state.city || null,
        locality: state.locality || null,
        landmark: state.landmark || null,
        address: state.address || null,
        pincode: state.pincode || null,
        facing: state.facing || null,
        furnishing: state.furnishing || null,
        property_status: state.property_status || null,
        possession_date: state.possession_date || null,
        amenities: state.amenities || [],
        rera_id: state.rera_number || null,
        approval_type: state.approval_type || null,
        ownership_type: state.ownership_type || null,
        images: state.media_urls || [],
        is_draft: false,
        verified: false,
        verification_status: "pending",
        // Everything else lives in document_urls JSON for full fidelity
        document_urls: state,
        contact_name: state.contact_name || null,
        contact_phone: state.contact_mobile || null,
        contact_email: state.contact_email || null,
      };

      const { error: insErr } = await supabase.from("properties").insert(payload);
      if (insErr) throw insErr;
      toast.success("Listing submitted! 🎉");
      navigate("/dashboard/seller");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Could not submit listing");
    } finally {
      setSubmitting(false);
    }
  };

  const pct = Math.round((progress.filled / Math.max(progress.total, 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            AI-guided listing
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
            Sell Your Property
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            One quick question at a time. Tap chips, skip optionals, done in minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{progress.filled} / {progress.total} answered</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {loadingNext && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="p-12 flex flex-col items-center gap-3 border-primary/10 bg-card/60 backdrop-blur">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">AI is picking the next question…</p>
              </Card>
            </motion.div>
          )}

          {!loadingNext && done && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-primary/5">
                <div className="flex flex-col items-center text-center gap-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <h2 className="text-2xl font-semibold">Everything captured</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your listing is ready to publish. Our team will verify the details
                    and your property will go live shortly.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    {Object.entries(state).slice(0, 8).map(([k, v]) =>
                      v ? <Badge key={k} variant="secondary" className="font-normal">{k.replace(/_/g, " ")}</Badge> : null
                    )}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Button variant="outline" onClick={onBack}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button onClick={onSubmit} disabled={submitting} className="bg-gradient-to-r from-primary to-emerald-500">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Publish listing
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {!loadingNext && !done && field && (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 md:p-8 border-primary/15 bg-card/70 backdrop-blur shadow-xl shadow-primary/5">
                <div className="flex items-center gap-2 text-xs text-primary/80 font-medium mb-2">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {field.section}
                  {field.optional && <Badge variant="outline" className="ml-1 text-[10px]">optional</Badge>}
                </div>
                <h2 className="text-xl md:text-2xl font-semibold mb-5">{field.question}</h2>

                {renderInput(field, value, setValue)}

                {/* AI suggestions for title/description */}
                {suggestions.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Wand2 className="h-3 w-3" /> AI suggestions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setValue(s)}
                          className="text-left text-xs px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/15 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media */}
                {field.input === "media" && (
                  <div className="mt-2 space-y-3">
                    <input
                      ref={fileRef} type="file" multiple accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <Button
                      type="button" variant="outline" onClick={() => fileRef.current?.click()}
                      disabled={uploading} className="w-full"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                      Upload photos / video
                    </Button>
                    {state.media_urls?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {state.media_urls.map((url: string, i: number) => (
                          <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setState((s) => ({
                                ...s,
                                media_urls: s.media_urls.filter((_: any, idx: number) => idx !== i),
                              }))}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-xs text-destructive mt-3">{error}</p>}

                <div className="flex justify-between gap-3 mt-7">
                  <Button variant="ghost" onClick={onBack} disabled={history.length === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    {field.optional && (
                      <Button
                        variant="outline"
                        disabled={loadingNext}
                        onClick={async () => {
                          if (!field) return;
                          // Mark as explicitly skipped using null sentinel
                          const newState = { ...state, [field.id]: null };
                          setHistory((h) => [...h, { field, value: null }]);
                          setState(newState);
                          setValue("");
                          setError(null);
                          await fetchNext(newState);
                        }}
                      >
                        Skip
                      </Button>
                    )}
                    <Button onClick={onNext} disabled={loadingNext} className="bg-gradient-to-r from-primary to-emerald-500">
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
   Render the right input for the field type
   ============================================================ */
function renderInput(field: FieldDef, value: any, setValue: (v: any) => void) {
  switch (field.input) {
    case "text":
    case "phone":
    case "email":
      return (
        <Input
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.question}
          inputMode={field.input === "phone" ? "tel" : field.input === "email" ? "email" : "text"}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          placeholder="Type a few lines…"
        />
      );
    case "single":
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(opt)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition
                  ${active
                    ? "bg-primary text-primary-foreground border-primary shadow"
                    : "bg-background hover:bg-primary/5 border-border"}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "multi": {
      const arr: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const active = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setValue(active ? arr.filter((x) => x !== opt) : [...arr, opt])
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition
                  ${active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-primary/5 border-border"}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "yesno":
      return (
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(opt)}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition
                  ${active
                    ? "bg-primary text-primary-foreground border-primary shadow"
                    : "bg-background hover:bg-primary/5 border-border"}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "media":
      return null;
    default:
      return null;
  }
}
