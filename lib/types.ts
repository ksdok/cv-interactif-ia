/**
 * Shared type definitions
 *
 * Single source of truth for types used across multiple modules.
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}