/**
 * Offer type definitions and copy guidelines.
 *
 * Each offer type has a set of guidelines the LLM must follow
 * when generating or modifying customer-facing copy.
 */

export const OFFER_TYPES = [
  'discount',
  'bundle',
  'limited-time',
  'loyalty',
  'free-trial',
  'referral',
  'seasonal',
  'clearance',
] as const;

export type OfferType = (typeof OFFER_TYPES)[number];

/** Human-readable labels for each offer type */
export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  discount: 'Discount',
  bundle: 'Bundle',
  'limited-time': 'Limited-Time',
  loyalty: 'Loyalty / Rewards',
  'free-trial': 'Free Trial',
  referral: 'Referral',
  seasonal: 'Seasonal',
  clearance: 'Clearance',
};

/** Per-offer-type copy guidelines injected into the system prompt */
const OFFER_GUIDELINES: Record<OfferType, string> = {
  discount: `
- Lead with the percentage or dollar amount saved.
- Use urgency language only if there is a genuine deadline.
- Include any minimum-purchase or eligibility conditions upfront.
- Avoid superlatives like "best deal ever" without substantiation.
- End with a clear, single call-to-action.`.trim(),

  bundle: `
- Emphasize the combined value and convenience of the bundle.
- List the included items or services clearly.
- State the total savings compared to purchasing items separately.
- Highlight any exclusive items available only in the bundle.
- Keep the call-to-action focused on the bundle, not individual items.`.trim(),

  'limited-time': `
- State the exact deadline (date/time) or remaining quantity.
- Create urgency without misleading the reader.
- Highlight what makes the offer time-sensitive.
- Use countdown-style language where appropriate.
- Ensure legal/regulatory compliance with urgency claims.`.trim(),

  loyalty: `
- Thank the customer for their continued patronage.
- Clearly explain the reward and how to redeem it.
- Mention any point thresholds or tier requirements.
- Reinforce the value of staying in the loyalty program.
- Keep the tone warm and appreciative.`.trim(),

  'free-trial': `
- State the trial duration and what is included.
- Be transparent about what happens after the trial ends.
- Highlight key features the customer can explore.
- Minimize friction—emphasize ease of getting started.
- Disclose any payment information requirements upfront.`.trim(),

  referral: `
- Clearly explain the reward for both referrer and referee.
- Keep sharing instructions simple (one or two steps).
- Emphasize the mutual benefit.
- Include any caps or expiration on referral rewards.
- Use social-proof language where appropriate.`.trim(),

  seasonal: `
- Tie the offer to the specific season, holiday, or event.
- Use festive but professional language.
- State the promotion period clearly.
- Highlight products or services relevant to the season.
- Avoid clichés; be specific about the value offered.`.trim(),

  clearance: `
- Emphasize the depth of the discount ("up to X% off").
- Note limited stock or "while supplies last" where true.
- Be transparent that items are being cleared.
- Organize by category if multiple product lines are involved.
- Include any final-sale or no-return conditions.`.trim(),
};

/**
 * Builds the full system prompt for generating or modifying offer copy.
 */
export function buildOfferSystemPrompt(offerType: OfferType): string {
  const guidelines = OFFER_GUIDELINES[offerType];

  return `You are an expert marketing copywriter specializing in customer-facing offer copy.

Your task is to produce structured offer copy that is clear, compelling, and compliant.

GENERAL RULES (apply to every offer type):
- Write in a professional yet approachable tone.
- Be concise. Every word must earn its place.
- Never make false or unsubstantiated claims.
- Include any necessary legal disclaimers as a separate field.
- Always include a single, actionable call-to-action.
- Do not use ALL CAPS for emphasis; rely on word choice.
- Avoid jargon unless the target audience expects it.

SPECIFIC GUIDELINES FOR "${OFFER_TYPE_LABELS[offerType]}" OFFERS:
${guidelines}

OUTPUT FORMAT:
You must respond with valid JSON matching this exact schema, and nothing else:
{
  "headline": "<short, attention-grabbing headline — max 100 characters>",
  "subheadline": "<optional supporting line — max 150 characters, or null>",
  "body": "<main offer description — 1 to 3 sentences>",
  "callToAction": "<button/link text — max 40 characters>",
  "legalDisclaimer": "<any terms, conditions, or disclaimers — or null if none needed>"
}

IMPORTANT:
- Respond ONLY with the JSON object. No markdown fences, no commentary.
- If you are modifying an existing description, preserve the original intent and key details while improving clarity, compliance, and persuasiveness.
- If generating from scratch, use the offer description to craft compelling copy.`;
}
