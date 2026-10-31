import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryLot } from '@/features/food/api';
import { ExpirationBadge } from '@/features/food/components/inventory-badges';
import { LotRowActions } from '@/features/food/components/lot-row-actions';
import { daysUntil, getExpirationStatus } from '@/features/food/inventory-rules';
import { formatQuantity, LOCATION_LABELS } from '@/features/food/labels';
import { formatCalendarDate, formatRelativeDays } from '@/lib/format';

interface Props {
  /** Already filtered and in FEFO order. */
  lots: InventoryLot[];
  useFirst: Set<string>;
  today: string;
  emptyMessage: string;
  onNotice: (message: string) => void;
}

export function InventoryTable({ lots, useFirst, today, emptyMessage, onNotice }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Food</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            lots.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="truncate">{lot.foodName}</span>
                      {useFirst.has(lot.id) ? <Badge variant="secondary">Use first</Badge> : null}
                    </span>
                    {lot.category ? <span className="truncate text-muted-foreground">{lot.category}</span> : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatQuantity(lot)}</TableCell>
                <TableCell>{LOCATION_LABELS[lot.location]}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {lot.expirationDate ? (
                    <div className="flex flex-col">
                      <span>{formatCalendarDate(lot.expirationDate)}</span>
                      <span className="text-muted-foreground first-letter:uppercase">
                        {formatRelativeDays(daysUntil(lot.expirationDate, today))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ExpirationBadge status={getExpirationStatus(lot, today)} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <LotRowActions lot={lot} label={`${lot.foodName}, ${formatQuantity(lot)}`} onNotice={onNotice} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
