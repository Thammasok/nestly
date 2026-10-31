import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useThemeStore, type Theme } from '@/stores/theme-store';

const options: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

export function AppearanceCard() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>System follows your device's light or dark setting.</CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Theme"
          value={theme}
          // Radix emits '' when the active item is clicked again; keep the current theme.
          onValueChange={(value) => value && setTheme(value as Theme)}
        >
          {options.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} className="px-4">
              <Icon aria-hidden />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}
