import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { GroupVoiceChannelWithDetails } from "@shared/schema";

export function JoinChannelPage() {
  const [, params] = useRoute("/join-channel/:inviteCode");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);

  const inviteCode = params?.inviteCode;

  // Save invite code to sessionStorage for post-login redirect
  useEffect(() => {
    if (inviteCode) {
      sessionStorage.setItem('pendingInviteCode', inviteCode);
    }
  }, [inviteCode]);

  const { data: channelData, isLoading: isLoadingChannel, error: channelError } = useQuery<GroupVoiceChannelWithDetails>({
    queryKey: ['/api/group-voice/channel-by-code', inviteCode],
    queryFn: async () => {
      if (!inviteCode) throw new Error("No invite code provided");
      const response = await fetch(getApiUrl(`/api/group-voice/channel-by-code/${inviteCode}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Channel not found" }));
        throw new Error(errorData.error || "Channel not found");
      }
      return response.json();
    },
    enabled: !!inviteCode,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiRequest('POST', '/api/group-voice/accept-invite-link', { 
        channelId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-voice/invites'] });
      sessionStorage.removeItem('pendingInviteCode');
      toast({
        title: "Success!",
        description: "You've joined the voice channel",
      });
      setTimeout(() => {
        setLocation('/voice-channels');
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join channel",
        variant: "destructive",
      });
    },
  });

  // Auto-join for authenticated users
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user && channelData && !hasAttemptedAutoJoin) {
      setHasAttemptedAutoJoin(true);
      
      // Check if the CURRENT user is already a member
      const isAlreadyMember = channelData.members?.some((m) => m.userId === user.id);
      
      if (isAlreadyMember) {
        sessionStorage.removeItem('pendingInviteCode');
        toast({
          title: "Already a member",
          description: "You're already in this channel",
        });
        setTimeout(() => {
          setLocation('/voice-channels');
        }, 1500);
      } else {
        // Auto-join the channel
        handleJoinChannel();
      }
    }
  }, [isAuthLoading, isAuthenticated, user, channelData, hasAttemptedAutoJoin]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && inviteCode) {
      toast({
        title: "Login Required",
        description: "Please log in to join this voice channel",
      });
      setTimeout(() => {
        setLocation('/');
      }, 1500);
    }
  }, [isAuthLoading, isAuthenticated, inviteCode]);

  const handleJoinChannel = async () => {
    if (!channelData) return;
    setIsAccepting(true);
    try {
      await acceptInviteMutation.mutateAsync(channelData.id);
    } finally {
      setIsAccepting(false);
    }
  };

  if (!inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Invalid Invite Link</p>
            <p className="text-muted-foreground mb-4">
              The invite link appears to be invalid or incomplete.
            </p>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthLoading || isLoadingChannel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {isAuthLoading ? "Checking authentication..." : "Loading channel details..."}
          </p>
        </div>
      </div>
    );
  }

  if (channelError || !channelData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Channel Not Found</p>
            <p className="text-muted-foreground mb-4">
              {channelError instanceof Error ? channelError.message : "This invite link may be expired or invalid."}
            </p>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberCount = channelData.members?.length || 0;
  // Check if the CURRENT user is already a member (not just any user)
  const isAlreadyMember = user ? channelData.members?.some((m) => m.userId === user.id) : false;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Voice Channel Invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{channelData.name}</h2>
            <p className="text-muted-foreground">
              You've been invited to join this voice channel
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="font-semibold">{memberCount}</span>
            </div>

            {channelData.members && channelData.members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Channel Members:</p>
                <div className="flex flex-wrap gap-2">
                  {channelData.members.slice(0, 5).map((member) => (
                    <div key={member.userId} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.gamertag?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.gamertag || "Unknown"}</span>
                    </div>
                  ))}
                  {memberCount > 5 && (
                    <div className="flex items-center p-2 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">+{memberCount - 5} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleJoinChannel}
              disabled={isAccepting || isAlreadyMember}
              className="w-full"
              data-testid="button-join-channel"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : isAlreadyMember ? (
                "Already a Member"
              ) : (
                "Join Channel"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/')}
              data-testid="button-decline"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
