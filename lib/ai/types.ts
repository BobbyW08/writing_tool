// Shared types for the AI layer (step S4). No imports beyond zod, so this file is safe for both
// server code and plain scripts.

export type AiTask = 'quick_suggestions' | 'deep_suggestions'

export const DEFAULT_MODELS: Record<AiTask, string> = {
  quick_suggestions: 'claude-haiku-4-5',
  deep_suggestions: 'claude-sonnet-4-5',
}

export type ProposalKind = 'field' | 'detail' | 'beat'

// What lib/ai/proposals.ts writes into ai_proposals.proposed_value. The Accept and Reject inbox
// reads `kind` to know which of these shapes to expect.
export type ProposedValue =
  | { kind: 'field'; field: string; value: string }
  | { kind: 'detail'; label: string; value: string }
  | { kind: 'beat'; name: string; summary: string }
