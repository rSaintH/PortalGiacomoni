import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

type Theme = "light" | "dark";

export interface ColorPalette {
  background: string;
  foreground: string;
  primary: string;
  card: string;
  accent: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  border: string;
}

export const DEFAULT_PALETTE: ColorPalette = {
  background: "#f5f7fa",
  foreground: "#1a2332",
  primary: "#1a5fb4",
  card: "#ffffff",
  accent: "#e8f0fe",
  sidebarBackground: "#1a2332",
  sidebarForeground: "#dce1e8",
  sidebarPrimary: "#5b9bf5",
  sidebarAccent: "#253347",
  border: "#dce1e8",
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  palette: ColorPalette;
  setPalette: (p: ColorPalette) => void;
  paletteActive: boolean;
  setPaletteActive: (v: boolean) => void;
  shadowsDisabled: boolean;
  setShadowsDisabled: (v: boolean) => void;
  easterEggUnlocked: boolean;
  registerThemeToggleClick: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyPalette(p: ColorPalette) {
  const root = document.documentElement;
  const map: Record<string, string> = {
    "--background": p.background,
    "--foreground": p.foreground,
    "--primary": p.primary,
    "--primary-foreground": p.card,
    "--card": p.card,
    "--card-foreground": p.foreground,
    "--accent": p.accent,
    "--accent-foreground": p.foreground,
    "--border": p.border,
    "--input": p.border,
    "--ring": p.primary,
    "--popover": p.card,
    "--popover-foreground": p.foreground,
    "--sidebar-background": p.sidebarBackground,
    "--sidebar-foreground": p.sidebarForeground,
    "--sidebar-primary": p.sidebarPrimary,
    "--sidebar-primary-foreground": p.card,
    "--sidebar-accent": p.sidebarAccent,
    "--sidebar-accent-foreground": p.sidebarForeground,
    "--sidebar-border": p.sidebarAccent,
    "--sidebar-ring": p.sidebarPrimary,
  };
  for (const [prop, hex] of Object.entries(map)) {
    root.style.setProperty(prop, hexToHsl(hex));
  }
}

function removePalette() {
  const root = document.documentElement;
  const props = [
    "--background", "--foreground", "--primary", "--primary-foreground",
    "--card", "--card-foreground", "--accent", "--accent-foreground",
    "--border", "--input", "--ring", "--popover", "--popover-foreground",
    "--sidebar-background", "--sidebar-foreground", "--sidebar-primary",
    "--sidebar-primary-foreground", "--sidebar-accent", "--sidebar-accent-foreground",
    "--sidebar-border", "--sidebar-ring",
  ];
  props.forEach((p) => root.style.removeProperty(p));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("fatorr-theme");
    return stored === "dark" ? "dark" : "light";
  });

  const [easterEggUnlocked, setEasterEggUnlocked] = useState(false);
  const clickCountRef = useRef(0);
  const waitingForArrowRef = useRef(false);

  const [shadowsDisabled, setShadowsDisabledState] = useState(() => {
    return localStorage.getItem("contaoffice-shadows-disabled") === "true";
  });

  const [paletteActive, setPaletteActiveState] = useState(() => {
    return localStorage.getItem("contaoffice-palette-active") === "true";
  });

  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    try {
      const stored = localStorage.getItem("contaoffice-custom-palette");
      if (stored) return { ...DEFAULT_PALETTE, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULT_PALETTE;
  });

  const setPalette = (p: ColorPalette) => {
    setPaletteState(p);
    localStorage.setItem("contaoffice-custom-palette", JSON.stringify(p));
  };

  const setPaletteActive = (v: boolean) => {
    setPaletteActiveState(v);
    localStorage.setItem("contaoffice-palette-active", String(v));
  };

  const setShadowsDisabled = (v: boolean) => {
    setShadowsDisabledState(v);
    localStorage.setItem("contaoffice-shadows-disabled", String(v));
  };

  // Main effect
  useEffect(() => {
    const root = document.documentElement;
    if (paletteActive) {
      root.classList.remove("dark");
      applyPalette(palette);
    } else {
      removePalette();
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    localStorage.setItem("fatorr-theme", theme);

    if (shadowsDisabled) {
      root.classList.add("no-shadows");
    } else {
      root.classList.remove("no-shadows");
    }
  }, [theme, paletteActive, palette, shadowsDisabled]);

  const toggleTheme = () => {
    if (paletteActive) return;
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const registerThemeToggleClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickCountRef.current >= 2) {
      clickCountRef.current = 0;
      waitingForArrowRef.current = true;
      setTimeout(() => {
        waitingForArrowRef.current = false;
      }, 3000);
    } else {
      setTimeout(() => {
        clickCountRef.current = 0;
      }, 1000);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && waitingForArrowRef.current) {
        waitingForArrowRef.current = false;
        setEasterEggUnlocked(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, toggleTheme,
      palette, setPalette,
      paletteActive, setPaletteActive,
      shadowsDisabled, setShadowsDisabled,
      easterEggUnlocked,
      registerThemeToggleClick,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
