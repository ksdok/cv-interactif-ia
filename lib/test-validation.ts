/**
 * Test suite for input validation
 *
 * Run with: npm run test:validation
 * Or manually import and run tests in a Node script
 *
 * This file tests the validateChatMessages function against various attack vectors
 * and edge cases to ensure robust input validation.
 */

import { validateChatMessages } from './validation'

interface TestCase {
  name: string
  input: unknown
  shouldPass: boolean
  expectedError?: string
}

// Define all test cases
const testCases: TestCase[] = [
  // ============================================================
  // VALID INPUTS - Should pass
  // ============================================================
  {
    name: 'Valid single message',
    input: [{ role: 'user', content: 'Hello' }],
    shouldPass: true,
  },
  {
    name: 'Valid conversation with multiple messages',
    input: [
      { role: 'user', content: 'What is your name?' },
      { role: 'assistant', content: 'My name is Claude' },
      { role: 'user', content: 'Nice to meet you' },
    ],
    shouldPass: true,
  },
  {
    name: 'Message with maximum allowed length (5000 chars)',
    input: [{ role: 'user', content: 'a'.repeat(5000) }],
    shouldPass: true,
  },
  {
    name: 'Message with special characters',
    input: [{ role: 'user', content: 'Hello! @#$%^&*() <script>alert("xss")</script>' }],
    shouldPass: true,
  },
  {
    name: 'Message with newlines',
    input: [
      {
        role: 'user',
        content: 'Line 1\nLine 2\nLine 3',
      },
    ],
    shouldPass: true,
  },
  {
    name: 'Message with unicode characters',
    input: [{ role: 'user', content: 'Hello 世界 مرحبا мир' }],
    shouldPass: true,
  },
  {
    name: 'Message with leading/trailing whitespace',
    input: [{ role: 'user', content: '   Hello world   ' }],
    shouldPass: true,
  },

  // ============================================================
  // INVALID TYPE - Not an array
  // ============================================================
  {
    name: 'Input is a string instead of array',
    input: 'not an array',
    shouldPass: false,
    expectedError: 'messages must be an array',
  },
  {
    name: 'Input is a number instead of array',
    input: 123,
    shouldPass: false,
    expectedError: 'messages must be an array',
  },
  {
    name: 'Input is an object instead of array',
    input: { messages: [{ role: 'user', content: 'test' }] },
    shouldPass: false,
    expectedError: 'messages must be an array',
  },
  {
    name: 'Input is null',
    input: null,
    shouldPass: false,
    expectedError: 'messages must be an array',
  },
  {
    name: 'Input is undefined',
    input: undefined,
    shouldPass: false,
    expectedError: 'messages must be an array',
  },

  // ============================================================
  // EMPTY ARRAY
  // ============================================================
  {
    name: 'Empty array',
    input: [],
    shouldPass: false,
    expectedError: 'messages array cannot be empty',
  },

  // ============================================================
  // ARRAY TOO LARGE
  // ============================================================
  {
    name: 'Array exceeds maximum length (101 messages)',
    input: Array(101)
      .fill(null)
      .map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      })),
    shouldPass: false,
    expectedError: 'messages array cannot exceed 100 messages',
  },

  // ============================================================
  // INVALID MESSAGE STRUCTURE
  // ============================================================
  {
    name: 'Message is not an object',
    input: ['not an object'],
    shouldPass: false,
    expectedError: 'Message at index 0 must be an object',
  },
  {
    name: 'Message is null',
    input: [null],
    shouldPass: false,
    expectedError: 'Message at index 0 must be an object',
  },
  {
    name: 'Message is an array instead of object',
    input: [['role', 'user', 'content', 'test']],
    shouldPass: false,
    expectedError: 'Message at index 0 must be an object, not an array',
  },
  {
    name: 'Message missing role field',
    input: [{ content: 'Hello' }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'role' field",
  },
  {
    name: 'Message missing content field',
    input: [{ role: 'user' }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'content' field",
  },

  // ============================================================
  // INVALID ROLE
  // ============================================================
  {
    name: 'Invalid role: "admin"',
    input: [{ role: 'admin', content: 'Hack the system' }],
    shouldPass: false,
    expectedError: 'Message at index 0 has invalid role',
  },
  {
    name: 'Invalid role: empty string',
    input: [{ role: '', content: 'test' }],
    shouldPass: false,
    expectedError: 'Message at index 0 has invalid role',
  },
  {
    name: 'Role is a number instead of string',
    input: [{ role: 123, content: 'test' }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'role' field",
  },
  {
    name: 'Role is null',
    input: [{ role: null, content: 'test' }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'role' field",
  },

  // ============================================================
  // INVALID CONTENT
  // ============================================================
  {
    name: 'Content is empty string',
    input: [{ role: 'user', content: '' }],
    shouldPass: false,
    expectedError: 'Message at index 0 content cannot be empty',
  },
  {
    name: 'Content is only whitespace',
    input: [{ role: 'user', content: '   \n\t   ' }],
    shouldPass: false,
    expectedError: 'Message at index 0 content cannot be empty',
  },
  {
    name: 'Content exceeds maximum length (5001 chars)',
    input: [{ role: 'user', content: 'a'.repeat(5001) }],
    shouldPass: false,
    expectedError: 'Message at index 0 content exceeds maximum length',
  },
  {
    name: 'Content is a number instead of string',
    input: [{ role: 'user', content: 123 }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'content' field",
  },
  {
    name: 'Content is null',
    input: [{ role: 'user', content: null }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'content' field",
  },
  {
    name: 'Content is an object',
    input: [{ role: 'user', content: { nested: 'object' } }],
    shouldPass: false,
    expectedError: "Message at index 0 must have a string 'content' field",
  },

  // ============================================================
  // ATTACK VECTORS
  // ============================================================
  {
    name: 'XSS attempt in content',
    input: [
      {
        role: 'user',
        content: '<script>alert("XSS")</script>',
      },
    ],
    shouldPass: true, // Content validation allows this - React will escape it
  },
  {
    name: 'SQL injection attempt in content',
    input: [
      {
        role: 'user',
        content: "'; DROP TABLE users; --",
      },
    ],
    shouldPass: true, // Content validation allows this - sent to LLM, not DB
  },
  {
    name: 'Huge payload - DoS attempt (100KB)',
    input: [{ role: 'user', content: 'a'.repeat(100000) }],
    shouldPass: false,
    expectedError: 'exceeds maximum length',
  },
  {
    name: 'Deeply nested object',
    input: [
      {
        role: 'user',
        content: 'test',
        nested: {
          deep: {
            object: {
              structure: 'attack',
            },
          },
        },
      },
    ],
    shouldPass: true, // Extra fields are allowed (with warning)
  },
  {
    name: 'Many messages - potential memory attack',
    input: Array(50)
      .fill(null)
      .map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      })),
    shouldPass: true, // 50 is within limit of 100
  },

  // ============================================================
  // EDGE CASES
  // ============================================================
  {
    name: 'Message with only numbers as content',
    input: [{ role: 'user', content: '123456' }],
    shouldPass: true,
  },
  {
    name: 'Message with emoji content',
    input: [{ role: 'user', content: '😀 👍 🚀' }],
    shouldPass: true,
  },
  {
    name: 'Multiple messages with mixed valid/invalid roles in middle',
    input: [
      { role: 'user', content: 'First' },
      { role: 'invalid', content: 'Second' },
    ],
    shouldPass: false,
    expectedError: 'Message at index 1 has invalid role',
  },
]

/**
 * Run all test cases and report results
 */
export function runValidationTests() {
  console.log('🧪 Running input validation tests...\n')

  let passed = 0
  let failed = 0

  testCases.forEach((testCase) => {
    const validation = validateChatMessages(testCase.input)
    const isValid = validation.isValid

    const testPassed = isValid === testCase.shouldPass

    if (testPassed) {
      passed++
      console.log(`✅ PASS: ${testCase.name}`)
    } else {
      failed++
      console.log(`❌ FAIL: ${testCase.name}`)
      console.log(
        `   Expected: ${testCase.shouldPass ? 'valid' : 'invalid (error: ' + testCase.expectedError + ')'}`
      )
      console.log(
        `   Got: ${isValid ? 'valid' : 'invalid (error: ' + validation.error + ')'}`
      )
    }

    // If we expected an error, verify the error message contains the expected text
    if (!testCase.shouldPass && testCase.expectedError) {
      if (validation.error && validation.error.includes(testCase.expectedError)) {
        // Error message matches - good
      } else if (!isValid) {
        console.log(
          `   ⚠️  Error message mismatch. Expected substring: "${testCase.expectedError}", got: "${validation.error}"`
        )
      }
    }
  })

  console.log(
    `\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`
  )

  return { passed, failed, total: testCases.length }
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runValidationTests()
}
