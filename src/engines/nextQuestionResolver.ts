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

export interface NextQuestionResolver {
  resolve(state: ConversationState): NextQuestionResult;

  progress(state: ConversationState): {
    filled: number;
    total: number;
  };
}

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

      for (const fieldId of flow.order) {
        const field = flow.fields[fieldId];

        if (!field) continue;

        // ==================================================
        // RULE ENGINE VISIBILITY
        // ==================================================

        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) continue;

        total++;

        // ==================================================
        // SKIP ANSWERED
        // ==================================================

        const alreadyAnswered = answers[fieldId] !== undefined && answers[fieldId] !== null && answers[fieldId] !== "";

        if (alreadyAnswered) {
          filled++;
          continue;
        }

        // ==================================================
        // SKIP EXTRACTED
        // ==================================================

        if (state.extracted.includes(fieldId)) {
          filled++;
          continue;
        }

        // ==================================================
        // SKIP USER SKIPPED
        // ==================================================

        if (state.skipped.includes(fieldId)) {
          continue;
        }

        // ==================================================
        // GET QUESTION
        // ==================================================

        const question = flow.questions?.[fieldId];

        // ==================================================
        // RETURN NEXT FIELD
        // ==================================================

        return {
          field,

          question: question || {
            fieldId,

            prompt: field.question || `Please provide ${field.label}`,
          },

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
        const relevant = rules.isFieldRelevant(fieldId, state);

        if (!relevant) continue;

        total++;

        const value = state.answers[fieldId];

        const isFilled = value !== undefined && value !== null && value !== "";

        if (isFilled) {
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
