import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

// Keep in sync with the pre-paint script in index.html.
const STORAGE_KEY = 'nestly-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && darkQuery().matches);
  document.documentElement.classList.toggle('dark', isDark);
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage blocked (private mode etc.) — the choice still applies for this session.
    }
    applyTheme(theme);
    set({ theme });
  },
}));

/** Follow OS light/dark changes while the user's choice is "system". Call once at startup. */
export function watchSystemTheme() {
  darkQuery().addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') applyTheme(theme);
  });
}
