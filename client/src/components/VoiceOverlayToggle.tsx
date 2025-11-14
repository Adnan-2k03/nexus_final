import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VoiceOverlay from "@/lib/voice-overlay-plugin";
import { Capacitor } from "@capacitor/core";
import { Mic, Move } from "lucide-react";

interface VoiceOverlayToggleProps {
  userId?: string | null;
}

export function VoiceOverlayToggle({ userId }: VoiceOverlayToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      checkPermission();
      loadUserPreference();
    }
  }, [isNative, userId]);

  const checkPermission = async () => {
    try {
      const result = await VoiceOverlay.checkPermission();
      setHasPermission(result.granted);
    } catch (error) {
      console.error("Error checking overlay permission:", error);
    }
  };

  const loadUserPreference = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (response.ok) {
        const user = await response.json();
        setIsEnabled(user.voiceOverlayEnabled || false);
        
        if (user.voiceOverlayEnabled && hasPermission) {
          await VoiceOverlay.enableOverlay();
        }
      }
    } catch (error) {
      console.error("Error loading overlay preference:", error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!isNative) return;

    setIsLoading(true);

    try {
      if (checked) {
        if (!hasPermission) {
          setShowDialog(true);
          setIsLoading(false);
          return;
        }

        await VoiceOverlay.enableOverlay();
        await savePreference(true);
        setIsEnabled(true);
      } else {
        await VoiceOverlay.disableOverlay();
        await savePreference(false);
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Error toggling voice overlay:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await VoiceOverlay.requestPermission();
      setHasPermission(result.granted);
      setShowDialog(false);

      if (result.granted) {
        await VoiceOverlay.enableOverlay();
        await savePreference(true);
        setIsEnabled(true);
      }
    } catch (error) {
      console.error("Error requesting overlay permission:", error);
    }
  };

  const savePreference = async (enabled: boolean) => {
    if (!userId) return;

    try {
      await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ voiceOverlayEnabled: enabled }),
      });
    } catch (error) {
      console.error("Error saving overlay preference:", error);
    }
  };

  if (!isNative) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <Label className="text-sm font-medium">Floating Voice Controls</Label>
            <p className="text-xs text-muted-foreground">
              Only available on Android mobile app
            </p>
          </div>
        </div>
        <Switch disabled data-testid="switch-voice-overlay" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Move className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="voice-overlay" className="text-sm font-medium cursor-pointer">
              Floating Voice Controls
            </Label>
            <p className="text-xs text-muted-foreground">
              Show draggable mic/speaker buttons over other apps
            </p>
          </div>
        </div>
        <Switch
          id="voice-overlay"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          data-testid="switch-voice-overlay"
        />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Floating Controls?</DialogTitle>
            <DialogDescription>
              This feature requires permission to display over other apps. 
              You'll be redirected to Android settings to grant this permission.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">What you'll get:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Mic className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>Quick access to mic and speaker controls</span>
              </li>
              <li className="flex items-start gap-2">
                <Move className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>Draggable overlay that works across all apps</span>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              data-testid="button-cancel-overlay"
            >
              Cancel
            </Button>
            <Button
              onClick={requestPermission}
              data-testid="button-grant-overlay-permission"
            >
              Grant Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
