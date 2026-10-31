import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlusIcon } from 'lucide-react';
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
import { createMemberSchema, type CreateMemberInput, type Member } from '@/features/members/api';
import { useCreateMember } from '@/features/members/queries';
import { ApiError } from '@/lib/api-client';

const emptyForm: CreateMemberInput = { name: '', email: '', password: '', role: 'member' };

const isDuplicateEmail = (error: unknown) => error instanceof ApiError && error.status === 409;

export function CreateMemberDialog({ onCreated }: { onCreated: (member: Member) => void }) {
  const [open, setOpen] = useState(false);
  const createMember = useCreateMember();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: emptyForm,
  });

  // Every close (Cancel, ✕, Esc, overlay, success) starts the next open from a clean form.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(emptyForm);
      createMember.reset();
    }
    setOpen(next);
  };

  const onSubmit = (values: CreateMemberInput) => {
    createMember.mutate(values, {
      onSuccess: (member) => {
        handleOpenChange(false);
        onCreated(member);
      },
      onError: (error) => {
        if (isDuplicateEmail(error)) {
          setError('email', { message: 'An account with this email already exists' });
        }
      },
    });
  };

  // 409 is shown on the email field; anything else is a form-level error.
  const formError = createMember.error && !isDuplicateEmail(createMember.error) ? createMember.error.message : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon aria-hidden />
          Create account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new account</DialogTitle>
          <DialogDescription>Nestly is private — there is no public sign-up, so accounts are created here.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="member-name">Name</FieldLabel>
              <Input id="member-name" autoComplete="off" aria-invalid={!!errors.name} {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="member-email">Email</FieldLabel>
              <Input
                id="member-email"
                type="email"
                autoComplete="off"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="member-password">Temporary password</FieldLabel>
              <Input
                id="member-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldDescription>Share it privately; they can change it after signing in.</FieldDescription>
              <FieldError errors={[errors.password]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-role">Role</FieldLabel>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="member-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>Admins can manage settings and members.</FieldDescription>
            </Field>
          </FieldGroup>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={createMember.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMember.isPending}>
              {createMember.isPending ? 'Creating…' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
