import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, MapPin, Users, Trophy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "./UserProfile";
import type { User } from "@shared/schema";

interface MatchRequestCardProps {
  id: string;
  userId: string;
  gamertag: string;
  profileImageUrl?: string;
  gameName: string;
  gameMode: string;
  description: string;
  region?: string;
  tournamentName?: string;
  status: "waiting" | "connected" | "declined";
  timeAgo: string;
  onAccept?: () => void;
  onDecline?: () => void;
  isOwn?: boolean;
}

export function MatchRequestCard({
  id,
  userId,
  gamertag,
  profileImageUrl,
  gameName,
  gameMode,
  description,
  region,
  tournamentName,
  status,
  timeAgo,
  onAccept,
  onDecline,
  isOwn = false,
}: MatchRequestCardProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: userProfile, isLoading: isLoadingProfile } = useQuery<User>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    enabled: profileOpen,
    retry: false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-gaming-connected text-white";
      case "declined":
        return "bg-gaming-declined text-white";
      default:
        return "bg-gaming-pending text-white";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "declined":
        return "Declined";
      default:
        return "Looking for teammates";
    }
  };

  return (
    <Card 
      className="hover-elevate transition-all duration-200 border-card-border"
      data-testid={`card-match-request-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid={`button-view-profile-${id}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profileImageUrl} alt={gamertag} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {gamertag.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground hover:text-primary cursor-pointer" data-testid={`text-gamertag-${id}`}>
                      {gamertag}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {gameName}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {gameMode}
                      </Badge>
                    </div>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Player Profile</DialogTitle>
                </DialogHeader>
                {isLoadingProfile ? (
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
                    age={userProfile.age ?? undefined}
                    preferredGames={userProfile.preferredGames ?? undefined}
                    isOwn={false}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Profile not found
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <Badge 
            className={`text-xs font-medium ${getStatusColor(status)}`}
            data-testid={`status-${status}-${id}`}
          >
            {getStatusText(status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-description-${id}`}>
          {description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
          {region && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{region}</span>
            </div>
          )}
          {tournamentName && (
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>{tournamentName}</span>
            </div>
          )}
        </div>
      </CardContent>

      {!isOwn && status === "waiting" && (
        <CardFooter className="pt-3 flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onAccept}
            className="flex-1"
            data-testid={`button-accept-${id}`}
          >
            Apply to Match
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            data-testid={`button-decline-${id}`}
          >
            Pass
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}