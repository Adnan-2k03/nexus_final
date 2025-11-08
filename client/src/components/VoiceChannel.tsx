import { useState, useEffect, useRef } from "react";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalScreenShared,
  selectHMSMessages,
  HMSNotificationTypes,
} from "@100mslive/react-sdk";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, MicOff, Phone, PhoneOff, MonitorUp, MonitorOff, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useHMSContext } from "@/contexts/HMSContext";

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
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);
  const hmsMessages = useHMSStore(selectHMSMessages);
  const { setVoiceChannelActive } = useHMSContext();
  
  const [isJoining, setIsJoining] = useState(false);
  const [fullscreenPeerId, setFullscreenPeerId] = useState<string | null>(null);
  const [minimizedPeerId, setMinimizedPeerId] = useState<string | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const minimizedVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const otherPeers = peers.filter(peer => !peer.isLocal);
  const hasOtherUser = otherPeers.length > 0;

  // Set up HMS logging
  useEffect(() => {
    hmsActions.setLogLevel(4);
    console.log('[HMS] Verbose logging enabled for voice channel');
  }, [hmsActions]);

  // Auto-reconnect if user was in this voice channel before navigating away
  useEffect(() => {
    const savedConnectionId = sessionStorage.getItem('activeVoiceChannelId');
    if (savedConnectionId === connectionId && !isConnected && !isJoining) {
      console.log('[HMS] Auto-reconnecting to voice channel after navigation');
      joinChannel();
    }
  }, []);

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

  const joinChannel = async () => {
    setIsJoining(true);
    try {
      console.log('[HMS] Requesting auth token for voice channel...');
      const response = await fetch(getApiUrl('/api/voice/join'), {
        method: 'POST',
        credentials: 'include',
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
      
      // Set active voice channel in context
      setVoiceChannelActive(connectionId);
      
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
      
      // Clear active voice channel from context
      setVoiceChannelActive(null);
      
      // Notify backend
      await fetch(getApiUrl('/api/voice/leave'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });
      
      toast({
        title: "Left voice channel",
        description: "You've disconnected from the voice channel",
      });
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  };

  const toggleMute = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isLocalScreenShared) {
        await hmsActions.setScreenShareEnabled(true);
        toast({
          title: "Screen sharing started",
          description: "Your screen is now visible",
        });
      } else {
        await hmsActions.setScreenShareEnabled(false);
        toast({
          title: "Screen sharing stopped",
        });
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      toast({
        title: "Screen share error",
        description: "Failed to start screen sharing",
        variant: "destructive",
      });
    }
  };

  const screenSharePeers = peers.filter(peer => peer.auxiliaryTracks.length > 0);
  
  // Attach screen share video tracks
  useEffect(() => {
    const fullscreenPeer = peers.find(p => p.id === fullscreenPeerId);
    if (fullscreenPeer && screenShareVideoRef.current) {
      const screenTrack = fullscreenPeer.auxiliaryTracks[0];
      if (screenTrack) {
        hmsActions.attachVideo(screenTrack.id, screenShareVideoRef.current);
        return () => {
          hmsActions.detachVideo(screenTrack.id, screenShareVideoRef.current!);
        };
      }
    }
  }, [fullscreenPeerId, peers, hmsActions]);

  useEffect(() => {
    const minimizedPeer = peers.find(p => p.id === minimizedPeerId);
    if (minimizedPeer && minimizedVideoRef.current) {
      const screenTrack = minimizedPeer.auxiliaryTracks[0];
      if (screenTrack) {
        hmsActions.attachVideo(screenTrack.id, minimizedVideoRef.current);
        return () => {
          hmsActions.detachVideo(screenTrack.id, minimizedVideoRef.current!);
        };
      }
    }
  }, [minimizedPeerId, peers, hmsActions]);

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
                  Start a voice channel with {otherUserName || 'teammate'}
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
              <Button
                size="sm"
                variant={isLocalScreenShared ? "default" : "secondary"}
                onClick={toggleScreenShare}
                className="flex-1"
                data-testid="button-toggle-screenshare"
              >
                {isLocalScreenShared ? (
                  <>
                    <MonitorOff className="h-4 w-4 mr-1" />
                    Stop Sharing
                  </>
                ) : (
                  <>
                    <MonitorUp className="h-4 w-4 mr-1" />
                    Share Screen
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

            {screenSharePeers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Screen Shares</p>
                {screenSharePeers.map((peer) => (
                  <div
                    key={peer.id}
                    className="bg-black rounded-lg overflow-hidden aspect-video relative group"
                    data-testid={`screenshare-${peer.id}`}
                  >
                    <video
                      ref={(videoEl) => {
                        if (videoEl && peer.auxiliaryTracks[0]) {
                          hmsActions.attachVideo(peer.auxiliaryTracks[0].id, videoEl);
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white">{peer.name}'s screen</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setFullscreenPeerId(peer.id)}
                        data-testid={`button-fullscreen-${peer.id}`}
                        className="backdrop-blur-sm bg-black/40 hover:bg-black/60 border-white/20 text-white"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMinimizedPeerId(peer.id)}
                        data-testid={`button-minimize-${peer.id}`}
                        className="backdrop-blur-sm bg-black/40 hover:bg-black/60 border-white/20 text-white"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Fullscreen Screen Share Dialog */}
      <Dialog open={fullscreenPeerId !== null} onOpenChange={(open) => !open && setFullscreenPeerId(null)}>
        <DialogContent className="max-w-[95vw] h-[95vh]">
          <DialogHeader>
            <DialogTitle>
              {peers.find(p => p.id === fullscreenPeerId)?.name}'s Screen Share
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-black rounded-lg overflow-hidden">
            <video
              ref={screenShareVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Minimized Pop-out Screen Share */}
      {minimizedPeerId && (
        <div className="fixed bottom-4 right-4 w-80 bg-background border-2 border-primary rounded-lg shadow-2xl z-50"
          data-testid="minimized-screenshare">
          <div className="flex items-center justify-between p-2 bg-primary text-primary-foreground">
            <span className="text-sm font-medium">
              {peers.find(p => p.id === minimizedPeerId)?.name}'s Screen
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMinimizedPeerId(null)}
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              data-testid="button-close-minimized"
            >
              ✕
            </Button>
          </div>
          <div className="aspect-video bg-black">
            <video
              ref={minimizedVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
