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
  const [otherUserReady, setOtherUserReady] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [hasAudio, setHasAudio] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const hasReceivedOfferRef = useRef(false);
  const hasSentReadyRef = useRef(false);
  const hasInitiatedCallRef = useRef(false);
  
  const { toast } = useToast();
  const { lastMessage, sendMessage } = useWebSocket();
  
  // Determine caller using deterministic tie-breaker to prevent both users from initiating
  // This ensures only one user ever sends the offer, avoiding WebRTC "glare"
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
      console.log('[Voice] Received remote track:', event.streams[0]);
      remoteStreamRef.current = event.streams[0];
      setHasAudio(true);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        // Explicitly play the audio to handle browser autoplay policies
        remoteAudioRef.current.play().then(() => {
          console.log('[Voice] Remote audio playing successfully');
        }).catch(err => {
          console.error('[Voice] Error playing remote audio:', err);
          toast({
            title: "Audio playback issue",
            description: "Click anywhere on the page to enable audio",
            variant: "destructive",
          });
        });
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
      console.log('[Voice] Connection state:', peerConnection.connectionState);
      setConnectionState(peerConnection.connectionState);
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

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log('[Voice] ICE connection state:', peerConnection.iceConnectionState);
      setIceConnectionState(peerConnection.iceConnectionState);
    };
    
    return peerConnection;
  };

  const initiateCall = async () => {
    console.log('[Voice] initiateCall called - isCaller:', isCaller, 'hasStream:', !!localStreamRef.current, 'hasInitiated:', hasInitiatedCallRef.current);
    
    if (!isCaller || !localStreamRef.current || hasInitiatedCallRef.current) {
      console.log('[Voice] Skipping initiateCall - conditions not met');
      return;
    }
    
    // Prevent multiple invocations
    hasInitiatedCallRef.current = true;
    console.log('[Voice] Creating peer connection and offer...');
    
    try {
      // Create peer connection
      const peerConnection = await createPeerConnection();
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('[Voice] Sending WebRTC offer to', otherUserId);
      
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
        title: "Starting call",
        description: "Connecting with teammate...",
      });
    } catch (error) {
      console.error('[Voice] Error initiating call:', error);
      hasInitiatedCallRef.current = false; // Reset on error so user can retry
      toast({
        title: "Failed to start call",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const joinChannel = async () => {
    console.log('[Voice] joinChannel called - isCaller:', isCaller, 'otherUserReady:', otherUserReady);
    try {
      setIsConnecting(true);
      
      // Request microphone access
      console.log('[Voice] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      console.log('[Voice] Got local audio stream with', stream.getAudioTracks().length, 'tracks');
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }
      
      setIsInChannel(true);
      
      // Notify the other user that we're ready
      if (sendMessage && !hasSentReadyRef.current) {
        console.log('[Voice] Sending voice_channel_ready to', otherUserId);
        sendMessage({
          type: 'voice_channel_ready',
          connectionId,
          targetUserId: otherUserId,
        });
        hasSentReadyRef.current = true;
      }
      
      // If we're the caller and the other user is already ready, initiate the call
      if (isCaller && otherUserReady) {
        console.log('[Voice] We are caller and other user ready - initiating call');
        await initiateCall();
      } else if (isCaller) {
        console.log('[Voice] We are caller but waiting for other user');
        toast({
          title: "Ready for voice",
          description: "Waiting for teammate to join...",
        });
      } else {
        console.log('[Voice] We are not caller - waiting for call to start');
        toast({
          title: "Ready for voice",
          description: "Teammate can now start the call...",
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
    hasSentReadyRef.current = false;
    hasInitiatedCallRef.current = false;
    iceCandidatesQueue.current = [];
    setIsInChannel(false);
    setIsMuted(false);
    setIsSpeakerMuted(false);
    setOtherUserReady(false);
    
    // Reset connection status indicators
    setConnectionState('disconnected');
    setIceConnectionState('new');
    setHasAudio(false);
    
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
        if (type === 'voice_channel_ready') {
          // Other user is ready for voice
          console.log('[Voice] Received voice_channel_ready - isCaller:', isCaller, 'isInChannel:', isInChannel);
          setOtherUserReady(true);
          
          // If we're the caller and we're already in the channel, initiate the call
          if (isCaller && isInChannel && localStreamRef.current) {
            console.log('[Voice] We are caller and in channel - initiating call');
            await initiateCall();
          }
        } else if (type === 'webrtc_offer') {
          console.log('[Voice] Received webrtc_offer');

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
          console.log('[Voice] Received webrtc_answer');
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('[Voice] Set remote description from answer');
            
            // Add any queued ICE candidates
            console.log('[Voice] Processing', iceCandidatesQueue.current.length, 'queued ICE candidates');
            while (iceCandidatesQueue.current.length > 0) {
              const candidate = iceCandidatesQueue.current.shift();
              if (candidate) {
                await peerConnectionRef.current.addIceCandidate(candidate);
                console.log('[Voice] Added queued ICE candidate');
              }
            }
          } else {
            console.warn('[Voice] Received answer but no peer connection exists');
          }
        } else if (type === 'webrtc_ice_candidate') {
          // Received an ICE candidate
          console.log('[Voice] Received ICE candidate');
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('[Voice] Added ICE candidate to peer connection');
          } else {
            // Queue candidate if remote description not set yet
            iceCandidatesQueue.current.push(new RTCIceCandidate(data.candidate));
            console.log('[Voice] Queued ICE candidate (remote description not set yet), queue size:', iceCandidatesQueue.current.length);
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
            
            {/* Connection Status Indicators */}
            <div className="bg-background/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Connection Status:</span>
                <div className="flex items-center gap-2">
                  {connectionState === 'connected' ? (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-green-600 dark:text-green-400">Connected</span>
                    </>
                  ) : connectionState === 'connecting' ? (
                    <>
                      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">Connecting...</span>
                    </>
                  ) : connectionState === 'failed' ? (
                    <>
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-red-600 dark:text-red-400">Failed</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                      <span className="font-medium text-muted-foreground">Waiting...</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Audio Stream:</span>
                <div className="flex items-center gap-2">
                  {hasAudio ? (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-green-600 dark:text-green-400">Receiving</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                      <span className="font-medium text-muted-foreground">No Audio</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ICE State:</span>
                <div className="flex items-center gap-2">
                  {iceConnectionState === 'connected' || iceConnectionState === 'completed' ? (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-600 dark:text-green-400 capitalize">{iceConnectionState}</span>
                    </>
                  ) : iceConnectionState === 'checking' ? (
                    <>
                      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">Checking</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                      <span className="font-medium text-muted-foreground capitalize">{iceConnectionState}</span>
                    </>
                  )}
                </div>
              </div>
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
