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
import { Mic, MicOff, Phone, PhoneOff, MonitorUp, MonitorOff, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useHMSContext } from "@/contexts/HMSContext";

interface VoiceChannelProps {
  connectionId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName?: string;
  hideScreenShare?: boolean;
}

export function VoiceChannel({ connectionId, currentUserId, otherUserId, otherUserName, hideScreenShare = false }: VoiceChannelProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);
  const hmsMessages = useHMSStore(selectHMSMessages);
  const { setVoiceChannelActive, activeVoiceChannel } = useHMSContext();
  
  const [isJoining, setIsJoining] = useState(false);
  const [fullscreenPeerId, setFullscreenPeerId] = useState<string | null>(null);
  const [minimizedPeerId, setMinimizedPeerId] = useState<string | null>(null);
  const [remotePeerVolumes, setRemotePeerVolumes] = useState<Record<string, number>>({});
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const minimizedVideoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  const hasExplicitlyLeftRef = useRef(false);
  const { toast } = useToast();

  const otherPeers = peers.filter(peer => !peer.isLocal);
  const hasOtherUser = otherPeers.length > 0;

  // Set up HMS logging and audio quality settings
  useEffect(() => {
    hmsActions.setLogLevel(4);
    console.log('[HMS] Verbose logging enabled for voice channel');
    
    // Configure high-quality audio settings
    const configureAudioQuality = async () => {
      try {
        // Set audio output settings for better quality with higher bitrate
        await hmsActions.setAudioSettings({
          maxBitrate: 64,
        });
        console.log('[HMS] High-quality audio settings configured');
      } catch (error) {
        console.warn('[HMS] Could not configure audio settings:', error);
      }
    };
    
    configureAudioQuality();
  }, [hmsActions]);

  // Auto-reconnect if user was in this individual voice channel before navigating away
  useEffect(() => {
    // Only auto-reconnect if:
    // 1. The saved channel matches this connection ID
    // 2. The saved channel is of type 'individual'
    // 3. We're not currently connected to any HMS room
    // 4. We're not already in the process of joining
    // 5. The user hasn't explicitly left this channel
    if (activeVoiceChannel?.id === connectionId && 
        activeVoiceChannel?.type === 'individual' && 
        !isConnected && 
        !isJoining &&
        !hasExplicitlyLeftRef.current) {
      console.log('[HMS] Auto-reconnecting to individual voice channel after navigation');
      joinChannel();
    }
  }, [activeVoiceChannel, connectionId, isConnected, isJoining]);

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

  // Handle wake lock re-acquisition when tab becomes visible
  useEffect(() => {
    if (!isConnected) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        try {
          if ('wakeLock' in navigator) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            console.log('[Wake Lock] Re-acquired after tab became visible');
          }
        } catch (err) {
          console.warn('[Wake Lock] Could not re-acquire wake lock:', err);
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for wake lock release to clear ref
    if (wakeLockRef.current) {
      wakeLockRef.current.addEventListener('release', () => {
        console.log('[Wake Lock] Released by system');
        wakeLockRef.current = null;
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  // Handle HMS notifications and errors
  useEffect(() => {
    if (hmsMessages && hmsMessages.length > 0) {
      const latestMessage = hmsMessages[hmsMessages.length - 1];
      console.log('[HMS] Notification:', latestMessage);
      
      if (latestMessage.type === HMSNotificationTypes.ERROR) {
        const error = (latestMessage as any).data;
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
        console.log('[HMS] Peer joined:', (latestMessage as any).data);
      }
      
      if (latestMessage.type === HMSNotificationTypes.PEER_LEFT) {
        console.log('[HMS] Peer left:', (latestMessage as any).data);
      }
    }
  }, [hmsMessages, isJoining, toast]);

  const joinChannel = async () => {
    setIsJoining(true);
    hasExplicitlyLeftRef.current = false; // Clear explicit leave flag when joining
    try {
      // If already connected to a room, leave it first
      if (isConnected) {
        console.log('[HMS] Already connected to a room, leaving first...');
        await hmsActions.leave();
        setVoiceChannelActive(null);
        
        // Wait a moment for HMS to fully disconnect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast({
          title: "Switched channels",
          description: "Left previous voice call to join this conversation",
        });
      }

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
        const errorData = await response.json().catch(() => ({ message: 'Failed to join voice channel' }));
        
        // Handle service not configured (503)
        if (response.status === 503) {
          throw new Error('Voice service is not configured on this server. Please contact support or set up 100ms credentials.');
        }
        
        throw new Error(errorData.message || 'Failed to join voice channel');
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
        rememberDeviceSelection: true,
      });

      // Request wake lock to keep audio running when app is backgrounded
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('[Wake Lock] Acquired to prevent audio interruption in background');
        }
      } catch (err) {
        console.warn('[Wake Lock] Could not acquire wake lock:', err);
      }

      console.log('[HMS] Join request sent successfully');
      
      // Set active voice channel in context with type 'individual'
      setVoiceChannelActive(connectionId, 'individual');
      
      toast({
        title: "Connecting...",
        description: "Joining voice channel",
      });
    } catch (error) {
      console.error('[HMS] Error in joinChannel:', error);
      setIsJoining(false);
      const errorMessage = error instanceof Error ? error.message : "Could not connect to voice channel";
      toast({
        title: "Voice channel unavailable",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const leaveChannel = async () => {
    try {
      hasExplicitlyLeftRef.current = true; // Set explicit leave flag to prevent auto-rejoin
      
      await hmsActions.leave();
      
      // Clear active voice channel from context
      setVoiceChannelActive(null);
      
      // Release wake lock
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[Wake Lock] Released');
      }
      
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

  const toggleRemoteAudioMute = async () => {
    const newMuteState = !isRemoteAudioMuted;
    setIsRemoteAudioMuted(newMuteState);
    
    // When toggling, apply to all current peers
    for (const peer of otherPeers) {
      if (peer.audioTrack) {
        if (newMuteState) {
          // When muting: Save current volume (100 is HMS default) then set to 0
          setRemotePeerVolumes(prev => {
            if (!(peer.id in prev)) {
              return { ...prev, [peer.id]: 100 };
            }
            return prev;
          });
          await hmsActions.setVolume(0, peer.audioTrack);
        } else {
          // When unmuting: Restore to saved volume
          await hmsActions.setVolume(remotePeerVolumes[peer.id] || 100, peer.audioTrack);
        }
      }
    }
    
    toast({
      title: newMuteState ? "Incoming audio muted" : "Incoming audio unmuted",
      description: newMuteState ? "You won't hear others in the call" : "You can now hear others in the call",
    });
  };

  // Apply mute state to peers when they join or when mute state changes
  useEffect(() => {
    if (!isConnected) return;
    
    const applyVolumeState = async () => {
      for (const peer of otherPeers) {
        if (peer.audioTrack) {
          if (isRemoteAudioMuted) {
            // For new peers joining while muted: record baseline volume and mute
            setRemotePeerVolumes(prev => {
              if (!(peer.id in prev)) {
                return { ...prev, [peer.id]: 100 };
              }
              return prev;
            });
            await hmsActions.setVolume(0, peer.audioTrack);
          }
        }
      }
    };
    
    applyVolumeState();
  }, [peers.map(p => p.id).join(','), isRemoteAudioMuted, isConnected, hmsActions]);

  // Clean up volumes for peers that have left
  useEffect(() => {
    const currentPeerIds = new Set(otherPeers.map(p => p.id));
    setRemotePeerVolumes(prev => {
      const cleaned: Record<string, number> = {};
      for (const [peerId, volume] of Object.entries(prev)) {
        if (currentPeerIds.has(peerId)) {
          cleaned[peerId] = volume;
        }
      }
      return cleaned;
    });
  }, [otherPeers.map(p => p.id).join(',')]);

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

  const screenSharePeers = peers.filter(peer => peer.auxiliaryTracks.length > 0);
  
  // Attach fullscreen screen share video track with proper cleanup
  useEffect(() => {
    if (hideScreenShare) return;
    
    const fullscreenPeer = peers.find(p => p.id === fullscreenPeerId);
    if (fullscreenPeer && screenShareVideoRef.current && fullscreenPeer.auxiliaryTracks[0]) {
      const track = fullscreenPeer.auxiliaryTracks[0] as any;
      const trackId = typeof track === 'string' ? track : track.id;
      
      if (trackId) {
        hmsActions.attachVideo(trackId, screenShareVideoRef.current);
        
        // Cleanup function to detach when peer changes or dialog closes
        return () => {
          if (screenShareVideoRef.current) {
            hmsActions.detachVideo(trackId, screenShareVideoRef.current);
          }
        };
      }
    }
  }, [fullscreenPeerId, peers, hmsActions, hideScreenShare]);

  // Attach minimized screen share video track with proper cleanup
  useEffect(() => {
    if (hideScreenShare) return;
    
    const minimizedPeer = peers.find(p => p.id === minimizedPeerId);
    if (minimizedPeer && minimizedVideoRef.current && minimizedPeer.auxiliaryTracks[0]) {
      const track = minimizedPeer.auxiliaryTracks[0] as any;
      const trackId = typeof track === 'string' ? track : track.id;
      
      if (trackId) {
        hmsActions.attachVideo(trackId, minimizedVideoRef.current);
        
        // Cleanup function to detach when peer changes or window closes
        return () => {
          if (minimizedVideoRef.current) {
            hmsActions.detachVideo(trackId, minimizedVideoRef.current);
          }
        };
      }
    }
  }, [minimizedPeerId, peers, hmsActions, hideScreenShare]);

  // Check if user is in THIS specific individual voice channel
  const isInThisIndividualChannel = isConnected && 
                                     activeVoiceChannel?.id === connectionId && 
                                     activeVoiceChannel?.type === 'individual';

  return (
    <div className="space-y-4">
      {!isInThisIndividualChannel ? (
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
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-background animate-pulse"></div>
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
                variant={isRemoteAudioMuted ? "destructive" : "secondary"}
                onClick={toggleRemoteAudioMute}
                className="flex-1"
                data-testid="button-toggle-speaker"
                title={isRemoteAudioMuted ? "Unmute incoming audio" : "Mute incoming audio"}
              >
                {isRemoteAudioMuted ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-1" />
                    Speaker Off
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-1" />
                    Speaker
                  </>
                )}
              </Button>
              {!hideScreenShare && (
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
              )}
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
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse" data-testid="teammate-ready-indicator"></div>
                  <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
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

      {/* Screen Shares Section - Only shown when hideScreenShare is false */}
      {!hideScreenShare && isInThisIndividualChannel && screenSharePeers.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Screen Shares</h3>
          <div className="grid gap-2">
            {screenSharePeers.map((peer) => (
              <Card key={peer.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MonitorUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {peer.name === currentUserId ? 'Your screen' : `${peer.name}'s screen`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFullscreenPeerId(peer.id)}
                      data-testid={`button-fullscreen-${peer.id}`}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMinimizedPeerId(peer.id)}
                      data-testid={`button-minimize-${peer.id}`}
                    >
                      <Minimize2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Screen Share Dialog */}
      {!hideScreenShare && fullscreenPeerId && (
        <Dialog open={fullscreenPeerId !== null} onOpenChange={(open) => !open && setFullscreenPeerId(null)}>
          <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {otherUserName}'s Screen Share
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-black rounded-lg overflow-hidden min-h-0">
              <video
                ref={screenShareVideoRef}
                autoPlay
                muted
                playsInline
                controls
                className="w-full h-full object-contain"
                data-testid="fullscreen-video"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Minimized Pop-out Screen Share - Portal to render outside dialog */}
      {!hideScreenShare && minimizedPeerId && (
        <div className="fixed bottom-4 right-4 w-96 bg-background border-2 border-primary rounded-lg shadow-2xl z-[9999]"
          data-testid="minimized-screenshare"
          style={{ position: 'fixed' }}>
          <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MonitorUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                {otherUserName}'s Screen Share
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMinimizedPeerId(null)}
              className="h-7 w-7 p-0 hover:bg-primary-foreground/20"
              data-testid="button-close-minimized"
            >
              ✕
            </Button>
          </div>
          <div className="aspect-video bg-black rounded-b-lg overflow-hidden">
            <video
              ref={minimizedVideoRef}
              autoPlay
              muted
              playsInline
              controls
              className="w-full h-full object-contain"
              data-testid="minimized-video"
            />
          </div>
        </div>
      )}
    </div>
  );
}
