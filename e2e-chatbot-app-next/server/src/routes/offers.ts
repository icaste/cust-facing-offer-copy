import {
  Router,
  type Request,
  type Response,
  type Router as RouterType,
} from 'express';
import { generateText } from 'ai';

import { authMiddleware, requireAuth } from '../middleware/auth';
import {
  myProvider,
  offerRequestBodySchema,
  type OfferInput,
  type OfferResult,
  type OfferResponse,
  offerCopySchema,
  buildOfferSystemPrompt,
} from '@chat-template/core';
import { ChatSDKError } from '@chat-template/core/errors';

export const offersRouter: RouterType = Router();

offersRouter.use(authMiddleware);

/** Maximum wall-clock time allowed per individual offer (ms). */
const PER_OFFER_TIMEOUT_MS = 5_000;

/** Maximum number of offers processed concurrently in a batch. */
const BATCH_CONCURRENCY = 10;

/**
 * Process a single offer: call the LLM and return structured copy.
 */
async function processOffer(offer: OfferInput): Promise<OfferResult> {
  const start = Date.now();

  const systemPrompt = buildOfferSystemPrompt(offer.offerType);

  // Build the user prompt based on whether we are modifying or generating
  let userPrompt: string;
  if (offer.existingCopy) {
    userPrompt = [
      'OFFER DESCRIPTION:',
      offer.offerDescription,
      '',
      'EXISTING COPY TO MODIFY:',
      offer.existingCopy,
      '',
      'Please revise the existing copy to better follow the guidelines while preserving the original intent.',
    ].join('\n');
  } else {
    userPrompt = [
      'OFFER DESCRIPTION:',
      offer.offerDescription,
      '',
      'Please generate new customer-facing copy for this offer.',
    ].join('\n');
  }

  const model = await myProvider.languageModel('chat-model');

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    abortSignal: AbortSignal.timeout(PER_OFFER_TIMEOUT_MS),
  });

  // Parse the JSON response from the model
  let parsed: unknown;
  try {
    // Strip markdown code fences if the model included them
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Model returned invalid JSON for offer "${offer.offerDescription.slice(0, 60)}…": ${text.slice(0, 200)}`,
    );
  }

  const copy = offerCopySchema.parse(parsed);

  return {
    offerType: offer.offerType,
    offerDescription: offer.offerDescription,
    mode: offer.existingCopy ? 'modified' : 'generated',
    copy,
    processingTimeMs: Date.now() - start,
  };
}

/**
 * Run an array of promises with bounded concurrency.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * POST /api/offers/generate
 *
 * Accepts structured offer inputs (single or batch) and returns
 * generated / modified copy in a structured JSON format.
 */
offersRouter.post(
  '/generate',
  requireAuth,
  async (req: Request, res: Response) => {
    let body: { offers: OfferInput[] };

    try {
      body = offerRequestBodySchema.parse(req.body);
    } catch (_) {
      console.error('Error parsing offer request body:', _);
      const error = new ChatSDKError('bad_request:api');
      const response = error.toResponse();
      return res.status(response.status).json(response.json);
    }

    const batchStart = Date.now();

    try {
      const results = await mapWithConcurrency(
        body.offers,
        BATCH_CONCURRENCY,
        async (offer) => processOffer(offer),
      );

      const response: OfferResponse = {
        results,
        totalProcessingTimeMs: Date.now() - batchStart,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating offer copy:', error);

      if (error instanceof ChatSDKError) {
        const response = error.toResponse();
        return res.status(response.status).json(response.json);
      }

      return res.status(500).json({
        error: 'Failed to generate offer copy',
        message:
          error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);
