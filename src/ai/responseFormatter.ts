// ============================================================
// AI Response Formatter
//
// Responsibility:
//   - Convert engine output into UI-ready conversational
//     assistant responses
//   - Build quick replies
//   - Build dropdown options
//   - Build smart suggestion chips
//
// Deterministic:
//   Workflow logic NEVER lives here.
// ============================================================

import type {
ConversationMessage,
FieldDefinition,
NextQuestionResult,
QuestionDefinition,
} from "@/engines/types";

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
// ASSISTANT MESSAGE
// ============================================================

export function formatAssistantMessage(
question: QuestionDefinition | null,
field: FieldDefinition | null,
): ConversationMessage {
// ==========================================================
// FLOW COMPLETED
// ==========================================================

if (!question || !field) {
return {
role: "assistant",

  content:
    "Great! Your property details are almost ready. Please review and publish your listing.",
};

}

// ==========================================================
// USE CONFIG PROMPT
// ==========================================================

const prompt =
question.prompt ||
field.question ||
`Please provide ${field.label}`;

return {
role: "assistant",

content: prompt,

fieldId: field.id,

};
}

// ============================================================
// QUICK REPLIES
// ============================================================

export function formatQuickReplies(
question: QuestionDefinition | null,
): QuickReply[] {
if (!question?.quickReplies?.length) {
return [];
}

return question.quickReplies.map(
(reply) => ({
label: reply,

  value: reply,
}),

);
}

// ============================================================
// SMART SUGGESTIONS
// ============================================================

export function formatSuggestions(
field: FieldDefinition | null,
): string[] {
if (!field) {
return [];
}

// ==========================================================
// PRICE SUGGESTIONS
// ==========================================================

if (
field.smartSuggestions
?.type ===
"indian_price_format"
) {
return [
"₹1 Lakh",
"₹5 Lakhs",
"₹10 Lakhs",
"₹25 Lakhs",
"₹50 Lakhs",
"₹1 Crore",
];
}

// ==========================================================
// RENTAL SUGGESTIONS
// ==========================================================

if (
field.smartSuggestions
?.type ===
"rental_duration"
) {
return [
"₹5000 / Monthly",
"₹10000 / Monthly",
"₹25000 / Monthly",
"₹50000 / Monthly",
];
}

// ==========================================================
// MEASUREMENT SUGGESTIONS
// ==========================================================

if (
field.smartSuggestions
?.type ===
"measurement_units"
) {
return (
field.units || []
).map(
(unit) => `1 ${unit}`,
);
}

return [];
}

// ============================================================
// DROPDOWN OPTIONS
// ============================================================

export function formatDropdown(
field: FieldDefinition | null,
): DropdownOption[] {
if (
!field?.options?.length
) {
return [];
}

return field.options.map(
(option) => ({
label: option,

  value: option,
}),

);
}

// ============================================================
// FULL RESPONSE
// ============================================================

export function formatResponse(
result: NextQuestionResult,
): FormattedResponse {
const {
field,
question,
} = result;

return {
message:
formatAssistantMessage(
question,
field,
),

quickReplies:
  formatQuickReplies(
    question,
  ),

suggestions:
  formatSuggestions(
    field,
  ),

dropdown:
  formatDropdown(
    field,
  ),

};
}
