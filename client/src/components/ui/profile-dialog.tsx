import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { UserProfile } from "../UserProfile";
import type { User } from "@shared/schema";

interface ProfileDialogProps {
  userId: string;
  gamertag: string;
  profileImageUrl?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export function ProfileDialog({ 
  userId, 
  gamertag, 
  profileImageUrl,
  children,
  trigger
}: ProfileDialogProps) {
  const [open, setOpen] = useState(false);

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
      </DialogContent>
    </Dialog>
  );
}
