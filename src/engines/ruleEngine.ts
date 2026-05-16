// ============================================================
// Rule Engine
//
// Responsibility:
//   - Evaluate ConditionalRule[] against ConversationState
//   - Determine field visibility
//   - Handle dynamic conditional logic
//   - Reset dependent fields
//
// Deterministic:
//   AI NEVER controls rules.
// ============================================================

import type {
ConditionalRule,
ConditionGroup,
ConversationState,
PropertyFlowConfig,
FieldCondition,
} from "./types";

// ============================================================
// RULE ENGINE INTERFACE
// ============================================================

export interface RuleEngine {
isFieldRelevant(
fieldId: string,
state: ConversationState,
): boolean;

evaluateCondition(
condition: ConditionGroup,
state: ConversationState,
): boolean;

fieldsToResetOnChange(
fieldId: string,
flow: PropertyFlowConfig,
): string[];
}

// ============================================================
// NORMALIZE VALUE
// ============================================================

function normalizeValue(
value: unknown,
): unknown {
if (
typeof value === "string"
) {
return value.trim();
}

return value;
}

// ============================================================
// SINGLE CONDITION EVALUATOR
// ============================================================

function evaluateSingleCondition(
condition: FieldCondition,
state: ConversationState,
): boolean {
const currentValue =
normalizeValue(
state.answers[
condition.fieldId
],
);

const expectedValue =
normalizeValue(
condition.value,
);

switch (condition.operator) {
// ======================================================
// EQUAL
// ======================================================

case "eq":
  return (
    currentValue ===
    expectedValue
  );

// ======================================================
// NOT EQUAL
// ======================================================

case "neq":
  return (
    currentValue !==
    expectedValue
  );

// ======================================================
// EXISTS
// ======================================================

case "exists":
  return (
    currentValue !==
      undefined &&
    currentValue !== null &&
    currentValue !== ""
  );

// ======================================================
// MISSING
// ======================================================

case "missing":
  return (
    currentValue ===
      undefined ||
    currentValue === null ||
    currentValue === ""
  );

// ======================================================
// TRUTHY
// ======================================================

case "truthy":
  return Boolean(
    currentValue,
  );

// ======================================================
// FALSY
// ======================================================

case "falsy":
  return !currentValue;

// ======================================================
// IN ARRAY
// ======================================================

case "in":
  return Array.isArray(
    expectedValue,
  )
    ? expectedValue.includes(
        currentValue,
      )
    : false;

// ======================================================
// NOT IN ARRAY
// ======================================================

case "notIn":
  return Array.isArray(
    expectedValue,
  )
    ? !expectedValue.includes(
        currentValue,
      )
    : false;

// ======================================================
// GREATER THAN
// ======================================================

case "gt":
  return (
    Number(currentValue) >
    Number(expectedValue)
  );

// ======================================================
// LESS THAN
// ======================================================

case "lt":
  return (
    Number(currentValue) <
    Number(expectedValue)
  );

default:
  return true;

}
}

// ============================================================
// CREATE RULE ENGINE
// ============================================================

export function createRuleEngine(
flow: PropertyFlowConfig,
): RuleEngine {
return {
// ======================================================
// FIELD VISIBILITY
// ======================================================

isFieldRelevant(
  fieldId,
  state,
) {
  const field =
    flow.fields[fieldId];

  if (!field) {
    return false;
  }

  // ====================================================
  // visibleIf SUPPORT
  // ====================================================

  if (
    field.visibleIf
  ) {
    const visible =
      Object.entries(
        field.visibleIf,
      ).every(
        ([
          dependency,
          values,
        ]) => {
          const current =
            state.answers[
              dependency
            ];

          if (
            current ===
              undefined ||
            current ===
              null
          ) {
            return false;
          }

          const cur = String(current);
          if (Array.isArray(values)) return values.includes(cur);
          if (values.notIn && values.notIn.includes(cur)) return false;
          if (values.in && !values.in.includes(cur)) return false;
          return true;
        },
      );

    if (!visible) {
      return false;
    }
  }

  // ====================================================
  // CONDITIONAL RULES
  // ====================================================

  const matchingRules =
    flow.rules.filter(
      (rule) =>
        rule.fieldId ===
        fieldId,
    );

  for (const rule of matchingRules) {
    if (!rule.when) {
      continue;
    }

    const valid =
      this.evaluateCondition(
        rule.when,
        state,
      );

    if (!valid) {
      return false;
    }
  }

  return true;
},

// ======================================================
// CONDITION EVALUATOR
// ======================================================

evaluateCondition(
  condition,
  state,
) {
  // ====================================================
  // ALL CONDITIONS
  // ====================================================

  if (
    "all" in condition
  ) {
    return condition.all.every(
      (
        singleCondition,
      ) =>
        evaluateSingleCondition(
          singleCondition,
          state,
        ),
    );
  }

  // ====================================================
  // ANY CONDITIONS
  // ====================================================

  if (
    "any" in condition
  ) {
    return condition.any.some(
      (
        singleCondition,
      ) =>
        evaluateSingleCondition(
          singleCondition,
          state,
        ),
    );
  }

  // ====================================================
  // SINGLE CONDITION
  // ====================================================

  return evaluateSingleCondition(
    condition,
    state,
  );
},

// ======================================================
// DEPENDENT FIELD RESETS
// ======================================================

fieldsToResetOnChange(
  fieldId,
  flow,
) {
  const resets =
    new Set<string>();

  // ====================================================
  // EXPLICIT RULE RESETS
  // ====================================================

  for (const rule of flow.rules) {
    if (
      rule.fieldId !==
      fieldId
    ) {
      continue;
    }

    if (
      !rule.resets
        ?.length
    ) {
      continue;
    }

    for (const fieldToReset of rule.resets) {
      resets.add(
        fieldToReset,
      );
    }
  }

  // ====================================================
  // visibleIf DEPENDENCY RESETS
  // ====================================================

  for (const [
    targetFieldId,
    targetField,
  ] of Object.entries(
    flow.fields,
  )) {
    if (
      !targetField.visibleIf
    ) {
      continue;
    }

    const dependencies =
      Object.keys(
        targetField.visibleIf,
      );

    if (
      dependencies.includes(
        fieldId,
      )
    ) {
      resets.add(
        targetFieldId,
      );
    }
  }

  return Array.from(
    resets,
  );
},

};
}

// ============================================================
// RE-EXPORT TYPES
// ============================================================

export type { ConditionalRule };
