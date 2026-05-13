// ============================================================
// Next Question Resolver — SCAFFOLD ONLY.
//
// Responsibility:
//   - Walk PropertyFlowConfig.order in strict sequence
//   - Skip fields marked irrelevant by RuleEngine
//   - Skip already answered / extracted / explicitly skipped fields
//   - Return the next QuestionDefinition + FieldDefinition to ask
//
// Deterministic: AI never picks the next question.
// ============================================================
import type {
  ConversationState,
  NextQuestionResult,
  PropertyFlowConfig,
} from "./types";
import { createRuleEngine } from "./ruleEngine";

export interface NextQuestionResolver {
  resolve(state: ConversationState): NextQuestionResult;
  progress(state: ConversationState): { filled: number; total: number };
}

export function createNextQuestionResolver(
  flow: PropertyFlowConfig,
): NextQuestionResolver {
  const _rules = createRuleEngine(flow);

  return {
    resolve(_state) {
      // TODO: iterate flow.order, apply rules, return next field+question
      return {
        field: null,
        question: null,
        done: true,
        progress: { filled: 0, total: 0 },
      };
    },
    progress(_state) {
      // TODO: count relevant + filled
      return { filled: 0, total: 0 };
    },
  };
}
