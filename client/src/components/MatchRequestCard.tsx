import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  currentUserId?: string;
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
  currentUserId,
}: MatchRequestCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-600 text-white";
      case "declined":
        return "bg-red-600 text-white";
      default:
        return "bg-blue-600 text-white";
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
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ProfileDialog 
              userId={userId} 
              gamertag={gamertag} 
              profileImageUrl={profileImageUrl}
              currentUserId={currentUserId}
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground hover:text-primary cursor-pointer truncate" data-testid={`text-gamertag-${id}`}>
                  {gamertag}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-medium px-1.5 py-0">
                    {gameName}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Users className="w-3 h-3 mr-1" />
                    {gameMode}
                  </Badge>
                </div>
              </div>
            </ProfileDialog>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge 
              className={`text-xs font-medium whitespace-nowrap ${getStatusColor(status)}`}
              data-testid={`status-${status}-${id}`}
            >
              {getStatusText(status)}
            </Badge>
            {isOwn && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                data-testid={`button-delete-${id}`}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${id}`}>
          {description}
        </p>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
              <span className="truncate max-w-[150px]">{tournamentName}</span>
            </div>
          )}
        </div>

        {!isOwn && status === "waiting" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={onAccept}
              className="flex-1 h-8"
              data-testid={`button-accept-${id}`}
            >
              Apply to Match
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              className="h-8"
              data-testid={`button-decline-${id}`}
            >
              Pass
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}