// ============================================================
// Conversation Engine — SCAFFOLD ONLY.
//
// Responsibility:
//   - Own the ConversationState lifecycle
//   - Apply user answers, AI-extracted fields, and skips
//   - Delegate field relevance to RuleEngine
//   - Delegate next-question selection to NextQuestionResolver
//   - Provide AI-facing hooks for:
//       * conversational wording (rephrase prompt)
//       * structured extraction from uploads/messages
//       * smart suggestion generation
//       * title / description generation
//
// Deterministic: workflow order, required fields, conditional
// logic and skip behavior are NOT decided by the AI.
// ============================================================
import type {
  ConversationMessage,
  ConversationState,
  NextQuestionResult,
  PropertyCategory,
  PropertyFlowConfig,
} from "./types";
import { getPropertyFlow } from "@/config/propertyFlows";
import { createNextQuestionResolver } from "./nextQuestionResolver";
import { createRuleEngine } from "./ruleEngine";

export interface ConversationEngine {
  readonly flow: PropertyFlowConfig;
  getState(): ConversationState;
  setCategory(category: PropertyCategory): void;
  applyAnswer(fieldId: string, value: unknown): void;
  applyExtractedFields(values: Record<string, unknown>): void;
  skipField(fieldId: string): void;
  appendMessage(message: ConversationMessage): void;
  next(): NextQuestionResult;
  reset(): void;
}

export function createInitialState(
  category: PropertyCategory | null = null,
): ConversationState {
  return {
    category,
    answers: {},
    skipped: [],
    extracted: [],
    currentFieldId: null,
    messages: [],
    done: false,
  };
}

export function createConversationEngine(
  category: PropertyCategory,
  initial?: Partial<ConversationState>,
): ConversationEngine {
  const flow = getPropertyFlow(category);
  let state: ConversationState = { ...createInitialState(category), ...initial };
  const _rules = createRuleEngine(flow);
  const resolver = createNextQuestionResolver(flow);

  return {
    flow,
    getState() {
      return state;
    },
    setCategory(_next) {
      // TODO: swap flow + reset answers that don't carry over
    },
    applyAnswer(_fieldId, _value) {
      // TODO: persist answer + clear dependent fields via rule engine
    },
    applyExtractedFields(_values) {
      // TODO: bulk-apply AI-extracted values, mark them in `extracted`
    },
    skipField(_fieldId) {
      // TODO: mark field as skipped
    },
    appendMessage(_message) {
      // TODO: push to transcript
    },
    next() {
      return resolver.resolve(state);
    },
    reset() {
      state = createInitialState(category);
    },
  };
}
