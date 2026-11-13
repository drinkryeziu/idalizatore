# Idealizator: developer handoff

Hand-off for building the real iPhone app from the approved prototype and design system. Written 2026-11-13.

- **Prototype (behaviour reference):** https://claude.ai/artifact/UsCDYqHXR16x1QMD6kGtkP (single HTML file; logic in plain React, no build step)
- **Design system (UI reference, tokens, components):** https://claude.ai/artifact/QVmBrPwetXmVPiC3nPH8QS
- The prototype is browser-only: data is in `localStorage`, AI calls go through Claude's built-in `window.claude` helper, and settings, billing and sign-in are demos. Everything marked **BUILD** below is missing from the prototype and must be built for real.

## 1. Product

A mobile app where a person **speaks an idea**, the AI cleans it up and files it, and on request the AI **scores the idea's market potential** and writes a **business plan and marketing plan** as a five-section report.

Core flow: Welcome (signed out) -> Create account / Sign in -> Ready to record -> hold the mic and speak -> Processing -> Recorded Ideas -> "Analyze Idea" -> Result (report).

## 2. Screens

| Screen | Purpose |
|---|---|
| Welcome (signed out) | Headline, three benefits, Create account / Sign in, terms link |
| Create account / Sign in / Reset password | Name, email, password with strength meter, verify password, forgot-password, Apple and Google buttons (not wired), terms checkbox; step 2 asks where to keep ideas |
| Ready to record | Hero, hold-to-record mic button. Typing fallback when no voice input |
| Recording | Live waveform, partial transcript, "Release to stop" |
| Processing | Violet screen with drifting formulas and code snippets while the AI works |
| "Where should this go?" sheet | Shown when the AI is unsure which idea a recording belongs to |
| Recorded Ideas | Accordion cards: transcript (editable), images, Add / Edit / Record more, **Analyze Idea** (or Re-analyze Idea when the idea changed) |
| Analyzed Ideas | List of ideas that have a report: title, score chip, verdict, score bar |
| Result | Score dial + verdict, "What drives the score" (5 factors), five report sections, one AI chart, Similar ideas & companies, Equipment & where to buy, Email and Print |
| Settings | Storage choice, account info, change password, plan tile, Terms of Use, Sign out |
| Plan & billing | Current plan and usage, Choose (monthly/yearly) -> Payment -> Done, update card, cancel, invoices |
| Terms of Use | Static legal text (section 9) |
| Menu | White drawer sliding from the right. Every signed-in screen has the hamburger icon top right. Items: Ready to record, Recorded Ideas (count), Analyzed Ideas (count), Settings; account tile at the bottom |

Layouts, spacing and every component are in the design system. Use its tokens, do not copy hex values by hand.

## 3. Key behaviours

1. **Hold to record.** The person records only while pressing the mic; letting go stops it. If hold is not possible (no pointer hold or no voice input), tap to start and tap to stop.
2. **Raw speech is never shown or saved.** After recording, the AI polishes the transcript (removes filler, repeats, noise) and only the polished text appears.
3. **Filing.** Recording from the ready screen: the AI decides `existing` (add to that idea), `unsure` (show the "Where should this go?" sheet, best match first, plus "Save as a new idea") or `new` (new idea). Recording from an idea card or the Result mic always adds to that idea.
4. **Analyze.** The report is generated only from the "Analyze Idea" button on an idea card. An idea is "stale" once its text or images changed after the report; the button then reads "Re-analyze Idea" and the score chip is dashed.
5. **Language.** Ideas can be typed or spoken in any language. The report is written in the idea's language (field `lang` / `languageName`). There is no voice-language picker.
6. **Score bands.** Under 40 red, 40-69 amber, 70 and up green. A glowing star appears above 80. The verdict text is black. Never colour alone: the number is always shown.
7. **Result actions.** Email (mail link and copies the report text) and Print (print-ready HTML copy) are pinned at the bottom.
8. **Menu animation.** The whole panel slides in from the right and out with the same 360 ms ease (`cubic-bezier(.4, 0, .2, 1)`); links do not animate individually. Respect reduced motion. In the web prototype the phone frame must be `overflow: clip`, not `hidden`, or focus scrolls it.
9. **Toast.** Bottom-anchored, high contrast (solid violet-deep for confirmations, white with red ring for warnings), about 4 seconds, dismissible.

## 4. Data model (suggested)

The prototype keeps this in `localStorage`; mirror it in your database and on the device.

```
User        { id, name, email, passwordHash, createdAt, storage: "device" | "server" | "both" }
Idea        { id, userId, createdAt, title, transcript, images: [Image], report: Report | null, reportFor: string, imagesChanged: bool, updatedAt }
              // reportFor = the transcript text the report was made from; stale = (reportFor != transcript) || imagesChanged
Image       { id, ideaId, url|localPath, createdAt }
Report      see section 5
Billing     { userId, plan: "free" | "plus" | "pro", period: "month" | "year", renewsAt, cancelAtPeriodEnd: bool, stripeCustomerId, stripeSubscriptionId }
Invoice     { id, userId, date, amount, plan, period, stripeInvoiceId }
```

Prototype `localStorage` keys: `idealizator-proto-v1` (ideas), `idealizator-settings-v1` (storage, name, email), `idealizator-billing-v1` (plan, period, renews, cancelAt, card, invoices).

## 5. AI contracts

Both calls return JSON only. Parse defensively (take the text between the first `{` and the last `}`, validate, clamp lengths, drop malformed items); the prototype's `parseReport` and `parseFiled` show exactly what is validated. Use a current Claude model through your backend; keep the API key server-side.

### 5.1 File a recording (polish + route)

Request: raw transcript + the person's saved ideas as `[{id, title, summary (first 320 chars)}]`, and optionally a target idea id.

Response:
```
{"text": string, "decision": "existing" | "unsure" | "new", "candidates": [string], "title": string}
```
Candidates are filtered to real idea ids, at most 3. `text: ""` means no idea content (discard the recording).

Prompt (the prototype's, with placeholders; when a target idea is given, the JOB 2 paragraph is replaced by "the speaker is adding to idea X, write a continuation, return decision existing"):

```
You are the note-taker inside Idealizator, an app where people speak business ideas out loud. Below is a raw speech-to-text recording. Do two jobs.

JOB 1, polish. Rewrite the recording as clean written text: remove filler words (um, uh, like, you know), false starts, repetitions, self-corrections, background noise and transcription garbage; fix grammar and punctuation. Keep every real detail and the speaker's meaning. Do not add ideas, opinions or facts that were not said. Write in the same language the speaker used. 1 to 4 short sentences per paragraph. If the recording contains no actual idea content, return "text": "".

JOB 2, file it. Decide which saved idea this recording is about. The speaker may be elaborating on a saved idea without naming it (for example talking about shingles and gutters when a roofing idea is saved).
- "existing": it is clearly about one saved idea. Put that idea's id first in "candidates".
- "unsure": it is related to one or more saved ideas but you cannot clearly tell which, or whether it is a separate idea. Put the most related ids in "candidates", most related first, at most 3.
- "new": it is not about any saved idea. "candidates" is empty.

Saved ideas:
[{"id":"{{ID}}","title":"{{TITLE}}","summary":"{{TEXT}}"}]

Recording:
"""
{{RAW_TRANSCRIPT}}
"""

Reply with JSON only, in exactly this shape:
{"text": string, "decision": "existing" | "unsure" | "new", "candidates": [string], "title": string}
"title" is a 2 to 5 word Title Case name for the idea, in the speaker's language, used only if it is saved as a new idea.
```

### 5.2 Analyze an idea (report)

Response shape (all text in the idea's language):
```
{
  "language": "en", "languageName": "English", "caption": "The forecasted success rate.",
  "title": "Project Management App",
  "score": 62,                          // integer 0-100
  "verdict": "Promising, with risks",
  "factors": [{"label": "Market demand", "score": 70}],   // exactly 5, higher is always better
  "chart": {"title": "...", "kind": "share" | "bars", "unit": "%", "section": 3, "items": [{"label": "...", "value": 40}]},
  "similar": {"title": "Similar ideas & companies", "items": [{"name": "...", "kind": "Company", "note": "..."}]},
  "equipment": {"title": "Equipment & where to buy", "items": [{"item": "...", "why": "...", "where": ["Amazon", "IKEA"]}]},
  "sections": [{"title": "...", "blocks": [{"kind": "paragraph", "text": "..."} | {"kind": "lead", "text": "...:"} | {"kind": "list", "items": ["..."]}]}]
}
```
Five sections, in order: Concept & Accessibility (titled "App Concept & Accessibility" for apps), Market Success Potential, Competition Analysis, Marketing Approach, Pricing Strategy. A `lead` ends with a colon and is always followed by a `list`.

Prompt (images, when attached, are sent with it as context):

```
You are Idealizator, an AI that tells founders whether a spoken idea is worth pursuing. Assess the idea below for the market and write a short business and marketing plan.

Idea, transcribed from speech (it may contain transcription mistakes):
"""
{{IDEA_TEXT}}
"""
The person also attached 1 image; use them as context.

LANGUAGE: The idea can be in any language. Work out which language it is written in (if it mixes languages, take the main one) and write EVERYTHING in that same language: the title, all five section titles, every paragraph, lead and list item, and the caption. Translate the section titles given below into that language. Do not answer in English unless the idea is in English.

Reply with JSON only, no text before or after it, in exactly this shape:
{"language": string, "languageName": string, "caption": string, "title": string, "score": integer, "verdict": string, "factors": [{"label": string, "score": integer}], "chart": {"title": string, "kind": "share" | "bars", "unit": string, "section": integer, "items": [{"label": string, "value": number}]}, "similar": {"title": string, "items": [{"name": string, "kind": string, "note": string}]}, "equipment": {"title": string, "items": [{"item": string, "why": string, "where": [string]}]}, "sections": [{"title": string, "blocks": [{"kind": "paragraph", "text": string} | {"kind": "lead", "text": string} | {"kind": "list", "items": [string]}]}]}

Rules:
- language: the BCP-47 code of the idea's language, such as "en", "sq", "de", "es-MX", "ar", "ja".
- languageName: that language's own name for itself, such as "English", "Shqip", "Deutsch", "العربية".
- caption: "The forecasted success rate." translated into that language.
- title: the idea's name in 2 to 5 words, Title Case, no quotes.
- verdict: the score in 2 to 4 plain words, in the idea's language, such as "Strong potential", "Promising, with risks" or "High risk".
- factors: exactly 5 things that drive the score for THIS idea, each with a 1 to 3 word label in the idea's language and a score from 0 to 100 where higher is always better for the idea (so rate "room among competitors", not "competition"). Typical ones are market demand, room among competitors, ease of building, earning potential and uniqueness; swap in ones that matter more for this idea.
- chart: ONE extra chart with the numbers most useful for this particular idea, as your estimate. Pick what fits: a suggested marketing budget split, a revenue mix, a startup cost breakdown, customer segments ("share": 3 to 5 items whose values are percentages adding up to 100, unit "%"), or a comparison such as price points or monthly revenue by year ("bars": 3 to 5 items, with a short unit such as "$", "€" or "k users"). "section" is the number (1 to 5) of the section it belongs to. Title of 2 to 5 words, labels of 1 to 3 words, all in the idea's language.
- similar: 3 to 5 REAL, well-known companies, products, apps or existing ideas that already do something close to this idea. "name" is the real name as people know it, "kind" is one word such as Company, App, Product, Service or Idea (in the idea's language), "note" is one short sentence on what they do or how they differ. Never invent a name: if you are not sure it exists, leave it out. "title" is "Similar ideas & companies" translated.
- equipment: only when the idea needs physical equipment, tools, hardware or materials to start (a food truck needs a truck and a grill; a pure software idea needs none, so return an empty items list). Up to 5 items. "item" is a 1 to 4 word name, "why" one short sentence, and "where" 2 or 3 well-known places to buy it for the idea's likely country or worldwide (such as Amazon, IKEA, Home Depot, Alibaba, a restaurant-supply chain). Real stores only, no prices, no links. "title" is "Equipment & where to buy" translated.
- score: the forecasted chance of market success as a whole percentage, 0 to 100. Be realistic: most ideas land between 30 and 75.
- sections: exactly five, in this order: "Concept & Accessibility", "Market Success Potential", "Competition Analysis", "Marketing Approach", "Pricing Strategy". If the idea is an app, title the first one "App Concept & Accessibility".
- Each section: 50 to 120 words in 2 to 4 blocks. A lead ends with a colon and is always followed by a list. Lists have 2 to 5 short items; when an item needs a reason, write "Label: explanation."
- Put the business plan (customers, revenue model, costs, first steps) in Market Success Potential and Pricing Strategy, and the marketing plan (audience, channels, launch steps) in Marketing Approach.
- Speak to the founder as "you". Plain, practical and honest about risks. No hype, no emoji, no markdown.
```

**Important:** `similar` and `equipment` are the model's own knowledge, not live data; the UI labels them "AI estimate / not verified" and links each name to a web search. The score, factors and chart are estimates, never promises. Keep that wording.

Add on the backend (not in the prototype): per-user rate limits, retries, a timeout, and logging of failures. Free-plan limits must be enforced server-side (section 7).

## 6. Voice input

- The prototype uses Claude's built-in dictation (Chromium only, language list unknown). That is not available in a native app.
- Recommended: record audio on the device and send it to a backend that calls OpenAI file transcription (`gpt-transcribe`). `whisper-1` is deprecated and shuts down 2027-02-26. The old Whisper price was $0.006 per minute; **check current pricing** before budgeting.
- Alternatives to evaluate: on-device iOS speech recognition (free, offline, fewer languages) or a mix.
- Never expose the transcription API key in the app.

## 7. Plans and payments (Stripe)

All prices and limits below are **sample values from the prototype, not decisions**:

| Plan | Month | Year | Limit |
|---|---|---|---|
| Free | $0 | $0 | 3 analyzed ideas a month |
| Plus | $6 | $57.60 | 20 analyzed ideas a month |
| Pro | $12 | $115.20 | unlimited |

- Payments are processed by **Stripe**. The app must never see or store a card number. Use Stripe's hosted or native payment sheet (Payment Element / PaymentSheet) and Stripe Billing for subscriptions, the customer portal for updating cards, and webhooks (`invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`) to keep `Billing` in sync.
- **Apple rule to verify before launch:** digital subscriptions sold inside an iPhone app normally must use Apple In-App Purchase, not Stripe. Confirm with Apple's current App Store Review Guidelines, or decide to take web-only checkout. This can change the whole payments design, so resolve it first.
- The prototype's card form is a demo (Luhn check, test card 4242 4242 4242 4242). Replace it entirely.
- Cancel keeps the plan active until the period ends (`cancelAtPeriodEnd`), then falls back to Free. Yearly = 20% off monthly x 12.
- Enforce limits on the server. The prototype shows usage but does not stop the person at the limit.

## 8. Storage and accounts

- The person chooses in Settings (and at sign-up step 2): **On this iPhone**, **On our server**, or **Both** (recommended: saved on the phone, backed up to the account, syncs when back online).
- The Terms of Use say ideas are stored on the server and on the iPhone. **Conflict to resolve:** the prototype's Free plan text says "Saved on this iPhone only" and Plus adds "Backup to your account". Either keep server backup in every plan and change the plan copy, or change the Terms. Decide before launch.
- Build real auth: email + password (hash with a modern algorithm such as argon2 or bcrypt), email verification, password reset by emailed link, change password, sign out, delete account (removes data from phone and server). Apple and Google sign-in buttons exist in the UI but are not wired (check App Store guideline 4.8 on login services: offering third-party login may require an equivalent privacy-preserving option such as Sign in with Apple).
- Sync design is open: last-write-wins per idea is enough to start; the transcript and report are the only large fields.

## 9. Terms of Use (sample text, have a lawyer review)

Ten sections in the prototype: About these terms; Your account; Your ideas belong to you; Where your ideas are stored (on our server and on your iPhone; Settings lets you choose server, iPhone only or both; deleting removes it from both); **We do not sell your ideas or your information** (nor share them with advertisers; the idea text is sent to the AI service we use, which acts for us and may use it only to produce your result); AI analysis is guidance, not a promise; Plans and payments (monthly or yearly, cancel in Settings; **payments are processed by Stripe, we never see or store your full card number**); Using Idealizator responsibly; Changes and ending; Contact. The date and contact address are placeholders. The text is in the prototype source (`TERMS` array). A Privacy Policy does not exist yet and should be written; the prototype only links the Terms.

## 10. Design system

- Tokens (`tokens.json`), CSS (`bundle.css`), React components (`bundle.js`, `window.Idealizator`) and per-component READMEs are in the design system artifact. Fira Sans only.
- Colours: violet `#b100d9` (capture and list grounds), paper `#ffffff` (report, Analyzed Ideas, Settings, plans, menu), violet-deep `#7d0099`, amber `#ffb700`, ink `#252525`, plus ink-soft, violet-tint, violet-line, violet-edge, field, and status colours success, warning, danger.
- Components: Screen, AppBar, PageTitle, Logo, Icon, Hero, RecordButton, Waveform, ProcessingIndicator, NavLink, FilterField, IdeaCard, IconButton, AiButton, ScoreGauge, ReportSection, Button, ScoreChip, Tag, Field, OptionCard, Segmented, StepIndicator, ListRow, MenuDrawer, Toast, Sheet. Flow pages: CaptureFlow, IdeasFlow, AccountFlow.
- Not yet in the design system (prototype only): Welcome page, Terms page, the Processing "thinking" backdrop, and the Result page's score panel, factor bars, chart, similar and equipment panels.
- If the app is native SwiftUI, treat the DS as a visual spec (tokens and READMEs) rather than code to port.
- Accessibility: 44 px touch targets, visible focus rings, reduced-motion support, colour never the only signal, text contrast checked on paper (amber numerals fail on white, so the gauge and verdict use band colours).

## 11. Open decisions

1. Apple In-App Purchase vs Stripe for subscriptions (section 7).
2. Final plan names, prices and limits.
3. Free plan storage vs the Terms (section 8).
4. Speech-to-text provider and languages (section 6).
5. Final legal text for Terms of Use and a Privacy Policy; real company name, address and support email.
6. Image attachments: allowed count and size, where stored.
7. Light theme only for now; dark theme not designed.
8. The "+" icon in the original mockup was navy; normalized to ink.

## 12. Suggested build order

1. Accounts and auth, local storage of ideas, navigation shell and menu.
2. Recording, transcription backend, AI filing (5.1), Recorded Ideas.
3. Analyze (5.2), Result, Analyzed Ideas, Email and Print.
4. Server sync and the storage setting.
5. Plans, Stripe or In-App Purchase, limits.
6. Terms, Privacy Policy, polish, accessibility pass, App Store submission.
