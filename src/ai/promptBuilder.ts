// ============================================================
// Dynamic GPT Prompt Builder
//
// Responsibility:
//   - Build small, focused prompts for the AI based on the
//     current field, conversation state, and latest user
//     message.
//
// NOTE: Scaffold only — no business logic implemented yet.
// ============================================================

import type {
  ConversationState,
  FieldDefinition,
  QuestionDefinition,
} from "@/engines/types";

export interface PromptContext {
  field: FieldDefinition | null;
  question: QuestionDefinition | null;
  state: ConversationState;
  userMessage?: string;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

// ------------------------------------------------------------
// Builders (scaffold)
// ------------------------------------------------------------

export function buildSystemPrompt(_context: PromptContext): string {
  return "";
}

export function buildUserPrompt(_context: PromptContext): string {
  return "";
}

export function buildPrompt(context: PromptContext): BuiltPrompt {
  return {
    system: buildSystemPrompt(context),
    user: buildUserPrompt(context),
  };
}
