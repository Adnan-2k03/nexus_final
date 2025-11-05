import { useState, useEffect } from "react";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectHMSMessages,
  HMSNotificationTypes,
} from "@100mslive/react-sdk";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceChannelProps {
  connectionId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName?: string;
}

export function VoiceChannel({ connectionId, currentUserId, otherUserId, otherUserName }: VoiceChannelProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const hmsMessages = useHMSStore(selectHMSMessages);
  
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const otherPeers = peers.filter(peer => !peer.isLocal);
  const hasOtherUser = otherPeers.length > 0;

  // Set up HMS logging
  useEffect(() => {
    hmsActions.setLogLevel(4);
    console.log('[HMS] Verbose logging enabled for voice channel');
  }, [hmsActions]);

  // Handle connection success
  useEffect(() => {
    if (isConnected && isJoining) {
      console.log('[HMS] Successfully connected to voice channel!');
      setIsJoining(false);
      toast({
        title: "Voice connected",
        description: `You're now in a voice channel with ${otherUserName || 'teammate'}`,
      });
    }
  }, [isConnected, isJoining, otherUserName, toast]);

  // Handle HMS notifications and errors
  useEffect(() => {
    if (hmsMessages && hmsMessages.length > 0) {
      const latestMessage = hmsMessages[hmsMessages.length - 1];
      console.log('[HMS] Notification:', latestMessage);
      
      if (latestMessage.type === HMSNotificationTypes.ERROR) {
        const error = latestMessage.data;
        console.error('[HMS] Error received:', {
          code: error?.code,
          message: error?.message,
          description: error?.description,
          isTerminal: error?.isTerminal,
          action: error?.action,
        });
        
        if (isJoining) {
          setIsJoining(false);
          toast({
            title: "Connection failed",
            description: `${error?.message || 'Could not connect to voice channel'} (Code: ${error?.code})`,
            variant: "destructive",
          });
        }
      }
      
      if (latestMessage.type === HMSNotificationTypes.PEER_JOINED) {
        console.log('[HMS] Peer joined:', latestMessage.data);
      }
      
      if (latestMessage.type === HMSNotificationTypes.PEER_LEFT) {
        console.log('[HMS] Peer left:', latestMessage.data);
      }
    }
  }, [hmsMessages, isJoining, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        console.log('[HMS] Component unmounting, leaving room');
        hmsActions.leave();
      }
    };
  }, [isConnected, hmsActions]);

  const joinChannel = async () => {
    setIsJoining(true);
    try {
      console.log('[HMS] Requesting auth token for voice channel...');
      const response = await fetch('/api/voice/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to join voice channel');
      }

      const data = await response.json() as { token: string; roomId: string };
      console.log('[HMS] Auth token received, room ID:', data.roomId);
      console.log('[HMS] Attempting to join room...');

      await hmsActions.join({
        userName: currentUserId,
        authToken: data.token,
        settings: {
          isAudioMuted: false,
          isVideoMuted: true,
        },
      });

      console.log('[HMS] Join request sent successfully');
      
      toast({
        title: "Connecting...",
        description: "Joining voice channel",
      });
    } catch (error) {
      console.error('[HMS] Error in joinChannel:', error);
      setIsJoining(false);
      const errorMessage = error instanceof Error ? error.message : "Could not connect to voice channel";
      toast({
        title: "Failed to join",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const leaveChannel = async () => {
    try {
      await hmsActions.leave();
      
      // Notify backend
      await fetch('/api/voice/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });
      
      toast({
        title: "Left voice channel",
        description: "You've disconnected from the voice chat",
      });
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  };

  const toggleMute = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Voice Channel</h3>
                <p className="text-xs text-muted-foreground">
                  Start a voice chat with {otherUserName || 'teammate'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={joinChannel}
              disabled={isJoining}
              data-testid="button-join-voice"
            >
              {isJoining ? "Joining..." : "Join Voice"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="p-2 bg-primary rounded-full">
                    <Phone className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">In Voice Channel</h3>
                  <p className="text-xs text-muted-foreground">
                    Connected with {otherUserName || 'teammate'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={leaveChannel}
                data-testid="button-leave-voice"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant={!isLocalAudioEnabled ? "destructive" : "secondary"}
                onClick={toggleMute}
                className="flex-1"
                data-testid="button-toggle-mic"
              >
                {!isLocalAudioEnabled ? (
                  <>
                    <MicOff className="h-4 w-4 mr-1" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1" />
                    Mute
                  </>
                )}
              </Button>
            </div>
            
            {!hasOtherUser ? (
              <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Phone className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
                    <div className="absolute inset-0 h-8 w-8 bg-yellow-500/30 rounded-full animate-ping"></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-yellow-700 dark:text-yellow-500">
                      Waiting for {otherUserName || 'teammate'}...
                    </h4>
                    <p className="text-xs text-yellow-600/90 dark:text-yellow-500/80">
                      You're in the voice channel. Waiting for them to join.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" data-testid="teammate-ready-indicator"></div>
                  <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                    {otherUserName || 'Teammate'} is in the voice channel
                  </span>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-background/50 rounded p-2">
              <p className="flex items-center gap-1">
                <span className="font-semibold">Note:</span> 
                Voice channels use 100ms for reliable, high-quality voice communication.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
