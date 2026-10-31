import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

// Assumed contract — the backend Food module doesn't exist yet (spec §6.6). A lot is returned joined with its
// food item's name, category and unit. Expiration status is never sent: it goes stale, so the client derives it.
export const STORAGE_LOCATIONS = ['refrigerator', 'freezer', 'pantry', 'other'] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const inventoryLotSchema = z.object({
  id: z.string(),
  foodItemId: z.string(),
  foodName: z.string(),
  category: z.string().nullable(),
  unit: z.string(),
  quantity: z.number().nonnegative(),
  location: z.enum(STORAGE_LOCATIONS),
  purchasedAt: z.iso.date().nullable(),
  expirationDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type InventoryLot = z.infer<typeof inventoryLotSchema>;

const quantitySchema = z
  .number({ error: 'Enter a quantity' })
  .positive('Must be more than 0')
  .max(100_000, 'That looks too large');

// Spec §6.7 fast-entry flow: name → quantity + unit → location → expiry → save. The backend reuses an existing
// food item with the same name (case-insensitive) or creates one, so the user never manages items separately.
export const addLotSchema = z.object({
  foodName: z.string().trim().min(1, 'Enter a food name').max(80, 'Keep it under 80 characters'),
  quantity: quantitySchema,
  unit: z.string().trim().min(1, 'Enter a unit').max(20, 'Keep it under 20 characters'),
  location: z.enum(STORAGE_LOCATIONS),
  expirationDate: z.union([z.iso.date({ error: 'Enter a valid date' }), z.literal('')]),
});
export type AddLotInput = z.infer<typeof addLotSchema>;

/** Consume/discard amount, capped at what the lot still holds. */
export const adjustQuantitySchema = (available: number) =>
  z.object({ quantity: quantitySchema.max(available, `Only ${available} left in this lot`) });
export type AdjustQuantityInput = { quantity: number };

export function listInventory() {
  return apiRequest('/v1/inventory', z.array(inventoryLotSchema));
}

export function addInventoryLot({ expirationDate, ...input }: AddLotInput) {
  return apiRequest('/v1/inventory', inventoryLotSchema, {
    method: 'POST',
    body: JSON.stringify({ ...input, expirationDate: expirationDate || null }),
  });
}

// Both write a food_transactions row server-side in the same DB transaction as the quantity change.
export function consumeLot({ lotId, quantity }: { lotId: string; quantity: number }) {
  return apiRequest(`/v1/inventory/${encodeURIComponent(lotId)}/consume`, inventoryLotSchema, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export function discardLot({ lotId, quantity }: { lotId: string; quantity: number }) {
  return apiRequest(`/v1/inventory/${encodeURIComponent(lotId)}/discard`, inventoryLotSchema, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}
