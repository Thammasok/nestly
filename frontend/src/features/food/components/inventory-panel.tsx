import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { STORAGE_LOCATIONS, type InventoryLot, type StorageLocation } from '@/features/food/api';
import { LOCATION_LABELS } from '@/features/food/labels';
import { InventoryTable } from '@/features/food/components/inventory-table';
import { EXPIRING_SOON_DAYS, getExpirationStatus, localToday, pickUseFirstLots, sortByFefo } from '@/features/food/inventory-rules';
import { useInventory } from '@/features/food/queries';

type LocationFilter = StorageLocation | 'all';
const isLocation = (value: string | null): value is StorageLocation =>
  STORAGE_LOCATIONS.some((location) => location === value);

function matchesSearch(lot: InventoryLot, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || lot.foodName.toLowerCase().includes(needle) || !!lot.category?.toLowerCase().includes(needle);
}

export function InventoryPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const { data, isPending, isError, error, refetch, isFetching } = useInventory();
  // Location filter lives in the URL so /food/inventory?location=freezer can be linked and survives refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('location');
  const location: LocationFilter = isLocation(requested) ? requested : 'all';
  const [search, setSearch] = useState('');
  const today = localToday();

  // Used-up lots are history, not stock. FEFO order means the top of the list is what to eat next.
  const inStock = useMemo(() => sortByFefo((data ?? []).filter((lot) => lot.quantity > 0)), [data]);
  const useFirst = useMemo(() => pickUseFirstLots(inStock, today), [inStock, today]);
  const counts = useMemo(() => {
    const statuses = inStock.map((lot) => getExpirationStatus(lot, today));
    return {
      total: inStock.length,
      expiringSoon: statuses.filter((status) => status === 'expiring-soon').length,
      expired: statuses.filter((status) => status === 'expired').length,
    };
  }, [inStock, today]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading inventory">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const visible = inStock.filter(
    (lot) => (location === 'all' || lot.location === location) && matchesSearch(lot, search),
  );
  let emptyMessage = 'Nothing in stock yet. Add the first item with "Add food".';
  if (search.trim()) emptyMessage = `No food matches "${search.trim()}".`;
  else if (location !== 'all' && inStock.length > 0) emptyMessage = `Nothing in the ${LOCATION_LABELS[location].toLowerCase()}.`;

  const summary = [
    { label: 'In stock', value: counts.total, hint: 'batches across all storage' },
    { label: 'Expiring soon', value: counts.expiringSoon, hint: `within the next ${EXPIRING_SOON_DAYS} days` },
    { label: 'Expired', value: counts.expired, hint: 'discard or check them' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map(({ label, value, hint }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="-mx-1 overflow-x-auto px-1">
              <ToggleGroup
                type="single"
                variant="outline"
                aria-label="Storage location"
                value={location}
                // Radix allows deselecting a single toggle; ignore that so one filter is always active.
                onValueChange={(value) => {
                  if (!value) return;
                  setSearchParams(value === 'all' ? {} : { location: value }, { replace: true });
                }}
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                {STORAGE_LOCATIONS.map((value) => (
                  <ToggleGroupItem key={value} value={value}>
                    {LOCATION_LABELS[value]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="relative md:w-64">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search food or category"
                aria-label="Search inventory"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <InventoryTable
            lots={visible}
            useFirst={useFirst}
            today={today}
            emptyMessage={emptyMessage}
            onNotice={onNotice}
          />
        </CardContent>
      </Card>
    </div>
  );
}
