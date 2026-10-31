import type { InventoryLot } from '@/features/food/api';
import { addDays, localToday } from '@/features/food/inventory-rules';

// Placeholder data shown until the backend's inventory endpoints exist. Dates are relative to today so the
// expired / expiring-soon examples stay meaningful whenever the app is opened.
const today = localToday();
const day = (offset: number) => addDays(today, offset);

type Seed = Omit<InventoryLot, 'createdAt' | 'updatedAt'>;

const seeds: Seed[] = [
  { id: 'lot_01', foodItemId: 'food_eggs', foodName: 'Eggs', category: 'Dairy & eggs', unit: 'pcs', quantity: 4, location: 'refrigerator', purchasedAt: day(-10), expirationDate: day(2) },
  { id: 'lot_02', foodItemId: 'food_eggs', foodName: 'Eggs', category: 'Dairy & eggs', unit: 'pcs', quantity: 10, location: 'refrigerator', purchasedAt: day(-1), expirationDate: day(18) },
  { id: 'lot_03', foodItemId: 'food_milk', foodName: 'Milk', category: 'Dairy & eggs', unit: 'L', quantity: 1, location: 'refrigerator', purchasedAt: day(-8), expirationDate: day(-1) },
  { id: 'lot_04', foodItemId: 'food_milk', foodName: 'Milk', category: 'Dairy & eggs', unit: 'L', quantity: 2, location: 'refrigerator', purchasedAt: day(-1), expirationDate: day(6) },
  { id: 'lot_05', foodItemId: 'food_spinach', foodName: 'Spinach', category: 'Vegetables', unit: 'g', quantity: 200, location: 'refrigerator', purchasedAt: day(-3), expirationDate: day(1) },
  { id: 'lot_06', foodItemId: 'food_yogurt', foodName: 'Greek yogurt', category: 'Dairy & eggs', unit: 'cups', quantity: 3, location: 'refrigerator', purchasedAt: day(-2), expirationDate: day(9) },
  { id: 'lot_07', foodItemId: 'food_chicken', foodName: 'Chicken breast', category: 'Meat & fish', unit: 'g', quantity: 750, location: 'freezer', purchasedAt: day(-20), expirationDate: day(70) },
  { id: 'lot_08', foodItemId: 'food_peas', foodName: 'Frozen peas', category: 'Vegetables', unit: 'bags', quantity: 2, location: 'freezer', purchasedAt: day(-30), expirationDate: day(150) },
  { id: 'lot_09', foodItemId: 'food_rice', foodName: 'Jasmine rice', category: 'Grains', unit: 'kg', quantity: 3.5, location: 'pantry', purchasedAt: day(-40), expirationDate: day(320) },
  { id: 'lot_10', foodItemId: 'food_salt', foodName: 'Sea salt', category: 'Condiments', unit: 'g', quantity: 500, location: 'pantry', purchasedAt: day(-90), expirationDate: null },
  { id: 'lot_11', foodItemId: 'food_coconut', foodName: 'Coconut water', category: 'Drinks', unit: 'cans', quantity: 6, location: 'other', purchasedAt: day(-5), expirationDate: day(40) },
];

export const STATIC_INVENTORY: InventoryLot[] = seeds.map((seed) => ({
  ...seed,
  createdAt: `${seed.purchasedAt ?? today}T09:00:00.000Z`,
  updatedAt: `${today}T09:00:00.000Z`,
}));
