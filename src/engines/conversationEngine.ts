// ============================================================
// ADVANCED CONVERSATION ENGINE
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type {
  ConversationMessage,
  ConversationState,
  NextQuestionResult,
  PropertyCategory,
  PropertyFlowConfig,
  FieldState,
} from "./types";

import { getPropertyFlow } from "@/config/propertyFlows";

import { createNextQuestionResolver } from "./nextQuestionResolver";

import { createRuleEngine } from "./ruleEngine";

// ============================================================
// PRICE NORMALIZATION
// ============================================================

function normalizePriceString(input: string): number {
  const s = String(input)
    .trim()
    .toLowerCase()
    .replace(/[₹,\s]/g, "");

  if (!s) {
    return NaN;
  }

  const numMatch = s.match(/^(\d+(?:\.\d+)?)/);

  if (!numMatch) {
    return NaN;
  }

  const num = parseFloat(numMatch[1]);

  if (!Number.isFinite(num)) {
    return NaN;
  }

  if (/cr(ore)?s?$/.test(s)) {
    return num * 10000000;
  }

  if (/lakhs?$|lacs?$/.test(s) || s.endsWith("l")) {
    return num * 100000;
  }

  if (/thousands?$/.test(s) || s.endsWith("k")) {
    return num * 1000;
  }

  return num;
}

// ============================================================
// ENGINE INTERFACE
// ============================================================

export interface ConversationEngine {
  readonly flow: PropertyFlowConfig;

  getState(): ConversationState;

  setCategory(category: PropertyCategory): void;

  applyAnswer(fieldId: string, value: unknown): void;

  applyExtractedFields(
    values: Record<string, unknown>,
    options?: {
      overwrite?: boolean;
      isCorrection?: boolean;
    },
  ): void;

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

    fieldStates: {},

    skipped: [],

    extracted: [],

    invalidated: [],

    rejected: [],

    currentFieldId: null,

    messages: [],

    done: false,

    memory: {},
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

  // ==========================================================
  // SET FIELD STATE
  // ==========================================================

  function setFieldState(fieldId: string, fieldState: FieldState) {
    if (!state.fieldStates) {
      state.fieldStates = {};
    }

    state.fieldStates[fieldId] = fieldState;
  }

  // ==========================================================
  // RESET DEPENDENT FIELDS
  // ==========================================================

  function resetDependentFields(fieldId: string) {
    const resetFields = rules.fieldsToResetOnChange(fieldId, flow);

    for (const resetField of resetFields) {
      delete state.answers[resetField];

      state.skipped = state.skipped.filter((id) => id !== resetField);

      state.extracted = state.extracted.filter((id) => id !== resetField);

      state.invalidated = state.invalidated?.filter((id) => id !== resetField) || [];

      setFieldState(resetField, "invalidated");
    }
  }

  // ==========================================================
  // CLEANUP HIDDEN FIELDS
  // ==========================================================

  function cleanupHiddenFields() {
    state = rules.cleanupHiddenFields(state);
  }

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
      // ====================================================
      // EMPTY
      // ====================================================

      if (value === undefined || value === null) {
        return;
      }

      // ====================================================
      // STRING HANDLING
      // ====================================================

      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        // ------------------------------------------------
        // SKIP
        // ------------------------------------------------

        if (normalized === "skip" || normalized === "skipped" || normalized === "na" || normalized === "n/a") {
          this.skipField(fieldId);

          return;
        }

        if (normalized === "") {
          return;
        }
      }

      const previousValue = state.answers[fieldId];

      // ====================================================
      // PRICE NORMALIZATION
      // ====================================================

      const fieldDef = flow.fields[fieldId];

      const fieldKind = fieldDef?.type || fieldDef?.input;

      const isPriceField =
        flow.ai?.autoNormalizePricingUnits !== false &&
        (fieldKind === "price" || fieldKind === "rental_price" || fieldKind === "price_per_unit");

      if (isPriceField && typeof value === "string") {
        const normalized = normalizePriceString(value);

        if (Number.isFinite(normalized) && normalized > 0) {
          value = normalized;
        }
      }

      // ====================================================
      // APPLY ANSWER
      // ====================================================

      state.answers[fieldId] = value;

      // ====================================================
      // FIELD STATE
      // ====================================================

      setFieldState(fieldId, "answered");

      // ====================================================
      // REMOVE SKIPPED
      // ====================================================

      state.skipped = state.skipped.filter((id) => id !== fieldId);

      // ====================================================
      // REMOVE EXTRACTED
      // ====================================================

      state.extracted = state.extracted.filter((id) => id !== fieldId);

      // ====================================================
      // REMOVE INVALIDATED
      // ====================================================

      state.invalidated = state.invalidated?.filter((id) => id !== fieldId) || [];

      // ====================================================
      // RESET DEPENDENCIES
      // ====================================================

      if (previousValue !== value) {
        resetDependentFields(fieldId);
      }

      // ====================================================
      // CLEANUP HIDDEN
      // ====================================================

      cleanupHiddenFields();

      // ====================================================
      // CURRENT FIELD
      // ====================================================

      state.currentFieldId = fieldId;
    },

    // ======================================================
    // APPLY EXTRACTED VALUES
    // ======================================================

    applyExtractedFields(values, options = {}) {
      const { overwrite = true, isCorrection = false } = options;

      for (const [fieldId, value] of Object.entries(values)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }

        const existingValue = state.answers[fieldId];

        if (!overwrite && existingValue !== undefined) {
          continue;
        }

        state.answers[fieldId] = value;

        if (!state.extracted.includes(fieldId)) {
          state.extracted.push(fieldId);
        }

        setFieldState(fieldId, "inferred");

        if (isCorrection && existingValue !== value) {
          resetDependentFields(fieldId);
        }

        state.skipped = state.skipped.filter((id) => id !== fieldId);
      }

      cleanupHiddenFields();
    },

    // ======================================================
    // SKIP FIELD
    // ======================================================

    skipField(fieldId) {
      if (!state.skipped.includes(fieldId)) {
        state.skipped.push(fieldId);
      }

      delete state.answers[fieldId];

      setFieldState(fieldId, "skipped");
    },

    // ======================================================
    // APPEND MESSAGE
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
      cleanupHiddenFields();

      const result = resolver.resolve(state);

      state.done = result.done;

      state.currentFieldId = result.field?.id || null;

      return result;
    },

    // ======================================================
    // RESET
    // ======================================================

    reset() {
      state = createInitialState(category);
    },
  };
}
