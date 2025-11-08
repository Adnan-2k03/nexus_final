import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { selectIsConnectedToRoom, useHMSStore } from "@100mslive/react-sdk";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { Plus, Users, UserPlus, X, RefreshCw, Mic2, Search, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GroupVoiceChannel } from "@/components/GroupVoiceChannel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getApiUrl } from "@/lib/api";
import type { GroupVoiceChannelWithDetails, User, ConnectionRequestWithUser } from "@shared/schema";
import { useLayout } from "@/contexts/LayoutContext";

interface VoiceChannelsPageProps {
  currentUserId?: string;
}

export function VoiceChannelsPage({ currentUserId }: VoiceChannelsPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [pasteInviteDialogOpen, setPasteInviteDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [inviteLinkInput, setInviteLinkInput] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<GroupVoiceChannelWithDetails | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [friendSearchTerm, setFriendSearchTerm] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    return localStorage.getItem('activeGroupVoiceChannelId');
  });
  const { toast } = useToast();
  const { getContainerClass } = useLayout();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isConnected && activeChannelId) {
      setActiveChannelId(null);
      localStorage.removeItem('activeGroupVoiceChannelId');
    }
  }, [isConnected, activeChannelId]);

  const handleJoinChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    localStorage.setItem('activeGroupVoiceChannelId', channelId);
  };

  const handleLeaveChannel = () => {
    setActiveChannelId(null);
    localStorage.removeItem('activeGroupVoiceChannelId');
    queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] });
  };

  if (!currentUserId) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  const { data: allChannels = [], isLoading } = useQuery<GroupVoiceChannelWithDetails[]>({
    queryKey: ['/api/group-voice/channels'],
  });

  // Filter channels by search term and sort by active members
  const channels = allChannels
    .filter(channel => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = channel.name.toLowerCase().includes(searchLower);
      const memberMatch = channel.members?.some(member =>
        member.gamertag?.toLowerCase().includes(searchLower)
      );
      
      return nameMatch || memberMatch;
    })
    .sort((a, b) => {
      // Check if channels have active members
      const aHasActiveMembers = a.members?.some(m => m.isActive) || false;
      const bHasActiveMembers = b.members?.some(m => m.isActive) || false;
      
      // Sort channels with active members to the top
      if (aHasActiveMembers && !bHasActiveMembers) return -1;
      if (!aHasActiveMembers && bHasActiveMembers) return 1;
      
      // If both have active members or both don't, maintain original order
      return 0;
    });

  const { data: allInvites = [] } = useQuery<any[]>({
    queryKey: ['/api/group-voice/invites'],
  });

  const receivedInvites = allInvites.filter((inv: any) => inv.inviteeId === currentUserId);
  const sentInvites = allInvites.filter((inv: any) => inv.inviterId === currentUserId);

  const { data: matchConnectionsResponse } = useQuery<any[]>({
    queryKey: ['/api/user/connections'],
  });

  const { data: connectionRequestsResponse } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests'],
  });

  const { data: usersResponse } = useQuery<{ users: User[] }>({
    queryKey: ['/api/users'],
  });

  const matchConnections = matchConnectionsResponse?.filter(c => c.status === 'accepted') || [];
  const connectionRequests = connectionRequestsResponse?.filter(c => c.status === 'accepted') || [];
  const allUsers = usersResponse?.users || [];

  const createChannelMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log('Creating channel with name:', name);
      const response = await apiRequest('POST', '/api/group-voice/create', { name });
      console.log('Response received:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Channel created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] });
      setCreateDialogOpen(false);
      setChannelName("");
      toast({
        title: "Channel created",
        description: "Your voice channel is ready",
      });
    },
    onError: (error) => {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ channelId, userIds }: { channelId: string; userIds: string[] }) => {
      const response = await apiRequest('POST', '/api/group-voice/invite', { channelId, userIds });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] });
      setInviteDialogOpen(false);
      setSelectedFriends([]);
      toast({
        title: "Invites sent",
        description: data.message || `Invited ${data.invitedCount || 0} user(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invites",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('DELETE', `/api/group-voice/invite/${inviteId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/invites'] });
      toast({
        title: "Invite cancelled",
        description: "The invitation has been withdrawn",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel invite",
        variant: "destructive",
      });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('POST', `/api/group-voice/invite/${inviteId}/accept`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] });
      toast({
        title: "Invite accepted",
        description: "You've joined the voice channel",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept invite",
        variant: "destructive",
      });
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('POST', `/api/group-voice/invite/${inviteId}/decline`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/invites'] });
      toast({
        title: "Invite declined",
        description: "You've declined the channel invite",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to decline invite",
        variant: "destructive",
      });
    },
  });

  const handleCreateChannel = () => {
    if (!channelName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a channel name",
        variant: "destructive",
      });
      return;
    }
    createChannelMutation.mutate(channelName);
  };

  const handleInviteFriends = () => {
    if (!selectedChannel || selectedFriends.length === 0) {
      toast({
        title: "Select friends",
        description: "Please select at least one friend to invite",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate({ channelId: selectedChannel.id, userIds: selectedFriends });
  };

  const getFilteredAndSortedFriends = () => {
    const friends = getFriendsList();
    
    // Filter by search term
    const filtered = friends.filter(friend => {
      if (!friendSearchTerm.trim()) return true;
      const searchLower = friendSearchTerm.toLowerCase();
      return (friend.gamertag?.toLowerCase().includes(searchLower) || 
              friend.firstName?.toLowerCase().includes(searchLower));
    });
    
    // Sort by status: not in channel (top), invited pending (middle), already members (bottom)
    return filtered.sort((a, b) => {
      const statusA = getInviteStatus(selectedChannel?.id || '', a.id);
      const statusB = getInviteStatus(selectedChannel?.id || '', b.id);
      
      const priorityMap = { 'none': 0, 'sent': 1, 'member': 2 };
      const priorityA = priorityMap[statusA.status as keyof typeof priorityMap] || 0;
      const priorityB = priorityMap[statusB.status as keyof typeof priorityMap] || 0;
      
      return priorityA - priorityB;
    });
  };

  const getFriendsList = () => {
    // Get friends from match connections
    const matchFriends = matchConnections.map(conn => {
      const iAmRequester = conn.requesterId === currentUserId;
      const friendId = iAmRequester ? conn.accepterId : conn.requesterId;
      const friendGamertag = iAmRequester ? conn.accepterGamertag : conn.requesterGamertag;
      const friendProfileImageUrl = iAmRequester ? conn.accepterProfileImageUrl : conn.requesterProfileImageUrl;
      
      return {
        id: friendId,
        gamertag: friendGamertag,
        profileImageUrl: friendProfileImageUrl,
      } as User;
    }).filter(f => f.id && f.gamertag);
    
    // Get friends from direct connection requests (only accepted connections)
    const connectionFriends = connectionRequests
      .filter(conn => conn.status === 'accepted')
      .map(conn => {
        const iAmSender = conn.senderId === currentUserId;
        const friendId = iAmSender ? conn.receiverId : conn.senderId;
        const friendGamertag = iAmSender ? conn.receiverGamertag : conn.senderGamertag;
        const friendProfileImageUrl = iAmSender ? conn.receiverProfileImageUrl : conn.senderProfileImageUrl;
        
        return {
          id: friendId,
          gamertag: friendGamertag,
          profileImageUrl: friendProfileImageUrl,
        } as User;
      }).filter(f => f.id && f.gamertag);
    
    // Combine and deduplicate by user ID
    const allFriends = [...matchFriends, ...connectionFriends];
    const uniqueFriendsMap = new Map<string, User>();
    
    allFriends.forEach(friend => {
      if (!uniqueFriendsMap.has(friend.id)) {
        uniqueFriendsMap.set(friend.id, friend);
      }
    });
    
    return Array.from(uniqueFriendsMap.values());
  };

  const getSentInvitesForChannel = (channelId: string) => {
    return sentInvites.filter((inv: any) => inv.channelId === channelId);
  };

  const getInviteStatus = (channelId: string, userId: string) => {
    const sentInvites = getSentInvitesForChannel(channelId);
    const existingInvite = sentInvites.find((inv: any) => inv.inviteeId === userId);
    
    if (!selectedChannel) return { status: 'none', inviteId: null };
    
    const isMember = selectedChannel.members?.some((m) => m.userId === userId);
    if (isMember) return { status: 'member', inviteId: null };
    if (existingInvite) return { status: 'sent', inviteId: existingInvite.id };
    return { status: 'none', inviteId: null };
  };

  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handlePasteInviteLink = () => {
    if (!inviteLinkInput.trim()) {
      toast({
        title: "Invalid link",
        description: "Please paste a valid invite link",
        variant: "destructive",
      });
      return;
    }

    // Extract invite code from the link
    const linkPattern = /join-channel\/([a-zA-Z0-9]+)/;
    const match = inviteLinkInput.match(linkPattern);
    
    if (!match || !match[1]) {
      toast({
        title: "Invalid link",
        description: "Please paste a valid invite link",
        variant: "destructive",
      });
      return;
    }

    const inviteCode = match[1];
    setPasteInviteDialogOpen(false);
    setInviteLinkInput("");
    
    // Navigate to the join-channel page
    setLocation(`/join-channel/${inviteCode}`);
  };

  if (isLoading) {
    return <div className="p-4">Loading channels...</div>;
  }

  return (
    <div className={`w-full ${getContainerClass()} mx-auto space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-voice-channels">
            <Mic2 className="h-6 w-6 text-primary" />
            Voice Channels
          </h1>
          <p className="text-muted-foreground">Create and join group voice channels</p>
        </div>
        <div className="flex gap-2 flex-wrap sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-channels"
            className={`transition-transform ${isRefreshing ? 'scale-95' : 'hover:scale-105'}`}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={pasteInviteDialogOpen} onOpenChange={setPasteInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-paste-invite">
                <LinkIcon className="h-4 w-4 mr-2" />
                Paste Invite Link
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-paste-invite">
              <DialogHeader>
                <DialogTitle>Join with Invite Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-link">Invite Link</Label>
                  <Input
                    id="invite-link"
                    value={inviteLinkInput}
                    onChange={(e) => setInviteLinkInput(e.target.value)}
                    placeholder="Paste invite link here..."
                    data-testid="input-invite-link"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePasteInviteLink();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Example: https://nexus-final-tau.vercel.app/join-channel/abc123
                  </p>
                </div>
                <Button
                  onClick={handlePasteInviteLink}
                  className="w-full"
                  data-testid="button-submit-paste-invite"
                >
                  Join Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-channel">
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-channel">
            <DialogHeader>
              <DialogTitle>Create Voice Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input
                  id="channel-name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Enter channel name"
                  data-testid="input-channel-name"
                />
              </div>
              <Button
                onClick={handleCreateChannel}
                disabled={createChannelMutation.isPending}
                className="w-full"
                data-testid="button-submit-create"
              >
                {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="text"
              placeholder="Search channels by name or members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 overflow-x-auto whitespace-nowrap"
              style={{
                textOverflow: 'clip',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              data-testid="input-search-channels"
            />
          </div>
        </CardContent>
      </Card>

      {receivedInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Pending Invites</h2>
          <div className="grid gap-3">
            {receivedInvites.map((invite: any) => (
              <Card key={invite.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ProfileDialog
                        userId={invite.inviterId}
                        gamertag={invite.inviterGamertag || undefined}
                        profileImageUrl={invite.inviterProfileImageUrl || undefined}
                        currentUserId={currentUserId}
                        trigger={
                          <button className="hover:opacity-80 transition-opacity">
                            <Avatar 
                              className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary" 
                              data-testid={`avatar-inviter-${invite.id}`}
                            >
                              <AvatarImage src={invite.inviterProfileImageUrl || undefined} />
                              <AvatarFallback>
                                {invite.inviterGamertag?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        }
                      />
                      <div>
                        <p className="font-medium">{invite.channelName || "Voice Channel"}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited by{" "}
                          <ProfileDialog
                            userId={invite.inviterId}
                            gamertag={invite.inviterGamertag || undefined}
                            profileImageUrl={invite.inviterProfileImageUrl || undefined}
                            currentUserId={currentUserId}
                            trigger={
                              <span 
                                className="cursor-pointer hover:underline inline"
                                data-testid={`inviter-name-${invite.id}`}
                              >
                                {invite.inviterGamertag || "Unknown"}
                              </span>
                            }
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptInviteMutation.mutate(invite.id)}
                        disabled={acceptInviteMutation.isPending}
                        data-testid={`button-accept-invite-${invite.id}`}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineInviteMutation.mutate(invite.id)}
                        disabled={declineInviteMutation.isPending}
                        data-testid={`button-decline-invite-${invite.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sentInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sent Invites</h2>
          <div className="grid gap-3">
            {sentInvites.map((invite: any) => (
              <Card key={invite.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ProfileDialog
                        userId={invite.inviteeId}
                        gamertag={invite.inviteeGamertag || undefined}
                        profileImageUrl={invite.inviteeProfileImageUrl || undefined}
                        currentUserId={currentUserId}
                        trigger={
                          <button className="hover:opacity-80 transition-opacity">
                            <Avatar 
                              className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary" 
                              data-testid={`avatar-invitee-${invite.id}`}
                            >
                              <AvatarImage src={invite.inviteeProfileImageUrl || undefined} />
                              <AvatarFallback>
                                {invite.inviteeGamertag?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        }
                      />
                      <div>
                        <p className="font-medium">{invite.channelName || "Voice Channel"}</p>
                        <p className="text-sm text-muted-foreground">
                          Sent to{" "}
                          <ProfileDialog
                            userId={invite.inviteeId}
                            gamertag={invite.inviteeGamertag || undefined}
                            profileImageUrl={invite.inviteeProfileImageUrl || undefined}
                            currentUserId={currentUserId}
                            trigger={
                              <span 
                                className="cursor-pointer hover:underline inline"
                                data-testid={`invitee-name-${invite.id}`}
                              >
                                {invite.inviteeGamertag || "Unknown"}
                              </span>
                            }
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelInviteMutation.mutate(invite.id)}
                        disabled={cancelInviteMutation.isPending}
                        data-testid={`button-cancel-sent-invite-${invite.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">My Channels</h2>
        <div className="grid gap-4">
          {channels.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No voice channels yet</p>
                  <p className="text-sm">Create your first channel to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            channels.map((channel) => {
              const channelHasActiveMembers = channel.members?.some(m => m.isActive) || false;
              return (
                <div key={channel.id}>
                  <Card className={channelHasActiveMembers ? 'border-green-500/50 bg-green-500/5' : ''}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{channel.name}</span>
                          {channelHasActiveMembers && (
                            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 rounded-full px-2 py-0.5 shrink-0">
                              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                {channel.members?.filter(m => m.isActive).length} Active
                              </span>
                            </div>
                          )}
                        </div>
                        {channel.members?.some(m => m.userId === currentUserId) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedChannel(channel);
                              setInviteDialogOpen(true);
                            }}
                            data-testid={`button-invite-${channel.id}`}
                            className="shrink-0"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Invite
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <GroupVoiceChannel
                        channel={channel}
                        currentUserId={currentUserId}
                        isActiveChannel={activeChannelId === channel.id}
                        onJoin={() => handleJoinChannel(channel.id)}
                        onLeave={handleLeaveChannel}
                      />
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
        setInviteDialogOpen(open);
        if (!open) {
          setFriendSearchTerm("");
          setSelectedFriends([]);
        }
      }}>
        <DialogContent data-testid="dialog-invite-friends">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Search friends..."
                value={friendSearchTerm}
                onChange={(e) => setFriendSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-friends"
              />
            </div>
            
            <div className="max-h-80 overflow-y-auto space-y-2">
              {getFilteredAndSortedFriends().map((friend) => {
                const inviteStatus = getInviteStatus(selectedChannel?.id || '', friend.id);
                const isDisabled = inviteStatus.status !== 'none';
                
                return (
                  <div
                    key={friend.id}
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg ${!isDisabled ? 'hover:bg-muted cursor-pointer' : 'opacity-60'}`}
                    onClick={() => !isDisabled && toggleFriendSelection(friend.id)}
                    data-testid={`friend-item-${friend.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedFriends.includes(friend.id)}
                        onCheckedChange={() => !isDisabled && toggleFriendSelection(friend.id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isDisabled}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {friend.gamertag?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{friend.gamertag || friend.firstName || "Unknown"}</span>
                    </div>
                    {inviteStatus.status === 'member' && (
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">Member</span>
                    )}
                    {inviteStatus.status === 'sent' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary px-2 py-1 bg-primary/10 rounded">Sent</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (inviteStatus.inviteId) {
                              cancelInviteMutation.mutate(inviteStatus.inviteId);
                            }
                          }}
                          data-testid={`button-cancel-invite-${friend.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {getFilteredAndSortedFriends().length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {friendSearchTerm.trim() ? 
                    "No friends found matching your search." : 
                    "No friends to invite. Add friends first!"}
                </p>
              )}
            </div>
            <Button
              onClick={handleInviteFriends}
              disabled={selectedFriends.length === 0 || inviteMutation.isPending}
              className="w-full"
              data-testid="button-submit-invite"
            >
              {inviteMutation.isPending ? "Inviting..." : `Invite ${selectedFriends.length} friend(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
