import { useState } from 'react';
import { AddLotDialog } from '@/features/food/components/add-lot-dialog';
import { formatQuantity, LOCATION_LABELS } from '@/features/food/labels';
import { InventoryPanel } from '@/features/food/components/inventory-panel';

export function FoodInventoryPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Food inventory</h1>
          <p className="text-muted-foreground">What's in the fridge, freezer and pantry — soonest to expire first.</p>
        </div>
        <AddLotDialog
          onAdded={(lot) =>
            setNotice(`Added ${formatQuantity(lot)} of ${lot.foodName} to the ${LOCATION_LABELS[lot.location].toLowerCase()}`)
          }
        />
      </div>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {notice}
      </p>
      <InventoryPanel onNotice={setNotice} />
    </div>
  );
}
