import { useState } from 'react'
import { HistoryIcon, InfoIcon, KeyRoundIcon, MoreHorizontalIcon, UserXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Member } from '@/features/members/api'
import { ConfirmMemberActionDialog } from '@/features/members/components/confirm-member-action-dialog'
import { MemberHistorySheet } from '@/features/members/components/member-history-sheet'
import { MemberInfoDialog } from '@/features/members/components/member-info-dialog'
import { ResetPasswordDialog } from '@/features/members/components/reset-password-dialog'
import { useDeactivateMember } from '@/features/members/queries'

type Panel = 'info' | 'history' | 'reset-password' | 'deactivate' | null

interface Props {
  member: Member
  onNotice: (message: string) => void
}

export function MemberRowActions({ member, onNotice }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const deactivate = useDeactivateMember()
  const isDeactivated = member.status === 'deactivated'

  // Dialogs live outside the menu so they survive it closing; closing also clears the deactivate error.
  const close = () => {
    setPanel(null)
    deactivate.reset()
  }
  const onOpenChange = (open: boolean) => !open && close()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' aria-label={`Actions for ${member.name}`}>
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem className='cursor-pointer p-2' onSelect={() => setPanel('info')}>
            <InfoIcon aria-hidden />
            Info
          </DropdownMenuItem>
          <DropdownMenuItem className='cursor-pointer p-2' onSelect={() => setPanel('history')}>
            <HistoryIcon aria-hidden />
            History
          </DropdownMenuItem>
          <DropdownMenuItem
            className='cursor-pointer p-2'
            disabled={isDeactivated}
            onSelect={() => setPanel('reset-password')}
          >
            <KeyRoundIcon aria-hidden />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            disabled={isDeactivated}
            className='cursor-pointer p-2'
            onSelect={() => setPanel('deactivate')}
          >
            <UserXIcon aria-hidden />
            {isDeactivated ? 'Deactivated' : 'Deactivate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MemberInfoDialog member={member} open={panel === 'info'} onOpenChange={onOpenChange} />
      <MemberHistorySheet member={member} open={panel === 'history'} onOpenChange={onOpenChange} />

      <ResetPasswordDialog
        member={member}
        open={panel === 'reset-password'}
        onOpenChange={onOpenChange}
        onDone={() => onNotice(`New password set for ${member.email}`)}
      />

      <ConfirmMemberActionDialog
        open={panel === 'deactivate'}
        onOpenChange={onOpenChange}
        title={`Deactivate ${member.name}?`}
        description='They will be signed out and can no longer sign in. Their history is kept.'
        confirmLabel='Deactivate'
        pendingLabel='Deactivating…'
        destructive
        isPending={deactivate.isPending}
        error={deactivate.error}
        onConfirm={() =>
          deactivate.mutate(member.id, {
            onSuccess: () => {
              close()
              onNotice(`${member.name} has been deactivated`)
            },
          })
        }
      />
    </>
  )
}
