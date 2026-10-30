"use client";

import { useGspTheme } from "./ThemeProvider";

export function ThemeControls() {
  const { theme, setTheme, glowEnabled, setGlowEnabled, ready } = useGspTheme();
  // Avoid server/client hydration differences from persisted preferences.
  if (!ready) return null;

  return (
    <div className="gsp-theme-controls" aria-label="Display preferences">
      <label className="gsp-theme-control-label">
        Appearance
        <select
          aria-label="Appearance theme"
          className="gsp-theme-select"
          value={theme}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value);
            }
          }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="gsp-theme-glow-toggle">
        <input
          type="checkbox"
          checked={glowEnabled}
          onChange={(event) => setGlowEnabled(event.target.checked)}
        />
        Glow effects
      </label>
    </div>
  );
}
