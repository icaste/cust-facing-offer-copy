import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatHeader } from '@/components/chat-header';
import {
  OFFER_TYPES,
  OFFER_TYPE_LABELS,
  type OfferType,
  type OfferResult,
  type OfferResponse,
} from '@chat-template/core';
import {
  PlusIcon,
  Trash2Icon,
  Loader2Icon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  UploadIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---------- Types ----------

interface OfferFormEntry {
  id: string;
  offerType: OfferType;
  offerDescription: string;
  existingCopy: string;
}

function createEmptyEntry(): OfferFormEntry {
  return {
    id: crypto.randomUUID(),
    offerType: 'discount',
    offerDescription: '',
    existingCopy: '',
  };
}

// ---------- Single offer card ----------

function OfferEntryCard({
  entry,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  entry: OfferFormEntry;
  index: number;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<OfferFormEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className='font-medium text-foreground text-sm'>
          Offer {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(entry.id)}
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Offer type */}
      <label
        htmlFor={`offer-type-${entry.id}`}
        className="mb-1 block text-muted-foreground text-xs"
      >
        Offer Type
      </label>
      <select
        id={`offer-type-${entry.id}`}
        value={entry.offerType}
        onChange={(e) =>
          onChange(entry.id, {
            offerType: e.target.value as OfferType,
          })
        }
        className="mb-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {OFFER_TYPES.map((t) => (
          <option key={t} value={t}>
            {OFFER_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      {/* Offer description */}
      <label
        htmlFor={`offer-desc-${entry.id}`}
        className="mb-1 block text-muted-foreground text-xs"
      >
        Offer Description
      </label>
      <Textarea
        id={`offer-desc-${entry.id}`}
        placeholder="Describe the offer (e.g., 20% off all running shoes for new customers)..."
        value={entry.offerDescription}
        onChange={(e) =>
          onChange(entry.id, { offerDescription: e.target.value })
        }
        className="mb-3 min-h-[72px]"
      />

      {/* Existing copy (optional) */}
      <label
        htmlFor={`offer-existing-${entry.id}`}
        className="mb-1 block text-muted-foreground text-xs"
      >
        Existing Copy{' '}
        <span className="text-muted-foreground/60">(optional)</span>
      </label>
      <Textarea
        id={`offer-existing-${entry.id}`}
        placeholder="Paste existing copy to modify, or leave blank to generate new copy..."
        value={entry.existingCopy}
        onChange={(e) =>
          onChange(entry.id, { existingCopy: e.target.value })
        }
        className="min-h-[60px]"
      />
    </div>
  );
}

// ---------- Result card ----------

function OfferResultCard({ result }: { result: OfferResult }) {
  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    },
    [],
  );

  const fullCopy = [
    result.copy.headline,
    result.copy.subheadline,
    result.copy.body,
    result.copy.callToAction,
    result.copy.legalDisclaimer
      ? `\n${result.copy.legalDisclaimer}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs',
              result.mode === 'generated'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}
          >
            {result.mode === 'generated'
              ? 'Generated'
              : 'Modified'}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {OFFER_TYPE_LABELS[result.offerType]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">
            {(result.processingTimeMs / 1000).toFixed(1)}s
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 h-6 w-6"
            onClick={() => copyToClipboard(fullCopy)}
            title="Copy all"
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs italic">
        {result.offerDescription.length > 100
          ? `${result.offerDescription.slice(0, 100)}...`
          : result.offerDescription}
      </p>

      <hr className="my-3 border-border" />

      <h3 className="mb-1 font-semibold text-lg leading-tight">
        {result.copy.headline}
      </h3>
      {result.copy.subheadline && (
        <p className="mb-2 text-muted-foreground text-sm">
          {result.copy.subheadline}
        </p>
      )}
      <p className="mb-3 text-sm">{result.copy.body}</p>
      <div className="mb-2 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm">
        {result.copy.callToAction}
      </div>
      {result.copy.legalDisclaimer && (
        <p className="mt-2 text-muted-foreground text-xs">
          {result.copy.legalDisclaimer}
        </p>
      )}
    </div>
  );
}

// ---------- CSV/JSON batch import ----------

function parseCsvBatch(text: string): OfferFormEntry[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Expect header: offerType,offerDescription,existingCopy
  const entries: OfferFormEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const offerType = cols[0] as OfferType;
    if (!OFFER_TYPES.includes(offerType)) continue;
    entries.push({
      id: crypto.randomUUID(),
      offerType,
      offerDescription: cols[1] ?? '',
      existingCopy: cols.slice(2).join(',') ?? '',
    });
  }
  return entries;
}

function parseJsonBatch(text: string): OfferFormEntry[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.offers ?? [];
  return arr
    .filter(
      (item: Record<string, unknown>) =>
        item.offerType &&
        OFFER_TYPES.includes(item.offerType as OfferType),
    )
    .map((item: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      offerType: item.offerType as OfferType,
      offerDescription: String(item.offerDescription ?? ''),
      existingCopy: String(item.existingCopy ?? ''),
    }));
}

// ---------- Main page ----------

export default function OfferPage() {
  const [entries, setEntries] = useState<OfferFormEntry[]>([
    createEmptyEntry(),
  ]);
  const [results, setResults] = useState<OfferResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);

  const updateEntry = useCallback(
    (id: string, patch: Partial<OfferFormEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  }, []);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();

      try {
        let imported: OfferFormEntry[];
        if (file.name.endsWith('.json')) {
          imported = parseJsonBatch(text);
        } else {
          imported = parseCsvBatch(text);
        }

        if (imported.length === 0) {
          toast.error('No valid offers found in file');
          return;
        }
        if (imported.length > 50) {
          toast.error('Maximum 50 offers per batch');
          imported = imported.slice(0, 50);
        }

        setEntries(imported);
        toast.success(`Imported ${imported.length} offers`);
      } catch {
        toast.error('Failed to parse file');
      }
      // Reset file input
      e.target.value = '';
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    // Validate
    const valid = entries.filter((e) => e.offerDescription.trim());
    if (valid.length === 0) {
      toast.error(
        'Please provide an offer description for at least one offer',
      );
      return;
    }

    setLoading(true);
    setResults([]);
    setTotalTime(null);

    try {
      const response = await fetch('/api/offers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offers: valid.map((e) => ({
            offerType: e.offerType,
            offerDescription: e.offerDescription,
            ...(e.existingCopy ? { existingCopy: e.existingCopy } : {}),
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message ?? 'Request failed');
      }

      const data: OfferResponse = await response.json();
      setResults(data.results);
      setTotalTime(data.totalProcessingTimeMs);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to generate offers',
      );
    } finally {
      setLoading(false);
    }
  }, [entries]);

  const exportResults = useCallback(() => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-copy-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="mb-6">
            <h1 className="font-semibold text-2xl">
              Offer Copy Generator
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Generate or modify customer-facing offer copy with
              structured inputs and consistent guidelines.
            </p>
          </div>

          {/* ---------- Input form ---------- */}
          <div className="mb-6 space-y-4">
            {entries.map((entry, i) => (
              <OfferEntryCard
                key={entry.id}
                entry={entry}
                index={i}
                canRemove={entries.length > 1}
                onChange={updateEntry}
                onRemove={removeEntry}
              />
            ))}
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEntry}
              disabled={entries.length >= 50}
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Offer
            </Button>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleFileImport}
              />
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground">
                <UploadIcon className="h-4 w-4" />
                Import CSV/JSON
              </span>
            </label>

            <div className="ml-auto">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Copy'
                )}
              </Button>
            </div>
          </div>

          {/* ---------- Results ---------- */}
          {results.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h2 className="font-semibold text-lg">Results</h2>
                  {totalTime !== null && (
                    <span className="text-muted-foreground text-xs">
                      ({(totalTime / 1000).toFixed(1)}s total)
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                >
                  Export JSON
                </Button>
              </div>
              <div className="space-y-4 pb-8">
                {results.map((r) => (
                  <OfferResultCard
                    key={`${r.offerType}-${r.offerDescription}`}
                    result={r}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
