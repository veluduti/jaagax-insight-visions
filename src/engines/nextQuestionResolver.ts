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

import type {
ConversationState,
NextQuestionResult,
PropertyFlowConfig,
} from "./types";

import { createRuleEngine } from "./ruleEngine";

// ============================================================
// RESOLVER INTERFACE
// ============================================================

export interface NextQuestionResolver {
resolve(
state: ConversationState,
): NextQuestionResult;

progress(
state: ConversationState,
): {
filled: number;
total: number;
};
}

// ============================================================
// HELPERS
// ============================================================

function isFilled(
value: unknown,
): boolean {
return !(
value === undefined ||
value === null ||
value === ""
);
}

// ============================================================
// CREATE RESOLVER
// ============================================================

export function createNextQuestionResolver(
flow: PropertyFlowConfig,
): NextQuestionResolver {
const rules =
createRuleEngine(flow);

return {
// ======================================================
// RESOLVE NEXT QUESTION
// ======================================================

```
resolve(state) {
  const answers =
    state.answers || {};

  let total = 0;

  let filled = 0;

  // ====================================================
  // FIRST PASS
  // CALCULATE PROGRESS
  // ====================================================

  for (const fieldId of flow.order) {
    const field =
      flow.fields[fieldId];

    if (!field) {
      continue;
    }

    const relevant =
      rules.isFieldRelevant(
        fieldId,
        state,
      );

    if (!relevant) {
      continue;
    }

    total++;

    const value =
      answers[fieldId];

    if (isFilled(value)) {
      filled++;
    }
  }

  // ====================================================
  // SECOND PASS
  // FIND NEXT QUESTION
  // ====================================================

  for (const fieldId of flow.order) {
    const field =
      flow.fields[fieldId];

    if (!field) {
      continue;
    }

    // ==================================================
    // VISIBILITY
    // ==================================================

    const relevant =
      rules.isFieldRelevant(
        fieldId,
        state,
      );

    if (!relevant) {
      continue;
    }

    // ==================================================
    // SKIP ANSWERED
    // ==================================================

    const value =
      answers[fieldId];

    if (isFilled(value)) {
      continue;
    }

    // ==================================================
    // SKIP EXTRACTED
    // ==================================================

    if (
      state.extracted.includes(
        fieldId,
      )
    ) {
      continue;
    }

    // ==================================================
    // SKIP USER SKIPPED
    // ==================================================

    if (
      state.skipped.includes(
        fieldId,
      )
    ) {
      continue;
    }

    // ==================================================
    // BUILD QUESTION
    // ==================================================

    const question =
      flow.questions?.[
        fieldId
      ] || {
        fieldId,

        prompt:
          field.question ||
          `Please provide ${field.label}`,
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
    const field =
      flow.fields[fieldId];

    if (!field) {
      continue;
    }

    const relevant =
      rules.isFieldRelevant(
        fieldId,
        state,
      );

    if (!relevant) {
      continue;
    }

    total++;

    const value =
      state.answers[
        fieldId
      ];

    if (isFilled(value)) {
      filled++;
    }
  }

  return {
    filled,
    total,
  };
},
```

};
}
