import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export function useOnlineStatus() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [usersInVoice, setUsersInVoice] = useState<Set<string>>(new Set());
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (!lastMessage) return;

    const { type, data, userId } = lastMessage as { type: string; data?: any; userId?: string };

    if (type === 'user_online' && userId) {
      setOnlineUsers(prev => new Set(prev).add(userId));
    } else if (type === 'user_offline' && userId) {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      // Also remove from voice when user goes offline
      setUsersInVoice(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else if (type === 'voice_channel_ready' && data?.userId) {
      setUsersInVoice(prev => new Set(prev).add(data.userId));
    } else if (type === 'voice_channel_left' && data?.userId) {
      setUsersInVoice(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    }
  }, [lastMessage]);

  const isUserOnline = (userId: string) => onlineUsers.has(userId);
  const isUserInVoice = (userId: string) => usersInVoice.has(userId);

  return { onlineUsers, isUserOnline, usersInVoice, isUserInVoice };
}
