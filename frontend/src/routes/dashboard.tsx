import type { LucideIcon } from 'lucide-react';
import { AirVent, Refrigerator, Zap } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const domains: { title: string; description: string; icon: LucideIcon }[] = [
  { title: 'Climate', description: 'Air conditioner status and control', icon: AirVent },
  { title: 'Food', description: 'Fridge, freezer and pantry inventory', icon: Refrigerator },
  { title: 'Electricity', description: 'Bills and meter readings', icon: Zap },
];

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {domains.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="text-muted-foreground" aria-hidden />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
