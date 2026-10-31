import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMember, deactivateMember, resetMemberPassword } from '@/features/members/api';
import { STATIC_MEMBER_ACTIVITY, STATIC_MEMBERS } from '@/features/members/static-members';

export const membersKeys = {
  all: ['members'] as const,
  activity: (memberId: string) => ['members', memberId, 'activity'] as const,
};

// Reads are static for now. When the backend is ready, use `listMembers` / `listMemberActivity` from api.ts.
export function useMembers() {
  return useQuery({ queryKey: membersKeys.all, queryFn: () => Promise.resolve(STATIC_MEMBERS) });
}

export function useMemberActivity(memberId: string, enabled: boolean) {
  return useQuery({
    queryKey: membersKeys.activity(memberId),
    queryFn: () => Promise.resolve(STATIC_MEMBER_ACTIVITY[memberId] ?? []),
    enabled,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKeys.all }),
  });
}

export function useResetMemberPassword() {
  return useMutation({ mutationFn: resetMemberPassword });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKeys.all }),
  });
}
