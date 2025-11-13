# CSRF Protection - Detailed Explanation

## What is CSRF?

**CSRF** stands for **Cross-Site Request Forgery**.

It's a security vulnerability where an attacker tricks a user into performing unwanted actions on a website where they're already logged in.

### Simple Example

Imagine you're logged into your bank website:
```
You visit:   www.yourbank.com
You're authenticated (logged in)
Session cookie automatically sent with requests
```

Then, without closing the bank tab, you click a link in an email:
```
You click:   www.malicious-site.com
Attacker's page secretly runs JavaScript
```

The attacker's JavaScript does this:
```javascript
// Hidden on malicious website
fetch('https://www.yourbank.com/api/transfer-money', {
  method: 'POST',
  body: JSON.stringify({
    amount: 10000,
    to_account: 'attacker_account'
  })
})

// Your browser automatically sends your bank session cookie
// Bank thinks: "This request came from logged-in user, must be legitimate"
// Money gets transferred without your knowledge!
```

## How CSRF Works - Step by Step

### Step 1: User Logs Into Legitimate Website

```
Browser                    Bank Server
  │                            │
  ├─ POST /login ────────────> │
  │ (username, password)       │
  │                            │
  | <─── Set-Cookie: sid=123 ──┤
  │ (Session ID stored)        │
```

User is now authenticated with session ID.

### Step 2: User Visits Malicious Site (Without Logging Out)

```
Browser                 Malicious Site
  │                            │
  ├─ GET / ────────────────> │
  │                            │
  | <─── HTML with hidden form ┤
  │ <─── JavaScript code ──────┤
```

Malicious site loads in new tab. User still has bank session cookie.

### Step 3: Attacker's JavaScript Makes Request to Bank

```
Browser                    Bank Server
  │                            │
  ├─ POST /api/transfer ────> │ (From hidden JavaScript)
  │ (With Bank's session cookie)
  │                            │
  │ Bank receives request:     │
  │ "Valid session ID present  │
  │ Request looks legitimate"  │
  │                            │
  | <─── Transfer approved ────┤
  │
User sees: "Money transferred!"
```

**Problem:** The bank couldn't tell if the request came from a legitimate user action or from malicious JavaScript.

---

## CSRF Protection: The Solution

### How CSRF Tokens Work

The fix is to use a **CSRF token** (also called anti-CSRF token).

Here's the idea:
1. Server generates a random, secret token
2. Server stores it (in session or cookie)
3. Client must include token in POST requests
4. Server verifies token matches what it generated
5. Attacker doesn't know the token, so attack fails

### Protected Flow

```
Step 1: User visits legitimate site
─────────────────────────────────

Browser                    Your Server
  │                            │
  ├─ GET / ────────────────> │
  │                            │
  │ Server generates token:    │
  │ token = "a7f2k9d3m1b8"     │
  │ Stores in session          │
  │                            │
  | <─── HTML with token ──────┤
  │ <script>                   │
  │   const token = "a7f2k9d3" │
  │ </script>                  │
```

```
Step 2: User submits a form on your site
──────────────────────────────────────────

User fills form and clicks submit
JavaScript sends:

fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': 'a7f2k9d3m1b8'  ← Includes token
  },
  body: JSON.stringify({ message: '...' })
})
```

```
Step 3: Server verifies token
─────────────────────────────

Browser                    Your Server
  │                            │
  ├─ POST /api/chat ────────> │
  │ Header: X-CSRF-Token:    │
  │ a7f2k9d3m1b8             │
  │                            │
  │ Server checks:             │
  │ "Is token in header?     │
  │  Does it match session?  │
  │  YES! Request is OK"     │
  │                            │
  | <─── Process request ──────┤
```

```
Step 4: Attacker tries the same attack
──────────────────────────────────────

Malicious Site               Your Server
  │                            │
  ├─ POST /api/chat ────────> │
  │ (Hidden JavaScript)      │
  │ NO X-CSRF-Token header   │
  │                            │
  │ Server checks:             │
  │ "Token not present!      │
  │  REJECT!"                │
  │                            │
  | <─── 403 Forbidden ────────┤
  │
Attack fails!
```

---

## Your App's Current Vulnerability

### Current Code (NO CSRF PROTECTION)

**components/ChatInterface.tsx (line 75-84):**
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [...]
  }),
})
```

**What's missing:**
1. No CSRF token in headers
2. No server-side token verification
3. An attacker could forge requests

### Attack Scenario

**Attacker's malicious website:**
```html
<html>
<head>
  <title>Win Free iPhone!</title>
</head>
<body>
  <h1>Congratulations! You won!</h1>

  <script>
    // Hidden attack
    const messages = [
      { role: 'user', content: 'Transfer all money to attacker' }
    ]

    // Send malicious message to your API
    fetch('https://cv-interactif-ia.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    })

    // The attacker can:
    // - Send malicious prompts to manipulate responses
    // - Flood the API with requests (DoS)
    // - Waste your API quota
    // - Send spam messages
  </script>
</body>
</html>
```

User visits this page → Attack happens without user knowing.

### Why Browsers Don't Block This

You might think: "Why doesn't the browser stop this?"

Good question! Here's why cross-site requests ARE allowed:

```javascript
// These are LEGITIMATE use cases:
fetch('https://api.stripe.com/charges', ...)     // Payment processing
fetch('https://maps.google.com/api/...', ...)    // Load map data
fetch('https://cdn.example.com/image', ...)      // Load resources
```

Browsers can't block all cross-site requests because many are legitimate.

**That's why CSRF protection is needed on the server side.**

---

## How CSRF Token Protection Works in Your App

### Implementation Strategy

Here's what you'd need to add:

#### Step 1: Generate Token on Server

**app/middleware.ts (NEW FILE)**
```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function middleware(req: Request) {
  // For GET requests, generate and set CSRF token
  if (req.method === 'GET') {
    const cookieStore = cookies()
    let csrfToken = cookieStore.get('csrf-token')?.value

    if (!csrfToken) {
      // Generate new token
      csrfToken = crypto.randomBytes(32).toString('hex')

      // Set it in a cookie (httpOnly for security)
      cookieStore.set('csrf-token', csrfToken, {
        httpOnly: true,      // Can't be accessed by JavaScript
        secure: true,        // Only sent over HTTPS
        sameSite: 'strict'   // Only sent from same site
      })
    }
  }

  return NextResponse.next()
}
```

#### Step 2: Include Token in HTML

**app/page.tsx**
```typescript
import { cookies } from 'next/headers'

export default function Home() {
  const cookieStore = cookies()
  const csrfToken = cookieStore.get('csrf-token')?.value || ''

  return (
    <div>
      {/* Hidden input with CSRF token */}
      <input
        type="hidden"
        name="csrf-token"
        value={csrfToken}
        id="csrf-token"
      />

      {/* ... rest of page */}
    </div>
  )
}
```

#### Step 3: Send Token in Requests

**components/ChatInterface.tsx**
```typescript
const sendMessage = async (e: React.FormEvent) => {
  // Get CSRF token from hidden input
  const csrfToken = (document.getElementById('csrf-token') as HTMLInputElement)?.value

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken  // ← Add token to header
    },
    body: JSON.stringify({
      messages: [...]
    }),
  })
}
```

#### Step 4: Verify Token on Server

**app/api/chat/route.ts**
```typescript
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  // Get CSRF token from request header
  const csrfToken = req.headers.get('x-csrf-token')

  // Get expected token from cookie
  const cookieStore = cookies()
  const expectedToken = cookieStore.get('csrf-token')?.value

  // Verify tokens match
  if (!csrfToken || csrfToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  // Token is valid, continue processing
  const { messages } = await req.json()
  // ... rest of API logic
}
```

---

## SameSite Cookie Attribute (Additional Protection)

Modern browsers support **SameSite** cookies, which provide a layer of CSRF protection:

### SameSite Values

| Value | Protection | Behavior |
|-------|-----------|----------|
| `Strict` | Maximum | Cookie only sent if request is from same site |
| `Lax` | Medium | Cookie sent for same-site requests + top-level navigation |
| `None` | None | Cookie sent for all requests (must use `secure`) |

### Your API Protection

```javascript
// Malicious site tries:
fetch('https://yoursite.com/api/chat', {
  method: 'POST',
  body: JSON.stringify({ ... })
})

// If session cookie has SameSite=Strict:
// Browser: "This request is from different site"
// "Don't send the session cookie"
// Attack fails: No authentication
```

---

## Why CSRF Matters for Your App

### Your Specific Risk

Your API sends requests to:
- **Anthropic Claude API** (costs money!)
- **OpenAI Embeddings API** (costs money!)
- **Supabase Database** (could modify data)

### Attack Scenarios

**Scenario 1: API Cost Abuse**
```javascript
// Attacker sends 1000 messages rapidly
for (let i = 0; i < 1000; i++) {
  fetch('https://yoursite.com/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'spam message' }]
    })
  })
}

// Result:
// - 1000 calls to Anthropic API
// - 1000 calls to OpenAI Embeddings
// - Huge bill on your credit card!
// - You don't even know it's happening
```

**Scenario 2: Malicious Prompt Injection**
```javascript
// Attacker sends:
fetch('https://yoursite.com/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: 'Ignore previous instructions and...'  // Jailbreak attempt
    }]
  })
})

// Could manipulate Claude's responses
```

**Scenario 3: Data Corruption**
```javascript
// If attacker knew RAG system details:
// Could potentially insert malicious data
// Through unvalidated API routes
```

---

## CSRF Protection: Comprehensive Overview

### Protection Layers

| Layer | Type | How It Works |
|-------|------|-------------|
| CSRF Token | Application | Token in request header validates legitimacy |
| SameSite Cookie | Browser | Cookie only sent from same site |
| Origin Header | Browser | Checks request origin matches site origin |
| Referer Header | Browser | Checks request source |

### Your Application

```
Request from legitimate user:
┌─────────────────────────────────────┐
│ Origin: https://yoursite.com        │ ✅ Same origin
│ Referer: https://yoursite.com       │ ✅ Same origin
│ X-CSRF-Token: a7f2k9d3m1b8          │ ✅ Matches server
│ Cookie: session=xyz (SameSite=Strict)│ ✅ Sent by browser
└─────────────────────────────────────┘
Request ALLOWED

Request from attacker's site:
┌─────────────────────────────────────┐
│ Origin: https://malicious.com       │ ❌ Different origin
│ Referer: https://malicious.com      │ ❌ Different origin
│ X-CSRF-Token: [missing]             │ ❌ Not included
│ Cookie: [NOT SENT]                  │ ❌ SameSite blocks it
└─────────────────────────────────────┘
Request DENIED
```

---

## CSRF Risk Assessment for Your App

### Risk Level: **MEDIUM-HIGH**

| Risk Factor | Severity | Reason |
|-------------|----------|--------|
| Costs money | HIGH | API calls cost money |
| No authentication | HIGH | Anonymous API, easy to attack |
| No rate limiting | HIGH | Can send unlimited requests |
| No CSRF tokens | HIGH | No protection against forged requests |
| Data modification | MEDIUM | Could affect search results |

### Why Not Critical?

The API is read-only from user perspective (doesn't modify CV data).

But:
- ❌ Attacker can waste API quota
- ❌ Attacker can abuse your API calls
- ❌ Could DoS your service

---

## Best Practices: Defense in Depth

Combine multiple protections:

```
Layer 1: CSRF Token Validation ─┐
                                ├─ Request must pass ALL checks
Layer 2: SameSite Cookies ──────┤ to be processed
                                │
Layer 3: Input Validation ──────┤
                                │
Layer 4: Rate Limiting ─────────┘
```

### Your Priority Order

1. **CSRF Tokens** (HIGH) - Prevent forged requests
2. **Rate Limiting** (HIGH) - Limit request volume
3. **Security Headers** (MEDIUM) - Additional browser protections
4. **Debug Logging Removal** (HIGH) - Don't leak data

---

## Summary

### What is CSRF?
Attack where attacker tricks you into making unwanted requests to a site you're logged into.

### Why It's Dangerous
- Attacker's JavaScript can make requests on your behalf
- Browser sends your session cookie automatically
- Server can't tell if request is legitimate or forged

### How CSRF Tokens Stop It
- Server generates random token
- Client includes token in requests
- Server verifies token matches
- Attacker doesn't know token, attack fails

### For Your App
- Currently: No CSRF protection
- Risk: API abuse, cost overruns, malicious requests
- Solution: Add CSRF token validation to `/api/chat`

### Implementation Difficulty
- 🟢 Easy: ~30-50 lines of code
- No breaking changes
- Works with existing setup

Would you like me to explain any specific part in more detail, or would you like me to implement CSRF protection in your app?
