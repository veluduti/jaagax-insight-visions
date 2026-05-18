// ============================================================
// ADVANCED RULE ENGINE
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type {
  ConditionalRule,
  ConditionGroup,
  ConversationState,
  PropertyFlowConfig,
  FieldCondition,
  VisibilityRule,
} from "./types";

// ============================================================
// RULE ENGINE INTERFACE
// ============================================================

export interface RuleEngine {
  // FIELD VISIBILITY

  isFieldRelevant(fieldId: string, state: ConversationState): boolean;

  // VISIBILITY RULE EVALUATION

  evaluateVisibilityRule(rule: VisibilityRule, state: ConversationState): boolean;

  // CONDITIONAL RULE EVALUATION

  evaluateCondition(condition: ConditionGroup, state: ConversationState): boolean;

  // RESET FIELDS

  fieldsToResetOnChange(fieldId: string, flow: PropertyFlowConfig): string[];

  // GET HIDDEN FIELDS

  getHiddenFields(state: ConversationState): string[];

  // CLEANUP HIDDEN FIELDS

  cleanupHiddenFields(state: ConversationState): ConversationState;
}

// ============================================================
// NORMALIZE VALUE
// ============================================================

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

// ============================================================
// SINGLE CONDITION EVALUATOR
// ============================================================

function evaluateSingleCondition(condition: FieldCondition, state: ConversationState): boolean {
  const currentValue = normalizeValue(state.answers[condition.fieldId]);

  const expectedValue = normalizeValue(condition.value);

  switch (condition.operator) {
    // ======================================================
    // EQUAL
    // ======================================================

    case "eq":
      return currentValue === expectedValue;

    // ======================================================
    // NOT EQUAL
    // ======================================================

    case "neq":
      return currentValue !== expectedValue;

    // ======================================================
    // EXISTS
    // ======================================================

    case "exists":
      return currentValue !== undefined && currentValue !== null && currentValue !== "";

    // ======================================================
    // MISSING
    // ======================================================

    case "missing":
      return currentValue === undefined || currentValue === null || currentValue === "";

    // ======================================================
    // TRUTHY
    // ======================================================

    case "truthy":
      return Boolean(currentValue);

    // ======================================================
    // FALSY
    // ======================================================

    case "falsy":
      return !currentValue;

    // ======================================================
    // IN
    // ======================================================

    case "in":
      return Array.isArray(expectedValue) ? expectedValue.includes(currentValue) : false;

    // ======================================================
    // NOT IN
    // ======================================================

    case "notIn":
      return Array.isArray(expectedValue) ? !expectedValue.includes(currentValue) : false;

    // ======================================================
    // GREATER THAN
    // ======================================================

    case "gt":
      return Number(currentValue) > Number(expectedValue);

    // ======================================================
    // LESS THAN
    // ======================================================

    case "lt":
      return Number(currentValue) < Number(expectedValue);

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
    // FIELD VISIBILITY
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
        const visible = this.evaluateVisibilityRule(field.visibleIf, state);

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
    // VISIBILITY RULE EVALUATION
    // ======================================================

    evaluateVisibilityRule(rule, state) {
      // ====================================================
      // FUNCTION SUPPORT
      // ====================================================

      if (typeof rule.function === "function") {
        try {
          return rule.function(state);
        } catch {
          return false;
        }
      }

      // ====================================================
      // AND CONDITIONS
      // ====================================================

      if (rule.and) {
        return rule.and.every((childRule) => this.evaluateVisibilityRule(childRule, state));
      }

      // ====================================================
      // OR CONDITIONS
      // ====================================================

      if (rule.or) {
        return rule.or.some((childRule) => this.evaluateVisibilityRule(childRule, state));
      }

      // ====================================================
      // FIELD BASED RULES
      // ====================================================

      if (rule.field) {
        const currentValue = state.answers[rule.field];

        // --------------------------------------------------
        // equals
        // --------------------------------------------------

        if (rule.equals !== undefined) {
          return currentValue === rule.equals;
        }

        // --------------------------------------------------
        // notEquals
        // --------------------------------------------------

        if (rule.notEquals !== undefined) {
          return currentValue !== rule.notEquals;
        }

        // --------------------------------------------------
        // in
        // --------------------------------------------------

        if (rule.in) {
          return rule.in.includes(currentValue);
        }

        // --------------------------------------------------
        // notIn
        // --------------------------------------------------

        if (rule.notIn) {
          return !rule.notIn.includes(currentValue);
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

      // ====================================================
      // EXPLICIT RULE RESETS
      // ====================================================

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

      // ====================================================
      // invalidateOnChange SUPPORT
      // ====================================================

      const sourceField = flow.fields[fieldId];

      if (sourceField?.invalidateOnChange?.length) {
        for (const dependentField of sourceField.invalidateOnChange) {
          resets.add(dependentField);
        }
      }

      // ====================================================
      // visibleIf DEPENDENCIES
      // ====================================================

      for (const [targetFieldId, targetField] of Object.entries(flow.fields)) {
        if (!targetField.visibleIf) {
          continue;
        }

        const visibleIf = targetField.visibleIf;

        // --------------------------------------------------
        // SIMPLE FIELD RULE
        // --------------------------------------------------

        if (visibleIf.field === fieldId) {
          resets.add(targetFieldId);
        }

        // --------------------------------------------------
        // AND RULES
        // --------------------------------------------------

        if (visibleIf.and) {
          for (const childRule of visibleIf.and) {
            if (childRule.field === fieldId) {
              resets.add(targetFieldId);
            }
          }
        }

        // --------------------------------------------------
        // OR RULES
        // --------------------------------------------------

        if (visibleIf.or) {
          for (const childRule of visibleIf.or) {
            if (childRule.field === fieldId) {
              resets.add(targetFieldId);
            }
          }
        }
      }

      return Array.from(resets);
    },

    // ======================================================
    // GET HIDDEN FIELDS
    // ======================================================

    getHiddenFields(state) {
      const hiddenFields: string[] = [];

      for (const fieldId of Object.keys(flow.fields)) {
        const visible = this.isFieldRelevant(fieldId, state);

        if (!visible) {
          hiddenFields.push(fieldId);
        }
      }

      return hiddenFields;
    },

    // ======================================================
    // CLEANUP HIDDEN FIELDS
    // ======================================================

    cleanupHiddenFields(state) {
      const hiddenFields = this.getHiddenFields(state);

      const updatedAnswers = {
        ...state.answers,
      };

      const updatedFieldStates = {
        ...(state.fieldStates || {}),
      };

      for (const hiddenFieldId of hiddenFields) {
        // --------------------------------------------------
        // REMOVE ANSWERS
        // --------------------------------------------------

        delete updatedAnswers[hiddenFieldId];

        // --------------------------------------------------
        // UPDATE FIELD STATE
        // --------------------------------------------------

        updatedFieldStates[hiddenFieldId] = "hidden";
      }

      return {
        ...state,

        answers: updatedAnswers,

        fieldStates: updatedFieldStates,
      };
    },
  };
}

// ============================================================
// RE-EXPORT TYPES
// ============================================================

export type { ConditionalRule };
