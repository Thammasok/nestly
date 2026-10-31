import { Link } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <AppShell title="Not found">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </AppShell>
  );
}
