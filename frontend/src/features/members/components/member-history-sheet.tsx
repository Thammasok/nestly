import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { Member } from '@/features/members/api';
import { useMemberActivity } from '@/features/members/queries';
import { formatDateTime } from '@/lib/format';

interface Props {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberHistorySheet({ member, open, onOpenChange }: Props) {
  // Only fetch once the sheet is opened.
  const { data: activity, isPending, isError, error } = useMemberActivity(member.id, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
          <SheetDescription>Recent activity for {member.name}.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isPending ? (
            <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading history">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l pl-4">
              {activity.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" aria-hidden />
                  <p className="text-sm">{entry.description}</p>
                  <time dateTime={entry.at} className="text-xs text-muted-foreground">
                    {formatDateTime(entry.at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
