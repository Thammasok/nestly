import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Member } from '@/features/members/api';
import { RoleBadge, StatusBadge } from '@/features/members/components/member-badges';
import { formatDateTime } from '@/lib/format';

interface Props {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberInfoDialog({ member, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <RoleBadge role={member.role} />
          </dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge status={member.status} />
          </dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDateTime(member.createdAt)}</dd>
          <dt className="text-muted-foreground">Last sign-in</dt>
          <dd>{member.lastSignInAt ? formatDateTime(member.lastSignInAt) : 'Never'}</dd>
        </dl>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
