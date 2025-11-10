# Rate Limiting - Detailed Explanation

## What is Rate Limiting?

**Rate Limiting** is a security technique that **limits how many requests** a user/IP address can make to your API **within a specific time period**.

Think of it like a bouncer at a nightclub:
- Normal customer: Enter, drink, leave normally ✅
- Drunk customer trying to get in repeatedly: Bouncer says "You've been here 5 times in the last hour, no more for 60 minutes" ❌

## Why Your App Needs Rate Limiting

### The Problem: Your API Costs Money

Your `/api/chat` endpoint calls:
1. **OpenAI Embeddings API** - `$0.02 per 1M tokens`
2. **Anthropic Claude API** - `$3-15 per 1M tokens` (depending on model)
3. **Supabase Database** - `Storage and API costs`

Every single message sent to your API costs money.

### Attack Scenario 1: Spam Abuse

```bash
# Attacker writes a script:
for (let i = 0; i < 10000; i++) {
  fetch('https://yoursite.com/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'spam message' }]
    })
  })
}

# Result:
# - 10,000 API calls to Anthropic
# - 10,000 API calls to OpenAI
# - 10,000 database queries
# - Bill: $200-500+
# - You don't even know it's happening
```

### Attack Scenario 2: Quota Exhaustion

```javascript
// Attacker discovers your API is public
// Sends constant requests 24/7

// Day 1: 86,400 requests
// Day 2: 86,400 requests
// Day 3: 86,400 requests
// ...

// Your monthly API quota is exhausted
// Legitimate users can't use the app anymore
// Service is down for everyone
```

### Attack Scenario 3: DoS (Denial of Service)

```bash
# Attacker wants to take down your site
# Sends massive volume of requests simultaneously

ab -n 100000 -c 1000 https://yoursite.com/api/chat

# Result:
# - Server gets overwhelmed
# - API quota maxed out
# - Database connection pool exhausted
# - Legitimate users experience slowness/timeout
# - Service degrades or goes down
```

## How Rate Limiting Works

### Basic Concept

Rate limiting tracks **how many requests** come from each **IP address** and **blocks excess requests**.

### Simple Example

```
Rate Limit: 10 requests per minute per IP

IP: 192.168.1.100
├─ Request 1 at 00:00 ✅ (1/10)
├─ Request 2 at 00:05 ✅ (2/10)
├─ Request 3 at 00:10 ✅ (3/10)
├─ Request 4 at 00:15 ✅ (4/10)
├─ Request 5 at 00:20 ✅ (5/10)
├─ Request 6 at 00:25 ✅ (6/10)
├─ Request 7 at 00:30 ✅ (7/10)
├─ Request 8 at 00:35 ✅ (8/10)
├─ Request 9 at 00:40 ✅ (9/10)
├─ Request 10 at 00:45 ✅ (10/10) ← LIMIT REACHED
└─ Request 11 at 00:50 ❌ (RATE LIMITED - wait 10 more seconds)

After 1 minute, counter resets:
Request 11 at 01:00 ✅ (1/10)
```

### Per-IP vs Per-User

Rate limiting can be done per different criteria:

| Method | Tracks | Use Case |
|--------|--------|----------|
| Per IP | Source IP address | Prevent external attacks |
| Per User | Authenticated user ID | Prevent abuse by registered users |
| Per Session | Session token | Prevent single user spamming |
| Hybrid | Combination of above | Most secure |

For your app: **Per IP** is best since it's anonymous (no login system).

## Rate Limiting Strategies

### 1. Fixed Window (Simple but Flawed)

```
Window: 1 minute
Limit: 10 requests

Minute 1 (00:00-00:59):
  - Can make 10 requests
  - Request 11 is rejected

Minute 2 (01:00-01:59):
  - Counter resets
  - Can make 10 more requests
```

**Problem**: Window edges can be gamed
```
IP sends 10 requests at 00:59
IP sends 10 requests at 01:00
Total: 20 requests in 2 seconds! (bypassed limit)
```

### 2. Sliding Window (More Secure)

```
Limit: 10 requests per minute (rolling)

00:00 - Request 1 ✅
00:05 - Request 2 ✅
00:10 - Request 3 ✅
00:15 - Request 4 ✅
00:20 - Request 5 ✅
00:25 - Request 6 ✅
00:30 - Request 7 ✅
00:35 - Request 8 ✅
00:40 - Request 9 ✅
00:45 - Request 10 ✅ (limit reached)
00:50 - Request 11 ❌ (would exceed limit)
01:00 - Request 1 from 1 min ago expires ✅ (now at 9/10)
01:01 - Request 2 expires ✅ (now at 8/10)
```

**Benefit**: Can't game the edge, truly rolling limit

### 3. Token Bucket (Most Flexible)

```
Bucket capacity: 10 tokens
Refill rate: 1 token per 6 seconds

Initial state:
  Tokens: 10/10 ✅

Each request costs 1 token:
  Request 1: Tokens: 9/10 ✅
  Request 2: Tokens: 8/10 ✅
  ...
  Request 10: Tokens: 0/10 ✅
  Request 11: Tokens needed but 0 available ❌ (wait 6 seconds)

After 6 seconds:
  1 token refilled: Tokens: 1/10 ✅
  Request 11: Tokens: 0/10 ✅

After 60 seconds:
  10 tokens refilled: Tokens: 10/10 ✅ (full again)
```

**Benefit**: Allows burst traffic while maintaining limits

## Your App's Vulnerability

### Current Situation: No Rate Limiting

```
Every request:
├─ OpenAI embeddings API call ($$$)
├─ Anthropic Claude API call ($$$)
└─ Supabase database query

No limit on:
├─ How many requests per IP
├─ How many requests per hour/day
├─ How many concurrent requests
└─ How much quota can be consumed

Result: Anyone can spam the API and run up your bill
```

### Cost Impact Example

Assuming:
- OpenAI embeddings: $0.02 per 1M tokens (~$0.00002 per request)
- Anthropic Claude: $3 per 1M input tokens (~$0.003 per request)
- Average cost per request: ~$0.005

**Attack scenario:**
```
Attacker sends: 1,000 requests per day
Your cost: 1,000 × $0.005 = $5/day
Over 30 days: $150/month

But attackers could do:
- 10,000 requests/day = $50/day = $1,500/month
- 100,000 requests/day = $500/day = $15,000/month
```

You'd notice huge bills suddenly appearing!

## Implementation Strategy for Your App

### Approach: Per-IP Rate Limiting

Best for anonymous API:

```typescript
// Example configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour per IP
  message: 'Too many requests from this IP, please try again later'
}
```

### What This Means

```
IP: 192.168.1.100
├─ Hour 1 (00:00-00:59): Can make 100 requests ✅
├─ Hour 2 (01:00-01:59): Can make 100 requests ✅
│
  If user sends 150 requests in Hour 1:
├─ Requests 1-100: Accepted ✅
├─ Requests 101-150: Rejected ❌
└─ Message: "Too many requests, try again in 60 minutes"
```

### Implementation Layers

```
Request → Middleware (Check rate limit)
            ├─ Is IP blocked? → Return 429 Too Many Requests
            └─ Is IP under limit? → Increment counter, continue
          → Input Validation
          → CSRF Token Validation
          → API Processing
          → Response
```

## Response Codes

### 429 Too Many Requests

When rate limit exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1731514800

{
  "error": "Too many requests from this IP address",
  "retryAfter": 3600,
  "remaining": 0
}
```

**Headers explained:**
- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`: Total requests allowed in window
- `X-RateLimit-Remaining`: Requests left in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Attack Scenarios - Rate Limited vs Not

### Scenario 1: Spam Attack

**Without Rate Limiting:**
```
Attacker sends 10,000 requests
All 10,000 processed
Cost to you: $50+
Service impact: Moderate lag
User impact: Slowness
```

**With Rate Limiting (100/hour):**
```
Attacker sends 10,000 requests
Only 100 processed
Remaining 9,900 rejected (429)
Cost to you: $0.50
Service impact: None
User impact: None
```

### Scenario 2: DoS Attack

**Without Rate Limiting:**
```
Attacker sends 1M requests from 10 IPs
Total: 1M requests processed
API quota exhausted
Database overwhelmed
Service down for legitimate users
```

**With Rate Limiting (100/hour per IP):**
```
Attacker sends 1M requests from 10 IPs
Per IP: 100 processed, 99,900 rejected
Total: Only 1,000 processed (100 × 10 IPs)
Service remains operational
Legitimate users unaffected
```

### Scenario 3: Quota Exhaustion

**Without Rate Limiting:**
```
Month starts: Fresh quota
Attacker: Sends 10,000 requests/day
Day 5: Quota exhausted (50% through month)
Days 6-30: API completely down
Users can't use service for 25 days
```

**With Rate Limiting:**
```
Month starts: Fresh quota
Attacker: Limited to 100 requests/hour
Can't exceed daily limit
Quota lasts entire month
Service stays available
```

## Choosing the Right Limits

### Conservative (Strict)
```
10 requests per hour per IP
Best for: Expensive APIs, critical services
Drawback: Legitimate users might hit limits
```

### Moderate (Balanced)
```
100 requests per hour per IP
Best for: Most applications, good balance
Good for your app: Covers normal usage
```

### Generous (Lenient)
```
1000 requests per hour per IP
Best for: High-volume legitimate traffic
Risk: Still allows significant abuse
```

### Recommendation for Your App

```typescript
const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour
  skipSuccessfulRequests: false,  // Count all requests
  skipFailedRequests: false,      // Count failed ones too
}
```

**Why 100/hour?**
- Normal user: ~5-10 messages per session
- Power user: ~50 messages per hour (typing continuously)
- 100 limit: Covers legit users with room to spare
- Prevents abuse: Attacker can't spam more than 100/hour
- Cost control: 100 messages × $0.005 = $0.50/hour max per IP

## Implementation Considerations

### What to Rate Limit

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `/api/chat` | 100/hour | Most expensive, needs protection |
| `GET /` | No limit | Static page, cheap |
| `/api/other` | 1000/hour | Less expensive, can be more generous |

### What NOT to Block

```typescript
// Don't rate limit these:
- Health checks (monitoring)
- Static files (images, CSS, JS)
- Analytics (Vercel analytics)

// DO rate limit these:
- API endpoints
- Form submissions
- Data mutations (POST, PUT, DELETE)
```

### Distributed Scenarios

**Challenge:** Rate limiting per IP only works if:
```
✅ Single server
✅ Same data center
✅ All requests go through same proxy
```

**Problem:** Multiple servers or distributed setup
```
Server 1: IP from user hits 30 requests
Server 2: Same IP from user hits 30 requests
Server 3: Same IP from user hits 30 requests
Total: 90 requests (limit was 100, so it worked)
BUT: Data not shared between servers

Solution: Use Redis or centralized store
```

For your Vercel deployment: Serverless functions handle this automatically.

## Example: How Your API Would Look

### Current (No Rate Limiting)

```bash
curl -X POST https://yoursite.com/api/chat \
  -H "X-CSRF-Token: xxx" \
  -d '{"messages": [...]}'

# Response:
HTTP 200 OK
{"response": "AI response here"}

# Can send infinite requests ❌
```

### With Rate Limiting

```bash
# Request 1-100: Normal
curl -X POST https://yoursite.com/api/chat ...
HTTP 200 OK
Headers:
  X-RateLimit-Remaining: 99
  X-RateLimit-Reset: 1731514800

# Request 101: Rate Limited
curl -X POST https://yoursite.com/api/chat ...
HTTP 429 Too Many Requests
Retry-After: 3600
{"error": "Too many requests. Try again in 60 minutes"}
```

## Benefits Summary

| Benefit | Impact |
|---------|--------|
| Cost Control | Limits API spending per IP |
| Service Protection | Prevents DoS attacks |
| Fair Usage | Ensures all users get access |
| Abuse Prevention | Stops malicious scripts |
| Quota Protection | Keeps monthly quota available |
| User Experience | Prevents slowdowns from abuse |

## Downsides (Minor)

| Issue | Severity | Mitigation |
|-------|----------|-----------|
| Legitimate users hit limit | Low | Make limits generous enough |
| Complex implementation | Low | Use existing libraries |
| False positives (VPNs share IPs) | Low | Whitelist trusted IPs |
| Monitoring overhead | Low | Use built-in monitoring |

## Status in Your App

| Item | Status |
|------|--------|
| Input Validation | ✅ DONE |
| Server-Only Marker | ✅ DONE |
| CSRF Protection | ✅ DONE |
| Rate Limiting | ⏳ TODO |
| Debug Logging Removal | ⏳ TODO |
| Security Headers | ⏳ TODO |

## Summary

### What is Rate Limiting?
Limit how many requests one IP can make in a time period.

### Why Your App Needs It?
Every API call costs money. Attackers can spam requests and run up your bill.

### How Does It Work?
- Track requests from each IP
- Count how many in last hour
- After limit: reject with 429
- After time window: reset counter

### For Your App?
- 100 requests per hour per IP
- Covers normal users
- Blocks attackers
- Costs: Limited to ~$0.50/hour per IP
- Implementation: ~30-50 lines of code

Would you like me to implement rate limiting for your app?
