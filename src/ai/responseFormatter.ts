// ============================================================
// AI Response Formatter
//
// Responsibility:
//   - Convert engine output into conversational UI responses
//   - Generate human-like assistant replies
//   - Build quick replies
//   - Build dropdown options
//   - Build smart contextual suggestions
//   - Support variant-based conversational flows
//
// IMPORTANT:
//   - No workflow business logic here
//   - Only UI/conversation formatting
// ============================================================

import type { ConversationMessage, FieldDefinition, NextQuestionResult, QuestionDefinition } from "@/engines/types";

// ============================================================
// TYPES
// ============================================================

export interface QuickReply {
  label: string;
  value: string;
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface FormattedResponse {
  message: ConversationMessage;

  quickReplies?: QuickReply[];

  suggestions?: string[];

  dropdown?: DropdownOption[];
}

// ============================================================
// TRANSITIONAL AI PHRASES
// ============================================================

const TRANSITIONS = ["Got it.", "Perfect.", "Great.", "Nice.", "Understood.", "Sounds good.", "Okay."];

function randomTransition() {
  return TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
}

// ============================================================
// SECTION TRANSITIONS
// ============================================================

function getSectionTransition(field?: FieldDefinition | null): string {
  if (!field?.section) {
    return "";
  }

  switch (field.section) {
    case "pricing":
      return "Now let's configure pricing details.";

    case "project_information":
      return "Let's continue with project details.";

    case "features":
      return "Now let's configure property features.";

    case "location":
      return "Let's add location details.";

    case "legal":
      return "Now let's complete approvals and legal details.";

    default:
      return "";
  }
}

// ============================================================
// VARIANT MESSAGE
// ============================================================

function getVariantMessage(state?: any): string {
  if (!state?.variants || !state.variants.length) {
    return "";
  }

  return `Currently configuring variant ${(state.activeVariant || 0) + 1} of ${state.variants.length}.`;
}

// ============================================================
// ASSISTANT MESSAGE
// ============================================================

export function formatAssistantMessage(
  question: QuestionDefinition | null,
  field: FieldDefinition | null,
  state?: any,
): ConversationMessage {
  // ==========================================================
  // FLOW COMPLETED
  // ==========================================================

  if (!question || !field) {
    return {
      role: "assistant",

      content: "Excellent. Your property listing is now ready for preview and publishing.",
    };
  }

  // ==========================================================
  // QUESTION TEXT
  // ==========================================================

  const questionText = question.prompt || field.question || `Please provide ${field.label}`;

  // ==========================================================
  // AI TRANSITIONS
  // ==========================================================

  const transition = randomTransition();

  const sectionTransition = getSectionTransition(field);

  const variantMessage = getVariantMessage(state);

  // ==========================================================
  // FINAL CONTENT
  // ==========================================================

  const content = [transition, sectionTransition, variantMessage, questionText].filter(Boolean).join("\n\n");

  return {
    role: "assistant",

    content,

    fieldId: field.id,
  };
}

// ============================================================
// QUICK REPLIES
// ============================================================

export function formatQuickReplies(question: QuestionDefinition | null): QuickReply[] {
  if (!question?.quickReplies?.length) {
    return [];
  }

  return question.quickReplies.map((reply) => ({
    label: reply,
    value: reply,
  }));
}

// ============================================================
// CONTEXTUAL SMART SUGGESTIONS
// ============================================================

export function formatSuggestions(field: FieldDefinition | null, state?: any): string[] {
  if (!field) {
    return [];
  }

  // ==========================================================
  // FLAT SIZE SUGGESTIONS
  // ==========================================================

  if (field.id === "flat_size") {
    return ["1200 Sq Ft", "1500 Sq Ft", "1800 Sq Ft", "2200 Sq Ft"];
  }

  // ==========================================================
  // LAND SIZE SUGGESTIONS
  // ==========================================================

  if (field.id === "land_size") {
    return ["150 Sq Yard", "200 Sq Yard", "300 Sq Yard", "500 Sq Yard", "1 Acre"];
  }

  // ==========================================================
  // TOTAL PRICE
  // ==========================================================

  if (field.id === "total_price") {
    return ["50 Lakhs", "75 Lakhs", "1 Crore", "1.5 Crore", "2 Crore"];
  }

  // ==========================================================
  // MONTHLY RENT
  // ==========================================================

  if (field.id === "monthly_rent") {
    return ["₹10000", "₹15000", "₹25000", "₹50000"];
  }

  // ==========================================================
  // LOCATION SUGGESTIONS
  // ==========================================================

  if (field.id === "location") {
    return ["Gachibowli Hyderabad", "Kondapur Hyderabad", "Madhapur Hyderabad", "Kukatpally Hyderabad"];
  }

  // ==========================================================
  // PROPERTY HIGHLIGHTS
  // ==========================================================

  if (field.id === "property_highlights") {
    return ["Verified Property", "Ready to Move", "Luxury Living", "Best Deal"];
  }

  // ==========================================================
  // GENERIC CONFIG SUGGESTIONS
  // ==========================================================

  if (field.smartSuggestions?.examples?.length) {
    return field.smartSuggestions.examples;
  }

  return [];
}

// ============================================================
// DROPDOWN OPTIONS
// ============================================================

export function formatDropdown(field: FieldDefinition | null): DropdownOption[] {
  if (!field?.options?.length) {
    return [];
  }

  return field.options.map((option) => ({
    label: option,
    value: option,
  }));
}

// ============================================================
// RESPONSE VALIDATION
// ============================================================

function validateFieldVisibility(field: FieldDefinition | null, state?: any): boolean {
  if (!field) {
    return false;
  }

  // visibility should already
  // be resolved by engine

  // secondary protection layer

  return true;
}

// ============================================================
// FULL RESPONSE
// ============================================================

export function formatResponse(result: NextQuestionResult): FormattedResponse {
  const { field, question, state } = result;

  // ==========================================================
  // SAFETY VISIBILITY CHECK
  // ==========================================================

  const isVisible = validateFieldVisibility(field, state);

  if (!isVisible) {
    return {
      message: {
        role: "assistant",
        content: "Let me continue with the next relevant detail.",
      },
    };
  }

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  return {
    message: formatAssistantMessage(question, field, state),

    quickReplies: formatQuickReplies(question),

    suggestions: formatSuggestions(field, state),

    dropdown: formatDropdown(field),
  };
}
