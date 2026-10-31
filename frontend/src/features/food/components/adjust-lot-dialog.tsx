import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { adjustQuantitySchema, type AdjustQuantityInput, type InventoryLot } from '@/features/food/api';
import { formatQuantity, LOCATION_LABELS } from '@/features/food/labels';
import { useConsumeLot, useDiscardLot } from '@/features/food/queries';

export type AdjustKind = 'consume' | 'discard';

const copy = {
  consume: { title: 'Use', submit: 'Record use', pending: 'Saving…', done: 'Used' },
  discard: { title: 'Discard', submit: 'Discard', pending: 'Discarding…', done: 'Discarded' },
} satisfies Record<AdjustKind, Record<string, string>>;

interface Props {
  lot: InventoryLot;
  kind: AdjustKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}

/**
 * Records a consume or discard against one lot; the backend writes the matching food_transactions row.
 * The parent mounts it only while open, so every open starts with a fresh form and mutation state.
 */
export function AdjustLotDialog({ lot, kind, open, onOpenChange, onDone }: Props) {
  const consume = useConsumeLot();
  const discard = useDiscardLot();
  const mutation = kind === 'consume' ? consume : discard;
  const text = copy[kind];
  // Discarding is usually the whole lot (it went off); using is usually part of it.
  const defaultValues = { quantity: kind === 'discard' ? lot.quantity : Number.NaN };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdjustQuantityInput>({ resolver: zodResolver(adjustQuantitySchema(lot.quantity)), defaultValues });

  const onSubmit = ({ quantity }: AdjustQuantityInput) => {
    mutation.mutate(
      { lotId: lot.id, quantity },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDone(`${text.done} ${formatQuantity({ quantity, unit: lot.unit })} of ${lot.foodName}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {text.title} {lot.foodName}
          </DialogTitle>
          <DialogDescription>
            {formatQuantity(lot)} left in the {LOCATION_LABELS[lot.location].toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.quantity}>
            <FieldLabel htmlFor={`adjust-${lot.id}`}>Quantity ({lot.unit})</FieldLabel>
            <div className="flex gap-2">
              <Input
                id={`adjust-${lot.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-invalid={!!errors.quantity}
                {...register('quantity', { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setValue('quantity', lot.quantity, { shouldValidate: true })}
              >
                All
              </Button>
            </div>
            <FieldError errors={[errors.quantity]} />
          </Field>

          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant={kind === 'discard' ? 'destructive' : 'default'} disabled={mutation.isPending}>
              {mutation.isPending ? text.pending : text.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
