import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Phone, PhoneOff, Mic, MicOff, Users } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import type { ChatMessageWithSender, VoiceParticipantWithUser } from "@shared/schema";
import { useVoice } from "@/contexts/VoiceProvider";

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
  const { state: voiceState, joinChannel, leaveChannel, toggleMute } = useVoice();

  // Fetch messages for this connection
  const { data: messages = [], isLoading } = useQuery<ChatMessageWithSender[]>({
    queryKey: ['/api/messages', connectionId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${connectionId}`);
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
      const response = await fetch(`/api/voice/channel/${connectionId}`);
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
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const formatMessageTime = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isInVoiceChannel = voiceState.isInChannel && voiceState.connectionId === connectionId;
  const voiceParticipants = voiceChannelData?.participants || [];
  const participantsOtherThanMe = voiceParticipants.filter(p => p.userId !== currentUserId);
  const someoneIsWaiting = participantsOtherThanMe.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Voice Channel - Persists across navigation */}
      <div className="border-b p-3 bg-muted/30">
        {/* Show who's currently in voice channel */}
        {someoneIsWaiting && !isInVoiceChannel && (
          <div className="mb-2 p-2 bg-primary/10 border border-primary/30 rounded-md">
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
                  {participant.isMuted === 'true' && (
                    <MicOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!isInVoiceChannel ? (
          <Button
            onClick={() => joinChannel(connectionId, otherUserId)}
            disabled={voiceState.isConnecting}
            size="sm"
            variant={someoneIsWaiting ? "default" : "outline"}
            className="w-full"
            data-testid="button-join-voice"
          >
            {voiceState.isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : someoneIsWaiting ? (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Join Voice Call ({participantsOtherThanMe.length} waiting)
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Start Voice Call
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  In Voice Call
                  {voiceParticipants.length > 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {voiceParticipants.length} participants
                    </Badge>
                  )}
                </span>
              </div>
              <Button
                onClick={toggleMute}
                size="sm"
                variant={voiceState.isMuted ? "destructive" : "secondary"}
                data-testid="button-toggle-mute"
              >
                {voiceState.isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={leaveChannel}
                size="sm"
                variant="destructive"
                data-testid="button-leave-voice"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
            {/* Show all participants in the call */}
            {voiceParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2">
                {voiceParticipants.map(participant => {
                  const isMe = participant.userId === currentUserId;
                  return (
                    <div 
                      key={participant.id} 
                      className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                        isMe ? 'bg-primary/20' : 'bg-secondary'
                      }`}
                      data-testid={`voice-participant-active-${participant.userId}`}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {(participant.gamertag?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {isMe ? 'You' : (participant.gamertag || 'User')}
                      </span>
                      {participant.isMuted === 'true' && (
                        <MicOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef} data-testid="chat-messages-area">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={isCurrentUser ? "bg-primary/10" : "bg-secondary"}>
                      {isCurrentUser ? "Y" : "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <Card className={`p-3 ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      <p className="text-sm break-words" data-testid={`message-text-${msg.id}`}>
                        {msg.message}
                      </p>
                    </Card>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
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
