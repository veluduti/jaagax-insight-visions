import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { LAND_SCHEMA, nextMissingField, computeCompletion, fieldById, computeLandTier, slugifyLand, type LandProfileTier } from "./schema";
import {
  Edit3,
  Leaf,
  Send,
  CheckCircle2,
  Loader2,
  Paperclip,
  SkipForward,
  Check,
  Plus,
  Trash2,
  MapPin,
  Ruler,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type DraftRow = {
  id: string;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  total_area?: number | null;
  area_unit?: string | null;
  completion_pct?: number | null;
  updated_at: string;
  created_at: string;
};

const GREETING =
  "Namaste! I'm JAAGA, your agriculture consultant. I'll help you register your land — no forms, just a conversation. Lets start.";

export default function LandAgentChat() {
  const { user, loading: authLoading } = useNLAuth();
  const navigate = useNavigate();
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<Msg[]>([{ id: "welcome", role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [multiPicks, setMultiPicks] = useState<string[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"picker" | "chat">("picker");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [profilePrompt, setProfilePrompt] = useState<null | { tier: LandProfileTier }>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const completion = useMemo(() => computeCompletion(state), [state]);
  const nextField = useMemo(() => nextMissingField(state), [state]);

  const loadDrafts = useCallback(async (uid: string) => {
    const { data } = await (supabase as any)
      .from("nl_land_registrations")
      .select("id, village, district, state, total_area, area_unit, completion_pct, updated_at, created_at")
      .eq("user_id", uid)
      .eq("status", "draft")
      .order("updated_at", { ascending: false });
    setDrafts((data as DraftRow[]) ?? []);
    return (data as DraftRow[]) ?? [];
  }, []);

  // Bootstrap: fetch drafts, show picker (never auto-resume).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/natural-living/auth?next=/natural-living/list-land");
      return;
    }
    (async () => {
      await loadDrafts(user.id);
      setBootstrapping(false);
    })();
  }, [authLoading, user, navigate, loadDrafts]);

  async function openDraft(draftId: string) {
    if (!user) return;
    setBootstrapping(true);
    const { data: draft } = await (supabase as any)
      .from("nl_land_registrations")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!draft) {
      setBootstrapping(false);
      return;
    }
    setRegistrationId(draft.id);
    const s = draftToState(draft);
    setState(s);
    const { data: convo } = await (supabase as any)
      .from("nl_land_conversations")
      .select("id, role, content")
      .eq("registration_id", draft.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (convo && convo.length) {
      setMessages(convo.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    } else {
      const pct = computeCompletion(s);
      setMessages([
        {
          id: "welcome-back",
          role: "assistant",
          content: `Welcome back! We're **${pct}%** through this land registration. Shall we continue where we left off?`,
        },
      ]);
    }
    setView("chat");
    setBootstrapping(false);
  }

  async function startNewDraft() {
    if (!user || creatingNew) return;
    setCreatingNew(true);
    try {
      const { data: created, error } = await (supabase as any)
        .from("nl_land_registrations")
        .insert({ user_id: user.id, status: "draft" })
        .select()
        .single();
      if (error || !created) throw new Error(error?.message ?? "Failed to create draft");
      setRegistrationId(created.id);
      setState({});
      setMessages([{ id: "welcome", role: "assistant", content: GREETING }]);
      setView("chat");
    } catch (e: any) {
      alert(`Could not start a new registration: ${e?.message ?? String(e)}`);
    } finally {
      setCreatingNew(false);
    }
  }

  async function deleteDraft(draftId: string) {
    if (!user) return;
    setDeletingId(draftId);
    try {
      // Clean up child rows first (in case FKs are not ON DELETE CASCADE).
      await (supabase as any).from("nl_land_conversations").delete().eq("registration_id", draftId);
      await (supabase as any).from("nl_land_uploads").delete().eq("registration_id", draftId);
      const { error } = await (supabase as any)
        .from("nl_land_registrations")
        .delete()
        .eq("id", draftId)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      setConfirmDeleteId(null);
      await loadDrafts(user.id);
    } catch (e: any) {
      alert(`Could not delete draft: ${e?.message ?? String(e)}`);
    } finally {
      setDeletingId(null);
    }
  }

  function backToPicker() {
    setView("picker");
    setRegistrationId(null);
    setState({});
    setMessages([{ id: "welcome", role: "assistant", content: GREETING }]);
    setPendingUploads([]);
    setMultiPicks([]);
    setActiveFieldId(null);
    setInput("");
    if (user) loadDrafts(user.id);
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    if (!sending) inputRef.current?.focus();
  }, [messages, sending]);

  // Lock body scroll while in chat view — ChatGPT-style full-viewport UX.
  useEffect(() => {
    if (view !== "chat") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [view]);

  async function send(overrideText?: string, stateOverride?: Record<string, any>) {
    const text = (overrideText ?? input).trim();
    if (!text || sending || !registrationId || !user) return;

    const effectiveState = stateOverride ?? state;
    const effectiveNext = nextMissingField(effectiveState);

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setMultiPicks([]);
    setActiveFieldId(null);
    setSending(true);

    const skippedList: string[] = Array.isArray(effectiveState.__skipped) ? effectiveState.__skipped : [];
    const schemaSummary = LAND_SCHEMA.map(
      (f) =>
        `${f.id} (${f.type}${f.options ? ": " + f.options.join("|") : ""})${f.required ? " *" : ""}${f.adminOnly ? " [admin-only]" : ""} — ${f.label}${f.hint ? ` — ${f.hint}` : ""}`,
    ).join("\n");

    try {
      const { error: userMessageError } = await (supabase as any).from("nl_land_conversations").insert({
        registration_id: registrationId,
        user_id: user.id,
        role: "user",
        content: text,
      });
      if (userMessageError)
        throw new Error(`DB insert failed in LandAgentChat.send user message: ${userMessageError.message}`);

      const { data, error } = await supabase.functions.invoke("nl-land-agent", {
        body: {
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          state: effectiveState,
          skippedFields: skippedList,
          schemaSummary,
          schema: LAND_SCHEMA.map((f) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            options: f.options,
            required: f.required,
            adminOnly: f.adminOnly,
          })),
          nextField: effectiveNext
            ? { id: effectiveNext.id, label: effectiveNext.label, type: effectiveNext.type, options: effectiveNext.options }
            : null,
        },
      });
      if (error) throw await buildInvokeError("nl-land-agent", error);
      if (data?.ok === false) throw new Error(formatAgentDebug(data.debug, data.reply));

      const reply = data?.reply ?? "Could you tell me more?";
      const extracted: Record<string, any> = data?.extracted ?? {};
      const replaceFields: string[] = Array.isArray(data?.replace_fields) ? data.replace_fields : [];
      const returnedActive: string | null = typeof data?.active_field === "string" ? data.active_field : null;
      setActiveFieldId(returnedActive && fieldById(returnedActive) ? returnedActive : null);
      setMultiPicks([]);

      if (Object.keys(extracted).length > 0) {
        const merged = mergeState(effectiveState, extracted, replaceFields);
        // Un-skip any field the user just provided answers for.
        if (Array.isArray(merged.__skipped)) {
          merged.__skipped = (merged.__skipped as string[]).filter((id) => !(id in extracted));
        }
        setState(merged);
        await persistState(registrationId, merged);
      } else if (stateOverride) {
        // Persist skip-only updates.
        setState(effectiveState);
        await persistState(registrationId, effectiveState);
      }

      const asstMsg: Msg = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setMessages((m) => [...m, asstMsg]);
      const { error: assistantMessageError } = await (supabase as any).from("nl_land_conversations").insert({
        registration_id: registrationId,
        user_id: user.id,
        role: "assistant",
        content: reply,
        extracted_fields: extracted,
      });
      if (assistantMessageError)
        throw new Error(`DB insert failed in LandAgentChat.send assistant message: ${assistantMessageError.message}`);
    } catch (e: any) {
      console.error("LandAgentChat.send runtime failure", e);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: formatRuntimeError(e) }]);
    } finally {
      setSending(false);
    }
  }

  async function skipCurrent() {
    if (!nextField || sending) return;
    const skipped = new Set<string>(Array.isArray(state.__skipped) ? (state.__skipped as string[]) : []);
    skipped.add(nextField.id);
    const next = { ...state, __skipped: Array.from(skipped) };
    setState(next);
    await send(`Skip — I don't have info for "${nextField.label}" right now.`, next);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || !files.length || !registrationId || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${user.id}/${registrationId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("nl-land-uploads").upload(path, file, { upsert: false });
        if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
        await (supabase as any).from("nl_land_uploads").insert({
          registration_id: registrationId,
          user_id: user.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          kind: nextField?.id === "ownership_docs" ? "ownership_doc" : "land_photo",
        });
        uploaded.push(file.name);
      }
      setPendingUploads((p) => [...p, ...uploaded]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `Upload failed: ${e?.message ?? String(e)}` },
      ]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function finalizeUploads() {
    if (!pendingUploads.length || !nextField) return;
    const label = nextField.id === "ownership_docs" ? "ownership document(s)" : "land photo(s)";
    const files = pendingUploads;
    setPendingUploads([]);
    // Mark this upload field as complete in state so the resolver advances.
    const merged = { ...state, [nextField.id]: files };
    setState(merged);
    if (registrationId) await persistState(registrationId, merged).catch(() => {});
    await send(`I've uploaded ${files.length} ${label}: ${files.join(", ")}`);
  }

  async function requestReask(fieldId: string) {
    const f = fieldById(fieldId);
    if (!f) return;
    // Clear the value and un-skip so resolver treats it as missing again.
    const next = { ...state };
    delete next[fieldId];
    if (Array.isArray(next.__skipped)) next.__skipped = (next.__skipped as string[]).filter((id) => id !== fieldId);
    setState(next);
    if (registrationId) await persistState(registrationId, next).catch(() => {});
    await send(`I'd like to change my answer for "${f.label}". Please ask me that question again.`, next);
  }

  async function submitRegistration() {
    if (!registrationId || !user || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("nl_land_registrations")
        .update({ status: "submitted" })
        .eq("id", registrationId)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      alert("Your land registration has been submitted for review. Thank you!");
      backToPicker();
    } catch (e: any) {
      alert(`Could not submit: ${e?.message ?? String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Chip source-of-truth: prefer the AI-declared active field, fall back to the resolver.
  // Chips ALWAYS reflect the field the AI is asking about — never a stale/other field.
  const activeField = useMemo(() => {
    const byAI = activeFieldId ? fieldById(activeFieldId) : null;
    return byAI ?? nextField ?? null;
  }, [activeFieldId, nextField]);
  const chipSuggestions: string[] = activeField?.options?.slice(0, 24) ?? [];
  const isMultiField = activeField?.type === "multi";
  const isUploadField = activeField?.type === "upload";
  const canSkip = !!activeField && !activeField.required;

  if (bootstrapping) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  if (view === "picker") {
    return (
      <div className="nl-container py-6 md:py-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
          <h1 className="nl-serif text-xl md:text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>
            List Your Land
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--nl-muted))" }}>
          You can register multiple lands. Continue an existing draft, or start a fresh registration.
        </p>

        <button
          type="button"
          onClick={startNewDraft}
          disabled={creatingNew}
          className="w-full mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors hover:bg-[hsl(var(--nl-forest)/0.04)] disabled:opacity-60"
          style={{ borderColor: "hsl(var(--nl-forest) / 0.4)", color: "hsl(var(--nl-forest))" }}
        >
          <span className="flex items-center gap-3">
            <span className="p-2 rounded-full" style={{ background: "hsl(var(--nl-forest) / 0.1)" }}>
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-left">
              <span className="block font-medium">Start New Registration</span>
              <span className="block text-xs" style={{ color: "hsl(var(--nl-muted))" }}>
                Register another land — begin the conversation from scratch.
              </span>
            </span>
          </span>
          {creatingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {drafts.length > 0 && (
          <>
            <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "hsl(var(--nl-muted))" }}>
              Your drafts ({drafts.length})
            </div>
            <ul className="space-y-3">
              {drafts.map((d) => {
                const loc = [d.village, d.district, d.state].filter(Boolean).join(", ");
                const area = d.total_area ? `${d.total_area} ${d.area_unit ?? "acres"}` : null;
                const pct = d.completion_pct ?? 0;
                return (
                  <li
                    key={d.id}
                    className="rounded-2xl border p-4"
                    style={{ borderColor: "hsl(var(--nl-forest) / 0.18)", background: "hsl(var(--nl-cream))" }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "hsl(var(--nl-forest) / 0.1)", color: "hsl(var(--nl-forest))" }}
                          >
                            {pct}% complete
                          </span>
                          <span className="text-[11px]" style={{ color: "hsl(var(--nl-muted))" }}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            Updated {formatWhen(d.updated_at)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-sm" style={{ color: "hsl(var(--nl-ink))" }}>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" style={{ color: "hsl(var(--nl-forest))" }} />
                            {loc || <em style={{ color: "hsl(var(--nl-muted))" }}>Location not captured yet</em>}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Ruler className="h-3.5 w-3.5" style={{ color: "hsl(var(--nl-forest))" }} />
                            {area || <em style={{ color: "hsl(var(--nl-muted))" }}>Area not captured yet</em>}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1 w-full rounded-full"
                          style={{ background: "hsl(var(--nl-forest) / 0.1)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: "hsl(var(--nl-forest))" }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDraft(d.id)}
                          className="text-xs px-3 py-2 rounded-full font-medium"
                          style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(d.id)}
                          disabled={deletingId === d.id}
                          className="p-2 rounded-full border disabled:opacity-40"
                          style={{ borderColor: "hsl(var(--nl-forest) / 0.3)", color: "hsl(var(--nl-forest))" }}
                          aria-label="Delete draft"
                          title="Delete draft"
                        >
                          {deletingId === d.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {confirmDeleteId === d.id && (
                      <div
                        className="mt-3 rounded-xl border p-3 text-sm"
                        style={{
                          borderColor: "hsl(0 70% 55% / 0.35)",
                          background: "hsl(0 70% 55% / 0.06)",
                          color: "hsl(var(--nl-ink))",
                        }}
                      >
                        Delete this draft permanently? This cannot be undone.
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => deleteDraft(d.id)}
                            disabled={deletingId === d.id}
                            className="text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                            style={{ background: "hsl(0 70% 45%)", color: "white" }}
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-3 py-1.5 rounded-full border"
                            style={{ borderColor: "hsl(var(--nl-forest) / 0.3)", color: "hsl(var(--nl-forest))" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {drafts.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "hsl(var(--nl-muted))" }}>
            No drafts yet — click <strong>Start New Registration</strong> to begin.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "hsl(var(--nl-cream))", height: "100dvh" }}>
      {/* Fixed top: title + progress */}
      <div
        className="shrink-0 border-b"
        style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest) / 0.15)" }}
      >
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={backToPicker}
                className="p-1.5 rounded-full hover:bg-[hsl(var(--nl-forest)/0.08)] shrink-0"
                style={{ color: "hsl(var(--nl-forest))" }}
                aria-label="Back to drafts"
                title="Back to drafts"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Leaf className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "hsl(var(--nl-forest))" }} />
              <h1
                className="nl-serif text-base sm:text-lg md:text-xl truncate"
                style={{ color: "hsl(var(--nl-forest))" }}
              >
                List Your Land
              </h1>
            </div>
            <div
              className="flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 py-1 rounded-full shrink-0"
              style={{ background: "hsl(var(--nl-forest) / 0.08)", color: "hsl(var(--nl-forest))" }}
            >
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {completion}%
            </div>
          </div>
          <div className="h-1 w-full rounded-full mt-2" style={{ background: "hsl(var(--nl-forest) / 0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completion}%`, background: "hsl(var(--nl-forest))" }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable messages — only this scrolls */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-4 md:py-6">
          {Object.keys(state).length > 0 && (
            <details
              className="mb-4 rounded-2xl border px-4 py-3"
              style={{ borderColor: "hsl(var(--nl-forest) / 0.18)", background: "hsl(var(--nl-cream-deep) / 0.35)" }}
            >
              <summary className="cursor-pointer text-sm font-medium" style={{ color: "hsl(var(--nl-forest))" }}>
                Review / edit captured answers
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {LAND_SCHEMA.filter(
                  (f) => !f.adminOnly && state[f.id] !== undefined && state[f.id] !== null && state[f.id] !== "",
                ).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                    style={{ borderColor: "hsl(var(--nl-forest) / 0.12)", background: "hsl(var(--nl-cream))" }}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide" style={{ color: "hsl(var(--nl-muted))" }}>
                        {f.label}
                      </div>
                      <div className="text-sm break-words" style={{ color: "hsl(var(--nl-ink))" }}>
                        {formatValue(state[f.id])}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${f.label}`}
                      className="shrink-0 p-1.5 rounded-full"
                      style={{ color: "hsl(var(--nl-forest))", background: "hsl(var(--nl-forest) / 0.08)" }}
                      onClick={() => requestReask(f.id)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "" : "border"}`}
                style={
                  m.role === "user"
                    ? { background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }
                    : {
                        background: "hsl(var(--nl-cream-deep) / 0.5)",
                        color: "hsl(var(--nl-ink))",
                        borderColor: "hsl(var(--nl-forest) / 0.15)",
                      }
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--nl-muted))]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> JAAGA is thinking…
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom: upload prompt + chips + composer */}
      <div
        className="shrink-0 border-t"
        style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest) / 0.15)" }}
      >
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-3 safe-bottom">
          {!nextField && !isUploadField && (
            <div
              className="mb-2 rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ borderColor: "hsl(var(--nl-forest) / 0.35)", background: "hsl(var(--nl-forest) / 0.06)" }}
            >
              <div className="text-sm flex items-center gap-2 min-w-0" style={{ color: "hsl(var(--nl-ink))" }}>
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--nl-forest))" }} />
                <span>
                  <strong>All questions answered.</strong> Review your details above and submit when ready.
                </span>
              </div>
              <button
                type="button"
                onClick={submitRegistration}
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-full font-medium disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {submitting ? "Submitting…" : "Review & Submit"}
              </button>
            </div>
          )}
          {isUploadField && (
            <div
              className="mb-2 rounded-xl border p-3"
              style={{ borderColor: "hsl(var(--nl-forest) / 0.25)", background: "hsl(var(--nl-cream-deep) / 0.4)" }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm flex items-center gap-2 min-w-0" style={{ color: "hsl(var(--nl-ink))" }}>
                  <Paperclip className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--nl-forest))" }} />
                  <strong className="truncate">{activeField?.label}</strong>
                  <span className="text-[hsl(var(--nl-muted))] hidden sm:inline">— attach one or more files.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs px-3 py-1.5 rounded-full font-medium border disabled:opacity-50"
                    style={{
                      borderColor: "hsl(var(--nl-forest))",
                      color: "hsl(var(--nl-forest))",
                      background: "hsl(var(--nl-cream))",
                    }}
                  >
                    {uploading ? "Uploading…" : pendingUploads.length ? "Add more" : "Choose files"}
                  </button>
                  {pendingUploads.length > 0 && (
                    <button
                      type="button"
                      onClick={() => finalizeUploads()}
                      disabled={uploading || sending}
                      className="text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                      style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                    >
                      Done ({pendingUploads.length})
                    </button>
                  )}
                </div>
              </div>
              {pendingUploads.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {pendingUploads.map((name, i) => (
                    <li
                      key={i}
                      className="text-[11px] px-2 py-1 rounded-full border"
                      style={{
                        borderColor: "hsl(var(--nl-forest) / 0.25)",
                        color: "hsl(var(--nl-forest))",
                        background: "hsl(var(--nl-cream))",
                      }}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {chipSuggestions.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "hsl(var(--nl-muted))" }}>
                {isMultiField ? "Tap to select multiple, then Send" : "Smart suggestions"}
              </div>
              <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                {chipSuggestions.map((opt) => {
                  const selected = isMultiField && multiPicks.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isMultiField) {
                          setMultiPicks((p) => (p.includes(opt) ? p.filter((x) => x !== opt) : [...p, opt]));
                        } else {
                          send(opt);
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                      style={
                        selected
                          ? {
                              borderColor: "hsl(var(--nl-forest))",
                              color: "hsl(var(--nl-cream))",
                              background: "hsl(var(--nl-forest))",
                            }
                          : {
                              borderColor: "hsl(var(--nl-forest) / 0.3)",
                              color: "hsl(var(--nl-forest))",
                              background: "hsl(var(--nl-cream-deep) / 0.4)",
                            }
                      }
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {opt}
                    </button>
                  );
                })}
                {isMultiField && multiPicks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => send(multiPicks.join(", "))}
                    className="text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0"
                    style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                  >
                    Send {multiPicks.length}
                  </button>
                )}
              </div>
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-2xl border p-2"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--nl-cream))" }}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Answer naturally — you can share multiple details in one message."
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-[15px] px-3 py-2 max-h-32"
              style={{ color: "hsl(var(--nl-ink))" }}
              autoFocus
            />
            {canSkip && (
              <button
                type="button"
                onClick={() => skipCurrent()}
                disabled={sending}
                className="p-2.5 rounded-full text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-[hsl(var(--nl-forest)/0.08)]"
                style={{ color: "hsl(var(--nl-forest))" }}
                aria-label="Skip this question"
                title="Skip this question"
              >
                <SkipForward className="h-4 w-4" />
                <span className="hidden sm:inline">Skip</span>
              </button>
            )}
            <button
              onClick={() => send()}
              disabled={sending || !input.trim()}
              className="p-2.5 rounded-full disabled:opacity-40"
              style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------- helpers -------

function mergeState(prev: Record<string, any>, patch: Record<string, any>, replaceFields: string[] = []) {
  const next = { ...prev };
  for (const [k, v] of Object.entries(patch)) {
    const f = fieldById(k);
    if (!f) continue;
    if (f.type === "multi") {
      const arr = Array.isArray(v) ? v : [v];
      next[k] = replaceFields.includes(k)
        ? arr
        : Array.from(new Set([...(Array.isArray(prev[k]) ? prev[k] : []), ...arr]));
    } else if (f.type === "stars" && typeof v === "object" && v) {
      next[k] = replaceFields.includes(k) ? v : { ...(prev[k] ?? {}), ...v };
    } else {
      next[k] = v;
    }
  }
  return next;
}

async function persistState(registrationId: string, state: Record<string, any>) {
  const row: Record<string, any> = { completion_pct: computeCompletion(state) };
  const extra: Record<string, any> = {};
  for (const f of LAND_SCHEMA) {
    if (f.type === "upload") continue; // handled via uploads table
    const v = state[f.id];
    if (v === undefined) continue;
    if (f.column.startsWith("extra.")) {
      extra[f.column.slice("extra.".length)] = v;
      continue;
    }
    row[f.column] = v;
  }
  if (Array.isArray(state.__skipped)) extra.__skipped = state.__skipped;
  if (Object.keys(extra).length > 0) row.extra = extra;
  const { error } = await (supabase as any).from("nl_land_registrations").update(row).eq("id", registrationId);
  if (error) throw new Error(`DB update failed in persistState: ${error.message}`);
}

function draftToState(draft: any): Record<string, any> {
  const s: Record<string, any> = {};
  for (const f of LAND_SCHEMA) {
    if (f.type === "upload") continue;
    const v = draft?.[f.column];
    const value = f.column.startsWith("extra.") ? draft?.extra?.[f.column.slice("extra.".length)] : v;
    if (value !== undefined && value !== null && value !== "") s[f.id] = value;
  }
  if (Array.isArray(draft?.extra?.__skipped)) s.__skipped = draft.extra.__skipped;
  return s;
}

function formatWhen(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatValue(value: any) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value)
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  return String(value);
}

async function buildInvokeError(functionName: string, error: any) {
  let details = error?.message ?? String(error);
  if (error?.context?.text) {
    try {
      details = await error.context.text();
    } catch {
      /* keep original */
    }
  }
  return new Error(`Edge Function ${functionName} failed in LandAgentChat.send: ${details}`);
}

function formatAgentDebug(debug: any, fallback?: string) {
  return [
    fallback || "AI agent runtime failure.",
    "",
    "Runtime debug:",
    "```json",
    JSON.stringify(debug ?? {}, null, 2),
    "```",
  ].join("\n");
}

function formatRuntimeError(error: any) {
  const payload = {
    file: "src/features/natural-living/land-agent/LandAgentChat.tsx",
    function: "send",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
  };
  return [
    "The land assistant hit a runtime error. Here is the real failure instead of a generic fallback:",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}
