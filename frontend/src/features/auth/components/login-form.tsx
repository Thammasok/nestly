'use client'

import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NestlyLogo } from '@/components/brand/nestly-logo'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form>
        <FieldGroup>
          <div className='flex flex-col items-center gap-1 text-center'>
            <NestlyLogo aria-hidden size={128} />
            <h1 className='text-xl font-bold'>Welcome to Nestly</h1>
            <FieldDescription>Private access only. Sign in with your account.</FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              placeholder='m@example.com'
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='password'>Password</FieldLabel>
            <Input id='password' type='password' autoComplete='current-password' required />
          </Field>
          <Field>
            <Button type='submit'>Login</Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className='px-6 text-center'>
        By clicking continue, you agree to our <a href='#'>Terms of Service</a> and{' '}
        <a href='#'>Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
