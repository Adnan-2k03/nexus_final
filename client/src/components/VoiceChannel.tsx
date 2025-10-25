import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

interface VoiceChannelProps {
  connectionId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName?: string;
}

export function VoiceChannel({ connectionId, currentUserId, otherUserId, otherUserName }: VoiceChannelProps) {
  const [isInChannel, setIsInChannel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const hasReceivedOfferRef = useRef(false);
  
  const { toast } = useToast();
  const { lastMessage, sendMessage } = useWebSocket();
  
  // Determine if this user should initiate the call (caller role)
  // Use lexicographic comparison to ensure one user is always the caller
  const isCaller = currentUserId < otherUserId;

  // ICE servers for WebRTC connection (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const createPeerConnection = async () => {
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peerConnection;
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }
    
    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };
    
    // Send ICE candidates to remote peer via WebSocket
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && sendMessage) {
        sendMessage({
          type: 'webrtc_ice_candidate',
          connectionId,
          targetUserId: otherUserId,
          candidate: event.candidate
        });
      }
    };
    
    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        toast({
          title: "Voice connected",
          description: `You're now in a voice channel with ${otherUserName || 'teammate'}`,
        });
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        toast({
          title: "Voice disconnected",
          description: "The voice connection was lost",
          variant: "destructive",
        });
        leaveChannel();
      }
    };
    
    return peerConnection;
  };

  const joinChannel = async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }
      
      setIsInChannel(true);
      
      // Only create peer connection and send offer if this user is the caller
      if (isCaller) {
        // Create peer connection
        const peerConnection = await createPeerConnection();
        
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer to remote peer via WebSocket
        if (sendMessage) {
          sendMessage({
            type: 'webrtc_offer',
            connectionId,
            targetUserId: otherUserId,
            offer: offer
          });
        }
        
        toast({
          title: "Joined voice channel",
          description: "Waiting for teammate to join...",
        });
      } else {
        // Callee just gets media and waits for the offer from the caller
        // Peer connection will be created when offer arrives
        toast({
          title: "Ready for voice",
          description: "Waiting for teammate to start the call...",
        });
      }
      
      setIsConnecting(false);
    } catch (error) {
      console.error('Error joining voice channel:', error);
      setIsConnecting(false);
      toast({
        title: "Failed to join voice",
        description: "Please check your microphone permissions",
        variant: "destructive",
      });
    }
  };

  const leaveChannel = () => {
    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear remote stream
    remoteStreamRef.current = null;
    
    // Reset state
    hasReceivedOfferRef.current = false;
    iceCandidatesQueue.current = [];
    setIsInChannel(false);
    setIsMuted(false);
    setIsSpeakerMuted(false);
    
    toast({
      title: "Left voice channel",
      description: "You've disconnected from the voice chat",
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerMuted(remoteAudioRef.current.muted);
    }
  };

  // Handle incoming WebRTC signaling messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleSignaling = async () => {
      const { type, data } = lastMessage;
      
      // Only handle messages for this connection
      if (data?.connectionId !== connectionId) return;
      
      try {
        if (type === 'webrtc_offer') {
          // Ignore offer if we've already received one (prevents duplicate processing)
          if (hasReceivedOfferRef.current) {
            console.log('Ignoring duplicate offer');
            return;
          }
          hasReceivedOfferRef.current = true;
          
          // Received an offer - create answer
          if (!localStreamRef.current) {
            // Need to get media first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            if (localAudioRef.current) {
              localAudioRef.current.srcObject = stream;
              localAudioRef.current.muted = true;
            }
          }
          
          // Create or use existing peer connection
          const peerConnection = peerConnectionRef.current || await createPeerConnection();
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          // Add any queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              await peerConnection.addIceCandidate(candidate);
            }
          }
          
          // Create and send answer
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          if (sendMessage) {
            sendMessage({
              type: 'webrtc_answer',
              connectionId,
              targetUserId: otherUserId,
              answer: answer
            });
          }
          
          setIsInChannel(true);
          setIsConnecting(false);
        } else if (type === 'webrtc_answer') {
          // Received an answer
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            
            // Add any queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const candidate = iceCandidatesQueue.current.shift();
              if (candidate) {
                await peerConnectionRef.current.addIceCandidate(candidate);
              }
            }
          }
        } else if (type === 'webrtc_ice_candidate') {
          // Received an ICE candidate
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            // Queue candidate if remote description not set yet
            iceCandidatesQueue.current.push(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (error) {
        console.error('Error handling WebRTC signaling:', error);
      }
    };

    handleSignaling();
  }, [lastMessage, connectionId, otherUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInChannel) {
        leaveChannel();
      }
    };
  }, [isInChannel]);

  return (
    <div className="space-y-4">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay />
      <audio ref={remoteAudioRef} autoPlay />
      
      {!isInChannel ? (
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
              disabled={isConnecting}
              data-testid="button-join-voice"
            >
              {isConnecting ? "Joining..." : "Join Voice"}
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
                variant={isMuted ? "destructive" : "secondary"}
                onClick={toggleMute}
                className="flex-1"
                data-testid="button-toggle-mic"
              >
                {isMuted ? (
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
                variant={isSpeakerMuted ? "destructive" : "secondary"}
                onClick={toggleSpeaker}
                className="flex-1"
                data-testid="button-toggle-speaker"
              >
                {isSpeakerMuted ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-1" />
                    Speaker Off
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-1" />
                    Speaker On
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground bg-background/50 rounded p-2">
              <p className="flex items-center gap-1">
                <span className="font-semibold">Note:</span> 
                Voice channels use WebRTC peer-to-peer connections. For best results, ensure both users are online at the same time.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
