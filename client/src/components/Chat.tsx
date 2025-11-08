import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  selectIsLocalScreenShared, 
  useHMSActions, 
  useHMSStore,
  selectIsConnectedToRoom
} from "@100mslive/react-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Users, Mic, MicOff, MonitorUp, MonitorOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessageWithSender, VoiceParticipantWithUser } from "@shared/schema";
import { getApiUrl } from "@/lib/api";

interface ChatProps {
  connectionId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName?: string;
}

export function Chat({ connectionId, currentUserId, otherUserId, otherUserName }: ChatProps) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lastMessage: wsMessage } = useWebSocket();
  const { toast } = useToast();
  
  // HMS hooks for screen sharing when in voice channel
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);

  // Fetch messages for this connection
  const { data: messages = [], isLoading } = useQuery<ChatMessageWithSender[]>({
    queryKey: ['/api/messages', connectionId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/messages/${connectionId}`), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch voice channel participants
  const { data: voiceChannelData } = useQuery({
    queryKey: ['/api/voice/channel', connectionId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/voice/channel/${connectionId}`), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch voice channel');
      }
      return response.json() as Promise<{ channel: any; participants: VoiceParticipantWithUser[] }>;
    },
    retry: false,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await fetch(getApiUrl('/api/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          connectionId,
          receiverId: otherUserId,
          message: messageText,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages', connectionId] });
    },
  });

  // Handle WebSocket new message and voice events
  useEffect(() => {
    if (!wsMessage) return;

    const { type, data } = wsMessage;
    
    if (type === 'new_message' && data?.connectionId === connectionId) {
      // New message received for this connection
      queryClient.invalidateQueries({ queryKey: ['/api/messages', connectionId] });
    }
    
    if ((type === 'voice_participant_joined' || type === 'voice_participant_left' || type === 'voice_participant_muted') && data?.connectionId === connectionId) {
      // Voice participant update for this connection
      queryClient.invalidateQueries({ queryKey: ['/api/voice/channel', connectionId] });
    }
  }, [wsMessage, connectionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const toggleScreenShare = async () => {
    try {
      if (!isLocalScreenShared) {
        await hmsActions.setScreenShareEnabled(true);
        toast({
          title: "Screen sharing started",
          description: "Your screen is now visible to others in the channel",
        });
      } else {
        await hmsActions.setScreenShareEnabled(false);
        toast({
          title: "Screen sharing stopped",
          description: "Your screen is no longer being shared",
        });
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start screen sharing";
      toast({
        title: "Screen share error",
        description: errorMessage.includes("Permission denied") 
          ? "Screen sharing permission was denied. Please allow screen sharing to continue."
          : "Failed to start screen sharing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatMessageTime = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const voiceParticipants = voiceChannelData?.participants || [];
  const participantsOtherThanMe = voiceParticipants.filter(p => p.userId !== currentUserId);
  const someoneIsWaiting = participantsOtherThanMe.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Voice Channel Indicator with Screen Share Control */}
      {someoneIsWaiting && (
        <div className="border-b p-3 bg-muted/30">
          <div className="p-2 bg-primary/10 border border-primary/30 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">In Voice Channel:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {participantsOtherThanMe.map(participant => (
                <div key={participant.id} className="flex items-center gap-1 bg-background/50 rounded-full px-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs bg-primary/20">
                      {(participant.gamertag?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium" data-testid={`voice-participant-${participant.userId}`}>
                    {participant.gamertag || 'User'}
                  </span>
                  {participant.isMuted && (
                    <MicOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            {isConnected && (
              <div className="mt-2 pt-2 border-t border-primary/20">
                <Button
                  size="sm"
                  variant={isLocalScreenShared ? "default" : "secondary"}
                  onClick={toggleScreenShare}
                  className="w-full"
                  data-testid="button-toggle-screenshare-messages"
                >
                  {isLocalScreenShared ? (
                    <>
                      <MonitorOff className="h-4 w-4 mr-1" />
                      Stop Sharing Screen
                    </>
                  ) : (
                    <>
                      <MonitorUp className="h-4 w-4 mr-1" />
                      Share Screen
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Switch to the Voice tab to join the call{isConnected && " or control audio"}
            </p>
          </div>
        </div>
      )}

      {/* Messages List */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Start the conversation with {otherUserName || 'your teammate'}!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words" data-testid={`message-${msg.id}`}>{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${otherUserName || 'teammate'}...`}
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
