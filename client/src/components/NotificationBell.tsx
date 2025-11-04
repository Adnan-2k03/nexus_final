import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Set up WebSocket connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for notifications');
      ws.send(JSON.stringify({ type: 'ping' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'new_notification') {
          // Invalidate queries to refresh notifications
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
          
          // Show toast notification
          const notification = message.data as Notification;
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [toast]);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 15000,
  });

  const unreadCount = unreadCountData?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (notification.isRead === false) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Close the dropdown menu
    setDropdownOpen(false);
    
    // Handle specific notification types with proper navigation
    switch (notification.type) {
      case "voice_channel_invite":
      case "voice_channel_invite_accepted":
      case "voice_channel_invite_declined":
        // Navigate to voice channels page
        setLocation("/voice-channels");
        break;
      
      case "connection_request":
      case "connection_accepted":
      case "connection_declined":
        // Navigate to connections page to manage connections
        setLocation("/connections");
        break;
      
      case "match_application":
      case "match_accepted":
      case "match_declined":
        // Navigate to home page to see match feed and applications
        setLocation("/");
        break;
      
      default:
        // Use custom action URL if available
        if (notification.actionUrl) {
          setLocation(notification.actionUrl);
        }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "connection_request":
        return "👋";
      case "connection_accepted":
        return "✅";
      case "connection_declined":
        return "❌";
      case "match_application":
        return "🎮";
      case "match_accepted":
        return "🎉";
      case "match_declined":
        return "⛔";
      case "voice_channel_invite":
        return "🎙️";
      case "voice_channel_invite_accepted":
        return "✅";
      case "voice_channel_invite_declined":
        return "❌";
      default:
        return "📬";
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            data-testid="button-notification-bell"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                data-testid="badge-unread-count"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer ${
                  notification.isRead === false
                    ? "bg-blue-50 dark:bg-blue-950"
                    : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        {notification.title}
                      </h4>
                      {notification.isRead === false && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt || new Date()), {
                          addSuffix: true,
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        data-testid={`button-delete-notification-${notification.id}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
