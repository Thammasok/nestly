import type { InventoryLot, StorageLocation } from '@/features/food/api';
import { formatNumber } from '@/lib/format';

export const LOCATION_LABELS: Record<StorageLocation, string> = {
  refrigerator: 'Fridge',
  freezer: 'Freezer',
  pantry: 'Pantry',
  other: 'Other',
};

export const formatQuantity = (lot: Pick<InventoryLot, 'quantity' | 'unit'>) =>
  `${formatNumber(lot.quantity)} ${lot.unit}`;
