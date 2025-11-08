import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

export function useVoiceCallNotifications() {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000,
  });

  // Filter for unread voice_call_waiting notifications
  const voiceCallWaitingNotifications = notifications.filter(
    (n) => n.type === "voice_call_waiting" && n.isRead === false
  );

  const hasWaitingCalls = voiceCallWaitingNotifications.length > 0;
  const waitingCallCount = voiceCallWaitingNotifications.length;

  // Extract user IDs from notification messages/metadata if available
  // The notification message includes the caller's gamertag
  const waitingCallerGamertags = voiceCallWaitingNotifications.map((n) => {
    // Parse gamertag from message like "John is waiting in your personal voice channel"
    const match = n.message?.match(/^(.+?) is waiting in your personal voice channel$/);
    return match ? match[1] : null;
  }).filter(Boolean) as string[];

  return {
    hasWaitingCalls,
    waitingCallCount,
    waitingCallerGamertags,
    voiceCallWaitingNotifications,
  };
}
