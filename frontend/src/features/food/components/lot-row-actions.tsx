import { useState } from 'react';
import { MoreHorizontalIcon, Trash2Icon, UtensilsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InventoryLot } from '@/features/food/api';
import { AdjustLotDialog, type AdjustKind } from '@/features/food/components/adjust-lot-dialog';

interface Props {
  lot: InventoryLot;
  label: string;
  onNotice: (message: string) => void;
}

export function LotRowActions({ lot, label, onNotice }: Props) {
  const [kind, setKind] = useState<AdjustKind | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${label}`}>
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="cursor-pointer p-2" onSelect={() => setKind('consume')}>
            <UtensilsIcon aria-hidden />
            Use
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className="cursor-pointer p-2" onSelect={() => setKind('discard')}>
            <Trash2Icon aria-hidden />
            Discard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu so it survives the menu closing; keyed so switching kind starts a fresh form. */}
      {kind ? (
        <AdjustLotDialog
          key={kind}
          lot={lot}
          kind={kind}
          open
          onOpenChange={(open) => !open && setKind(null)}
          onDone={onNotice}
        />
      ) : null}
    </>
  );
}
