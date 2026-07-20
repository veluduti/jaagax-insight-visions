/**
 * useInterviewSession — Natural Living AI Interview state layer.
 *
 * Responsibilities:
 *  - Load pack `nl_core_v1`, its question bank, the user's goals.
 *  - Start / resume / pause / complete an `nl_interview_sessions` row.
 *  - Append turns to `nl_interview_turns` (user + AI, skips).
 *  - Merge structured extracted answers into `session.answers` (keyed by field_code).
 *  - Persist canonical facts into `ai_memory` (scope='user', module='natural-living').
 *
 * Uses `supabase` typed as any (via feature convention) since these tables are
 * missing from generated types.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import * as AIMemory from "@/platform/ai/AIMemory";
import type { Question } from "./InterviewEngine";
import { fieldCodeOf, nextQuestion, computeProgress } from "./InterviewEngine";

const sb = supabase as any;
const PACK_CODE = "nl_core_v1";
const AGENT_KEY = "nl_interview";
const MODULE_KEY = "natural-living";

export interface SessionRow {
  id: string;
  user_id: string;
  pack_id: string;
  status: "in_progress" | "paused" | "completed" | "abandoned";
  progress_pct: number;
  current_question_code: string | null;
  answers: Record<string, unknown>;
  derived_tags: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: any;
}

export interface TurnRow {
  id: string;
  session_id: string;
  question_id: string | null;
  question_code: string | null;
  role: "user" | "assistant" | "system";
  answer: any;
  answer_text: string | null;
  skipped: boolean;
  confidence: number | null;
  turn_index: number;
  created_at: string;
  question_snapshot?: any;
}

export interface InterviewState {
  loading: boolean;
  error: string | null;
  session: SessionRow | null;
  pack: { id: string; code: string; title: string; estimated_minutes: number } | null;
  questions: Question[];
  goalCodes: string[];
  turns: TurnRow[];
  currentQuestion: Question | null;
  progress: ReturnType<typeof computeProgress>;
  isResuming: boolean;
}

export function useInterviewSession(userId: string | null | undefined) {
  const [state, setState] = useState<InterviewState>({
    loading: true,
    error: null,
    session: null,
    pack: null,
    questions: [],
    goalCodes: [],
    turns: [],
    currentQuestion: null,
    progress: {
      totalApplicable: 0,
      answered: 0,
      skipped: 0,
      remaining: 0,
      requiredRemaining: 0,
      pct: 0,
      etaMinutes: 0,
      currentCategory: null,
    },
    isResuming: false,
  });

  const turnIndexRef = useRef(0);
  const startedEventFiredRef = useRef(false);

  const derived = useMemo(() => {
    const skipped = state.turns.filter((t) => t.skipped && t.question_code).map((t) => t.question_code as string);
    const answers = state.session?.answers || {};
    return { skipped, answers };
  }, [state.turns, state.session]);

  const recomputeCurrent = useCallback(
    (questions: Question[], answers: Record<string, unknown>, skipped: string[], goalCodes: string[]) => {
      const engineInput = { questions, answers, skipped, goalCodes };
      const q = nextQuestion(engineInput);
      const progress = computeProgress(engineInput);
      return { currentQuestion: q, progress };
    },
    [],
  );

  // Bootstrapping: pack + questions + goals + latest session.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [packRes, goalsRes, sessionRes] = await Promise.all([
          sb
            .from("nl_interview_packs")
            .select("id, code, title, estimated_minutes")
            .eq("code", PACK_CODE)
            .maybeSingle(),
          sb
            .from("nl_user_goals")
            .select("goal_id, nl_goals(code)")
            .eq("user_id", userId),
          sb
            .from("nl_interview_sessions")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (packRes.error || !packRes.data) throw packRes.error || new Error("Interview pack not found");

        const packRow = packRes.data;
        const qRes = await sb
          .from("nl_question_bank")
          .select("*")
          .eq("pack_id", packRow.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (qRes.error) throw qRes.error;

        const questions: Question[] = (qRes.data || []).map((q: any) => ({
          id: q.id,
          code: q.code,
          question: q.question,
          helper_text: q.helper_text,
          question_type: q.question_type,
          options: q.options ?? {},
          applies_when: q.applies_when,
          weight: Number(q.weight ?? 1),
          category: q.category,
          sort_order: q.sort_order ?? 0,
          is_required: !!q.is_required,
          tags: q.tags ?? [],
          metadata: q.metadata ?? {},
        }));

        const goalCodes = (goalsRes.data || [])
          .map((r: any) => r.nl_goals?.code)
          .filter((c: unknown): c is string => typeof c === "string");

        let session: SessionRow | null = sessionRes.data ?? null;
        let turns: TurnRow[] = [];
        let isResuming = false;

        if (session && (session.status === "completed" || session.status === "abandoned")) {
          session = null;
        }

        if (session) {
          const tRes = await sb
            .from("nl_interview_turns")
            .select("*")
            .eq("session_id", session.id)
            .order("turn_index", { ascending: true });
          if (tRes.error) throw tRes.error;
          turns = tRes.data || [];
          turnIndexRef.current = turns.length ? Math.max(...turns.map((t: TurnRow) => t.turn_index)) : 0;
          isResuming = turns.length > 0;
          if (session.status === "paused") {
            await sb
              .from("nl_interview_sessions")
              .update({ status: "in_progress", updated_at: new Date().toISOString() })
              .eq("id", session.id);
            session = { ...session, status: "in_progress" };
            void EventBus.publish({
              topic: "nl.interview.resumed",
              moduleKey: MODULE_KEY,
              actorUserId: userId,
              payload: { session_id: session.id },
            });
            void Analytics.track({ name: "nl_interview_resumed", userId, moduleKey: MODULE_KEY });
          }
        }

        if (cancelled) return;

        const { currentQuestion, progress } = recomputeCurrent(
          questions,
          session?.answers || {},
          turns.filter((t) => t.skipped && t.question_code).map((t) => t.question_code as string),
          goalCodes,
        );

        setState({
          loading: false,
          error: null,
          session,
          pack: packRow,
          questions,
          goalCodes,
          turns,
          currentQuestion,
          progress,
          isResuming,
        });
      } catch (e: any) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || "Failed to load interview" }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, recomputeCurrent]);

  const ensureSession = useCallback(async (): Promise<SessionRow | null> => {
    if (!userId || !state.pack) return null;
    if (state.session) return state.session;

    const now = new Date().toISOString();
    const insertRes = await sb
      .from("nl_interview_sessions")
      .insert({
        user_id: userId,
        pack_id: state.pack.id,
        status: "in_progress",
        progress_pct: 0,
        current_question_code: state.currentQuestion?.code ?? null,
        answers: {},
        started_at: now,
        metadata: { pack_code: state.pack.code },
      })
      .select("*")
      .single();
    if (insertRes.error) throw insertRes.error;
    const created: SessionRow = insertRes.data;

    if (!startedEventFiredRef.current) {
      startedEventFiredRef.current = true;
      void EventBus.publish({
        topic: "nl.interview.started",
        moduleKey: MODULE_KEY,
        actorUserId: userId,
        payload: { session_id: created.id, pack: state.pack.code },
      });
      void Analytics.track({
        name: "nl_interview_started",
        userId,
        moduleKey: MODULE_KEY,
        props: { pack: state.pack.code },
      });
    }

    setState((s) => ({ ...s, session: created }));
    return created;
  }, [userId, state.pack, state.session, state.currentQuestion]);

  const appendTurn = useCallback(
    async (turn: Omit<TurnRow, "id" | "created_at" | "turn_index" | "session_id"> & { session_id: string }) => {
      turnIndexRef.current += 1;
      const row = { ...turn, turn_index: turnIndexRef.current };
      const res = await sb.from("nl_interview_turns").insert(row).select("*").single();
      if (res.error) throw res.error;
      setState((s) => ({ ...s, turns: [...s.turns, res.data] }));
      return res.data as TurnRow;
    },
    [],
  );

  const persistAnswer = useCallback(
    async (session: SessionRow, question: Question, value: unknown) => {
      const fieldKey = fieldCodeOf(question);
      const newAnswers = { ...(session.answers || {}), [fieldKey]: value };

      const { currentQuestion: nextQ, progress: nextProgress } = recomputeCurrent(
        state.questions,
        newAnswers,
        derived.skipped,
        state.goalCodes,
      );

      const updated = await sb
        .from("nl_interview_sessions")
        .update({
          answers: newAnswers,
          progress_pct: nextProgress.pct,
          current_question_code: nextQ?.code ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select("*")
        .single();
      if (updated.error) throw updated.error;

      setState((s) => ({
        ...s,
        session: updated.data,
        currentQuestion: nextQ,
        progress: nextProgress,
      }));

      // Durable per-user profile fact via AIMemory.
      if (userId) {
        void AIMemory.remember({
          userId,
          scope: "user",
          moduleKey: MODULE_KEY,
          agentKey: AGENT_KEY,
          key: `profile_field:${fieldKey}`,
          value: { value, at: new Date().toISOString(), source: "interview" },
        }).catch(() => undefined);
      }

      return { session: updated.data as SessionRow, nextQuestion: nextQ, progress: nextProgress };
    },
    [state.questions, state.goalCodes, derived.skipped, userId, recomputeCurrent],
  );

  const skipQuestion = useCallback(
    async (question: Question) => {
      if (!userId) return;
      const session = await ensureSession();
      if (!session) return;

      await appendTurn({
        session_id: session.id,
        user_id: userId,
        question_id: question.id,
        question_code: question.code,
        question_snapshot: { question: question.question, question_type: question.question_type, options: question.options },
        role: "user",
        answer: null,
        answer_text: null,
        skipped: true,
        confidence: null,
      });

      const skippedNow = [...derived.skipped, question.code];
      const { currentQuestion: nextQ, progress: nextProgress } = recomputeCurrent(
        state.questions,
        state.session?.answers || {},
        skippedNow,
        state.goalCodes,
      );
      await sb
        .from("nl_interview_sessions")
        .update({
          progress_pct: nextProgress.pct,
          current_question_code: nextQ?.code ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      setState((s) => ({
        ...s,
        currentQuestion: nextQ,
        progress: nextProgress,
      }));

      void EventBus.publish({
        topic: "nl.interview.question_skipped",
        moduleKey: MODULE_KEY,
        actorUserId: userId,
        payload: { question_code: question.code },
      });
      void Analytics.track({
        name: "nl_interview_question_skipped",
        userId,
        moduleKey: MODULE_KEY,
        props: { question_code: question.code, category: question.category },
      });
    },
    [userId, ensureSession, appendTurn, derived.skipped, state.questions, state.session, state.goalCodes, recomputeCurrent],
  );

  const submitAnswer = useCallback(
    async (question: Question, userText: string, extracted: unknown, confidence: number, aiAck: string | null) => {
      if (!userId) return null;
      const session = await ensureSession();
      if (!session) return null;

      await appendTurn({
        session_id: session.id,
        user_id: userId,
        question_id: question.id,
        question_code: question.code,
        question_snapshot: { question: question.question, question_type: question.question_type, options: question.options },
        role: "user",
        answer: extracted ?? null,
        answer_text: userText || null,
        skipped: false,
        confidence: confidence ?? null,
      });

      if (aiAck) {
        await appendTurn({
          session_id: session.id,
          user_id: userId,
          question_id: question.id,
          question_code: question.code,
          question_snapshot: null,
          role: "assistant",
          answer: null,
          answer_text: aiAck,
          skipped: false,
          confidence: null,
        });
      }

      let result: { session: SessionRow; nextQuestion: Question | null; progress: ReturnType<typeof computeProgress> } | null = null;
      if (extracted != null && extracted !== "") {
        result = await persistAnswer(session, question, extracted);
        void EventBus.publish({
          topic: "nl.interview.question_answered",
          moduleKey: MODULE_KEY,
          actorUserId: userId,
          payload: {
            question_code: question.code,
            field_code: fieldCodeOf(question),
            confidence,
            progress_pct: result.progress.pct,
          },
        });
        void Analytics.track({
          name: "nl_interview_question_answered",
          userId,
          moduleKey: MODULE_KEY,
          props: {
            question_code: question.code,
            field_code: fieldCodeOf(question),
            category: question.category,
            confidence,
            progress_pct: result.progress.pct,
          },
        });
      }
      return result;
    },
    [userId, ensureSession, appendTurn, persistAnswer],
  );

  const pause = useCallback(async () => {
    if (!userId || !state.session) return;
    await sb
      .from("nl_interview_sessions")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", state.session.id);
    setState((s) => (s.session ? { ...s, session: { ...s.session, status: "paused" } } : s));
    void EventBus.publish({
      topic: "nl.interview.paused",
      moduleKey: MODULE_KEY,
      actorUserId: userId,
      payload: { session_id: state.session.id, progress_pct: state.progress.pct },
    });
    void Analytics.track({
      name: "nl_interview_paused",
      userId,
      moduleKey: MODULE_KEY,
      props: { progress_pct: state.progress.pct },
    });
  }, [userId, state.session, state.progress]);

  const complete = useCallback(async () => {
    if (!userId || !state.session) return;
    const now = new Date().toISOString();
    const upd = await sb
      .from("nl_interview_sessions")
      .update({
        status: "completed",
        completed_at: now,
        progress_pct: 100,
        updated_at: now,
      })
      .eq("id", state.session.id)
      .select("*")
      .single();
    if (!upd.error) {
      setState((s) => ({ ...s, session: upd.data, progress: { ...s.progress, pct: 100 } }));
    }
    void EventBus.publish({
      topic: "nl.interview.completed",
      moduleKey: MODULE_KEY,
      actorUserId: userId,
      payload: { session_id: state.session.id, answers: state.session.answers },
    });
    void Analytics.track({
      name: "nl_interview_completed",
      userId,
      moduleKey: MODULE_KEY,
      props: { progress_pct: 100, applicable: state.progress.totalApplicable },
    });
  }, [userId, state.session, state.progress]);

  return {
    ...state,
    submitAnswer,
    skipQuestion,
    pause,
    complete,
    ensureSession,
  };
}
