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
import { useBackground } from "./BackgroundProvider";

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
    value: "neon" as const, 
    label: "Neon Cyberpunk", 
    description: "Pink & orange glow",
    color: "bg-gradient-to-r from-[hsl(280,100%,60%)] to-[hsl(40,100%,55%)]"
  },
  { 
    value: "midnight" as const, 
    label: "Neon Cyan", 
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

const backgrounds = [
  { value: "canvas2d" as const, label: "Canvas Stars", description: "Smooth depth-based starfield" },
  { value: "webgl" as const, label: "WebGL Stars", description: "Interactive fractal starfield" },
  { value: "solid" as const, label: "Solid Dark", description: "Simple solid background" },
];

export function UnifiedThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { background, setBackground } = useBackground();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          data-testid="button-unified-theme-selector"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Appearance settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
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

        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel>Background</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {backgrounds.map((bg) => (
          <DropdownMenuItem
            key={bg.value}
            onClick={() => setBackground(bg.value)}
            className="flex items-center gap-3 cursor-pointer"
            data-testid={`menu-item-background-${bg.value}`}
          >
            <div className="flex-1">
              <div className="font-medium">{bg.label}</div>
              <div className="text-xs text-muted-foreground">{bg.description}</div>
            </div>
            {background === bg.value && (
              <Check className="h-4 w-4 text-primary" data-testid={`check-background-${bg.value}`} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
