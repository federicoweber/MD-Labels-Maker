import type { LabelData } from './types';

const KEY = 'md-labels';
const VERSION = 1;

/**
 * Persisted shape. `discs` is an array from the start so multi-disc support can
 * be added without a storage migration.
 */
export interface StoredState {
  version: number;
  discs: LabelData[];
}

/** Load saved discs, each merged onto `fallback` so new fields get defaults. */
export function loadDiscs(fallback: LabelData): LabelData[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [fallback];
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed?.discs?.length) return [fallback];
    return parsed.discs.map((d) => ({ ...fallback, ...d }));
  } catch {
    return [fallback];
  }
}

export function saveDiscs(discs: LabelData[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, discs }));
  } catch {
    /* quota / private mode — ignore */
  }
}
