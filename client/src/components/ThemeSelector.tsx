import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const themes = [
  { 
    value: "dark" as const, 
    label: "Gaming Dark", 
    description: "Classic dark mode",
    color: "bg-[hsl(230,85%,65%)]"
  },
  { 
    value: "light" as const, 
    label: "Light Mode", 
    description: "Clean and bright",
    color: "bg-[hsl(230,85%,55%)]"
  },
  { 
    value: "midnight" as const, 
    label: "Neon Cyber", 
    description: "Cyan glow vibes",
    color: "bg-[hsl(180,100%,50%)]"
  },
  { 
    value: "forest" as const, 
    label: "Vibrant Purple", 
    description: "Electric purple energy",
    color: "bg-[hsl(280,90%,65%)]"
  },
  { 
    value: "sunset" as const, 
    label: "Electric Teal", 
    description: "Teal with glow effects",
    color: "bg-[hsl(165,85%,55%)]"
  },
  { 
    value: "system" as const, 
    label: "System Default", 
    description: "Follow system preference",
    color: "bg-gradient-to-r from-[hsl(0,0%,15%)] to-[hsl(0,0%,95%)]"
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          data-testid="button-theme-selector"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="flex items-center gap-3 cursor-pointer"
            data-testid={`menu-item-theme-${themeOption.value}`}
          >
            <div className={`w-4 h-4 rounded-full ${themeOption.color} flex-shrink-0`} />
            <div className="flex-1">
              <div className="font-medium">{themeOption.label}</div>
              <div className="text-xs text-muted-foreground">{themeOption.description}</div>
            </div>
            {theme === themeOption.value && (
              <Check className="h-4 w-4 text-primary" data-testid={`check-theme-${themeOption.value}`} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
