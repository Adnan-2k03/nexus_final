import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, User, Gamepad2, Edit, MessageCircle } from "lucide-react";

interface UserProfileProps {
  id: string;
  gamertag: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  age?: number;
  preferredGames?: string[];
  isOwn?: boolean;
  onEdit?: () => void;
  onMessage?: () => void;
}

export function UserProfile({
  id,
  gamertag,
  firstName,
  lastName,
  profileImageUrl,
  bio,
  location,
  latitude,
  longitude,
  age,
  preferredGames = [],
  isOwn = false,
  onEdit,
  onMessage,
}: UserProfileProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : gamertag;
  const initials = firstName && lastName 
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : gamertag.slice(0, 2).toUpperCase();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profileImageUrl} alt={gamertag} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-foreground" data-testid={`text-display-name-${id}`}>
              {displayName}
            </h2>
            {firstName && lastName && (
              <p className="text-sm text-muted-foreground" data-testid={`text-gamertag-${id}`}>
                @{gamertag}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isOwn ? (
              <Button size="sm" variant="outline" onClick={onEdit} data-testid="button-edit-profile">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button size="sm" onClick={onMessage} data-testid="button-message-user">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bio && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              About
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-bio-${id}`}>
              {bio}
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          {location && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span data-testid={`text-location-${id}`}>{location}</span>
              </div>
              {latitude && longitude && (
                <Badge 
                  variant="secondary" 
                  className="text-xs flex items-center gap-1"
                  data-testid={`badge-gps-enabled-${id}`}
                >
                  <MapPin className="h-3 w-3 text-green-500" />
                  GPS
                </Badge>
              )}
            </div>
          )}
          
          {age && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span data-testid={`text-age-${id}`}>{age} years old</span>
            </div>
          )}
        </div>

        {preferredGames.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Preferred Games
              </h3>
              <div className="flex flex-wrap gap-2">
                {preferredGames.map((game) => (
                  <Badge
                    key={game}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`badge-game-${game.toLowerCase().replace(/\s+/g, '-')}-${id}`}
                  >
                    {game}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}