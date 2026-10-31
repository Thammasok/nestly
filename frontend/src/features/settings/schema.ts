import { z } from 'zod';

export const preferencesSchema = z.object({
  homeName: z.string().trim().min(1, 'Enter a name for your home').max(60, 'Keep it under 60 characters'),
  expiringSoonDays: z
    .number({ error: 'Enter a number of days' })
    .int('Use whole days')
    .min(1, 'At least 1 day')
    .max(30, 'At most 30 days'),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Preferences = {
  homeName: 'My home',
  expiringSoonDays: 3,
};
