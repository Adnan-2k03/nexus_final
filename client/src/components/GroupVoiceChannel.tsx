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
import type { GroupVoiceChannelWithDetails, GroupVoiceMemberWithUser } from "@shared/schema";

interface GroupVoiceChannelProps {
  channel: GroupVoiceChannelWithDetails;
  currentUserId: string;
  onLeave?: () => void;
}

export function GroupVoiceChannel({ channel, currentUserId, onLeave }: GroupVoiceChannelProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);
  
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
      const response = await fetch(`/api/users/${profileDialogUserId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!profileDialogUserId,
  });

  const inviteLink = `${window.location.origin}/join-channel/${channel.inviteCode}`;

  useEffect(() => {
    fetchMembers();
  }, [channel.id]);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/group-voice/${channel.id}/members`);
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
      const response = await apiRequest(
        "POST",
        "/api/group-voice/join",
        { channelId: channel.id }
      );

      const data = await response.json() as { token: string; roomId: string };

      const joinTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout - 100ms credentials may be invalid")), 10000);
      });

      await Promise.race([
        hmsActions.join({
          userName: currentUserId,
          authToken: data.token,
        }),
        joinTimeout
      ]);

      toast({
        title: "Joined voice channel",
        description: `You're now in ${channel.name}`,
      });
    } catch (error) {
      console.error("Error joining channel:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not connect to voice channel";
      toast({
        title: "Failed to join",
        description: errorMessage.includes("credentials") 
          ? "Voice service credentials are invalid. Please contact support."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const leaveChannel = async () => {
    try {
      await hmsActions.leave();
      await apiRequest("POST", "/api/group-voice/leave", { channelId: channel.id });
      
      toast({
        title: "Left voice channel",
        description: "You've disconnected from the voice chat",
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

  return (
    <div className="space-y-4">
      {!isConnected ? (
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
                Participants ({peers.length})
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
                            hmsActions.attachVideo(peer.auxiliaryTracks[0].id, videoEl);
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
