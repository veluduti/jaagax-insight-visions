import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { LAND_SCHEMA, nextMissingField, computeCompletion, fieldById } from "./schema";
import { Edit3, Leaf, Send, CheckCircle2, Loader2, Paperclip, SkipForward, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const GREETING =
  "Namaste! I'm JAAGA, your agriculture consultant. I'll help you register your land — no forms, just a conversation. To start, may I know your name?";

export default function LandAgentChat() {
  const { user, loading: authLoading } = useNLAuth();
  const navigate = useNavigate();
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [multiPicks, setMultiPicks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const completion = useMemo(() => computeCompletion(state), [state]);
  const nextField = useMemo(() => nextMissingField(state), [state]);

  // Bootstrap: load or create a draft registration.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/natural-living/auth?next=/natural-living/list-land");
      return;
    }
    (async () => {
      const { data: draft } = await (supabase as any)
        .from("nl_land_registrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draft) {
        setRegistrationId(draft.id);
        setState(draftToState(draft));
        // Load recent conversation
        const { data: convo } = await (supabase as any)
          .from("nl_land_conversations")
          .select("id, role, content")
          .eq("registration_id", draft.id)
          .order("created_at", { ascending: true })
          .limit(200);
        if (convo && convo.length) {
          setMessages(convo.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        } else {
          const pct = computeCompletion(draftToState(draft));
          setMessages([
            {
              id: "welcome-back",
              role: "assistant",
              content: `Welcome back! We're **${pct}%** through your land registration. Shall we continue where we left off?`,
            },
          ]);
        }
      } else {
        const { data: created, error } = await (supabase as any)
          .from("nl_land_registrations")
          .insert({ user_id: user.id, status: "draft" })
          .select()
          .single();
        if (!error && created) setRegistrationId(created.id);
      }
      setBootstrapping(false);
    })();
  }, [authLoading, user, navigate]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    if (!sending) inputRef.current?.focus();
  }, [messages, sending]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending || !registrationId || !user) return;

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setMultiPicks([]);
    setSending(true);

    const schemaSummary = LAND_SCHEMA.map(
      (f) => `${f.id} (${f.type}${f.options ? ": " + f.options.join("|") : ""})${f.required ? " *" : ""}${f.adminOnly ? " [admin-only]" : ""} — ${f.label}${f.hint ? ` — ${f.hint}` : ""}`,
    ).join("\n");

    try {
      const { error: userMessageError } = await (supabase as any).from("nl_land_conversations").insert({
        registration_id: registrationId,
        user_id: user.id,
        role: "user",
        content: text,
      });
      if (userMessageError) throw new Error(`DB insert failed in LandAgentChat.send user message: ${userMessageError.message}`);

      const { data, error } = await supabase.functions.invoke("nl-land-agent", {
        body: {
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          state,
          schemaSummary,
          schema: LAND_SCHEMA.map((f) => ({ id: f.id, label: f.label, type: f.type, options: f.options, required: f.required, adminOnly: f.adminOnly })),
          nextField: nextField ? { id: nextField.id, label: nextField.label, type: nextField.type, options: nextField.options } : null,
        },
      });
      if (error) throw await buildInvokeError("nl-land-agent", error);
      if (data?.ok === false) throw new Error(formatAgentDebug(data.debug, data.reply));

      const reply = data?.reply ?? "Could you tell me more?";
      const extracted: Record<string, any> = data?.extracted ?? {};
      const replaceFields: string[] = Array.isArray(data?.replace_fields) ? data.replace_fields : [];

      if (Object.keys(extracted).length > 0) {
        const merged = mergeState(state, extracted, replaceFields);
        setState(merged);
        await persistState(registrationId, merged);
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
      if (assistantMessageError) throw new Error(`DB insert failed in LandAgentChat.send assistant message: ${assistantMessageError.message}`);
    } catch (e: any) {
      console.error("LandAgentChat.send runtime failure", e);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: formatRuntimeError(e) }]);
    } finally {
      setSending(false);
    }
  }

  async function skipCurrent() {
    if (!nextField || sending) return;
    // Mark skipped locally so the resolver moves on; persist as null so we don't re-ask.
    const merged = { ...state, [nextField.id]: nextField.type === "multi" ? [] : "__skipped__" };
    // For nicer UX, actually just mark it in a __skipped set stored in extra
    const skipped = new Set<string>((state.__skipped as string[]) ?? []);
    skipped.add(nextField.id);
    const next = { ...state, __skipped: Array.from(skipped) };
    setState(next);
    await send(`Skip — I don't have info for "${nextField.label}" right now.`);
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
          kind: (nextField?.id === "ownership_docs" ? "ownership_doc" : "land_photo"),
        });
        uploaded.push(file.name);
      }
      setPendingUploads((p) => [...p, ...uploaded]);
    } catch (e: any) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: `Upload failed: ${e?.message ?? String(e)}` }]);
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
    // Clear the value so resolver treats it as missing again.
    const next = { ...state };
    delete next[fieldId];
    setState(next);
    if (registrationId) await persistState(registrationId, next).catch(() => {});
    await send(`I'd like to change my answer for "${f.label}". Please ask me that question again.`);
  }

  const chipSuggestions: string[] = nextField?.options?.slice(0, 12) ?? [];
  const isMultiField = nextField?.type === "multi";
  const isUploadField = nextField?.type === "upload";
  const canSkip = !!nextField && !nextField.required;

  if (bootstrapping) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  return (
    <div className="nl-container py-6 md:py-10 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
          <h1 className="nl-serif text-xl md:text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>
            List Your Land
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--nl-forest) / 0.08)", color: "hsl(var(--nl-forest))" }}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {completion}% complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full mb-6" style={{ background: "hsl(var(--nl-forest) / 0.1)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, background: "hsl(var(--nl-forest))" }} />
      </div>

      {Object.keys(state).length > 0 && (
        <details className="mb-4 rounded-2xl border px-4 py-3" style={{ borderColor: "hsl(var(--nl-forest) / 0.18)", background: "hsl(var(--nl-cream-deep) / 0.35)" }}>
          <summary className="cursor-pointer text-sm font-medium" style={{ color: "hsl(var(--nl-forest))" }}>
            Review / edit captured answers
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LAND_SCHEMA.filter((f) => !f.adminOnly && state[f.id] !== undefined && state[f.id] !== null && state[f.id] !== "").map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl border p-3" style={{ borderColor: "hsl(var(--nl-forest) / 0.12)", background: "hsl(var(--nl-cream))" }}>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: "hsl(var(--nl-muted))" }}>{f.label}</div>
                  <div className="text-sm break-words" style={{ color: "hsl(var(--nl-ink))" }}>{formatValue(state[f.id])}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${f.label}`}
                  className="shrink-0 p-1.5 rounded-full"
                  style={{ color: "hsl(var(--nl-forest))", background: "hsl(var(--nl-forest) / 0.08)" }}
                  onClick={() => {
                    setInput(`Correction: ${f.label} should be `);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Message list */}
      <div
        ref={listRef}
        className="rounded-2xl border p-4 md:p-6 mb-4 overflow-y-auto"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--nl-cream))", height: "60vh", minHeight: 420 }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "" : "border"}`}
              style={
                m.role === "user"
                  ? { background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }
                  : { background: "hsl(var(--nl-cream-deep) / 0.5)", color: "hsl(var(--nl-ink))", borderColor: "hsl(var(--nl-forest) / 0.15)" }
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

      {/* Upload prompt when current field is an upload */}
      {isUploadField && (
        <div className="mb-3 rounded-xl border p-3 flex items-center justify-between gap-3" style={{ borderColor: "hsl(var(--nl-forest) / 0.25)", background: "hsl(var(--nl-cream-deep) / 0.4)" }}>
          <div className="text-sm" style={{ color: "hsl(var(--nl-ink))" }}>
            📎 <strong>{nextField?.label}</strong> — attach files below.
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
            style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
          >
            {uploading ? "Uploading…" : "Choose files"}
          </button>
        </div>
      )}

      {/* Smart suggestions */}
      {chipSuggestions.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "hsl(var(--nl-muted))" }}>
            {isMultiField ? "Tap to select multiple, then Send" : "Smart suggestions"}
          </div>
          <div className="flex flex-wrap gap-2">
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
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1"
                  style={
                    selected
                      ? { borderColor: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))", background: "hsl(var(--nl-forest))" }
                      : { borderColor: "hsl(var(--nl-forest) / 0.3)", color: "hsl(var(--nl-forest))", background: "hsl(var(--nl-cream-deep) / 0.4)" }
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
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
              >
                Send {multiPicks.length} selection{multiPicks.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 rounded-2xl border p-2" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--nl-cream))" }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending}
          className="p-2.5 rounded-full disabled:opacity-40 hover:bg-[hsl(var(--nl-forest)/0.08)]"
          style={{ color: "hsl(var(--nl-forest))" }}
          aria-label="Attach photos or documents"
          title="Attach photos or documents"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Answer naturally — you can share multiple details in one message."
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-[15px] px-3 py-2 max-h-40"
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

      <p className="text-xs text-[hsl(var(--nl-muted))] mt-3">
        JAAGA saves your progress automatically. You can leave and come back anytime.
      </p>
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
      next[k] = replaceFields.includes(k) ? arr : Array.from(new Set([...(Array.isArray(prev[k]) ? prev[k] : []), ...arr]));
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
  return s;
}

function formatValue(value: any) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value) return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(", ");
  return String(value);
}

async function buildInvokeError(functionName: string, error: any) {
  let details = error?.message ?? String(error);
  if (error?.context?.text) {
    try { details = await error.context.text(); } catch { /* keep original */ }
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
