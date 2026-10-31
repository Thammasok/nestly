import { AirVentIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function IntegrationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connected devices and cloud services.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <AirVentIcon className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Panasonic Comfort Cloud</span>
              <Badge variant="secondary">Not connected</Badge>
            </div>
            {/* Spec §10.3: provider credentials are backend secrets — never collected in the browser. */}
            <p className="text-sm text-muted-foreground">
              Living room AC (CS-XU9XKT). Credentials are configured on the server; status appears here once the
              backend is running.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
