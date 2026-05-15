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
// ENGINE INTERFACE
// ============================================================

export interface ConversationEngine {
readonly flow: PropertyFlowConfig;

getState(): ConversationState;

setCategory(category: PropertyCategory): void;

applyAnswer(
fieldId: string,
value: unknown,
): void;

applyExtractedFields(
values: Record<string, unknown>,
options?: {
overwrite?: boolean;
isCorrection?: boolean;
},
): void;

skipField(fieldId: string): void;

appendMessage(
message: ConversationMessage,
): void;

next(): NextQuestionResult;

reset(): void;
}

// ============================================================
// INITIAL STATE
// ============================================================

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

// ============================================================
// CREATE ENGINE
// ============================================================

export function createConversationEngine(
category: PropertyCategory,
initial?: Partial<ConversationState>,
): ConversationEngine {
let flow =
getPropertyFlow(category);

let state: ConversationState = {
...createInitialState(category),

...initial,

};

const resolver =
createNextQuestionResolver(flow);

const rules =
createRuleEngine(flow);

// ==========================================================
// INTERNAL RESET HELPER
// ==========================================================

function resetDependentFields(
fieldId: string,
) {
const resetFields =
rules.fieldsToResetOnChange(
fieldId,
flow,
);

for (const resetField of resetFields) {
  delete state.answers[
    resetField
  ];

  state.skipped =
    state.skipped.filter(
      (id) => id !== resetField,
    );

  state.extracted =
    state.extracted.filter(
      (id) => id !== resetField,
    );
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
  flow =
    getPropertyFlow(
      nextCategory,
    );

  state = {
    ...createInitialState(
      nextCategory,
    ),
  };
},

// ======================================================
// APPLY USER ANSWER
// ======================================================

applyAnswer(fieldId, value) {
  const previousValue =
    state.answers[fieldId];

  // ====================================================
  // IGNORE EMPTY VALUES
  // ====================================================

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  // ====================================================
  // PRICING NORMALIZATION
  // (5cr -> 50000000, 50L -> 5000000, 25k -> 25000)
  // ====================================================

  const fieldDef = flow.fields[fieldId];
  const fieldKind = (fieldDef as any)?.type || fieldDef?.input;
  const isPriceField =
    flow.ai?.autoNormalizePricingUnits !== false &&
    (fieldKind === "price" ||
      fieldKind === "rental_price" ||
      fieldKind === "price_per_unit");

  if (isPriceField && typeof value === "string") {
    const normalized = normalizePriceString(value);
    if (Number.isFinite(normalized) && normalized > 0) {
      value = normalized;
    }
  }

  // ====================================================
  // APPLY ANSWER
  // ====================================================

  state.answers[fieldId] =
    value;

  // ====================================================
  // REMOVE FROM SKIPPED
  // ====================================================

  state.skipped =
    state.skipped.filter(
      (id) => id !== fieldId,
    );

  // ====================================================
  // REMOVE FROM EXTRACTED
  // ====================================================

  state.extracted =
    state.extracted.filter(
      (id) => id !== fieldId,
    );

  // ====================================================
  // RESET DEPENDENT FIELDS
  // ONLY IF VALUE CHANGED
  // ====================================================

  if (
    previousValue !== value
  ) {
    resetDependentFields(
      fieldId,
    );
  }

  // ====================================================
  // UPDATE CURRENT FIELD
  // ====================================================

  state.currentFieldId =
    fieldId;
},

// ======================================================
// APPLY AI-EXTRACTED VALUES
// ======================================================

applyExtractedFields(
  values,
  options = {},
) {
  const {
    overwrite = true,
    isCorrection = false,
  } = options;

  for (const [
    fieldId,
    value,
  ] of Object.entries(values)) {
    // ==================================================
    // SKIP EMPTY
    // ==================================================

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    const existingValue =
      state.answers[fieldId];

    // ==================================================
    // PREVENT OVERWRITE
    // ==================================================

    if (
      !overwrite &&
      existingValue !== undefined
    ) {
      continue;
    }

    // ==================================================
    // APPLY VALUE
    // ==================================================

    state.answers[fieldId] =
      value;

    // ==================================================
    // TRACK EXTRACTED
    // ==================================================

    if (
      !state.extracted.includes(
        fieldId,
      )
    ) {
      state.extracted.push(
        fieldId,
      );
    }

    // ==================================================
    // HANDLE CORRECTIONS
    // ==================================================

    if (
      isCorrection &&
      existingValue !== value
    ) {
      resetDependentFields(
        fieldId,
      );
    }

    // ==================================================
    // REMOVE FROM SKIPPED
    // ==================================================

    state.skipped =
      state.skipped.filter(
        (id) => id !== fieldId,
      );
  }
},

// ======================================================
// SKIP FIELD
// ======================================================

skipField(fieldId) {
  if (
    !state.skipped.includes(
      fieldId,
    )
  ) {
    state.skipped.push(
      fieldId,
    );
  }
},

// ======================================================
// APPEND CHAT MESSAGE
// ======================================================

appendMessage(message) {
  state.messages.push({
    ...message,

    createdAt:
      new Date().toISOString(),
  });
},

// ======================================================
// NEXT QUESTION
// ======================================================

next() {
  const result =
    resolver.resolve(state);

  state.done =
    result.done;

  state.currentFieldId =
    result.field?.id || null;

  return result;
},

// ======================================================
// RESET ENGINE
// ======================================================

reset() {
  state =
    createInitialState(
      category,
    );
},

};
}
