// ============================================================
// Next Question Resolver
//
// Responsibility:
//   - Walk flow.order in strict sequence
//   - Apply visibility rules
//   - Skip answered fields
//   - Skip extracted fields
//   - Skip explicitly skipped fields
//   - Return next deterministic question
//
// AI NEVER decides workflow.
// ============================================================

import type { ConversationState, NextQuestionResult, PropertyFlowConfig } from "./types";

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
}

// ============================================================
// HELPERS
// ============================================================

function isFilled(value: unknown): boolean {
  // ----------------------------------------------------------
  // undefined / null
  // ----------------------------------------------------------

  if (value === undefined || value === null) {
    return false;
  }

  // ----------------------------------------------------------
  // empty string
  // ----------------------------------------------------------

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    // IMPORTANT:
    // treat skip keywords as EMPTY
    // so engine does not save them
    // as actual answers
    // ------------------------------------------------

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

  // ----------------------------------------------------------
  // arrays
  // ----------------------------------------------------------

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // ----------------------------------------------------------
  // objects
  // ----------------------------------------------------------

  if (typeof value === "object") {
    return Object.keys(value as object).length > 0;
  }

  return true;
}

// ============================================================
// CREATE RESOLVER
// ============================================================

export function createNextQuestionResolver(flow: PropertyFlowConfig): NextQuestionResolver {
  const rules = createRuleEngine(flow);

  return {
    // ======================================================
    // RESOLVE NEXT QUESTION
    // ======================================================

    resolve(state) {
      const answers = state.answers || {};

      let total = 0;

      let filled = 0;

      // ====================================================
      // FIRST PASS
      // CALCULATE PROGRESS
      // ====================================================

      for (const fieldId of flow.order) {
        const field = flow.fields[fieldId];

        if (!field) {
          continue;
        }

        const relevant = rules.isFieldRelevant(fieldId, state);

        // ------------------------------------------------
        // ignore hidden fields
        // ------------------------------------------------

        if (!relevant) {
          continue;
        }

        // ------------------------------------------------
        // ignore skipped fields
        // ------------------------------------------------

        if (state.skipped.includes(fieldId)) {
          continue;
        }

        total++;

        const value = answers[fieldId];

        if (isFilled(value)) {
          filled++;
        }
      }

      // ====================================================
      // SECOND PASS
      // FIND NEXT QUESTION
      // ====================================================

      for (const fieldId of flow.order) {
        const field = flow.fields[fieldId];

        if (!field) {
          continue;
        }

        // ==================================================
        // VISIBILITY
        // ==================================================

        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) {
          continue;
        }

        // ==================================================
        // SKIP USER SKIPPED
        // ==================================================

        const persistSkipped = flow.ai?.persistSkippedFields !== false;

        if (persistSkipped && state.skipped.includes(fieldId)) {
          continue;
        }

        // ==================================================
        // SKIP ANSWERED
        // ==================================================

        const value = answers[fieldId];

        if (isFilled(value)) {
          continue;
        }

        // ==================================================
        // SKIP EXTRACTED
        // ==================================================

        if (state.extracted.includes(fieldId)) {
          continue;
        }

        // ==================================================
        // BUILD QUESTION
        // ==================================================

        const explicit = flow.questions?.[fieldId];

        const isMulti =
          (field as any).type === "multi_select" || field.input === "multi" || field.input === "multi_select";

        const question = explicit || {
          fieldId,

          prompt: field.question || field.label || `Please provide ${fieldId.replace(/_/g, " ")}`,

          helper: (field as any).placeholder,

          quickReplies: field.options || [],

          multiSelect: isMulti,

          aiSuggestionHint: (field as any).aiSuggestionHint,

          smartSuggestions: (field as any).smartSuggestions,

          units: (field as any).units || [],
        };

        // ==================================================
        // RETURN NEXT QUESTION
        // ==================================================

        return {
          field,

          question,

          done: false,

          progress: {
            filled,
            total,
          },
        };
      }

      // ====================================================
      // FLOW COMPLETED
      // ====================================================

      return {
        field: null,

        question: null,

        done: true,

        progress: {
          filled,
          total,
        },
      };
    },

    // ======================================================
    // PROGRESS
    // ======================================================

    progress(state) {
      let total = 0;

      let filled = 0;

      for (const fieldId of flow.order) {
        const field = flow.fields[fieldId];

        if (!field) {
          continue;
        }

        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) {
          continue;
        }

        // ----------------------------------------------
        // ignore skipped
        // ----------------------------------------------

        if (state.skipped.includes(fieldId)) {
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
