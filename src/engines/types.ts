// ============================================================
// Shared types for the deterministic conversational workflow.
// Used by /src/config/propertyFlows/* and /src/engines/*.
// ============================================================

// ------------------------------------------------------------
// Property Categories
// ------------------------------------------------------------

export type PropertyCategory = "residential" | "commercial" | "plots" | "agriculture" | "coworking";

// ------------------------------------------------------------
// Field Input Types
// ------------------------------------------------------------

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
  | "price_unit"

  // ADVANCED TYPES
  | "price"
  | "rental_price"
  | "price_per_unit"
  | "measurement"
  | "location"
  | "future_date"
  | "group"
  | "media_upload"
  | "single_select"
  | "multi_select";

// ------------------------------------------------------------
// Smart Suggestions
// ------------------------------------------------------------

export interface SmartSuggestionsConfig {
  enabled?: boolean;

  type?: string;

  units?: string[];

  durations?: string[];

  examples?: string[];
}

// ------------------------------------------------------------
// Extraction Config
// ------------------------------------------------------------

export interface ExtractionConfig {
  enabled?: boolean;

  autoExtractPropertyData?: boolean;

  autoDetectMissingFields?: boolean;
}

// ------------------------------------------------------------
// Field Visibility Rules
// ------------------------------------------------------------

export type VisibilityRule = Record<string, string[]>;

// ------------------------------------------------------------
// Field Definition
// ------------------------------------------------------------

export interface FieldDefinition {
  // STABLE FIELD ID

  id: string;

  // HUMAN LABEL

  label: string;

  // OPTIONAL GROUPING

  section?: string;

  // INPUT TYPE

  input: FieldInputType;

  // REQUIRED OR OPTIONAL

  required?: boolean;

  // STATIC OPTIONS

  options?: string[];

  // MAX LIMIT

  max?: number;

  // DISPLAY UNIT

  unit?: string;

  // =========================================================
  // ADVANCED AI CONFIG
  // =========================================================

  // DYNAMIC QUESTION

  question?: string;

  // UNIT OPTIONS

  units?: string[];

  // GROUP FIELDS

  fields?: string[];

  // LOCATION HIERARCHY

  hierarchy?: string[];

  // MULTI SELECT LIMIT

  maxSelections?: number;

  // CONDITIONAL VISIBILITY

  visibleIf?: VisibilityRule;

  // SMART SUGGESTIONS

  smartSuggestions?: SmartSuggestionsConfig;

  // FILE / PDF EXTRACTION

  extraction?: ExtractionConfig;
}

// ------------------------------------------------------------
// Question Definition
// ------------------------------------------------------------

export interface QuestionDefinition {
  // TARGET FIELD

  fieldId: string;

  // AI QUESTION

  prompt: string;

  // OPTIONAL HELPER

  helper?: string;

  // QUICK REPLIES

  quickReplies?: string[];

  // MULTI SELECT

  multiSelect?: boolean;

  // AI SUGGESTION CONTEXT

  aiSuggestionHint?: string;
}

// ------------------------------------------------------------
// Conditional Rules
// ------------------------------------------------------------

export type ConditionOperator = "eq" | "neq" | "in" | "notIn" | "exists" | "missing" | "gt" | "lt" | "truthy" | "falsy";

// ------------------------------------------------------------
// Field Conditions
// ------------------------------------------------------------

export interface FieldCondition {
  fieldId: string;

  operator: ConditionOperator;

  value?: unknown;
}

// ------------------------------------------------------------
// Condition Groups
// ------------------------------------------------------------

export type ConditionGroup = { all: FieldCondition[] } | { any: FieldCondition[] } | FieldCondition;

// ------------------------------------------------------------
// Conditional Rule
// ------------------------------------------------------------

export interface ConditionalRule {
  // TARGET FIELD

  fieldId?: string;

  // WHEN THIS MATCHES

  when?: ConditionGroup;

  // RESET DEPENDENT FIELDS

  resets?: string[];

  // =========================================================
  // ADVANCED ENGINE RULES
  // =========================================================

  type?: string;

  formula?: string;
}

// ------------------------------------------------------------
// AI CONFIG
// ------------------------------------------------------------

export interface AIFlowConfig {
  conversational?: boolean;

  dynamicQuestioning?: boolean;

  askOneQuestionAtATime?: boolean;

  askOnlyMissingFields?: boolean;

  allowNaturalConversation?: boolean;

  supportGreetings?: boolean;

  supportCorrections?: boolean;

  supportTypos?: boolean;

  supportIntentDetection?: boolean;

  supportExtractionFromUploads?: boolean;

  supportAutoFill?: boolean;

  supportSmartSuggestions?: boolean;

  supportHumanLikeReplies?: boolean;

  supportContextAwareness?: boolean;

  supportDynamicFollowups?: boolean;
}

// ------------------------------------------------------------
// Property Flow Config
// ------------------------------------------------------------

export interface PropertyFlowConfig {
  // CATEGORY

  category: PropertyCategory;

  // DISPLAY LABEL

  label: string;

  // STRICT FLOW ORDER

  order: string[];

  // FIELD DEFINITIONS

  fields: Record<string, FieldDefinition>;

  // QUESTION DEFINITIONS

  questions?: Record<string, QuestionDefinition>;

  // RULES

  rules: ConditionalRule[];

  // OPTIONAL UI / ENGINE META

  meta?: Record<string, unknown>;

  // AI CONFIG

  ai?: AIFlowConfig;
}

// ------------------------------------------------------------
// Conversation Messages
// ------------------------------------------------------------

export interface ConversationMessage {
  role: "system" | "assistant" | "user";

  content: string;

  fieldId?: string;

  createdAt?: string;
}

// ------------------------------------------------------------
// Conversation State
// ------------------------------------------------------------

export interface ConversationState {
  // ACTIVE CATEGORY

  category: PropertyCategory | null;

  // ANSWERS

  answers: Record<string, unknown>;

  // USER SKIPPED FIELDS

  skipped: string[];

  // AUTO-EXTRACTED FIELDS

  extracted: string[];

  // CURRENT FIELD

  currentFieldId: string | null;

  // CHAT HISTORY

  messages: ConversationMessage[];

  // COMPLETED

  done: boolean;
}

// ------------------------------------------------------------
// Next Question Result
// ------------------------------------------------------------

export interface NextQuestionResult {
  field: FieldDefinition | null;

  question: QuestionDefinition | null;

  done: boolean;

  progress: {
    filled: number;
    total: number;
  };
}
