#!/bin/bash

# Test script for input validation on /api/chat endpoint
# This script tests the validation with curl commands

BASE_URL="http://localhost:3000/api/chat"

echo "🧪 Testing /api/chat input validation"
echo "========================================"
echo ""

# Test 1: Valid request
echo "Test 1: Valid single message"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is your name?"}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Empty array
echo "Test 2: Empty messages array (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": []}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Not an array
echo "Test 3: Messages is a string (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": "not an array"}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Missing role
echo "Test 4: Message missing role field (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"content": "Hello"}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 5: Missing content
echo "Test 5: Message missing content field (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user"}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 6: Invalid role
echo "Test 6: Invalid role 'admin' (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "admin", "content": "Hack the system"}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 7: Empty content
echo "Test 7: Empty message content (should fail)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": ""}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 8: Content too long (5001 chars)
echo "Test 8: Message content exceeds max length (should fail)"
LONG_STRING=$(printf 'a%.0s' {1..5001})
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"$LONG_STRING\"}]}" \
  -w "\nStatus: %{http_code}\n\n"

# Test 9: Valid conversation with multiple messages
echo "Test 9: Valid conversation (multiple messages)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there"}]}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 10: Message with special characters
echo "Test 10: Message with special characters (should pass validation)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello! @#$%^&*() 😀"}]}' \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Testing complete!"
