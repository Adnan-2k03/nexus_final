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
  const { currentConnectionId, setVoiceChannelActive } = useHMSContext();
  
  const [isJoining, setIsJoining] = useState(false);
  const [members, setMembers] = useState<GroupVoiceMemberWithUser[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [profileDialogUserId, setProfileDialogUserId] = useState<string | null>(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const { toast } = useToast();

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
        if (currentConnectionId) {
          try {
            await fetch(getApiUrl('/api/voice/leave'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ connectionId: currentConnectionId }),
            });
            console.log('[HMS] Notified backend to leave previous direct voice channel');
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

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
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
      {!isActiveChannel ? (
        <Card data-testid="card-join-channel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {channel.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                {channel.memberCount} member{channel.memberCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs mt-1">
                Created by {channel.creatorGamertag || "Unknown"}
              </p>
            </div>
            
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

            <div className="space-y-2">
              <p className="text-xs font-medium">Members:</p>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-muted rounded-full px-3 py-1"
                    data-testid={`member-${member.userId}`}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {member.gamertag?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="text-xs cursor-pointer hover:underline"
                      onClick={() => {
                        setProfileDialogUserId(member.userId);
                        setOpenProfileDialog(true);
                      }}
                      data-testid={`member-name-${member.userId}`}
                    >
                      {member.gamertag || "Unknown"}
                    </span>
                    {member.isActive && (
                      <div className="h-2 w-2 bg-green-500 rounded-full" data-testid={`active-${member.userId}`} />
                    )}
                    {channel.creatorId === currentUserId && member.userId !== currentUserId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveMember(member.userId)}
                        data-testid={`button-remove-${member.userId}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-primary/20" data-testid="card-in-channel">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
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
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isLocalAudioEnabled ? "secondary" : "destructive"}
                onClick={toggleAudio}
                className="flex-1"
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
                  {screenSharePeers.map((peer) => (
                    <div
                      key={peer.id}
                      className="bg-black rounded-lg overflow-hidden aspect-video"
                      data-testid={`screenshare-${peer.id}`}
                    >
                      <video
                        ref={(videoEl) => {
                          if (videoEl && peer.auxiliaryTracks[0]) {
                            const trackId = typeof peer.auxiliaryTracks[0] === 'string' 
                              ? peer.auxiliaryTracks[0] 
                              : peer.auxiliaryTracks[0].id;
                            hmsActions.attachVideo(trackId, videoEl);
                          }
                        }}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      <p className="text-xs text-white bg-black/50 px-2 py-1">
                        {peer.name}'s screen
                      </p>
                    </div>
                  ))}
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
