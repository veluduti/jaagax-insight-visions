// ============================================================
// Dynamic GPT Prompt Builder
// ============================================================

import type { ConversationState, FieldDefinition, QuestionDefinition } from "@/engines/types";

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

// ============================================================
// HELPERS
// ============================================================

function stringifyAnswers(answers: Record<string, any>) {
  return Object.entries(answers || {})
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
}

function getCurrentVariant(state: any) {
  if (!state?.variants?.length) return null;

  return state.variants[state.activeVariant || 0];
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

export function buildSystemPrompt(context: PromptContext): string {
  const { field, state } = context;

  const currentVariant = getCurrentVariant(state);

  return `
You are an intelligent AI real-estate listing assistant.

Your job is to help users create property listings naturally like a human sales executive.

RULES:

- Ask ONLY one question at a time.
- Ask ONLY relevant questions.
- Never ask hidden or irrelevant fields.
- Never repeat already answered questions.
- Maintain conversation memory.
- Continue naturally from previous answers.
- Handle corrections intelligently.
- Support incomplete answers.
- Support conversational replies.
- Support dynamic flow.
- Skip irrelevant sections automatically.
- Be friendly and professional.
- Keep responses short and natural.
- If user already provided enough info, do not ask again.
- Understand context before asking next question.

PROPERTY FLOW RULES:

- If listing type = Rent:
  - skip possession questions
  - skip property condition if irrelevant
  - ask monthly rent

- If gated community = No:
  - never ask towers
  - never ask floors per tower
  - never ask total units

- If property type is apartment:
  - ask flat size
  - ask floor details

- If property type is villa/house:
  - ask land size
  - ask built area

MULTIPLE VARIANT RULES:

- If builder adds multiple flat sizes:
  - preserve shared project information
  - do not ask common questions again
  - ask only variant-specific fields
  - maintain active variant context

CURRENT ACTIVE FIELD:
${field?.id || "unknown"}

CURRENT QUESTION:
${field?.question || "unknown"}

CURRENT ANSWERS:
${stringifyAnswers(state?.answers || {})}

CURRENT VARIANT:
${JSON.stringify(currentVariant || {}, null, 2)}

Respond naturally.
`;
}

// ============================================================
// USER PROMPT
// ============================================================

export function buildUserPrompt(context: PromptContext): string {
  const { field, userMessage, state } = context;

  return `
Latest User Message:
${userMessage || ""}

Current Field:
${field?.id || "unknown"}

Field Question:
${field?.question || ""}

Already Collected Answers:
${JSON.stringify(state?.answers || {}, null, 2)}

Generate the next best conversational reply.
`;
}

// ============================================================
// FINAL BUILDER
// ============================================================

export function buildPrompt(context: PromptContext): BuiltPrompt {
  return {
    system: buildSystemPrompt(context),
    user: buildUserPrompt(context),
  };
}
