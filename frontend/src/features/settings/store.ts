import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultPreferences, preferencesSchema, type Preferences } from '@/features/settings/schema';

// Browser-only until the backend has a preferences endpoint; then this becomes a TanStack Query mutation.
interface PreferencesState {
  preferences: Preferences;
  savePreferences: (preferences: Preferences) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      savePreferences: (preferences) => set({ preferences }),
    }),
    {
      name: 'nestly-preferences',
      // Stored data is untrusted (older versions, hand edits) — fall back to defaults if it doesn't parse.
      merge: (persisted, current) => {
        const parsed = preferencesSchema.safeParse((persisted as Partial<PreferencesState> | undefined)?.preferences);
        return { ...current, preferences: parsed.success ? parsed.data : defaultPreferences };
      },
    },
  ),
);
