import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

// Assumed contract — the backend Members module doesn't exist yet. Account creation must run server-side
// (Supabase admin API needs the service key), so the browser only ever calls these endpoints.
export const MEMBER_ROLES = ['admin', 'member'] as const;
export const MEMBER_STATUSES = ['active', 'deactivated'] as const;

export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(MEMBER_ROLES),
  status: z.enum(MEMBER_STATUSES),
  createdAt: z.iso.datetime(),
  lastSignInAt: z.iso.datetime().nullable(),
});
export type Member = z.infer<typeof memberSchema>;

export const memberActivitySchema = z.object({
  id: z.string(),
  at: z.iso.datetime(),
  description: z.string(),
});
export type MemberActivity = z.infer<typeof memberActivitySchema>;

const passwordSchema = z.string().min(8, 'Use at least 8 characters');

export const createMemberSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep it under 80 characters'),
  email: z.email('Enter a valid email address'),
  password: passwordSchema,
  role: z.enum(MEMBER_ROLES),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export function listMembers() {
  return apiRequest('/v1/members', z.array(memberSchema));
}

export function createMember(input: CreateMemberInput) {
  return apiRequest('/v1/members', memberSchema, { method: 'POST', body: JSON.stringify(input) });
}

export function listMemberActivity(memberId: string) {
  return apiRequest(`/v1/members/${encodeURIComponent(memberId)}/activity`, z.array(memberActivitySchema));
}

export const resetPasswordSchema = z.object({ password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Admin sets a new password directly (backend uses the Supabase admin API); only `password` is sent. */
export function resetMemberPassword({ memberId, password }: { memberId: string; password: string }) {
  return apiRequest(`/v1/members/${encodeURIComponent(memberId)}/reset-password`, z.unknown(), {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deactivateMember(memberId: string) {
  return apiRequest(`/v1/members/${encodeURIComponent(memberId)}/deactivate`, memberSchema, { method: 'POST' });
}
