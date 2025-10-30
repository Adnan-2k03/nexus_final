import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserMinus } from "lucide-react";
import { UserProfile } from "../UserProfile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ProfileDialogProps {
  userId: string;
  gamertag: string;
  profileImageUrl?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  connectionId?: string;
}

export function ProfileDialog({ 
  userId, 
  gamertag, 
  profileImageUrl,
  children,
  trigger,
  connectionId
}: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: userProfile, isLoading } = useQuery<User>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    enabled: open,
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
        description: `You have disconnected from ${gamertag}`,
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

  const defaultTrigger = (
    <button 
      className="flex items-center gap-3 hover:opacity-80 transition-opacity" 
      data-testid={`button-view-profile-${userId}`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={profileImageUrl} alt={gamertag} />
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          {gamertag.slice(0, 2).toUpperCase()}
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
          <div className="flex items-center justify-between">
            <DialogTitle>Player Profile</DialogTitle>
            {connectionId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="button-disconnect-profile"
                  >
                    <UserMinus className="h-4 w-4" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect from {gamertag}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your connection with {gamertag}. Your chat history will be lost, and you'll need to send a new connection request to reconnect.
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
            )}
          </div>
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
      </DialogContent>
    </Dialog>
  );
}
