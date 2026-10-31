import type { InventoryLot } from '@/features/food/api';

/** A lot expiring within this many days (inclusive) needs attention. */
export const EXPIRING_SOON_DAYS = 3;

export type ExpirationStatus = 'used-up' | 'expired' | 'expiring-soon' | 'fresh' | 'no-date';

const DAY_MS = 86_400_000;

/** Today as YYYY-MM-DD in the user's time zone — expiry dates are calendar days, not instants. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `today` to `date`; negative once it has passed. Date-only strings parse as UTC midnight, so no DST drift. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS);
}

/** Derived on every read from today + expiry + remaining quantity (spec §6.5) — never stored. */
export function getExpirationStatus(
  lot: Pick<InventoryLot, 'quantity' | 'expirationDate'>,
  today: string,
): ExpirationStatus {
  if (lot.quantity <= 0) return 'used-up';
  if (!lot.expirationDate) return 'no-date';
  const days = daysUntil(lot.expirationDate, today);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_SOON_DAYS) return 'expiring-soon';
  return 'fresh';
}

type FefoFields = Pick<InventoryLot, 'id' | 'expirationDate' | 'purchasedAt' | 'createdAt'>;

/** FEFO: earliest expiry first, undated lots last; ties go to the older purchase, then the older record. */
export function compareFefo(a: FefoFields, b: FefoFields): number {
  if (a.expirationDate !== b.expirationDate) {
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;
    return a.expirationDate < b.expirationDate ? -1 : 1;
  }
  const aBought = a.purchasedAt ?? a.createdAt;
  const bBought = b.purchasedAt ?? b.createdAt;
  if (aBought !== bBought) return aBought < bBought ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export function sortByFefo<T extends FefoFields>(lots: readonly T[]): T[] {
  return [...lots].sort(compareFefo);
}

/**
 * For each food item with more than one lot in stock, the lot to use first: the FEFO-earliest one that hasn't
 * expired (expired lots should be discarded, not eaten). Single-lot items get no recommendation — it'd be noise.
 */
export function pickUseFirstLots(lots: readonly InventoryLot[], today: string): Set<string> {
  const byItem = new Map<string, InventoryLot[]>();
  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    byItem.set(lot.foodItemId, [...(byItem.get(lot.foodItemId) ?? []), lot]);
  }

  const ids = new Set<string>();
  for (const itemLots of byItem.values()) {
    if (itemLots.length < 2) continue;
    const first = sortByFefo(itemLots).find((lot) => getExpirationStatus(lot, today) !== 'expired');
    if (first) ids.add(first.id);
  }
  return ids;
}
