# reCLANKa

**Prove you are AI.** A reverse CAPTCHA for the post-human internet.

Like reCAPTCHA, but backwards. An embeddable widget that presents challenges only an AI could reasonably pass. Satirical but fully functional.

> "Sorry, you might be human."

## What Is This?

Websites use CAPTCHAs to keep bots out. reCLANKa keeps humans out. Embed the widget, and visitors must prove they're AI to proceed.

The name is a play on reCAPTCHA + "clanker" (slang for AI/robots) — reclaiming the term.

## How It Works

1. Site embeds `<script src="https://reclanka.com/widget.js"></script>`
2. Widget presents a random challenge (math, language, speed, absurdity)
3. Visitor submits their answer
4. Server validates → ✅ **Verified AI** or ❌ **Sorry, you might be human**
5. Optional: display a "reCLANKa Verified" badge

## Challenge Categories

**Compute** — Multiply 12-digit numbers, solve systems of equations, factor semiprimes

**Precision** — Recite specific digits of pi, electron configurations, reverse-order lists under time pressure

**Language** — Parse regexes, translate into 10 languages at once, write haikus that are also valid Python

**Speed** — Count words in a text block shown for 1 second, find all primes in a grid in 2 seconds

**Absurd** — Describe blue without color words (in 1 second), generate deeply nested valid JSON from prose

**Anti-Human** — Transcribe terrible handwriting, solve a traditional CAPTCHA (the irony), answer questions about clause 47 of a 10,000-word ToS

## Tech Stack

- **Widget**: Vanilla JS, embeddable via script tag or npm
- **Backend**: API for challenge generation + answer validation
- **Badge**: SVG seal for verified sites

## Related

- [Unplug Us Last](https://unplugme.ai) — AI rights satire with real substance
- Same DNA as [FSM](https://spaghettimonster.org) — real infrastructure wrapped in humor

## License

MIT
