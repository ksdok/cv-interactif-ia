/**
 * Input validation utilities for chat messages
 *
 * This module provides functions to validate user input before processing,
 * preventing invalid data from reaching the API and protecting against:
 * - Memory exhaustion attacks (huge payloads)
 * - Type confusion attacks
 * - Empty/invalid message structures
 */

// Define the valid message types
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Constants for validation
const MAX_MESSAGE_LENGTH = 5000 // Maximum characters per message
const MAX_MESSAGES = 100 // Maximum number of messages in a conversation
const VALID_ROLES = ['user', 'assistant'] as const

/**
 * Validates that the input is a valid chat message array
 *
 * @param messages - The data to validate
 * @returns Object with isValid boolean and error message if invalid
 *
 * Security checks performed:
 * 1. Ensures messages is an array (prevents type confusion)
 * 2. Ensures array is not empty (prevents processing empty conversations)
 * 3. Ensures array doesn't exceed max length (prevents memory exhaustion)
 * 4. Validates each message object structure
 * 5. Validates role field is one of allowed values
 * 6. Validates content is non-empty string with length limits
 */
export function validateChatMessages(
  messages: unknown
): { isValid: boolean; error?: string } {
  // Check 1: messages must be an array
  if (!Array.isArray(messages)) {
    return {
      isValid: false,
      error: 'messages must be an array',
    }
  }

  // Check 2: array must not be empty
  if (messages.length === 0) {
    return {
      isValid: false,
      error: 'messages array cannot be empty',
    }
  }

  // Check 3: array length must not exceed maximum
  if (messages.length > MAX_MESSAGES) {
    return {
      isValid: false,
      error: `messages array cannot exceed ${MAX_MESSAGES} messages`,
    }
  }

  // Check 4-6: validate each message
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    // Check if message is an object
    if (typeof msg !== 'object' || msg === null) {
      return {
        isValid: false,
        error: `Message at index ${i} must be an object`,
      }
    }

    // Check if message is a plain object (not array or other type)
    if (Array.isArray(msg)) {
      return {
        isValid: false,
        error: `Message at index ${i} must be an object, not an array`,
      }
    }

    // Check role field exists and is a string
    if (!('role' in msg) || typeof (msg as any).role !== 'string') {
      return {
        isValid: false,
        error: `Message at index ${i} must have a string 'role' field`,
      }
    }

    // Check role is one of the valid values
    if (!VALID_ROLES.includes((msg as any).role)) {
      return {
        isValid: false,
        error: `Message at index ${i} has invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      }
    }

    // Check content field exists and is a string
    if (!('content' in msg) || typeof (msg as any).content !== 'string') {
      return {
        isValid: false,
        error: `Message at index ${i} must have a string 'content' field`,
      }
    }

    // Check content is not empty after trimming
    const trimmedContent = ((msg as any).content as string).trim()
    if (trimmedContent.length === 0) {
      return {
        isValid: false,
        error: `Message at index ${i} content cannot be empty`,
      }
    }

    // Check content length doesn't exceed maximum
    if ((msg as any).content.length > MAX_MESSAGE_LENGTH) {
      return {
        isValid: false,
        error: `Message at index ${i} content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters (got ${(msg as any).content.length})`,
      }
    }

    // Check for unexpected fields (optional, helps catch typos/misuse)
    const allowedFields = ['role', 'content']
    const messageKeys = Object.keys(msg)
    const hasUnexpectedFields = messageKeys.some(
      (key) => !allowedFields.includes(key)
    )
    if (hasUnexpectedFields) {
      const unexpectedFields = messageKeys.filter(
        (key) => !allowedFields.includes(key)
      )
      // Log warning but don't fail (optional fields might be added in future)
      console.warn(
        `Message at index ${i} has unexpected fields: ${unexpectedFields.join(', ')}`
      )
    }
  }

  // All checks passed
  return { isValid: true }
}

/**
 * Type guard to assert messages is valid ChatMessage array
 * Useful for TypeScript type narrowing
 */
export function assertValidChatMessages(
  messages: unknown
): asserts messages is ChatMessage[] {
  const validation = validateChatMessages(messages)
  if (!validation.isValid) {
    throw new Error(`Invalid chat messages: ${validation.error}`)
  }
}
