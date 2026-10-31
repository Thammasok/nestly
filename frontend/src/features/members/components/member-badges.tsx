import { Badge } from '@/components/ui/badge';
import type { Member } from '@/features/members/api';

export function RoleBadge({ role }: { role: Member['role'] }) {
  return (
    <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize">
      {role}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: Member['status'] }) {
  return (
    <Badge variant={status === 'active' ? 'outline' : 'destructive'} className="capitalize">
      {status}
    </Badge>
  );
}
