import { Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useBackground } from "./BackgroundProvider";

export function BackgroundSelector() {
  const { background, setBackground } = useBackground();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          data-testid="button-background-selector"
        >
          <Sparkles className="h-5 w-5" />
          <span className="sr-only">Select background theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setBackground("canvas2d")}
          className={background === "canvas2d" ? "bg-accent" : ""}
          data-testid="background-canvas2d"
        >
          Canvas Stars
          {background === "canvas2d" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setBackground("webgl")}
          className={background === "webgl" ? "bg-accent" : ""}
          data-testid="background-webgl"
        >
          WebGL Stars
          {background === "webgl" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
