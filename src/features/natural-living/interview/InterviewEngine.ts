/**
 * InterviewEngine — pure logic for the adaptive AI Interview.
 *
 * Given a question bank, prior answers, selected user goals, and a set of
 * skipped question codes, decides:
 *   - which questions apply (via `applies_when` predicate)
 *   - which is the next unanswered question
 *   - overall progress metrics (0..1, remaining count, ETA)
 *
 * No React, no Supabase — safe to unit test and reuse from server or client.
 */

export type QuestionType = "text" | "single_choice" | "multi_choice" | "scale" | "number";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  code: string;
  question: string;
  helper_text?: string | null;
  question_type: QuestionType;
  options: QuestionOption[] | { min: number; max: number } | Record<string, never>;
  applies_when: any;
  weight: number;
  category: string;
  sort_order: number;
  is_required: boolean;
  tags: string[];
  metadata: any;
}

export interface EngineInput {
  questions: Question[];
  answers: Record<string, unknown>;
  skipped: string[];
  goalCodes: string[];
}

export interface Progress {
  totalApplicable: number;
  answered: number;
  skipped: number;
  remaining: number;
  requiredRemaining: number;
  pct: number; // 0..100
  etaMinutes: number;
  currentCategory: string | null;
}

export function isApplicable(q: Question, answers: Record<string, unknown>, goalCodes: string[]): boolean {
  const cond = q.applies_when;
  if (!cond || typeof cond !== "object" || Array.isArray(cond)) return true;

  const goalsAny: string[] | undefined = cond.goals_any;
  if (Array.isArray(goalsAny) && goalsAny.length) {
    if (!goalsAny.some((g) => goalCodes.includes(g))) return false;
  }
  const goalsAll: string[] | undefined = cond.goals_all;
  if (Array.isArray(goalsAll) && goalsAll.length) {
    if (!goalsAll.every((g) => goalCodes.includes(g))) return false;
  }
  const ansRule = cond.answers;
  if (ansRule && typeof ansRule === "object") {
    for (const [field, allowed] of Object.entries(ansRule)) {
      const v = answers[field];
      if (v == null) return false;
      const list = Array.isArray(allowed) ? allowed : [allowed];
      if (!list.includes(v as any)) return false;
    }
  }
  const notRule = cond.not_answers;
  if (notRule && typeof notRule === "object") {
    for (const [field, blocked] of Object.entries(notRule)) {
      const v = answers[field];
      if (v == null) continue;
      const list = Array.isArray(blocked) ? blocked : [blocked];
      if (list.includes(v as any)) return false;
    }
  }
  return true;
}

export function fieldCodeOf(q: Question): string {
  return (q.metadata && q.metadata.field_code) || q.code;
}

export function applicableQuestions(input: EngineInput): Question[] {
  return input.questions.filter((q) => isApplicable(q, input.answers, input.goalCodes));
}

export function nextQuestion(input: EngineInput): Question | null {
  const sorted = [...input.questions].sort((a, b) => a.sort_order - b.sort_order);
  for (const q of sorted) {
    if (!isApplicable(q, input.answers, input.goalCodes)) continue;
    const key = fieldCodeOf(q);
    if (input.answers[key] != null) continue;
    if (input.skipped.includes(q.code)) continue;
    return q;
  }
  return null;
}

export function computeProgress(input: EngineInput): Progress {
  const applicable = applicableQuestions(input);
  const answered = applicable.filter((q) => input.answers[fieldCodeOf(q)] != null).length;
  const skipped = applicable.filter((q) => input.skipped.includes(q.code) && input.answers[fieldCodeOf(q)] == null).length;
  const total = applicable.length;
  const done = answered + skipped;
  const remaining = Math.max(0, total - done);
  const requiredRemaining = applicable.filter(
    (q) => q.is_required && input.answers[fieldCodeOf(q)] == null && !input.skipped.includes(q.code),
  ).length;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const etaMinutes = Math.max(0, Math.round(remaining * 0.4));
  const nxt = nextQuestion(input);
  return {
    totalApplicable: total,
    answered,
    skipped,
    remaining,
    requiredRemaining,
    pct,
    etaMinutes,
    currentCategory: nxt?.category ?? null,
  };
}

export function suggestionsFor(q: Question): string[] {
  const raw = q.metadata?.suggestions;
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === "string");
  if (Array.isArray(q.options)) return (q.options as QuestionOption[]).map((o) => o.label);
  return [];
}
