import type { InventoryLot } from '@/features/food/api';
import {
  addDays,
  daysUntil,
  getExpirationStatus,
  localToday,
  pickUseFirstLots,
  sortByFefo,
} from '@/features/food/inventory-rules';

const TODAY = '2026-10-31';

function lot(overrides: Partial<InventoryLot> & Pick<InventoryLot, 'id'>): InventoryLot {
  return {
    foodItemId: 'food_eggs',
    foodName: 'Eggs',
    category: null,
    unit: 'pcs',
    quantity: 6,
    location: 'refrigerator',
    purchasedAt: '2026-10-20',
    expirationDate: '2026-11-10',
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
    ...overrides,
  };
}

describe('date helpers', () => {
  it('formats today as a local calendar date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('counts whole days across month and year boundaries', () => {
    expect(daysUntil('2026-11-01', TODAY)).toBe(1);
    expect(daysUntil('2026-10-30', TODAY)).toBe(-1);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('getExpirationStatus', () => {
  it.each([
    ['2026-10-30', 'expired'],
    ['2026-10-31', 'expiring-soon'], // expires today: still usable, but urgent
    ['2026-11-03', 'expiring-soon'], // 3 days out, boundary is inclusive
    ['2026-11-04', 'fresh'],
  ] as const)('expiry %s → %s', (expirationDate, expected) => {
    expect(getExpirationStatus({ quantity: 1, expirationDate }, TODAY)).toBe(expected);
  });

  it('reports lots without an expiry date as no-date', () => {
    expect(getExpirationStatus({ quantity: 1, expirationDate: null }, TODAY)).toBe('no-date');
  });

  it('treats an empty lot as used up, whatever its date', () => {
    expect(getExpirationStatus({ quantity: 0, expirationDate: '2026-10-01' }, TODAY)).toBe('used-up');
  });

  it('is derived from the date passed in, so the same lot ages without being rewritten', () => {
    const milk = { quantity: 1, expirationDate: '2026-11-02' };
    expect(getExpirationStatus(milk, '2026-10-20')).toBe('fresh');
    expect(getExpirationStatus(milk, TODAY)).toBe('expiring-soon');
    expect(getExpirationStatus(milk, '2026-11-03')).toBe('expired');
  });
});

describe('sortByFefo', () => {
  it('orders by earliest expiry and puts undated lots last', () => {
    const lots = [
      lot({ id: 'undated', expirationDate: null }),
      lot({ id: 'late', expirationDate: '2026-12-01' }),
      lot({ id: 'soon', expirationDate: '2026-11-01' }),
    ];
    expect(sortByFefo(lots).map((l) => l.id)).toEqual(['soon', 'late', 'undated']);
  });

  it('breaks expiry ties by the older purchase', () => {
    const lots = [
      lot({ id: 'newer', purchasedAt: '2026-10-25' }),
      lot({ id: 'older', purchasedAt: '2026-10-10' }),
    ];
    expect(sortByFefo(lots).map((l) => l.id)).toEqual(['older', 'newer']);
  });

  it('does not mutate its input', () => {
    const lots = [lot({ id: 'b', expirationDate: '2026-12-01' }), lot({ id: 'a', expirationDate: '2026-11-01' })];
    sortByFefo(lots);
    expect(lots.map((l) => l.id)).toEqual(['b', 'a']);
  });
});

describe('pickUseFirstLots', () => {
  it('picks the earliest-expiring lot per food item', () => {
    const lots = [
      lot({ id: 'eggs-late', expirationDate: '2026-11-20' }),
      lot({ id: 'eggs-soon', expirationDate: '2026-11-02' }),
      lot({ id: 'milk-a', foodItemId: 'food_milk', expirationDate: '2026-11-05' }),
      lot({ id: 'milk-b', foodItemId: 'food_milk', expirationDate: '2026-11-04' }),
    ];
    expect(pickUseFirstLots(lots, TODAY)).toEqual(new Set(['eggs-soon', 'milk-b']));
  });

  it('skips expired lots and recommends the next good one', () => {
    const lots = [
      lot({ id: 'expired', expirationDate: '2026-10-29' }),
      lot({ id: 'good', expirationDate: '2026-11-08' }),
    ];
    expect(pickUseFirstLots(lots, TODAY)).toEqual(new Set(['good']));
  });

  it('ignores used-up lots and items with a single lot', () => {
    const lots = [
      lot({ id: 'empty', quantity: 0, expirationDate: '2026-11-01' }),
      lot({ id: 'only', expirationDate: '2026-11-08' }),
      lot({ id: 'rice', foodItemId: 'food_rice' }),
    ];
    expect(pickUseFirstLots(lots, TODAY).size).toBe(0);
  });
});
