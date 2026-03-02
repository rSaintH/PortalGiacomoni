import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { theme, toggleTheme, paletteActive, registerThemeToggleClick } = useTheme();

  const handleClick = () => {
    registerThemeToggleClick();
    toggleTheme();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(paletteActive && "opacity-50 cursor-not-allowed")}
      title={paletteActive ? "Paleta personalizada ativa" : "Alternar tema"}
      aria-label="Alternar tema"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
