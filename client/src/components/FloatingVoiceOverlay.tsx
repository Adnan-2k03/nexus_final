import { useState, useEffect, useRef } from "react";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsLocalAudioEnabled,
  HMSPeer,
} from "@100mslive/react-sdk";
import { Mic, MicOff, Volume2, X, Minimize2, Maximize2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import VoiceOverlay from "@/lib/voice-overlay-plugin";

interface FloatingVoiceOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export function FloatingVoiceOverlay({ isVisible, onClose }: FloatingVoiceOverlayProps) {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('voice-overlay-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 320, y: 20 };
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('voice-overlay-minimized');
    return saved === 'true';
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);

  const localPeer = peers.find((peer: HMSPeer) => peer.isLocal);
  const otherPeers = peers.filter((peer: HMSPeer) => !peer.isLocal);
  const isNativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNativePlatform && isVisible && isConnected) {
      const participants = otherPeers.map((peer: HMSPeer) => ({
        name: peer.name || 'User',
        isSpeaking: !!peer.audioTrack
      }));
      
      VoiceOverlay.updateParticipants({ participants }).catch(console.error);
    }
  }, [otherPeers, isVisible, isConnected, isNativePlatform]);

  useEffect(() => {
    if (isNativePlatform && isVisible) {
      VoiceOverlay.updateMicState({ isMuted: !isLocalAudioEnabled }).catch(console.error);
    }
  }, [isLocalAudioEnabled, isVisible, isNativePlatform]);

  useEffect(() => {
    localStorage.setItem('voice-overlay-position', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('voice-overlay-minimized', isMinimized.toString());
  }, [isMinimized]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - (isMinimized ? 200 : 300), e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - (isMinimized ? 60 : 200), e.clientY - dragOffset.current.y))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setIsDragging(true);
    }
  };

  const toggleMute = async () => {
    if (isConnected) {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed z-[9999] bg-card border border-border rounded-lg shadow-2xl transition-all",
        isDragging ? "cursor-grabbing" : "cursor-default"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '200px' : '300px',
      }}
      data-testid="floating-voice-overlay"
    >
      <div
        className={cn(
          "flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg",
          !isMinimized && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={!isMinimized ? handleMouseDown : undefined}
      >
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Voice Channel</span>
          {isConnected && (
            <Badge variant="default" className="h-5 px-1.5 text-xs">
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
            data-testid="button-minimize-overlay"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
            data-testid="button-close-overlay"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
          {!isConnected ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Not in a voice channel</p>
              <p className="text-xs text-muted-foreground mt-1">Join a voice call to see controls here</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">You</h4>
                {localPeer && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(localPeer.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate">{localPeer.name || 'You'}</span>
                    <Button
                      size="icon"
                      variant={isLocalAudioEnabled ? "default" : "destructive"}
                      className="h-7 w-7 shrink-0"
                      onClick={toggleMute}
                      data-testid="button-toggle-mic-overlay"
                    >
                      {isLocalAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>

              {otherPeers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    In Channel ({otherPeers.length})
                  </h4>
                  <div className="space-y-1">
                    {otherPeers.map((peer: HMSPeer) => (
                      <div
                        key={peer.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                        data-testid={`participant-${peer.id}`}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback>
                            {(peer.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 truncate">{peer.name || 'User'}</span>
                        <div className="shrink-0">
                          {peer.audioTrack ? (
                            <Volume2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <MicOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isMinimized && (
        <div
          className="p-2 flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? `${otherPeers.length + 1} in call` : 'Not connected'}
          </Badge>
          {isConnected && localPeer && (
            <Button
              size="icon"
              variant={isLocalAudioEnabled ? "default" : "destructive"}
              className="h-7 w-7"
              onClick={toggleMute}
              data-testid="button-toggle-mic-minimized"
            >
              {isLocalAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
