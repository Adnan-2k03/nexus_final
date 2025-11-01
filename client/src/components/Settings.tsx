import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PrivacySettings } from "./PrivacySettings";
import { PushNotificationToggle } from "./PushNotificationPrompt";
import { Users as UsersIcon, Layout, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";
import { useLayout, type LayoutWidth } from "@/contexts/LayoutContext";

interface SettingsProps {
  user?: User | null;
}

export function Settings({ user }: SettingsProps) {
  const { layoutWidth, setLayoutWidth, getContainerClass } = useLayout();

  // Fetch total user count
  const { data: userCount, isLoading: isLoadingCount } = useQuery<number>({
    queryKey: ['/api/users/count'],
    queryFn: async () => {
      const response = await fetch('/api/users/count');
      if (!response.ok) {
        throw new Error('Failed to fetch user count');
      }
      return response.json();
    },
    retry: false,
  });

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* User Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Platform Statistics
            </CardTitle>
            <CardDescription>Total active users on GameMatch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary" data-testid="text-user-count">
              {isLoadingCount ? "..." : userCount?.toLocaleString() || "0"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total users</p>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        {user && <PrivacySettings userId={user.id} />}

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize your viewing experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              Theme can be changed from the navigation menu
            </p>
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
      </div>
    </div>
  );
}
