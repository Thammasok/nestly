import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { HouseIcon, PaletteIcon, PlugIcon, UsersIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { MembersPanel } from '@/features/members/components/members-panel'
import { AppearanceCard } from '@/features/settings/components/appearance-card'
import { IntegrationsCard } from '@/features/settings/components/integrations-card'
import { PreferencesForm } from '@/features/settings/components/preferences-form'

const tabs = [
  { value: 'basic', label: 'Basic', icon: HouseIcon, panel: PreferencesForm },
  { value: 'appearance', label: 'Appearance', icon: PaletteIcon, panel: AppearanceCard },
  { value: 'integration', label: 'Integration', icon: PlugIcon, panel: IntegrationsCard },
  { value: 'members', label: 'Members', icon: UsersIcon, panel: MembersPanel },
] as const satisfies readonly {
  value: string
  label: string
  icon: LucideIcon
  panel: () => ReactNode
}[]

type TabValue = (typeof tabs)[number]['value']
const isTabValue = (value: string | null): value is TabValue =>
  tabs.some((tab) => tab.value === value)

export function SettingsPage() {
  // Active tab lives in the URL so /settings?tab=members can be linked and survives refresh.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const active: TabValue = isTabValue(requested) ? requested : 'basic'
  // Vertical menu on desktop; on phones a side column would squeeze the forms, so it becomes a scrollable strip.
  const isMobile = useIsMobile()

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Settings</h1>
        <p className='text-muted-foreground'>
          Manage your home, appearance, connected devices and who can sign in.
        </p>
      </div>

      <Tabs
        orientation={isMobile ? 'horizontal' : 'vertical'}
        value={active}
        onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
        className='gap-6'
      >
        <TabsList
          aria-label='Settings sections'
          // Same surface as <Card> (bg-card, rounded-xl, ring) so the menu sits level with the panels beside it.
          className='h-auto! w-full shrink-0 justify-start gap-1 overflow-x-auto rounded-xl bg-card p-2 text-card-foreground ring-1 ring-foreground/10 md:w-56 md:self-start'
        >
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              // Hover/active use the sidebar's accent tokens so both menus highlight the same way (incl. dark mode).
              className="h-11 flex-none gap-3 px-4 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-none! dark:text-sidebar-foreground dark:hover:text-sidebar-accent-foreground dark:data-active:border-transparent dark:data-active:bg-sidebar-accent dark:data-active:text-sidebar-accent-foreground md:w-full [&_svg:not([class*='size-'])]:size-5"
            >
              <Icon aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(({ value, panel: Panel }) => (
          <TabsContent key={value} value={value} className='min-w-0'>
            <Panel />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
