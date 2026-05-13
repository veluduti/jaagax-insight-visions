// ============================================================
// Rule Engine — SCAFFOLD ONLY.
//
// Responsibility:
//   - Evaluate ConditionalRule[] against ConversationState
//   - Decide whether a given field is currently relevant
//   - Determine which dependent fields to reset on answer change
//
// Deterministic: AI does not influence rule evaluation.
// ============================================================
import type {
  ConditionalRule,
  ConditionGroup,
  ConversationState,
  PropertyFlowConfig,
} from "./types";

export interface RuleEngine {
  isFieldRelevant(fieldId: string, state: ConversationState): boolean;
  evaluateCondition(condition: ConditionGroup, state: ConversationState): boolean;
  fieldsToResetOnChange(fieldId: string, flow: PropertyFlowConfig): string[];
}

export function createRuleEngine(_flow: PropertyFlowConfig): RuleEngine {
  return {
    isFieldRelevant(_fieldId, _state) {
      // TODO: implement rule evaluation
      return true;
    },
    evaluateCondition(_condition, _state) {
      // TODO: implement and/any/single condition evaluation
      return true;
    },
    fieldsToResetOnChange(_fieldId, _flow) {
      // TODO: walk rules[].resets and return dependent field ids
      return [];
    },
  };
}

export type { ConditionalRule };
