/**
 * InterviewChat — the visible AI Interview surface.
 *
 * Chat-style UI with: AI avatar, message bubbles, streamed typing indicator,
 * progress bar, adaptive suggestion chips, text composer, voice-input
 * placeholder, skip button, and a resume banner. Interview logic lives in
 * `useInterviewSession`; extraction happens in the `nl-interview-agent`
 * edge function.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Send,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileBoot } from "@/features/natural-living/onboarding/ProfileBootProvider";
import { useInterviewSession } from "./useInterviewSession";
import { suggestionsFor, type Question, type QuestionOption } from "./InterviewEngine";
import { cn } from "@/lib/utils";

type Bubble = {
  id: string;
  role: "assistant" | "user";
  text: string;
  pending?: boolean;
  meta?: string;
};

function optionsAsList(q: Question | null): QuestionOption[] {
  if (!q) return [];
  return Array.isArray(q.options) ? (q.options as QuestionOption[]) : [];
}

export default function InterviewChat() {
  const { user } = useProfileBoot();
  const navigate = useNavigate();
  const session = useInterviewSession(user?.id);
  const {
    loading,
    error,
    session: dbSession,
    pack,
    turns,
    currentQuestion,
    progress,
    isResuming,
    submitAnswer,
    skipQuestion,
    pause,
    complete,
  } = session;

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [transientAckId, setTransientAckId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const askedQuestionRef = useRef<Set<string>>(new Set());
  const askedBubblesRef = useRef<Bubble[]>([]);
  const askedQueueRef = useRef<Bubble[]>([]);
  const [localAsked, setLocalAsked] = useState<Bubble[]>([]);
  const askQuestionRefTick = useRef(0);

  const preferredName = useMemo(() => {
    const fromAnswer = (dbSession?.answers as any)?.name_preferred;
    if (typeof fromAnswer === "string" && fromAnswer.trim()) return fromAnswer.trim();
    const meta: any = user?.user_metadata || {};
    return (meta.first_name || meta.full_name || meta.name || (user?.email ? user.email.split("@")[0] : "") || "").split(" ")[0];
  }, [dbSession?.answers, user]);

  // Merge assistant turns + user turns into a chat transcript.
  const transcript: Bubble[] = useMemo(() => {
    const list: Bubble[] = [];
    for (const t of turns) {
      if (t.role === "assistant") {
        list.push({ id: `t${t.id}`, role: "assistant", text: t.answer_text || "" });
      } else if (t.role === "user") {
        if (t.skipped) {
          list.push({ id: `t${t.id}`, role: "user", text: "(skipped)", meta: "Skipped" });
        } else if (t.answer_text) {
          list.push({ id: `t${t.id}`, role: "user", text: t.answer_text });
        }
      }
    }
    return list;
  }, [turns]);

  // Ask the next question (as an assistant bubble) whenever `currentQuestion`
  // changes and we haven't asked it yet. We de-duplicate via a ref set because
  // React StrictMode remounts effects.
  useEffect(() => {
    if (!currentQuestion) return;
    if (askedQuestionRef.current.has(currentQuestion.code)) return;
    askedQuestionRef.current.add(currentQuestion.code);
    const preface = getPreface(preferredName, currentQuestion, transcript.length === 0);
    const text = preface ? `${preface} ${currentQuestion.question}` : currentQuestion.question;
    askQuestionRefTick.current += 1;
    const bubble: Bubble = { id: `ask-${currentQuestion.code}-${askQuestionRefTick.current}`, role: "assistant", text };
    setLocalAsked((prev) => [...prev, bubble]);
  }, [currentQuestion, preferredName, transcript.length]);

  // Combine persisted transcript + optimistic asked bubbles + optional thinking indicator.
  const displayBubbles: Bubble[] = useMemo(() => {
    const asked = localAsked.filter(
      (b) => !turns.some((t) => t.role === "assistant" && t.answer_text === b.text.replace(/^[^\n]*\s/, "")),
    );
    const merged = [...transcript, ...asked];
    if (thinking) merged.push({ id: "thinking", role: "assistant", text: "", pending: true });
    return merged;
  }, [transcript, localAsked, thinking, turns]);

  // Autoscroll on new content.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [displayBubbles.length, thinking]);

  // Reset multi-select when question changes.
  useEffect(() => {
    setMultiSelect([]);
  }, [currentQuestion?.code]);

  // Focus composer.
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentQuestion?.code]);

  const send = useCallback(
    async (rawText: string) => {
      if (!currentQuestion || !user || thinking) return;
      const text = rawText.trim();
      if (!text) return;
      setInput("");
      setNetworkError(null);
      setThinking(true);
      try {
        const { data, error: fnError } = await (supabase.functions as any).invoke("nl-interview-agent", {
          body: {
            question: {
              code: currentQuestion.code,
              question: currentQuestion.question,
              question_type: currentQuestion.question_type,
              options: currentQuestion.options,
              field_code: currentQuestion.metadata?.field_code,
            },
            userMessage: text,
            priorAnswers: dbSession?.answers || {},
            selectedGoalCodes: session.goalCodes,
            preferredName,
          },
        });
        if (fnError) throw fnError;
        if (!data?.ok) {
          const kind = data?.error;
          if (kind === "rate_limited") throw new Error("Our AI is a little rushed. One moment, then try again.");
          if (kind === "credits_exhausted") throw new Error("AI credits are exhausted. Please contact support.");
          throw new Error(data?.message || "Our AI couldn't process that. Please try again.");
        }
        const ack = data.ack || null;
        const extracted = data.extracted ?? null;
        const confidence = Number(data.confidence ?? 0);
        await submitAnswer(currentQuestion, text, extracted, confidence, ack);
        if (data.needsConfirmation && ack) {
          setTransientAckId(`nc-${Date.now()}`);
        }
      } catch (e: any) {
        setNetworkError(e?.message || "Network hiccup — your message is safe. Try again.");
      } finally {
        setThinking(false);
      }
    },
    [currentQuestion, user, thinking, dbSession, session.goalCodes, preferredName, submitAnswer],
  );

  // Direct-select handlers for choice questions bypass AI extraction (fast path).
  const commitDirect = useCallback(
    async (value: unknown, text: string) => {
      if (!currentQuestion || !user || thinking) return;
      setThinking(true);
      setNetworkError(null);
      try {
        const ack = buildLocalAck(currentQuestion, value, preferredName);
        await submitAnswer(currentQuestion, text, value, 0.95, ack);
      } catch (e: any) {
        setNetworkError(e?.message || "Couldn't save that answer.");
      } finally {
        setThinking(false);
      }
    },
    [currentQuestion, user, thinking, submitAnswer, preferredName],
  );

  const handleSkip = useCallback(async () => {
    if (!currentQuestion || thinking) return;
    setThinking(true);
    try {
      await skipQuestion(currentQuestion);
    } finally {
      setThinking(false);
    }
  }, [currentQuestion, thinking, skipQuestion]);

  // Auto-complete when no more questions.
  useEffect(() => {
    if (!loading && dbSession && !currentQuestion && dbSession.status !== "completed") {
      void complete();
    }
  }, [loading, dbSession, currentQuestion, complete]);

  const done = dbSession?.status === "completed" || (!currentQuestion && !loading);

  // ---------- render ----------

  if (loading) {
    return (
      <div className="nl-scope h-full min-h-0 flex items-center justify-center" style={{ background: "hsl(var(--nl-cream))" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="nl-scope h-full min-h-0 flex items-center justify-center text-center p-8" style={{ background: "hsl(var(--nl-cream))" }}>
        <div>
          <p className="text-[hsl(var(--nl-ink))] mb-3">We couldn't load your interview.</p>
          <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-4">{error}</p>
          <button className="nl-btn nl-btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="nl-scope h-full min-h-0 flex flex-col"
      style={{ background: "hsl(var(--nl-cream))" }}
    >
      {/* Header + progress */}
      <header
        className="shrink-0 border-b px-4 md:px-6 py-3"
        style={{ borderColor: "hsl(var(--nl-forest)/0.15)", background: "hsl(var(--nl-cream)/0.95)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
              >
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[hsl(var(--nl-ink))] truncate">
                  {pack?.title || "AI Interview"}
                </div>
                <div className="text-[11px] uppercase tracking-widest text-[hsl(var(--nl-ink)/0.55)] truncate">
                  {progress.currentCategory ? section(progress.currentCategory) : done ? "Complete" : "Getting ready"}
                  {` · ${progress.pct}%`}
                  {progress.remaining > 0 && ` · ${progress.remaining} left · ~${progress.etaMinutes || 1} min`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="nl-btn nl-btn-outline text-xs inline-flex items-center gap-1"
                onClick={async () => {
                  await pause();
                  navigate("/natural-living/start");
                }}
                disabled={!dbSession || done}
                title="Pause and resume later"
              >
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            </div>
          </div>
          <div
            className="mt-3 h-1.5 rounded-full overflow-hidden"
            style={{ background: "hsl(var(--nl-forest)/0.12)" }}
            aria-hidden="true"
          >
            <div
              className="h-full transition-all"
              style={{ width: `${progress.pct}%`, background: "hsl(var(--nl-forest))" }}
            />
          </div>
          {isResuming && !done && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[hsl(var(--nl-forest))]">
              <Sparkles className="h-3.5 w-3.5" /> Welcome back — we picked up right where you paused.
            </div>
          )}
        </div>
      </header>

      {/* Transcript */}
      <main ref={scrollerRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {displayBubbles.map((b) => (
            <MessageRow key={b.id} bubble={b} preferredName={preferredName} />
          ))}
          {done && (
            <div
              className="rounded-2xl border p-6 text-center"
              style={{ background: "hsl(var(--nl-forest)/0.06)", borderColor: "hsl(var(--nl-forest)/0.25)" }}
            >
              <CheckCircle2 className="h-7 w-7 mx-auto mb-2" style={{ color: "hsl(var(--nl-forest))" }} />
              <h3 className="nl-serif text-xl text-[hsl(var(--nl-ink))]">Thank you{preferredName ? `, ${preferredName}` : ""}.</h3>
              <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.75)]">
                That's everything I needed for now. Your AI companion is quietly making sense of it — you'll see your
                personalised profile in the next step.
              </p>
              <button
                type="button"
                className="nl-btn nl-btn-primary mt-4 inline-flex items-center gap-2"
                onClick={() => navigate("/natural-living/start")}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {networkError && (
            <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200" role="alert">
              {networkError}
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      {!done && currentQuestion && (
        <footer
          className="shrink-0 border-t px-4 md:px-6 py-3"
          style={{ borderColor: "hsl(var(--nl-forest)/0.15)", background: "hsl(var(--nl-cream)/0.95)" }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Suggestion chips / choice controls */}
            <SuggestionRow
              q={currentQuestion}
              multi={multiSelect}
              setMulti={setMultiSelect}
              onPick={(val, label) => commitDirect(val, label)}
              onSubmitMulti={(vals, labels) => commitDirect(vals, labels.join(", "))}
              onScale={(val) => commitDirect(val, String(val))}
              onChipText={(t) => {
                setInput(t);
                inputRef.current?.focus();
              }}
              disabled={thinking}
            />

            {(currentQuestion.question_type === "text" ||
              currentQuestion.question_type === "number" ||
              currentQuestion.question_type === "single_choice" ||
              currentQuestion.question_type === "multi_choice") && (
              <div
                className="mt-2 flex items-end gap-2 rounded-2xl border p-2"
                style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest)/0.25)" }}
              >
                <button
                  type="button"
                  className="p-2 rounded-full text-[hsl(var(--nl-ink)/0.5)] hover:bg-[hsl(var(--nl-forest)/0.08)]"
                  title="Voice input (coming soon)"
                  aria-label="Voice input coming soon"
                  disabled
                >
                  <Mic className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder={
                    currentQuestion.question_type === "number"
                      ? "Type a number…"
                      : "Type your answer…"
                  }
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-sm text-[hsl(var(--nl-ink))] placeholder:text-[hsl(var(--nl-ink)/0.4)] max-h-32 py-2"
                  disabled={thinking}
                  aria-label="Your answer"
                />
                <button
                  type="button"
                  onClick={handleSkip}
                  className="p-2 rounded-full text-[hsl(var(--nl-ink)/0.55)] hover:bg-[hsl(var(--nl-forest)/0.08)]"
                  title="Skip this question"
                  aria-label="Skip this question"
                  disabled={thinking}
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void send(input)}
                  className="p-2 rounded-full disabled:opacity-40"
                  style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                  title="Send"
                  aria-label="Send answer"
                  disabled={thinking || !input.trim()}
                >
                  {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
            <div className="mt-2 text-[11px] text-[hsl(var(--nl-ink)/0.5)] text-center">
              Answers save automatically. You can pause and return anytime.
            </div>
            {transientAckId && (
              <div className="sr-only" aria-live="polite">
                Answer noted. Let us know if we got that right.
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

// -------------------- pieces --------------------

function MessageRow({ bubble, preferredName }: { bubble: Bubble; preferredName?: string }) {
  const isAssistant = bubble.role === "assistant";
  return (
    <div className={cn("flex gap-3", isAssistant ? "" : "flex-row-reverse")}>
      {isAssistant ? (
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
          aria-hidden="true"
        >
          <Bot className="h-4 w-4" />
        </div>
      ) : (
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-medium"
          style={{ background: "hsl(var(--nl-forest)/0.12)", color: "hsl(var(--nl-forest))" }}
          aria-hidden="true"
        >
          {(preferredName?.[0] || "Y").toUpperCase()}
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isAssistant ? "" : "text-right",
        )}
        style={
          isAssistant
            ? { background: "transparent", color: "hsl(var(--nl-ink))" }
            : { background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }
        }
      >
        {bubble.pending ? (
          <TypingDots />
        ) : (
          <div className="whitespace-pre-wrap">{bubble.text}</div>
        )}
        {bubble.meta && !bubble.pending && (
          <div className={cn("text-[10px] mt-1 uppercase tracking-widest", isAssistant ? "text-[hsl(var(--nl-ink)/0.5)]" : "text-[hsl(var(--nl-cream)/0.7)]")}>
            {bubble.meta}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full animate-bounce"
          style={{
            background: "hsl(var(--nl-forest))",
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

function SuggestionRow({
  q,
  multi,
  setMulti,
  onPick,
  onSubmitMulti,
  onScale,
  onChipText,
  disabled,
}: {
  q: Question;
  multi: string[];
  setMulti: (v: string[]) => void;
  onPick: (value: string, label: string) => void;
  onSubmitMulti: (values: string[], labels: string[]) => void;
  onScale: (v: number) => void;
  onChipText: (text: string) => void;
  disabled: boolean;
}) {
  if (q.question_type === "single_choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {optionsAsList(q).map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value, o.label)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full border text-sm transition-colors"
            style={{
              background: "hsl(var(--nl-cream))",
              borderColor: "hsl(var(--nl-forest)/0.3)",
              color: "hsl(var(--nl-ink))",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  if (q.question_type === "multi_choice") {
    const opts = optionsAsList(q);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const active = multi.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  setMulti(active ? multi.filter((v) => v !== o.value) : [...multi, o.value])
                }
                disabled={disabled}
                className="px-3 py-1.5 rounded-full border text-sm transition-colors"
                style={{
                  background: active ? "hsl(var(--nl-forest))" : "hsl(var(--nl-cream))",
                  borderColor: active ? "hsl(var(--nl-forest))" : "hsl(var(--nl-forest)/0.3)",
                  color: active ? "hsl(var(--nl-cream))" : "hsl(var(--nl-ink))",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {multi.length > 0 && (
          <button
            type="button"
            className="nl-btn nl-btn-primary text-sm inline-flex items-center gap-2"
            onClick={() =>
              onSubmitMulti(
                multi,
                multi.map((v) => opts.find((o) => o.value === v)?.label ?? v),
              )
            }
            disabled={disabled}
          >
            Continue with {multi.length} selected <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
  if (q.question_type === "scale") {
    const range = q.options && typeof q.options === "object" && "min" in q.options ? (q.options as any) : { min: 1, max: 5 };
    const values: number[] = [];
    for (let i = range.min; i <= range.max; i++) values.push(i);
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onScale(v)}
            disabled={disabled}
            className="h-10 w-10 rounded-full border text-sm font-medium"
            style={{
              background: "hsl(var(--nl-cream))",
              borderColor: "hsl(var(--nl-forest)/0.3)",
              color: "hsl(var(--nl-ink))",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }
  // text / number → freeform suggestion chips
  const suggestions = suggestionsFor(q);
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChipText(s)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full border text-sm transition-colors"
          style={{
            background: "hsl(var(--nl-cream))",
            borderColor: "hsl(var(--nl-forest)/0.3)",
            color: "hsl(var(--nl-ink))",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function section(category: string) {
  const map: Record<string, string> = {
    warmup: "Warm-up",
    lifestyle: "Lifestyle",
    experience: "Experience",
    commitment: "Commitment",
    vision: "Vision",
    wrapup: "Wrap-up",
  };
  return map[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getPreface(name: string | undefined, q: Question, first: boolean): string {
  if (first) {
    return name
      ? `Lovely to meet you${name ? ", " + name : ""}.`
      : "Lovely to have you here.";
  }
  return "";
}

function buildLocalAck(q: Question, value: unknown, name?: string) {
  const label =
    Array.isArray(q.options) && Array.isArray(value)
      ? (value as string[]).map((v) => (q.options as QuestionOption[]).find((o) => o.value === v)?.label ?? v).join(", ")
      : Array.isArray(q.options)
        ? (q.options as QuestionOption[]).find((o) => o.value === value)?.label ?? String(value)
        : String(value);
  if (q.question_type === "scale") return `Got it — noted as ${label}.`;
  return name ? `Noted${name ? ", " + name : ""} — ${truncate(label, 60)}.` : `Noted — ${truncate(label, 60)}.`;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
