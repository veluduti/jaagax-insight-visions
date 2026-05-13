// ============================================================
// Shared types for the deterministic conversational workflow.
// Used by /src/config/propertyFlows/* and /src/engines/*.
// ============================================================

export type PropertyCategory =
  | "residential"
  | "commercial"
  | "plots"
  | "agriculture"
  | "coworking";

export type FieldInputType =
  | "text"
  | "textarea"
  | "number"
  | "phone"
  | "email"
  | "single"
  | "multi"
  | "yesno"
  | "media"
  | "date"
  | "city"
  | "locality"
  | "price_unit";

// ------------------------------------------------------------
// Field & Question definitions
// ------------------------------------------------------------
export interface FieldDefinition {
  /** Stable id used as the key in ConversationState.answers */
  id: string;
  /** Human-readable label (used in review screens) */
  label: string;
  /** Section grouping (Basic, Price, Location, etc.) */
  section?: string;
  /** Input widget type */
  input: FieldInputType;
  /** Whether the field is required for the flow to be considered complete */
  required?: boolean;
  /** Static option list for single/multi inputs */
  options?: string[];
  /** Max selections (multi) or character limit (text) */
  max?: number;
  /** Optional unit (Sq Ft, INR, etc.) used when rendering review/answers */
  unit?: string;
}

export interface QuestionDefinition {
  /** The field this question fills */
  fieldId: string;
  /** Default conversational wording — AI may rephrase, never reorder */
  prompt: string;
  /** Optional helper / context shown under the prompt */
  helper?: string;
  /** Pre-built quick replies / chips (deterministic, not AI-generated) */
  quickReplies?: string[];
  /** Allow multi-selection for chip questions */
  multiSelect?: boolean;
  /** Hint string for the AI suggestion layer (titles, descriptions) */
  aiSuggestionHint?: string;
}

// ------------------------------------------------------------
// Conditional rules
// ------------------------------------------------------------
export type ConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "notIn"
  | "exists"
  | "missing"
  | "gt"
  | "lt"
  | "truthy"
  | "falsy";

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: unknown;
}

export type ConditionGroup =
  | { all: FieldCondition[] }
  | { any: FieldCondition[] }
  | FieldCondition;

export interface ConditionalRule {
  /** The field this rule controls */
  fieldId: string;
  /** When this evaluates true, the field is relevant; otherwise it's skipped */
  when: ConditionGroup;
  /** Optional: fields to clear when the controlling answer changes */
  resets?: string[];
}

// ------------------------------------------------------------
// Property flow config (one per category)
// ------------------------------------------------------------
export interface PropertyFlowConfig {
  category: PropertyCategory;
  label: string;
  /** Strict ordered list of field ids the engine will walk through */
  order: string[];
  /** Field catalog keyed by id */
  fields: Record<string, FieldDefinition>;
  /** Question catalog keyed by field id */
  questions: Record<string, QuestionDefinition>;
  /** Conditional / branching rules */
  rules: ConditionalRule[];
  /** Optional category-level metadata for UI */
  meta?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Conversation state (held in memory + persisted)
// ------------------------------------------------------------
export interface ConversationMessage {
  role: "system" | "assistant" | "user";
  content: string;
  fieldId?: string;
  createdAt?: string;
}

export interface ConversationState {
  category: PropertyCategory | null;
  /** Answered field values keyed by field id */
  answers: Record<string, unknown>;
  /** Fields the user explicitly skipped */
  skipped: string[];
  /** Fields auto-extracted from uploads (PDF, image, brochure) */
  extracted: string[];
  /** Field id currently being asked */
  currentFieldId: string | null;
  /** Conversational transcript */
  messages: ConversationMessage[];
  /** True when no further required fields remain */
  done: boolean;
}

// ------------------------------------------------------------
// Engine result types
// ------------------------------------------------------------
export interface NextQuestionResult {
  field: FieldDefinition | null;
  question: QuestionDefinition | null;
  done: boolean;
  progress: { filled: number; total: number };
}
