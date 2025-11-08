import { useState, useEffect } from "react";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
  selectScreenShareByPeerID,
  selectHMSMessages,
  HMSNotificationTypes,
} from "@100mslive/react-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import {
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Users,
  Copy,
  Check,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import type { GroupVoiceChannelWithDetails, GroupVoiceMemberWithUser } from "@shared/schema";
import { useHMSContext } from "@/contexts/HMSContext";

interface GroupVoiceChannelProps {
  channel: GroupVoiceChannelWithDetails;
  currentUserId: string;
  isActiveChannel: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
}

export function GroupVoiceChannel({ channel, currentUserId, isActiveChannel, onJoin, onLeave }: GroupVoiceChannelProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);
  const hmsMessages = useHMSStore(selectHMSMessages);
  const { activeVoiceChannel, setVoiceChannelActive } = useHMSContext();
  
  // Check if user is actually in THIS specific group channel
  const isInThisGroupChannel = isConnected && 
                                activeVoiceChannel?.id === channel.id && 
                                activeVoiceChannel?.type === 'group';
  
  const [isJoining, setIsJoining] = useState(false);
  const [members, setMembers] = useState<GroupVoiceMemberWithUser[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [profileDialogUserId, setProfileDialogUserId] = useState<string | null>(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [remotePeerVolumes, setRemotePeerVolumes] = useState<Record<string, number>>({});
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const { toast} = useToast();
  
  // Check if channel has active members
  const hasActiveMembers = members.some(m => m.isActive);

  const { data: profileUser } = useQuery<User>({
    queryKey: ["/api/users", profileDialogUserId],
    queryFn: async () => {
      if (!profileDialogUserId) throw new Error("No user ID");
      const response = await fetch(getApiUrl(`/api/users/${profileDialogUserId}`), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!profileDialogUserId,
  });

  const inviteLink = `${window.location.origin}/join-channel/${channel.inviteCode}`;

  useEffect(() => {
    fetchMembers();
  }, [channel.id]);

  useEffect(() => {
    hmsActions.setLogLevel(4);
    console.log('[HMS] Verbose logging enabled');
  }, [hmsActions]);

  useEffect(() => {
    if (isConnected && isJoining) {
      console.log('[HMS] Successfully connected to room!');
      setIsJoining(false);
      if (onJoin) onJoin();
      toast({
        title: "Joined voice channel",
        description: `You're now in ${channel.name}`,
      });
    }
  }, [isConnected, isJoining, channel.name, toast, onJoin]);

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

  const fetchMembers = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/group-voice/${channel.id}/members`), {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const joinChannel = async () => {
    setIsJoining(true);
    try {
      // If already connected to a room, leave it first
      if (isConnected) {
        console.log('[HMS] Already connected to a room, leaving first...');
        
        // If there's an active direct voice channel, notify backend to clean it up
        if (activeVoiceChannel?.type === 'individual') {
          try {
            await fetch(getApiUrl('/api/voice/leave'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ connectionId: activeVoiceChannel.id }),
            });
            console.log('[HMS] Notified backend to leave previous individual voice channel');
          } catch (error) {
            console.warn('[HMS] Failed to notify backend about leaving previous channel:', error);
          }
        }
        
        await hmsActions.leave();
        setVoiceChannelActive(null);
        
        // Wait a moment for HMS to fully disconnect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast({
          title: "Switched channels",
          description: "Left previous voice call to join this group channel",
        });
      }

      console.log('[HMS] Requesting auth token from backend...');
      const response = await apiRequest(
        "POST",
        "/api/group-voice/join",
        { channelId: channel.id }
      );

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
      
      // Set active voice channel with type 'group'
      setVoiceChannelActive(channel.id, 'group');
      
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
      await apiRequest("POST", "/api/group-voice/leave", { channelId: channel.id });
      
      // Clear active voice channel from context
      setVoiceChannelActive(null);
      
      toast({
        title: "Left voice channel",
        description: "You've disconnected from the voice channel",
      });
      
      if (onLeave) onLeave();
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  };

  const exitChannel = async () => {
    try {
      if (isConnected) {
        await hmsActions.leave();
      }
      
      const response = await apiRequest("POST", "/api/group-voice/exit", { channelId: channel.id });
      
      // Clear active voice channel from context
      setVoiceChannelActive(null);
      
      const wasDeleted = (response as any).channelDeleted;
      
      toast({
        title: wasDeleted ? "Channel deleted" : "Exited channel",
        description: wasDeleted 
          ? "Channel was automatically deleted as you were the last member"
          : "You've permanently left the channel",
      });
      
      if (onLeave) onLeave();
    } catch (error) {
      console.error("Error exiting channel:", error);
      toast({
        title: "Failed to exit",
        description: "Could not exit the channel. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleRemoteAudioMute = async () => {
    const newMuteState = !isRemoteAudioMuted;
    setIsRemoteAudioMuted(newMuteState);
    
    // When toggling, apply to all current peers
    const otherPeers = peers.filter(peer => !peer.isLocal);
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

  const toggleScreenShare = async () => {
    try {
      if (!isLocalScreenShared) {
        await hmsActions.setScreenShareEnabled(true);
        toast({
          title: "Screen sharing started",
          description: "Your screen is now visible to everyone",
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

  // Apply mute state to peers when they join or when mute state changes
  useEffect(() => {
    if (!isConnected) return;
    
    const otherPeers = peers.filter(peer => !peer.isLocal);
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
    const otherPeers = peers.filter(peer => !peer.isLocal);
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
  }, [peers.map(p => p.id).join(',')]); 

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    toast({
      title: "Invite link copied",
      description: "Share this link to invite others",
    });
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await apiRequest("DELETE", `/api/group-voice/${channel.id}/member/${userId}`);
      toast({
        title: "Member removed",
        description: "User has been removed from the channel",
      });
      fetchMembers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const screenSharePeers = peers.filter(peer => peer.auxiliaryTracks.length > 0);
  const otherPeers = peers.filter(peer => !peer.isLocal);

  return (
    <div className="space-y-4">
      {!isInThisGroupChannel ? (
        <Card data-testid="card-join-channel">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              {channel.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>
                {channel.memberCount} member{channel.memberCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs mt-1">
                Created by {channel.creatorGamertag || "Unknown"}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={joinChannel}
                  disabled={isJoining}
                  className="flex-1"
                  data-testid="button-join-channel"
                >
                  {isJoining ? "Joining..." : "Join Voice Channel"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteLink}
                  data-testid="button-copy-invite"
                >
                  {copiedInvite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={exitChannel}
              className="text-xs text-destructive hover:bg-destructive/10"
              data-testid="button-exit-channel"
            >
              <X className="h-3 w-3 mr-1" />
              Exit Channel
            </Button>

            {/* Active Members - Always visible when there are active members */}
            {hasActiveMembers && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    Active Now ({members.filter(m => m.isActive).length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.filter(member => member.isActive).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-1"
                      data-testid={`active-member-${member.userId}`}
                    >
                      <Avatar className="h-5 w-5 ring-1 ring-green-500">
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.gamertag?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="text-xs font-medium cursor-pointer hover:underline"
                        onClick={() => {
                          setProfileDialogUserId(member.userId);
                          setOpenProfileDialog(true);
                        }}
                        data-testid={`active-member-name-${member.userId}`}
                      >
                        {member.gamertag || "Unknown"}
                      </span>
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" data-testid={`active-indicator-${member.userId}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Members - Sheet Trigger */}
            <Sheet open={membersSheetOpen} onOpenChange={setMembersSheetOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  data-testid="button-view-all-members"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View All Members ({members.length})
                </Button>
              </SheetTrigger>
              <SheetContent data-testid="sheet-channel-members">
                <SheetHeader>
                  <SheetTitle data-testid="title-channel-members">Channel Members</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-md ${
                        member.isActive ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'
                      }`}
                      data-testid={`member-${member.userId}`}
                    >
                      <Avatar className={`h-10 w-10 ${member.isActive ? 'ring-2 ring-green-500' : ''}`}>
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {member.gamertag?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium cursor-pointer hover:underline truncate"
                            onClick={() => {
                              setProfileDialogUserId(member.userId);
                              setOpenProfileDialog(true);
                            }}
                            data-testid={`member-name-${member.userId}`}
                          >
                            {member.gamertag || "Unknown"}
                          </span>
                          {member.isActive && (
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" data-testid={`active-${member.userId}`} />
                          )}
                        </div>
                        {member.isActive && (
                          <p className="text-xs text-green-600 dark:text-green-400">Active in voice</p>
                        )}
                      </div>
                      {channel.creatorId === currentUserId && member.userId !== currentUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemoveMember(member.userId)}
                          data-testid={`button-remove-${member.userId}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-primary/20" data-testid="card-in-channel">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Users className="h-5 w-5" />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>
                <span>{channel.name}</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={leaveChannel}
                data-testid="button-leave-channel"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant={isLocalAudioEnabled ? "secondary" : "destructive"}
                onClick={toggleAudio}
                data-testid="button-toggle-audio"
              >
                {isLocalAudioEnabled ? (
                  <>
                    <Mic className="h-4 w-4 mr-1" />
                    Mute
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 mr-1" />
                    Unmute
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant={isRemoteAudioMuted ? "destructive" : "secondary"}
                onClick={toggleRemoteAudioMute}
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
              <Button
                size="sm"
                variant={isLocalScreenShared ? "default" : "secondary"}
                onClick={toggleScreenShare}
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

            <div>
              <p className="text-sm font-medium mb-2">
                {otherPeers.length === 0 
                  ? 'You are alone in this channel' 
                  : `You + ${otherPeers.length} other${otherPeers.length !== 1 ? 's' : ''}`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {peers.map((peer) => {
                  const member = members.find((m: any) => m.userId === peer.name);
                  
                  return (
                    <div
                      key={peer.id}
                      className="flex items-center gap-2 bg-background rounded-lg p-2 cursor-pointer hover:bg-muted"
                      onClick={() => {
                        if (member?.userId) {
                          setProfileDialogUserId(member.userId);
                          setOpenProfileDialog(true);
                        }
                      }}
                      data-testid={`peer-${peer.id}`}
                    >
                      <Avatar className="h-8 w-8">
                        {member?.profileImageUrl ? (
                          <AvatarImage src={member.profileImageUrl} />
                        ) : null}
                        <AvatarFallback>
                          {peer.name[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member?.gamertag || peer.name}</p>
                        <div className="flex gap-1">
                          {peer.audioTrack ? (
                            <Mic className="h-3 w-3 text-green-500" />
                          ) : (
                            <MicOff className="h-3 w-3 text-muted-foreground" />
                          )}
                          {peer.auxiliaryTracks.length > 0 && (
                            <MonitorUp className="h-3 w-3 text-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {screenSharePeers.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Screen Shares</p>
                <div className="grid gap-2">
                  {screenSharePeers.map((peer) => {
                    const member = members.find((m: any) => m.userId === peer.name);
                    return (
                      <div
                        key={peer.id}
                        className="bg-black rounded-lg overflow-hidden aspect-video relative"
                        data-testid={`screenshare-${peer.id}`}
                      >
                        <video
                          ref={(videoEl) => {
                            if (videoEl && peer.auxiliaryTracks[0]) {
                              const track = peer.auxiliaryTracks[0] as any;
                              const trackId = typeof track === 'string' ? track : track.id;
                              hmsActions.attachVideo(trackId, videoEl);
                            }
                          }}
                          autoPlay
                          muted
                          playsInline
                          controls
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-xs text-white font-medium">
                            {member?.gamertag || peer.name}'s screen
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {openProfileDialog && profileDialogUserId && profileUser && (
        <ProfileDialog
          userId={profileDialogUserId}
          gamertag={profileUser.gamertag || profileUser.firstName || "Unknown"}
          profileImageUrl={profileUser.profileImageUrl || undefined}
          currentUserId={currentUserId}
          trigger={
            <button 
              style={{ display: 'none' }} 
              ref={(el) => {
                if (el && openProfileDialog) {
                  setTimeout(() => {
                    el.click();
                    setOpenProfileDialog(false);
                  }, 50);
                }
              }}
            />
          }
        />
      )}
    </div>
  );
}
