// ============================================================
// Conversation Store
//
// Responsibility:
//   - Centralized in-memory conversation state manager
//     (answers, skipped, extracted, messages, current field,
//     progress).
//
// NOTE: Scaffold only — no business logic implemented yet.
// ============================================================

import type {
  ConversationMessage,
  ConversationState,
  PropertyCategory,
} from "@/engines/types";

export interface ConversationStore {
  getState(): ConversationState;
  setCategory(category: PropertyCategory): void;
  setAnswer(fieldId: string, value: unknown): void;
  markSkipped(fieldId: string): void;
  markExtracted(fieldId: string, value: unknown): void;
  appendMessage(message: ConversationMessage): void;
  setCurrentField(fieldId: string | null): void;
  getProgress(): { filled: number; total: number };
  reset(): void;
}

// ------------------------------------------------------------
// Initial state
// ------------------------------------------------------------

export function createEmptyState(): ConversationState {
  return {
    category: null,
    answers: {},
    skipped: [],
    extracted: [],
    currentFieldId: null,
    messages: [],
    done: false,
  };
}

// ------------------------------------------------------------
// Factory (scaffold)
// ------------------------------------------------------------

export function createConversationStore(): ConversationStore {
  let state: ConversationState = createEmptyState();

  return {
    getState: () => state,
    setCategory: (category) => {
      state = { ...createEmptyState(), category };
    },
    setAnswer: (fieldId, value) => {
      state.answers[fieldId] = value;
    },
    markSkipped: (fieldId) => {
      if (!state.skipped.includes(fieldId)) state.skipped.push(fieldId);
    },
    markExtracted: (fieldId, value) => {
      state.answers[fieldId] = value;
      if (!state.extracted.includes(fieldId)) state.extracted.push(fieldId);
    },
    appendMessage: (message) => {
      state.messages.push(message);
    },
    setCurrentField: (fieldId) => {
      state.currentFieldId = fieldId;
    },
    getProgress: () => ({ filled: 0, total: 0 }),
    reset: () => {
      state = createEmptyState();
    },
  };
}
