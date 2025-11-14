import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PrivacySettings } from "./PrivacySettings";
import { PushNotificationToggle } from "./PushNotificationPrompt";
import { VoiceOverlayToggle } from "./VoiceOverlayToggle";
import { Check, Sparkles, Zap, Square, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";
import { useLayout } from "@/contexts/LayoutContext";
import { useBackground } from "./BackgroundProvider";
import { UnifiedThemeSelector } from "./UnifiedThemeSelector";

interface SettingsProps {
  user?: User | null;
}

export function Settings({ user }: SettingsProps) {
  const { layoutWidth, setLayoutWidth, getContainerClass } = useLayout();
  const { background, setBackground } = useBackground();

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Privacy Settings */}
        {user && <PrivacySettings userId={user.id} />}

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize your viewing experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Color Theme</label>
              <div className="flex items-center gap-3">
                <UnifiedThemeSelector />
                <span className="text-sm text-muted-foreground">Choose your preferred color theme</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Page Width</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant={layoutWidth === "compact" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setLayoutWidth("compact")}
                  data-testid="button-layout-compact"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 border-2 border-current rounded flex items-center justify-center">
                      <div className="w-6 h-6 bg-current/20 rounded-sm"></div>
                    </div>
                    {layoutWidth === "compact" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">Compact</span>
                  <span className="text-xs text-muted-foreground">Narrow width</span>
                </Button>

                <Button
                  variant={layoutWidth === "cozy" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setLayoutWidth("cozy")}
                  data-testid="button-layout-cozy"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 border-2 border-current rounded flex items-center justify-center">
                      <div className="w-8 h-6 bg-current/20 rounded-sm"></div>
                    </div>
                    {layoutWidth === "cozy" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">Cozy</span>
                  <span className="text-xs text-muted-foreground">Medium width</span>
                </Button>

                <Button
                  variant={layoutWidth === "comfortable" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setLayoutWidth("comfortable")}
                  data-testid="button-layout-comfortable"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 border-2 border-current rounded flex items-center justify-center">
                      <div className="w-11 h-6 bg-current/20 rounded-sm"></div>
                    </div>
                    {layoutWidth === "comfortable" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">Comfortable</span>
                  <span className="text-xs text-muted-foreground">Wide like Discover</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Background Effect</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant={background === "canvas2d" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setBackground("canvas2d")}
                  data-testid="button-background-canvas2d"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6" />
                    {background === "canvas2d" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">Animated Stars</span>
                  <span className="text-xs text-muted-foreground">Classic effect</span>
                </Button>

                <Button
                  variant={background === "webgl" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setBackground("webgl")}
                  data-testid="button-background-webgl"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-6 w-6" />
                    {background === "webgl" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">3D Stars</span>
                  <span className="text-xs text-muted-foreground">High performance</span>
                </Button>

                <Button
                  variant={background === "solid" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setBackground("solid")}
                  data-testid="button-background-solid"
                >
                  <div className="flex items-center gap-2">
                    <Square className="h-6 w-6" />
                    {background === "solid" && <Check className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold">Solid Dark</span>
                  <span className="text-xs text-muted-foreground">Simple & clean</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle />
          </CardContent>
        </Card>

        {/* Voice Channel */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Channel</CardTitle>
            <CardDescription>Control voice channel behavior on mobile</CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceOverlayToggle userId={user?.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
