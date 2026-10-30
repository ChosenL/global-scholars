"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ThemeChoice = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (choice: ThemeChoice) => void;
  glowEnabled: boolean;
  setGlowEnabled: (enabled: boolean) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "gsp-theme";
const GLOW_KEY = "gsp-glow";

/*
 * Read the visitor's saved theme.
 * Fall back to System Mode when storage is unavailable.
 */
function getSavedTheme(): ThemeChoice {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage may be unavailable.
  }

  return "system";
}

/*
 * Read the visitor's glow preference.
 */
function getSavedGlow(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(GLOW_KEY) !== "off";
  } catch {
    return true;
  }
}

/*
 * Keep the initial server/client render consistent.
 * React reports readiness after hydration.
 */
function subscribeToHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(getSavedTheme);

  const [glowEnabled, setGlowState] = useState<boolean>(getSavedGlow);

  const ready = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  /*
   * Synchronize the HTML element with the selected theme.
   */
  useEffect(() => {
    if (!ready) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);

      document.documentElement.classList.toggle("dark", isDark);

      document.documentElement.style.colorScheme = isDark ? "dark" : "light";

      document.documentElement.dataset.glow = glowEnabled ? "on" : "off";
    };

    applyTheme();

    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [theme, glowEnabled, ready]);

  /*
   * Save a new appearance preference.
   */
  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice);

    try {
      window.localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Theme still works without persistent storage.
    }
  };

  /*
   * Enable or disable decorative glow effects.
   */
  const setGlowEnabled = (enabled: boolean) => {
    setGlowState(enabled);

    try {
      window.localStorage.setItem(GLOW_KEY, enabled ? "on" : "off");
    } catch {
      // Glow setting still works without persistent storage.
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        glowEnabled,
        setGlowEnabled,
        ready,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useGspTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useGspTheme must be used within ThemeProvider");
  }

  return value;
}
