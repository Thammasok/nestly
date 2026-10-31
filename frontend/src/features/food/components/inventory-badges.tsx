import { Badge } from '@/components/ui/badge';
import type { ExpirationStatus } from '@/features/food/inventory-rules';

// Full class strings (not built from a colour name) so Tailwind's scanner sees them.
const statusBadge: Record<ExpirationStatus, { label: string; className?: string; variant?: 'destructive' | 'outline' }> = {
  expired: { label: 'Expired', variant: 'destructive' },
  'expiring-soon': { label: 'Expiring soon', className: 'bg-yellow-soft text-yellow-ink' },
  fresh: { label: 'Fresh', className: 'bg-mint-soft text-mint-ink' },
  'no-date': { label: 'No expiry', variant: 'outline' },
  'used-up': { label: 'Used up', variant: 'outline' },
};

export function ExpirationBadge({ status }: { status: ExpirationStatus }) {
  const { label, className, variant } = statusBadge[status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
