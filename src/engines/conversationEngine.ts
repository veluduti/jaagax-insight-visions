// ============================================================
// Conversation Engine
//
// Responsibility:
//   - Own ConversationState lifecycle
//   - Apply user answers
//   - Apply extracted AI values
//   - Handle field skipping
//   - Handle rule-based resets
//   - Delegate next question resolution
//
// Deterministic:
//   AI NEVER controls workflow order.
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

// ============================================================
// ENGINE INTERFACE
// ============================================================

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

// ============================================================
// INITIAL STATE
// ============================================================

export function createInitialState(category: PropertyCategory | null = null): ConversationState {
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

// ============================================================
// CREATE ENGINE
// ============================================================

export function createConversationEngine(
  category: PropertyCategory,
  initial?: Partial<ConversationState>,
): ConversationEngine {
  let flow = getPropertyFlow(category);

  let state: ConversationState = {
    ...createInitialState(category),

    ...initial,
  };

  const resolver = createNextQuestionResolver(flow);

  const rules = createRuleEngine(flow);

  return {
    // ======================================================
    // FLOW
    // ======================================================

    get flow() {
      return flow;
    },

    // ======================================================
    // GET STATE
    // ======================================================

    getState() {
      return state;
    },

    // ======================================================
    // CHANGE CATEGORY
    // ======================================================

    setCategory(nextCategory) {
      flow = getPropertyFlow(nextCategory);

      state = {
        ...createInitialState(nextCategory),
      };
    },

    // ======================================================
    // APPLY USER ANSWER
    // ======================================================

    applyAnswer(fieldId, value) {
      state.answers[fieldId] = value;

      // ====================================================
      // REMOVE FROM SKIPPED
      // ====================================================

      state.skipped = state.skipped.filter((id) => id !== fieldId);

      // ====================================================
      // RESET DEPENDENT FIELDS
      // ====================================================

      const resetFields = rules.fieldsToResetOnChange(fieldId, flow);

      for (const resetField of resetFields) {
        delete state.answers[resetField];
      }

      // ====================================================
      // UPDATE CURRENT FIELD
      // ====================================================

      state.currentFieldId = fieldId;
    },

    // ======================================================
    // APPLY AI-EXTRACTED VALUES
    // ======================================================

    applyExtractedFields(values) {
      for (const [fieldId, value] of Object.entries(values)) {
        state.answers[fieldId] = value;

        // ================================================
        // TRACK EXTRACTED
        // ================================================

        if (!state.extracted.includes(fieldId)) {
          state.extracted.push(fieldId);
        }
      }
    },

    // ======================================================
    // SKIP FIELD
    // ======================================================

    skipField(fieldId) {
      if (!state.skipped.includes(fieldId)) {
        state.skipped.push(fieldId);
      }
    },

    // ======================================================
    // APPEND CHAT MESSAGE
    // ======================================================

    appendMessage(message) {
      state.messages.push({
        ...message,

        createdAt: new Date().toISOString(),
      });
    },

    // ======================================================
    // NEXT QUESTION
    // ======================================================

    next() {
      const result = resolver.resolve(state);

      state.done = result.done;

      state.currentFieldId = result.field?.id || null;

      return result;
    },

    // ======================================================
    // RESET ENGINE
    // ======================================================

    reset() {
      state = createInitialState(category);
    },
  };
}
