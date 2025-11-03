import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GroupVoiceChannel } from "@/components/GroupVoiceChannel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GroupVoiceChannelWithDetails, User, ConnectionRequestWithUser } from "@shared/schema";

interface VoiceChannelsPageProps {
  currentUserId?: string;
}

export function VoiceChannelsPage({ currentUserId }: VoiceChannelsPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<GroupVoiceChannelWithDetails | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { toast } = useToast();

  if (!currentUserId) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  const { data: channels = [], isLoading } = useQuery<GroupVoiceChannelWithDetails[]>({
    queryKey: ['/api/group-voice/channels'],
  });

  const { data: connectionsResponse } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests'],
  });

  const { data: usersResponse } = useQuery<{ users: User[] }>({
    queryKey: ['/api/users'],
  });

  const connections = connectionsResponse?.filter(c => c.status === 'accepted') || [];
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
    onSuccess: () => {
      setInviteDialogOpen(false);
      setSelectedFriends([]);
      toast({
        title: "Invites sent",
        description: "Friends have been invited to the channel",
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

  const getFriendsList = () => {
    return connections.map(conn => {
      const friendId = conn.senderId === currentUserId ? conn.receiverId : conn.senderId;
      const friend = allUsers.find(u => u.id === friendId);
      return friend;
    }).filter((f): f is User => f !== undefined);
  };

  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading channels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-voice-channels">Voice Channels</h1>
          <p className="text-muted-foreground">Create and join group voice channels</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-channel">
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
          channels.map((channel) => (
            <div key={channel.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{channel.name}</span>
                    {channel.creatorId === currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedChannel(channel);
                          setInviteDialogOpen(true);
                        }}
                        data-testid={`button-invite-${channel.id}`}
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
                    onLeave={() => queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] })}
                  />
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent data-testid="dialog-invite-friends">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {getFriendsList().map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => toggleFriendSelection(friend.id)}
                  data-testid={`friend-item-${friend.id}`}
                >
                  <Checkbox
                    checked={selectedFriends.includes(friend.id)}
                    onCheckedChange={() => toggleFriendSelection(friend.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {friend.gamertag?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{friend.gamertag || friend.firstName || "Unknown"}</span>
                </div>
              ))}
              {getFriendsList().length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No friends to invite. Add friends first!
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
