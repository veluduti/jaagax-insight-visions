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

import type { ConditionalRule, ConditionGroup, ConversationState, PropertyFlowConfig, FieldCondition } from "./types";

// ============================================================
// RULE ENGINE INTERFACE
// ============================================================

export interface RuleEngine {
  isFieldRelevant(fieldId: string, state: ConversationState): boolean;

  evaluateCondition(condition: ConditionGroup, state: ConversationState): boolean;

  fieldsToResetOnChange(fieldId: string, flow: PropertyFlowConfig): string[];
}

// ============================================================
// SINGLE CONDITION EVALUATOR
// ============================================================

function evaluateSingleCondition(condition: FieldCondition, state: ConversationState): boolean {
  const currentValue = state.answers[condition.fieldId];

  switch (condition.operator) {
    case "eq":
      return currentValue === condition.value;

    case "neq":
      return currentValue !== condition.value;

    case "exists":
      return currentValue !== undefined && currentValue !== null && currentValue !== "";

    case "missing":
      return currentValue === undefined || currentValue === null || currentValue === "";

    case "truthy":
      return Boolean(currentValue);

    case "falsy":
      return !currentValue;

    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(currentValue) : false;

    case "notIn":
      return Array.isArray(condition.value) ? !condition.value.includes(currentValue) : false;

    case "gt":
      return Number(currentValue) > Number(condition.value);

    case "lt":
      return Number(currentValue) < Number(condition.value);

    default:
      return true;
  }
}

// ============================================================
// CREATE RULE ENGINE
// ============================================================

export function createRuleEngine(flow: PropertyFlowConfig): RuleEngine {
  return {
    // ======================================================
    // FIELD RELEVANCE
    // ======================================================

    isFieldRelevant(fieldId, state) {
      const field = flow.fields[fieldId];

      if (!field) {
        return false;
      }

      // ====================================================
      // visibleIf SUPPORT
      // ====================================================

      if (field.visibleIf) {
        const visible = Object.entries(field.visibleIf).every(([dependency, values]) => {
          const current = state.answers[dependency];

          return values.includes(String(current));
        });

        if (!visible) {
          return false;
        }
      }

      // ====================================================
      // CONDITIONAL RULES
      // ====================================================

      const matchingRules = flow.rules.filter((rule) => rule.fieldId === fieldId);

      for (const rule of matchingRules) {
        if (!rule.when) {
          continue;
        }

        const valid = this.evaluateCondition(rule.when, state);

        if (!valid) {
          return false;
        }
      }

      return true;
    },

    // ======================================================
    // CONDITION EVALUATOR
    // ======================================================

    evaluateCondition(condition, state) {
      // ====================================================
      // ALL CONDITIONS
      // ====================================================

      if ("all" in condition) {
        return condition.all.every((singleCondition) => evaluateSingleCondition(singleCondition, state));
      }

      // ====================================================
      // ANY CONDITIONS
      // ====================================================

      if ("any" in condition) {
        return condition.any.some((singleCondition) => evaluateSingleCondition(singleCondition, state));
      }

      // ====================================================
      // SINGLE CONDITION
      // ====================================================

      return evaluateSingleCondition(condition, state);
    },

    // ======================================================
    // FIELD RESETS
    // ======================================================

    fieldsToResetOnChange(fieldId, flow) {
      const resets = new Set<string>();

      for (const rule of flow.rules) {
        if (rule.fieldId !== fieldId) {
          continue;
        }

        if (!rule.resets?.length) {
          continue;
        }

        for (const fieldToReset of rule.resets) {
          resets.add(fieldToReset);
        }
      }

      return Array.from(resets);
    },
  };
}

// ============================================================
// RE-EXPORT TYPES
// ============================================================

export type { ConditionalRule };
