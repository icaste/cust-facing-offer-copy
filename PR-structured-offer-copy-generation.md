# PR: Add structured offer copy generation with batch support

**Branch:** `claude/add-structured-inputs-srLSn`
**Base:** `main`
**Files changed:** 9 (877 additions, 3 deletions)

---

## Summary

Introduces a dedicated offer copy generation system that transforms the generic chatbot application into a purpose-built tool for creating and revising customer-facing offer copy. The system accepts structured inputs (offer type + description), applies per-type copy guidelines via LLM system prompts, and returns validated structured JSON output.

- Add `POST /api/offers/generate` backend endpoint with batch support (up to 50 offers, 10 concurrent)
- Add per-offer-type copy guidelines enforced through system prompts (8 offer types)
- Add `/offers` frontend page with structured form, batch management, CSV/JSON import, and results display
- Enforce 5-second per-offer timeout for interactive use

---

## Requirements Traceability

| Must-Have Requirement | How It Is Met |
|---|---|
| Accept Offer Type and Offer Description as structured inputs | Zod schema (`offerRequestBodySchema`) validates `offerType` (enum of 8 types) and `offerDescription` (string). Frontend provides a dropdown selector and textarea per offer entry. |
| Support batch runs across multiple offers | API accepts an array of 1–50 offers processed with bounded concurrency (10 parallel). Frontend supports adding/removing entries and bulk import via CSV or JSON file. |
| Modify existing descriptions when present; generate new descriptions when absent | Each offer input has an optional `existingCopy` field. When present, the system prompt instructs the model to revise it; when absent, the model generates fresh copy. Results report `mode: "generated"` or `"modified"`. |
| Apply offer guidelines consistently across offer types | `buildOfferSystemPrompt()` injects general rules plus type-specific guidelines for each of the 8 offer types (discount, bundle, limited-time, loyalty, free-trial, referral, seasonal, clearance). |
| Produce outputs in a structured, repeatable format | Model output is parsed and validated against `offerCopySchema` (Zod): `headline`, `subheadline`, `body`, `callToAction`, `legalDisclaimer`. Full batch response is also validated. Results can be exported as JSON. |
| Return results fast enough for interactive use (<=5 s per offer) | Each LLM call uses `AbortSignal.timeout(5000)` and non-streaming `generateText` for minimal latency. Batch concurrency keeps total wall-clock time low. |

---

## Changes by Layer

### Backend

#### `packages/core/src/offer-guidelines.ts` (new)
- Defines 8 offer types: `discount`, `bundle`, `limited-time`, `loyalty`, `free-trial`, `referral`, `seasonal`, `clearance`
- Human-readable labels via `OFFER_TYPE_LABELS`
- Per-type copy guidelines (tone, structure, compliance rules)
- `buildOfferSystemPrompt(offerType)` — assembles the full system prompt with general rules + type-specific guidelines + JSON output format specification

#### `packages/core/src/schemas/offer.ts` (new)
- `offerRequestBodySchema` — validates the API request body (`offers` array, 1–50 items)
- `offerInputSchema` — validates each offer: `offerType` (enum), `offerDescription` (string, 1–2000 chars), `existingCopy` (optional, max 5000 chars)
- `offerCopySchema` — validates model output: `headline`, `subheadline` (nullable), `body`, `callToAction`, `legalDisclaimer` (nullable)
- `offerResultSchema` / `offerResponseSchema` — full response shapes with processing time metadata
- All schemas export inferred TypeScript types

#### `packages/core/src/index.ts` (modified)
- Exports new `schemas/offer` and `offer-guidelines` modules

#### `server/src/routes/offers.ts` (new)
- `POST /api/offers/generate` — authenticated endpoint
- `processOffer()` — builds user prompt (generate vs. modify), calls `generateText` with 5 s timeout, parses/validates JSON response
- `mapWithConcurrency()` — generic bounded-concurrency utility (cap: 10)
- Returns `{ results: OfferResult[], totalProcessingTimeMs: number }`

#### `server/src/index.ts` (modified)
- Registers `offersRouter` at `/api/offers`

### Frontend

#### `client/src/pages/OfferPage.tsx` (new)
- **OfferEntryCard** — form card per offer with accessible labels (`htmlFor`/`id`), offer-type dropdown, description textarea, optional existing-copy textarea
- **OfferResultCard** — displays structured output (headline, subheadline, body, CTA button preview, legal disclaimer), badges for mode and type, processing time, copy-to-clipboard
- **Batch management** — add/remove entries, max 50
- **CSV/JSON import** — `parseCsvBatch()` and `parseJsonBatch()` for bulk upload
- **JSON export** — downloads results as a timestamped `.json` file
- Loading state with spinner, toast notifications for errors

#### `client/src/App.tsx` (modified)
- Adds `<Route path="offers" element={<OfferPage />} />` under the chat layout

#### `client/src/components/app-sidebar.tsx` (modified)
- Adds "Offer Copy Generator" button with `SparklesIcon` in the sidebar for navigation

### Tests (auto-fixed by linter)

#### `tests/ai-sdk-provider/request-context.test.ts`
- Biome lint auto-fix: replaced `delete process.env.API_PROXY` with `process.env.API_PROXY = undefined`

---

## API Reference

### `POST /api/offers/generate`

**Authentication:** Required (same auth middleware as chat)

**Request body:**
```json
{
  "offers": [
    {
      "offerType": "discount",
      "offerDescription": "20% off all running shoes for new customers this weekend",
      "existingCopy": "Get a discount on shoes!"
    },
    {
      "offerType": "free-trial",
      "offerDescription": "14-day free trial of our premium analytics dashboard"
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "offerType": "discount",
      "offerDescription": "20% off all running shoes for new customers this weekend",
      "mode": "modified",
      "copy": {
        "headline": "Save 20% on Running Shoes This Weekend",
        "subheadline": "New customers get an exclusive discount on our full running collection",
        "body": "Step into savings with 20% off all running shoes. Whether you're training for a marathon or jogging around the block, find your perfect pair at a price that moves you.",
        "callToAction": "Shop Running Shoes Now",
        "legalDisclaimer": "Valid for new customers only. Offer ends Sunday at 11:59 PM EST. Cannot be combined with other promotions."
      },
      "processingTimeMs": 2340
    },
    {
      "offerType": "free-trial",
      "offerDescription": "14-day free trial of our premium analytics dashboard",
      "mode": "generated",
      "copy": {
        "headline": "Try Premium Analytics Free for 14 Days",
        "subheadline": null,
        "body": "Unlock the full power of our analytics dashboard with a no-commitment 14-day trial. Explore real-time insights, custom reports, and team collaboration features.",
        "callToAction": "Start Your Free Trial",
        "legalDisclaimer": "No credit card required. Trial converts to paid plan at $29/mo after 14 days unless cancelled."
      },
      "processingTimeMs": 1850
    }
  ],
  "totalProcessingTimeMs": 2340
}
```

**Supported offer types:** `discount`, `bundle`, `limited-time`, `loyalty`, `free-trial`, `referral`, `seasonal`, `clearance`

---

## Test Plan

- [ ] Verify `POST /api/offers/generate` returns 400 for missing/invalid `offerType`
- [ ] Verify `POST /api/offers/generate` returns 400 for empty `offers` array
- [ ] Verify single offer generation returns valid structured JSON with all required fields
- [ ] Verify batch of multiple offers returns correct number of results
- [ ] Verify `mode: "modified"` when `existingCopy` is provided
- [ ] Verify `mode: "generated"` when `existingCopy` is omitted
- [ ] Verify per-offer processing completes within 5 seconds
- [ ] Verify the `/offers` page renders the form with offer-type dropdown and description textarea
- [ ] Verify adding/removing offer entries works correctly
- [ ] Verify CSV import populates form entries
- [ ] Verify JSON import populates form entries
- [ ] Verify results display shows headline, body, CTA, and disclaimer
- [ ] Verify JSON export downloads a valid file
- [ ] Verify sidebar "Offer Copy Generator" link navigates to `/offers`
- [ ] Verify unauthenticated requests return 401
