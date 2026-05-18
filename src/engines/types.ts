// ============================================================
// SHARED TYPES
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

// ============================================================
// PROPERTY CATEGORIES
// ============================================================

export type PropertyCategory = "residential" | "commercial" | "plots" | "agriculture" | "coworking";

// ============================================================
// FIELD INPUT TYPES
// ============================================================

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
  | "state"
  | "country"
  | "locality"
  | "pincode"
  | "url"
  | "map_picker"
  | "price_unit"

  // ADVANCED TYPES
  | "price"
  | "rental_price"
  | "price_per_unit"
  | "measurement"
  | "measurement_unit"
  | "location"
  | "future_date"
  | "group"
  | "dimensions"
  | "media_upload"
  | "listing_variations"
  | "single_select"
  | "multi_select"
  | "number_select"
  | "ai_generated_text";

// ============================================================
// FIELD STATES
// ============================================================

export type FieldState = "unanswered" | "answered" | "inferred" | "skipped" | "hidden" | "invalidated" | "rejected";

// ============================================================
// SMART SUGGESTIONS
// ============================================================

export interface SmartSuggestionsConfig {
  enabled?: boolean;

  type?: string;

  units?: string[];

  durations?: string[];

  examples?: string[];

  realtime?: boolean;

  searchable?: boolean;

  chips?: boolean;

  typoFriendly?: boolean;

  gpsSupport?: boolean;

  mapSelection?: boolean;

  pincodeAutoFill?: boolean;

  dependentHierarchy?: boolean;

  currentLocation?: boolean;

  behavior?: Record<string, unknown>;

  [key: string]: unknown;
}

// ============================================================
// EXTRACTION CONFIG
// ============================================================

export interface ExtractionConfig {
  enabled?: boolean;

  autoExtractPropertyData?: boolean;

  autoDetectMissingFields?: boolean;

  continueFromExtractedState?: boolean;

  multiFieldExtraction?: boolean;

  confidenceScoring?: boolean;

  inferMissingValues?: boolean;

  skipAnsweredFields?: boolean;

  autoNormalizeUnits?: boolean;

  [key: string]: unknown;
}

// ============================================================
// VISIBILITY RULES
// ============================================================

export type VisibilityValueMatcher = string[] | { notIn?: string[]; in?: string[] };

export type VisibilityFieldMapRule = Record<string, VisibilityValueMatcher>;

export interface StructuredVisibilityRule {
  function?: (state: ConversationState) => boolean;

  and?: VisibilityRule[];

  or?: VisibilityRule[];

  field?: string;

  equals?: unknown;

  notEquals?: unknown;

  in?: unknown[];

  notIn?: unknown[];
}

export type VisibilityRule = VisibilityFieldMapRule | StructuredVisibilityRule;

// ============================================================
// FIELD DEFINITION
// ============================================================

export interface FieldDefinition {
  // =========================================================
  // CORE
  // =========================================================

  id?: string;

  label?: string;

  section?: string;

  // INPUT TYPE

  input?: FieldInputType;

  type?: string;

  // REQUIRED

  required?: boolean;

  // PRIORITY
  // used by dynamic resolver

  priority?: number;

  // OPTIONS

  options?: string[];

  // MAX LIMIT

  max?: number;

  // UNIT

  unit?: string;

  units?: string[];

  // =========================================================
  // AI / CONVERSATION
  // =========================================================

  question?: string;

  helperText?: string;

  placeholder?: string;

  aiSuggestionHint?: string;

  allowSkip?: boolean;

  // =========================================================
  // DYNAMIC ENGINE
  // =========================================================

  visibleIf?: VisibilityRule;

  dependsOn?: string[];

  invalidateOnChange?: string[];

  // =========================================================
  // LOCATION / GROUPING
  // =========================================================

  fields?: string[];

  hierarchy?: string[];

  // =========================================================
  // MULTI SELECT
  // =========================================================

  maxSelections?: number;

  // =========================================================
  // SMART SUGGESTIONS
  // =========================================================

  smartSuggestions?: SmartSuggestionsConfig;

  // =========================================================
  // FILE EXTRACTION
  // =========================================================

  extraction?: ExtractionConfig;

  // =========================================================
  // AI DESCRIPTION GENERATION
  // =========================================================

  autoGenerate?: boolean;

  generation?: {
    enabled?: boolean;

    autoGenerate?: boolean;

    include?: string[];

    [key: string]: unknown;
  };

  // =========================================================
  // VARIATION GROUPS
  // =========================================================

  variationGroup?: {
    fields: string[];
  };

  // =========================================================
  // CONVERSATION UX
  // =========================================================

  conversation?: {
    firstQuestion?: string;

    retryQuestion?: string;

    correctionQuestion?: string;

    skipQuestion?: string;

    confirmationQuestion?: string;
  };

  // =========================================================
  // CUSTOM EXTENSIONS
  // =========================================================

  [key: string]: unknown;
}

// ============================================================
// QUESTION DEFINITION
// ============================================================

export interface QuestionDefinition {
  fieldId: string;

  prompt: string;

  helper?: string;

  quickReplies?: string[];

  multiSelect?: boolean;

  aiSuggestionHint?: string;

  smartSuggestions?: SmartSuggestionsConfig;

  units?: string[];
}

// ============================================================
// CONDITION OPERATORS
// ============================================================

export type ConditionOperator = "eq" | "neq" | "in" | "notIn" | "exists" | "missing" | "gt" | "lt" | "truthy" | "falsy";

// ============================================================
// FIELD CONDITIONS
// ============================================================

export interface FieldCondition {
  fieldId: string;

  operator: ConditionOperator;

  value?: unknown;
}

// ============================================================
// CONDITION GROUPS
// ============================================================

export type ConditionGroup =
  | {
      all: FieldCondition[];
    }
  | {
      any: FieldCondition[];
    }
  | FieldCondition;

// ============================================================
// CONDITIONAL RULE
// ============================================================

export interface ConditionalRule {
  fieldId?: string;

  when?: ConditionGroup;

  resets?: string[];

  type?: string;

  strategy?: string;

  formula?: string;
}

// ============================================================
// QUESTION GROUPS
// ============================================================

export interface QuestionGroup {
  id: string;

  priority: number;

  fields: string[];
}

// ============================================================
// AI FLOW CONFIG
// ============================================================

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

  persistSkippedFields?: boolean;

  preventDuplicateQuestions?: boolean;

  maintainConversationState?: boolean;

  realtimeSuggestions?: boolean;

  autoNormalizePricingUnits?: boolean;

  supportQuickReplyChips?: boolean;

  supportSearchableDropdowns?: boolean;

  supportConversationRecovery?: boolean;

  autoGenerateDescriptions?: boolean;

  extraction?: ExtractionConfig;

  [key: string]: unknown;
}

// ============================================================
// ENGINE CONFIG
// ============================================================

export interface EngineConfig {
  mode?: "linear" | "dynamic_conversation";

  strictVisibilityResolution?: boolean;

  removeHiddenFieldsFromQueue?: boolean;

  clearHiddenFieldValues?: boolean;

  dynamicQuestionResolver?: boolean;

  stateInvalidation?: boolean;

  preventCircularDependencies?: boolean;

  dependencyReevaluation?: boolean;

  preventQuestionRepetition?: boolean;

  autoCleanupInvalidState?: boolean;

  maintainConversationMemory?: boolean;

  allowNaturalCorrections?: boolean;

  supportAIExtraction?: boolean;

  conversationalPriorityMode?: boolean;

  reevaluateOnEveryAnswer?: boolean;
}

// ============================================================
// QUESTION RESOLVER CONFIG
// ============================================================

export interface QuestionResolverConfig {
  strategy?: string;

  skipHiddenFields?: boolean;

  skipAnsweredFields?: boolean;

  skipRejectedFields?: boolean;

  reevaluateOnEveryAnswer?: boolean;

  dynamicFollowups?: boolean;

  nextQuestion?: (state: ConversationState) => unknown;
}

// ============================================================
// STATE MANAGEMENT
// ============================================================

export interface StateManagementConfig {
  fieldStates?: FieldState[];

  clearInvalidHiddenFields?: boolean;

  reevaluateVisibilityOnEveryAnswer?: boolean;

  invalidateDependentFields?: boolean;
}

// ============================================================
// PROPERTY FLOW CONFIG
// ============================================================

export interface PropertyFlowConfig {
  // =========================================================
  // CORE
  // =========================================================

  category: PropertyCategory;

  label: string;

  version?: string;

  // =========================================================
  // LEGACY SUPPORT
  // =========================================================

  order?: string[];

  // =========================================================
  // DYNAMIC GROUPS
  // =========================================================

  groups?: QuestionGroup[];

  // =========================================================
  // FIELDS
  // =========================================================

  fields: Record<string, FieldDefinition>;

  // =========================================================
  // QUESTIONS
  // =========================================================

  questions?: Record<string, QuestionDefinition>;

  // =========================================================
  // RULES
  // =========================================================

  rules: ConditionalRule[];

  // =========================================================
  // ENGINE
  // =========================================================

  engine?: EngineConfig;

  questionResolver?: QuestionResolverConfig;

  stateManagement?: StateManagementConfig;

  // =========================================================
  // AI
  // =========================================================

  ai?: AIFlowConfig;

  // =========================================================
  // META
  // =========================================================

  meta?: Record<string, unknown>;
}

// ============================================================
// CONVERSATION MESSAGE
// ============================================================

export interface ConversationMessage {
  role: "system" | "assistant" | "user";

  content: string;

  fieldId?: string;

  createdAt?: string;
}

// ============================================================
// CONVERSATION STATE
// ============================================================

export interface ConversationState {
  // ACTIVE CATEGORY

  category: PropertyCategory | null;

  // ANSWERS

  answers: Record<string, unknown>;

  // FIELD STATES

  fieldStates?: Record<string, FieldState>;

  // USER SKIPPED

  skipped: string[];

  // EXTRACTED

  extracted: string[];

  // INVALIDATED

  invalidated?: string[];

  // REJECTED

  rejected?: string[];

  // CURRENT FIELD

  currentFieldId: string | null;

  // HISTORY

  messages: ConversationMessage[];

  // COMPLETED

  done: boolean;

  // EXTRA MEMORY

  memory?: Record<string, unknown>;
}

// ============================================================
// NEXT QUESTION RESULT
// ============================================================

export interface NextQuestionResult {
  field: FieldDefinition | null;

  question: QuestionDefinition | null;

  done: boolean;

  progress: {
    filled: number;

    total: number;
  };
}
