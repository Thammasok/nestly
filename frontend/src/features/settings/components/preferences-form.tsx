import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { preferencesSchema, type Preferences } from '@/features/settings/schema';
import { usePreferencesStore } from '@/features/settings/store';

export function PreferencesForm() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const savePreferences = usePreferencesStore((state) => state.savePreferences);
  const [hasSaved, setHasSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: preferences,
  });

  const onSubmit = (values: Preferences) => {
    savePreferences(values);
    reset(values); // new baseline, so the form is no longer dirty
    setHasSaved(true);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle>Home</CardTitle>
          <CardDescription>
            Your home's name and food expiry reminders. Saved in this browser for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <FieldGroup>
            <Field data-invalid={!!errors.homeName}>
              <FieldLabel htmlFor="homeName">Home name</FieldLabel>
              <Input id="homeName" aria-invalid={!!errors.homeName} {...register('homeName')} />
              <FieldError errors={[errors.homeName]} />
            </Field>

            <Field data-invalid={!!errors.expiringSoonDays}>
              <FieldLabel htmlFor="expiringSoonDays">Food "expiring soon" window</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="expiringSoonDays"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  className="w-24"
                  aria-invalid={!!errors.expiringSoonDays}
                  {...register('expiringSoonDays', { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">days before expiry</span>
              </div>
              <FieldError errors={[errors.expiringSoonDays]} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <p role="status" className="mr-auto text-sm text-muted-foreground">
            {hasSaved && !isDirty ? 'Saved' : null}
          </p>
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
