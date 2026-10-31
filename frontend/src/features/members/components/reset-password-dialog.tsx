import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react';
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { resetPasswordSchema, type Member, type ResetPasswordInput } from '@/features/members/api';
import { useResetMemberPassword } from '@/features/members/queries';
import { generatePassword } from '@/lib/password';

const emptyForm: ResetPasswordInput = { password: '' };

type CopyState = 'idle' | 'copied' | 'failed';

interface Props {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function ResetPasswordDialog({ member, open, onOpenChange, onDone }: Props) {
  const resetPassword = useResetMemberPassword();
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: emptyForm,
  });
  const password = useWatch({ control, name: 'password' });

  // "Copied" reverts after a moment; any edit to the password also clears it (see onChange below).
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  // Never keep a password around after the dialog closes.
  const handleOpenChange = (next: boolean) => {
    if (resetPassword.isPending) return;
    if (!next) {
      reset(emptyForm);
      resetPassword.reset();
      setCopyState('idle');
    }
    onOpenChange(next);
  };

  const generate = () => {
    setValue('password', generatePassword(), { shouldValidate: true, shouldDirty: true });
    setCopyState('idle');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopyState('copied');
    } catch {
      // Clipboard API is unavailable outside secure contexts or when permission is denied.
      setCopyState('failed');
    }
  };

  const onSubmit = (values: ResetPasswordInput) => {
    resetPassword.mutate(
      { memberId: member.id, password: values.password },
      {
        onSuccess: () => {
          handleOpenChange(false);
          onDone();
        },
      },
    );
  };

  const passwordField = register('password', { onChange: () => setCopyState('idle') });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {member.name}. Their current password stops working immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <div className="flex gap-2">
                {/* Shown as plain text: the admin has to read it to pass it on. */}
                <Input
                  id="reset-password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  aria-invalid={!!errors.password}
                  {...passwordField}
                />
                <Button type="button" variant="outline" size="icon" aria-label="Generate password" onClick={generate}>
                  <RefreshCwIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={copyState === 'copied' ? 'Copied' : 'Copy password'}
                  disabled={!password}
                  onClick={copy}
                >
                  {copyState === 'copied' ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
              </div>
              <FieldDescription role={copyState === 'idle' ? undefined : 'status'}>
                {copyState === 'copied'
                  ? 'Copied to clipboard.'
                  : copyState === 'failed'
                    ? "Couldn't copy — select the password and copy it manually."
                    : `Type one or generate it, then share it with ${member.name} privately.`}
              </FieldDescription>
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>

          {resetPassword.error ? (
            <p role="alert" className="text-sm text-destructive">
              {resetPassword.error.message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={resetPassword.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? 'Saving…' : 'Set new password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
