import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addLotSchema, STORAGE_LOCATIONS, type AddLotInput, type InventoryLot } from '@/features/food/api';
import { LOCATION_LABELS } from '@/features/food/labels';
import { useAddInventoryLot, useInventory } from '@/features/food/queries';

const COMMON_UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'pack', 'bag', 'can', 'bottle'];

// Quantity starts empty (NaN via valueAsNumber) so the user types a number rather than editing a placeholder 0.
const emptyForm: AddLotInput = { foodName: '', quantity: Number.NaN, unit: '', location: 'refrigerator', expirationDate: '' };

export function AddLotDialog({ onAdded }: { onAdded: (lot: InventoryLot) => void }) {
  const [open, setOpen] = useState(false);
  const addLot = useAddInventoryLot();
  const { data: inventory } = useInventory();

  // Known foods drive the name suggestions and pre-fill the unit, so re-stocking is name → quantity → save.
  const knownUnits = useMemo(
    () => new Map((inventory ?? []).map((lot) => [lot.foodName.toLowerCase(), lot.unit])),
    [inventory],
  );
  const knownNames = useMemo(() => [...new Set((inventory ?? []).map((lot) => lot.foodName))].sort(), [inventory]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AddLotInput>({ resolver: zodResolver(addLotSchema), defaultValues: emptyForm });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(emptyForm);
      addLot.reset();
    }
    setOpen(next);
  };

  const onSubmit = (values: AddLotInput) => {
    addLot.mutate(values, {
      onSuccess: (lot) => {
        handleOpenChange(false);
        onAdded(lot);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden />
          Add food
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add food</DialogTitle>
          <DialogDescription>Record a new batch. Each purchase is tracked separately by its expiry date.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.foodName}>
              <FieldLabel htmlFor="lot-name">Food</FieldLabel>
              <Input
                id="lot-name"
                list="lot-name-options"
                autoComplete="off"
                placeholder="e.g. Eggs"
                aria-invalid={!!errors.foodName}
                {...register('foodName', {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    const unit = knownUnits.get(event.target.value.trim().toLowerCase());
                    if (unit && !getValues('unit')) setValue('unit', unit);
                  },
                })}
              />
              <datalist id="lot-name-options">
                {knownNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <FieldError errors={[errors.foodName]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.quantity}>
                <FieldLabel htmlFor="lot-quantity">Quantity</FieldLabel>
                <Input
                  id="lot-quantity"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  aria-invalid={!!errors.quantity}
                  {...register('quantity', { valueAsNumber: true })}
                />
                <FieldError errors={[errors.quantity]} />
              </Field>
              <Field data-invalid={!!errors.unit}>
                <FieldLabel htmlFor="lot-unit">Unit</FieldLabel>
                <Input
                  id="lot-unit"
                  list="lot-unit-options"
                  autoComplete="off"
                  placeholder="pcs, g, L…"
                  aria-invalid={!!errors.unit}
                  {...register('unit')}
                />
                <datalist id="lot-unit-options">
                  {COMMON_UNITS.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
                <FieldError errors={[errors.unit]} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="lot-location">Stored in</FieldLabel>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="lot-location" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_LOCATIONS.map((location) => (
                        <SelectItem key={location} value={location}>
                          {LOCATION_LABELS[location]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field data-invalid={!!errors.expirationDate}>
              <FieldLabel htmlFor="lot-expiry">Expires on</FieldLabel>
              <Input
                id="lot-expiry"
                type="date"
                aria-invalid={!!errors.expirationDate}
                {...register('expirationDate')}
              />
              <FieldDescription>Leave empty for food that doesn't expire, like salt.</FieldDescription>
              <FieldError errors={[errors.expirationDate]} />
            </Field>
          </FieldGroup>

          {addLot.error ? (
            <p role="alert" className="text-sm text-destructive">
              {addLot.error.message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={addLot.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={addLot.isPending}>
              {addLot.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
