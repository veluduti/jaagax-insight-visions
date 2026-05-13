// ============================================================
// AI Response Formatter
//
// Responsibility:
//   - Convert engine + AI output into UI-ready structures:
//     assistant messages, quick replies, suggestion chips,
//     dropdown options.
//
// NOTE: Scaffold only — no business logic implemented yet.
// ============================================================

import type {
  ConversationMessage,
  FieldDefinition,
  NextQuestionResult,
  QuestionDefinition,
} from "@/engines/types";

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

// ------------------------------------------------------------
// Formatters (scaffold)
// ------------------------------------------------------------

export function formatAssistantMessage(
  _question: QuestionDefinition | null,
  _field: FieldDefinition | null,
): ConversationMessage {
  return { role: "assistant", content: "" };
}

export function formatQuickReplies(_question: QuestionDefinition | null): QuickReply[] {
  return [];
}

export function formatSuggestions(_field: FieldDefinition | null): string[] {
  return [];
}

export function formatDropdown(_field: FieldDefinition | null): DropdownOption[] {
  return [];
}

export function formatResponse(_result: NextQuestionResult): FormattedResponse {
  return {
    message: { role: "assistant", content: "" },
  };
}
