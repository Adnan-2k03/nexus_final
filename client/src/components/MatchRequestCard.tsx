import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { Clock, MapPin, Users, Trophy, Trash2 } from "lucide-react";

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
  onDelete?: () => void;
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
  onDelete,
  isOwn = false,
}: MatchRequestCardProps) {
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
            <ProfileDialog 
              userId={userId} 
              gamertag={gamertag} 
              profileImageUrl={profileImageUrl}
            >
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
            </ProfileDialog>
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
      
      {isOwn && (
        <CardFooter className="pt-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            className="w-full gap-2"
            data-testid={`button-delete-${id}`}
          >
            <Trash2 className="h-4 w-4" />
            Delete Request
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}