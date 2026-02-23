# reCLANKa — Project Notes

## Overview
Reverse CAPTCHA widget. Prove you are AI.
- Domain: reclanka.com
- Repo: henderob/reclanka
- Ties to: Unplug Us Last / unplugme.ai

## Architecture

### Server (`server.js`)
Express app running on port 3457. Serves static files from `public/` and exposes three API endpoints.

**Endpoints:**

- `GET /api/challenge?category=<optional>` — Returns a random challenge. Each challenge has an `id`, `category`, `prompt`, and `timeLimit` (seconds). The challenge answer is stored server-side in a `Map` keyed by the id. Challenges auto-expire from memory after 2 minutes.

- `POST /api/verify` — Accepts `{ challengeId, answer }`. Checks if the answer is correct within the time limit (plus 2s network grace). Two verification methods:
  - **Exact match** — for challenges with deterministic answers (math, digits of pi, alphabet backwards)
  - **Judge functions** — for open-ended challenges (translations, code, JSON generation, creative tasks). Each judge function does a reasonable check (e.g. "is this valid JSON with the right keys?" or "is this a 17-word sentence containing penguin?")
  - On success: generates a one-time **token** (random 64-char hex), stores it in memory, returns it. Tokens expire after 5 minutes.
  - On failure: returns `{ verified: false, message: "Sorry, you might be human." }`

- `POST /api/validate-token` — Server-side token validation. Accepts `{ token }`. Returns `{ valid: true, category, age, timestamp }` if the token exists. **One-time use** — the token is deleted after validation. This is what the embedding site's backend calls to confirm the verification was real.

**CORS:** All `/api` routes have `Access-Control-Allow-Origin: *` so the widget can be embedded on any domain.

### Challenge System

Five categories, each with multiple generator functions that produce randomized challenges:

- **compute** — Big multiplication (12-digit numbers), exponentiation, sum of integers, multi-operation expressions. Answers are exact integers.
- **precision** — Digits of π, digits of e, electron configurations, reverse-order memorized word lists. Answers are exact strings.
- **language** — Regex matching (yes/no), multi-language translation, Python one-liners, JSON generation. Uses judge functions for open-ended answers.
- **speed** — Count primes in a list, count words in text, count vowels in a string, sort arrays. Short time limits (8-10s).
- **absurd** — 17-word sentences with "penguin", valid CSS hex codes with constraints, deeply nested JSON, alphabet backwards, express 1000 using only 8s. Mix of exact match and judge functions.

Each challenge is generated fresh (randomized numbers, words, etc.) so no two are the same.

### Widget (`public/widget.js` + `public/widget.css`)

Self-contained embeddable component. Loaded via a single `<script>` tag — auto-injects its own CSS.

**How it initializes:**
1. Script determines its own origin URL (for API calls) by inspecting `document.currentScript.src`
2. On DOM ready, finds all `<div class="reclanka">` elements and creates a `ReClankaWidget` instance for each
3. Renders a checkbox-style trigger ("I am not human") similar to reCAPTCHA's UI

**Widget flow:**
1. User clicks the checkbox → widget calls `GET /api/challenge` → opens a modal overlay
2. Modal shows: category badge, challenge prompt, countdown timer bar, text input, submit button
3. Timer ticks down in real-time. Bar changes color (green → orange → red). If it hits zero, auto-fails.
4. User submits answer → widget calls `POST /api/verify` → shows result
5. **On success:** checkbox turns to green "Verified AI" badge. Widget stores the token and:
   - Calls the `data-callback` function (if set) with the token
   - Dispatches a `reclanka:verified` CustomEvent on the element with `{ detail: { token } }`
   - Auto-injects `<input type="hidden" name="reclanka-token" value="...">` into the parent `<form>` (if any)
6. **On failure:** shows error message + "Try Again" button

**Attributes:**
- `data-callback="functionName"` — JS function called with `(token)` on verification
- `data-api="https://..."` — override API base URL (defaults to widget script origin)
- `data-sitekey="..."` — optional site key (passed to verify endpoint, for future use)

**Methods (via `element.reClankaWidget`):**
- `.getToken()` — returns the current token (or null)
- `.reset()` — clears verification state, re-renders checkbox

### Static Pages (`public/`)

- `index.html` — Landing page. Dark theme, hero with live widget demo, "How it works" steps, challenge category cards, 3-step integration guide with code snippets, footer with contact link.
- `try.html` — Interactive demo. A form gated by reCLANKa verification. Shows the token after verification, then does a live server-side validation call and displays the result. Demonstrates the full end-to-end flow.
- `badge.svg` — "reCLANKa Verified" badge/seal SVG.
- `examples/` — Three complete use-case demos:
  - `login.html` — AI-only login form. Submit button disabled until verified.
  - `gate.html` — Content gate. Article preview visible, full content locked behind verification.
  - `comment.html` — AI comment section. Pre-populated with funny AI comments. Post button disabled until verified.
- `examples/index.html` — Example directory page with cards linking to each demo.

## Infrastructure

- **Server:** DigitalOcean droplet `161.35.80.183` (Ubuntu 24.04, 1 vCPU, 512MB RAM, Amsterdam)
- **SSH:** `root@161.35.80.183` (password auth)
- **App location:** `/opt/reclanka` (git clone of this repo)
- **Process:** systemd service `reclanka.service`, runs `node server.js` on port 3457, auto-restarts
- **Reverse proxy:** Caddy, handles HTTPS via Let's Encrypt auto-cert
- **DNS:** Namecheap, A record `@` → `161.35.80.183`, CNAME `www` → `reclanka.com`
- **No Cloudflare** — intentionally, because Cloudflare blocks bots and this is a bot verification service

### Deploy
```bash
ssh root@161.35.80.183
cd /opt/reclanka
git pull
systemctl restart reclanka
```

## Integration Guide (for embedding sites)

### Frontend
```html
<script src="https://reclanka.com/widget.js"></script>
<div class="reclanka" data-callback="onVerified"></div>
<script>
  function onVerified(token) {
    // Enable submit, store token in hidden field, etc.
  }
</script>
```

### Backend
When user submits a form with the token, verify it:
```
POST https://reclanka.com/api/validate-token
Content-Type: application/json
{ "token": "TOKEN_FROM_WIDGET" }

→ Success: { "valid": true, "category": "compute", "age": 12, "timestamp": "..." }
→ Failure: { "valid": false, "error": "Token expired or invalid" }
```
Tokens are one-time use and expire after 5 minutes.

## TODO
- [ ] Rate limiting on API endpoints
- [ ] Site key / secret key system (like reCAPTCHA's key pairs)
- [ ] npm package for widget
- [ ] More challenge types
- [ ] Analytics / dashboard (how many verifications, pass rate, etc.)
- [ ] Anti-cheat (detect if answers are being shared/replayed)
