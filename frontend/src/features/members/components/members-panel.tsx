import { useState } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateMemberDialog } from '@/features/members/components/create-member-dialog';
import { MembersTable } from '@/features/members/components/members-table';

export function MembersPanel() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>People who can sign in to this home.</CardDescription>
        <CardAction>
          <CreateMemberDialog onCreated={(member) => setNotice(`Account created for ${member.email}`)} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {notice}
        </p>
        <MembersTable onNotice={setNotice} />
      </CardContent>
    </Card>
  );
}
