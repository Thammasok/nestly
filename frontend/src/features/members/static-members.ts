import type { Member, MemberActivity } from '@/features/members/api';

// Placeholder data shown until the backend's members endpoints exist.
export const STATIC_MEMBERS: Member[] = [
  {
    id: 'mem_01',
    name: 'Charan Chai',
    email: 'charan@nestly.home',
    role: 'admin',
    status: 'active',
    createdAt: '2026-09-01T09:00:00.000Z',
    lastSignInAt: '2026-10-31T07:12:00.000Z',
  },
  {
    id: 'mem_02',
    name: 'Nok Somsri',
    email: 'nok@nestly.home',
    role: 'admin',
    status: 'active',
    createdAt: '2026-09-02T10:30:00.000Z',
    lastSignInAt: '2026-10-30T19:40:00.000Z',
  },
  {
    id: 'mem_03',
    name: 'Ploy Wongsa',
    email: 'ploy@nestly.home',
    role: 'member',
    status: 'active',
    createdAt: '2026-09-15T18:45:00.000Z',
    lastSignInAt: '2026-10-28T12:05:00.000Z',
  },
  {
    id: 'mem_04',
    name: 'Somchai Dee',
    email: 'somchai@nestly.home',
    role: 'member',
    status: 'active',
    createdAt: '2026-10-05T08:15:00.000Z',
    lastSignInAt: null,
  },
  {
    id: 'mem_05',
    name: 'Mali Jaidee',
    email: 'mali@nestly.home',
    role: 'member',
    status: 'deactivated',
    createdAt: '2026-09-10T14:00:00.000Z',
    lastSignInAt: '2026-09-30T09:20:00.000Z',
  },
];

export const STATIC_MEMBER_ACTIVITY: Record<string, MemberActivity[]> = {
  mem_01: [
    { id: 'a1', at: '2026-10-31T07:12:00.000Z', description: 'Signed in' },
    { id: 'a2', at: '2026-10-30T21:00:00.000Z', description: 'Changed Living Room AC to 26°C' },
    { id: 'a3', at: '2026-10-05T08:15:00.000Z', description: 'Created account for Somchai Dee' },
  ],
  mem_02: [
    { id: 'a4', at: '2026-10-30T19:40:00.000Z', description: 'Signed in' },
    { id: 'a5', at: '2026-10-30T19:45:00.000Z', description: 'Recorded October electricity bill' },
  ],
  mem_03: [
    { id: 'a6', at: '2026-10-28T12:05:00.000Z', description: 'Signed in' },
    { id: 'a7', at: '2026-10-28T12:10:00.000Z', description: 'Consumed 2 eggs from refrigerator' },
  ],
  mem_05: [
    { id: 'a8', at: '2026-10-01T10:00:00.000Z', description: 'Account deactivated by Charan Chai' },
    { id: 'a9', at: '2026-09-30T09:20:00.000Z', description: 'Signed in' },
  ],
};
