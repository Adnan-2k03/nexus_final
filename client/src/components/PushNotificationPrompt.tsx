import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationPrompt() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe, isSubscribing } = usePushNotifications();

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('push-notification-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('push-notification-prompt-dismissed', 'true');
    setIsDismissed(true);
  };

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Already dismissed
  // - Permission denied
  if (!isSupported || isSubscribed || isDismissed || permission === 'denied') {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/50 bg-card/90 backdrop-blur" data-testid="push-notification-prompt">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Enable Push Notifications</CardTitle>
              <CardDescription className="mt-1">
                Get instant alerts for match requests, connections, and messages
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
            data-testid="button-dismiss-push-prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          onClick={() => subscribe()}
          disabled={isSubscribing}
          className="flex-1"
          data-testid="button-enable-push-notifications"
        >
          {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
        </Button>
        <Button
          onClick={handleDismiss}
          variant="outline"
          className="flex-1"
          data-testid="button-maybe-later"
        >
          Maybe Later
        </Button>
      </CardContent>
    </Card>
  );
}

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, isSubscribing, isUnsubscribing } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Push notifications blocked. Enable them in your browser settings.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="font-medium">Push Notifications</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Receive notifications even when the app is closed
        </p>
      </div>
      <Button
        onClick={() => isSubscribed ? unsubscribe() : subscribe()}
        disabled={isSubscribing || isUnsubscribing}
        variant={isSubscribed ? 'outline' : 'default'}
        size="sm"
        data-testid="button-toggle-push-notifications"
      >
        {isSubscribing || isUnsubscribing ? 'Processing...' : isSubscribed ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}
