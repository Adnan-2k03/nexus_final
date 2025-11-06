import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { UserProfile } from "../UserProfile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ProfileDialogProps {
  userId: string;
  gamertag?: string;
  profileImageUrl?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  connectionId?: string;
  currentUserId?: string;
}

export function ProfileDialog({ 
  userId, 
  gamertag, 
  profileImageUrl,
  children,
  trigger,
  connectionId,
  currentUserId
}: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: userProfile, isLoading } = useQuery<User>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/users/${userId}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    enabled: open,
    retry: false,
  });

  const { data: connectionRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/connection-requests'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/connection-requests'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch connection requests');
      return response.json();
    },
    enabled: open && !!currentUserId,
    retry: false,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connectionId) throw new Error('No connection ID');
      return await apiRequest('DELETE', `/api/connection-requests/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
      setOpen(false);
      toast({
        title: "Connection Removed",
        description: `You have disconnected from ${gamertag || 'this user'}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive",
      });
    },
  });

  const createConnectionRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      return await apiRequest('POST', '/api/connection-requests', {
        receiverId: targetUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Connection Request Sent",
        description: "Your connection request has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Connect",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  const existingDirectConnection = connectionRequests.find(
    (req: any) => 
      (req.status === 'pending' || req.status === 'accepted') &&
      ((req.senderId === currentUserId && req.receiverId === userId) ||
      (req.receiverId === currentUserId && req.senderId === userId))
  );

  const pendingOutgoingRequest = connectionRequests.find(
    (req: any) => 
      req.status === 'pending' &&
      req.senderId === currentUserId && 
      req.receiverId === userId
  );

  const isAlreadyConnected = existingDirectConnection?.status === 'accepted';

  const showConnectButton = currentUserId && 
    currentUserId !== userId && 
    !connectionId && 
    !isAlreadyConnected;

  const handleConnect = () => {
    if (existingDirectConnection) {
      if (existingDirectConnection.status === 'accepted') {
        toast({
          title: "Already Connected",
          description: "You already have a friend connection with this user.",
        });
      } else {
        toast({
          title: "Request Already Sent",
          description: "You already have a pending connection request with this user.",
        });
      }
      return;
    }
    createConnectionRequestMutation.mutate(userId);
  };

  const defaultTrigger = (
    <button 
      className="flex items-center gap-3 hover:opacity-80 transition-opacity" 
      data-testid={`button-view-profile-${userId}`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={profileImageUrl} alt={gamertag || 'User'} />
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          {(gamertag || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {children}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-full sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Profile</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : userProfile ? (
            <UserProfile
              id={userProfile.id}
              gamertag={userProfile.gamertag || "Unknown"}
              firstName={userProfile.firstName ?? undefined}
              lastName={userProfile.lastName ?? undefined}
              profileImageUrl={userProfile.profileImageUrl ?? undefined}
              bio={userProfile.bio ?? undefined}
              location={userProfile.location ?? undefined}
              latitude={userProfile.latitude ?? undefined}
              longitude={userProfile.longitude ?? undefined}
              age={userProfile.age ?? undefined}
              preferredGames={userProfile.preferredGames ?? undefined}
              isOwn={false}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Profile not found
            </div>
          )}
        </div>
        {connectionId && (
          <div className="pt-4 border-t mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  data-testid="button-disconnect-profile"
                >
                  <UserMinus className="h-4 w-4" />
                  Remove Connection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect from {gamertag || 'this user'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your connection with {gamertag || 'this user'}. Your chat history will be lost, and you'll need to send a new connection request to reconnect.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-disconnect-profile">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="bg-destructive hover:bg-destructive/90"
                    data-testid="button-confirm-disconnect-profile"
                  >
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {showConnectButton && (
          <div className="pt-4 border-t mt-4">
            {pendingOutgoingRequest ? (
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full gap-2"
                disabled
                data-testid="button-request-sent-profile"
              >
                <UserPlus className="h-4 w-4" />
                Sent
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full gap-2"
                onClick={handleConnect}
                disabled={createConnectionRequestMutation.isPending}
                data-testid="button-connect-profile"
              >
                <UserPlus className="h-4 w-4" />
                {createConnectionRequestMutation.isPending ? "Sending Request..." : "Connect"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
