import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';
import type { VoiceParticipantWithUser } from '@shared/schema';

interface VoiceChannelState {
  connectionId: string | null;
  participants: VoiceParticipantWithUser[];
  isConnected: boolean;
  isMuted: boolean;
  isJoining: boolean;
  error: string | null;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoiceChannel() {
  const { sendMessage, lastMessage } = useWebSocket();
  const { user } = useAuth();
  const [state, setState] = useState<VoiceChannelState>({
    connectionId: null,
    participants: [],
    isConnected: false,
    isMuted: false,
    isJoining: false,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const otherUserIdRef = useRef<string | null>(null);

  // Initialize remote audio element
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, []);

  // Clean up WebRTC resources
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    otherUserIdRef.current = null;
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((otherUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && state.connectionId) {
        sendMessage({
          type: 'webrtc_ice_candidate',
          targetUserId: otherUserId,
          connectionId: state.connectionId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Voice] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, isConnected: true, isJoining: false }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setState(prev => ({ ...prev, isConnected: false, error: 'Connection lost' }));
      }
    };

    return pc;
  }, [sendMessage, state.connectionId]);

  // Join voice channel
  const joinVoiceChannel = useCallback(async (connectionId: string, otherUserId: string) => {
    try {
      setState(prev => ({ ...prev, isJoining: true, error: null }));

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      otherUserIdRef.current = otherUserId;

      // Join channel in backend
      const response = await fetch('/api/voice/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to join voice channel');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        connectionId,
        participants: data.participants,
        isJoining: false,
      }));

      // Create peer connection and add local tracks
      const pc = createPeerConnection(otherUserId);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendMessage({
        type: 'webrtc_offer',
        targetUserId: otherUserId,
        connectionId,
        offer,
      });

    } catch (error) {
      console.error('[Voice] Join error:', error);
      cleanup();
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join voice channel',
      }));
    }
  }, [createPeerConnection, sendMessage, cleanup]);

  // Leave voice channel
  const leaveVoiceChannel = useCallback(async () => {
    if (!state.connectionId) return;

    try {
      await fetch('/api/voice/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: state.connectionId }),
      });

      cleanup();
      setState({
        connectionId: null,
        participants: [],
        isConnected: false,
        isMuted: false,
        isJoining: false,
        error: null,
      });
    } catch (error) {
      console.error('[Voice] Leave error:', error);
    }
  }, [state.connectionId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!state.connectionId || !localStreamRef.current) return;

    const newMutedState = !state.isMuted;
    
    // Mute/unmute local audio tracks
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState;
    });

    // Update backend
    try {
      await fetch('/api/voice/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: state.connectionId, isMuted: newMutedState }),
      });

      setState(prev => ({ ...prev, isMuted: newMutedState }));
    } catch (error) {
      console.error('[Voice] Mute error:', error);
    }
  }, [state.connectionId, state.isMuted]);

  // Handle WebRTC signaling messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleSignaling = async () => {
      const { type, data } = lastMessage;

      if (type === 'webrtc_offer' && data?.connectionId === state.connectionId) {
        try {
          if (!peerConnectionRef.current) {
            // Create new peer connection if we don't have one
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            otherUserIdRef.current = data.fromUserId;

            const pc = createPeerConnection(data.fromUserId);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => {
              pc.addTrack(track, stream);
            });
          }

          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          sendMessage({
            type: 'webrtc_answer',
            targetUserId: data.fromUserId,
            connectionId: data.connectionId,
            answer,
          });
        } catch (error) {
          console.error('[Voice] Offer handling error:', error);
        }
      } else if (type === 'webrtc_answer' && data?.connectionId === state.connectionId) {
        try {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        } catch (error) {
          console.error('[Voice] Answer handling error:', error);
        }
      } else if (type === 'webrtc_ice_candidate' && data?.connectionId === state.connectionId) {
        try {
          if (peerConnectionRef.current && data.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (error) {
          console.error('[Voice] ICE candidate error:', error);
        }
      } else if (type === 'voice_participant_joined' && data?.connectionId === state.connectionId) {
        setState(prev => ({ ...prev, participants: data.participants }));
        
        // If someone joined and we're already in the channel, initiate connection
        if (data.participant.userId !== user?.id && state.connectionId) {
          // The new participant will send an offer to us
        }
      } else if (type === 'voice_participant_left' && data?.connectionId === state.connectionId) {
        setState(prev => ({ ...prev, participants: data.participants }));
        
        // If the other user left, clean up connection
        if (data.userId === otherUserIdRef.current) {
          cleanup();
          setState(prev => ({ ...prev, isConnected: false }));
        }
      } else if (type === 'voice_participant_muted' && data?.connectionId === state.connectionId) {
        setState(prev => ({ ...prev, participants: data.participants }));
      }
    };

    handleSignaling();
  }, [lastMessage, state.connectionId, createPeerConnection, sendMessage, cleanup, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cleanup on unmount to persist voice across navigation
      // Only cleanup when explicitly leaving
    };
  }, []);

  return {
    ...state,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
  };
}
