import { z } from 'zod';
import { OFFER_TYPES } from '../offer-guidelines';

// ---------- Input schemas ----------

const offerInputSchema = z.object({
  /** The type of offer (determines which guidelines are applied). */
  offerType: z.enum(OFFER_TYPES),
  /** A free-text description of the offer to generate copy for. */
  offerDescription: z.string().min(1).max(2000),
  /**
   * Optional existing copy to modify.
   * When present the model will revise this text; when absent it generates new copy.
   */
  existingCopy: z.string().max(5000).optional(),
});

export type OfferInput = z.infer<typeof offerInputSchema>;

/** Accepts either a single offer or an array of up to 50 offers. */
export const offerRequestBodySchema = z.object({
  offers: z
    .array(offerInputSchema)
    .min(1, 'At least one offer is required')
    .max(50, 'Maximum 50 offers per batch'),
});

export type OfferRequestBody = z.infer<typeof offerRequestBodySchema>;

// ---------- Output schemas ----------

export const offerCopySchema = z.object({
  headline: z.string(),
  subheadline: z.string().nullable(),
  body: z.string(),
  callToAction: z.string(),
  legalDisclaimer: z.string().nullable(),
});

export type OfferCopy = z.infer<typeof offerCopySchema>;

export const offerResultSchema = z.object({
  /** Echo back the input so results can be correlated. */
  offerType: z.enum(OFFER_TYPES),
  offerDescription: z.string(),
  /** Whether the model modified existing copy or generated new copy. */
  mode: z.enum(['generated', 'modified']),
  /** The structured copy produced by the model. */
  copy: offerCopySchema,
  /** Processing time in milliseconds for this offer. */
  processingTimeMs: z.number(),
});

export type OfferResult = z.infer<typeof offerResultSchema>;

export const offerResponseSchema = z.object({
  results: z.array(offerResultSchema),
  totalProcessingTimeMs: z.number(),
});

export type OfferResponse = z.infer<typeof offerResponseSchema>;
