// ============================================================
// Conversation Engine
//
// Responsibility:
//   - Own ConversationState lifecycle
//   - Apply user answers
//   - Apply extracted AI values
//   - Handle corrections
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

  // crore
  if (/cr(ore)?s?$/.test(s)) {
    return num * 10000000;
  }

  // lakh
  if (/lakhs?$|lacs?$/.test(s) || s.endsWith("l")) {
    return num * 100000;
  }

  // thousand
  if (/thousands?$/.test(s) || s.endsWith("k")) {
    return num * 1000;
  }

  return num;
}

// ============================================================
// PRICE FORMATTER
// ============================================================

export function formatIndianPrice(value: number): string {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)} Crore`;
  }

  if (value >= 100000) {
    return `${(value / 100000).toFixed(2)} Lakh`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} Thousand`;
  }

  return String(value);
}

// ============================================================
// SMART AI SUGGESTIONS
// ============================================================

export function generateSuggestions(field: any, input: string): string[] {
  if (!input) {
    return [];
  }

  const value = Number(input);

  if (!Number.isFinite(value)) {
    return [];
  }

  const type = field?.type;

  // ==========================================================
  // PRICE SUGGESTIONS
  // ==========================================================

  if (type === "price" || type === "rental_price" || type === "price_per_unit") {
    const formatted = formatIndianPrice(value);

    const suggestions = [formatted];

    const units = field?.units || ["Sqft", "Sq Yard", "Acre", "Gunta"];

    if (type === "price_per_unit") {
      for (const unit of units) {
        suggestions.push(`₹${formatted}/${unit}`);
      }
    }

    if (type === "rental_price") {
      suggestions.push(`₹${formatted}/Month`);

      suggestions.push(`₹${formatted}/Week`);

      suggestions.push(`₹${formatted}/Year`);
    }

    return suggestions;
  }

  // ==========================================================
  // LAND / AREA SUGGESTIONS
  // ==========================================================

  if (type === "measurement" || type === "measurement_unit") {
    const units = field?.units || ["Sqft", "Sq Yard", "Acre", "Gunta", "Cent"];

    return units.map((unit: string) => `${value} ${unit}`);
  }

  return [];
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

  // ==========================================================
  // INTERNAL RESET HELPER
  // ==========================================================

  function resetDependentFields(fieldId: string) {
    const resetFields = rules.fieldsToResetOnChange(fieldId, flow);

    for (const resetField of resetFields) {
      delete state.answers[resetField];

      state.skipped = state.skipped.filter((id) => id !== resetField);

      state.extracted = state.extracted.filter((id) => id !== resetField);
    }
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
      // EMPTY / SKIP DETECTION
      // ====================================================

      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        // ------------------------------------------------
        // skip keywords
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

      const fieldKind = (fieldDef as any)?.type || fieldDef?.input;

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
      // REMOVE FROM SKIPPED
      // ====================================================

      state.skipped = state.skipped.filter((id) => id !== fieldId);

      // ====================================================
      // REMOVE FROM EXTRACTED
      // ====================================================

      state.extracted = state.extracted.filter((id) => id !== fieldId);

      // ====================================================
      // RESET DEPENDENT FIELDS
      // ====================================================

      if (previousValue !== value) {
        resetDependentFields(fieldId);
      }

      // ====================================================
      // UPDATE CURRENT FIELD
      // ====================================================

      state.currentFieldId = fieldId;
    },

    // ======================================================
    // APPLY AI EXTRACTED VALUES
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

        if (isCorrection && existingValue !== value) {
          resetDependentFields(fieldId);
        }

        state.skipped = state.skipped.filter((id) => id !== fieldId);
      }
    },

    // ======================================================
    // SKIP FIELD
    // ======================================================

    skipField(fieldId) {
      if (!state.skipped.includes(fieldId)) {
        state.skipped.push(fieldId);
      }

      delete state.answers[fieldId];
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
