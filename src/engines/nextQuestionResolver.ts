// ============================================================
// ADVANCED NEXT QUESTION RESOLVER
// FULLY DYNAMIC AI CONVERSATIONAL ENGINE
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type {
  ConversationState,
  NextQuestionResult,
  PropertyFlowConfig,
  FieldDefinition,
  QuestionDefinition,
} from "./types";

import { createRuleEngine } from "./ruleEngine";

// ============================================================
// RESOLVER INTERFACE
// ============================================================

export interface NextQuestionResolver {
  resolve(state: ConversationState): NextQuestionResult;

  progress(state: ConversationState): {
    filled: number;
    total: number;
  };

  getCandidateFields(state: ConversationState): FieldDefinition[];
}

// ============================================================
// HELPERS
// ============================================================

function isFilled(value: unknown): boolean {
  // ==========================================================
  // undefined / null
  // ==========================================================

  if (value === undefined || value === null) {
    return false;
  }

  // ==========================================================
  // STRING
  // ==========================================================

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    // --------------------------------------------------------
    // skip-like values
    // --------------------------------------------------------

    if (
      normalized === "" ||
      normalized === "skip" ||
      normalized === "skipped" ||
      normalized === "na" ||
      normalized === "n/a"
    ) {
      return false;
    }

    return true;
  }

  // ==========================================================
  // ARRAYS
  // ==========================================================

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // ==========================================================
  // OBJECTS
  // ==========================================================

  if (typeof value === "object") {
    return Object.keys(value as object).length > 0;
  }

  return true;
}

// ============================================================
// GET FIELD PRIORITY
// ============================================================

function getFieldPriority(field: FieldDefinition): number {
  return field.priority || 9999;
}

// ============================================================
// CREATE RESOLVER
// ============================================================

export function createNextQuestionResolver(flow: PropertyFlowConfig): NextQuestionResolver {
  const rules = createRuleEngine(flow);

  return {
    // ======================================================
    // GET CANDIDATE FIELDS
    // ======================================================

    getCandidateFields(state) {
      const candidates: FieldDefinition[] = [];

      for (const [fieldId, field] of Object.entries(flow.fields)) {
        // --------------------------------------------------
        // FIELD EXISTS
        // --------------------------------------------------

        if (!field) {
          continue;
        }

        // --------------------------------------------------
        // VISIBILITY
        // --------------------------------------------------

        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) {
          continue;
        }

        // --------------------------------------------------
        // SKIPPED
        // --------------------------------------------------

        const persistSkipped = flow.ai?.persistSkippedFields !== false;

        if (persistSkipped && state.skipped.includes(fieldId)) {
          continue;
        }

        // --------------------------------------------------
        // REJECTED
        // --------------------------------------------------

        if (state.rejected?.includes(fieldId)) {
          continue;
        }

        // --------------------------------------------------
        // INVALIDATED
        // --------------------------------------------------

        if (state.invalidated?.includes(fieldId)) {
          continue;
        }

        // --------------------------------------------------
        // ANSWERED
        // --------------------------------------------------

        const value = state.answers[fieldId];

        if (isFilled(value)) {
          continue;
        }

        // --------------------------------------------------
        // EXTRACTED
        // extracted only skipped if actual value exists
        // --------------------------------------------------

        if (state.extracted.includes(fieldId) && isFilled(value)) {
          continue;
        }

        candidates.push({
          ...field,
          id: fieldId,
        });
      }

      // ====================================================
      // SORT BY PRIORITY
      // ====================================================

      return candidates.sort((a, b) => getFieldPriority(a) - getFieldPriority(b));
    },

    // ======================================================
    // RESOLVE NEXT QUESTION
    // ======================================================

    resolve(state) {
      // ====================================================
      // CLEANUP HIDDEN FIELDS FIRST
      // ====================================================

      const cleanedState = rules.cleanupHiddenFields(state);

      // ====================================================
      // GET CANDIDATES
      // ====================================================

      const candidateFields = this.getCandidateFields(cleanedState);

      // ====================================================
      // PROGRESS
      // ====================================================

      const progress = this.progress(cleanedState);

      // ====================================================
      // COMPLETED
      // ====================================================

      if (candidateFields.length === 0) {
        return {
          field: null,

          question: null,

          done: true,

          progress,
        };
      }

      // ====================================================
      // NEXT FIELD
      // ====================================================

      const field = candidateFields[0];

      const fieldId = field.id || "";

      // ====================================================
      // EXPLICIT QUESTION
      // ====================================================

      const explicitQuestion = flow.questions?.[fieldId];

      // ====================================================
      // MULTI SELECT
      // ====================================================

      const isMulti = field.type === "multi_select" || field.input === "multi" || field.input === "multi_select";

      // ====================================================
      // BUILD QUESTION
      // ====================================================

      const question: QuestionDefinition = explicitQuestion || {
        fieldId,

        prompt: field.question || field.label || `Please provide ${fieldId.replace(/_/g, " ")}`,

        helper: field.helperText || field.placeholder,

        quickReplies: field.options || [],

        multiSelect: isMulti,

        aiSuggestionHint: field.aiSuggestionHint,

        smartSuggestions: field.smartSuggestions,

        units: field.units || [],
      };

      // ====================================================
      // RETURN RESULT
      // ====================================================

      return {
        field,

        question,

        done: false,

        progress,
      };
    },

    // ======================================================
    // PROGRESS
    // ======================================================

    progress(state) {
      let total = 0;

      let filled = 0;

      for (const [fieldId, field] of Object.entries(flow.fields)) {
        // --------------------------------------------------
        // FIELD EXISTS
        // --------------------------------------------------

        if (!field) {
          continue;
        }

        // --------------------------------------------------
        // VISIBILITY
        // --------------------------------------------------

        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) {
          continue;
        }

        // --------------------------------------------------
        // SKIPPED
        // --------------------------------------------------

        if (state.skipped.includes(fieldId)) {
          continue;
        }

        // --------------------------------------------------
        // REJECTED
        // --------------------------------------------------

        if (state.rejected?.includes(fieldId)) {
          continue;
        }

        total++;

        const value = state.answers[fieldId];

        if (isFilled(value)) {
          filled++;
        }
      }

      return {
        filled,
        total,
      };
    },
  };
}
