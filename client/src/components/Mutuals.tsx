import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gamepad2, Users, Heart, Lock } from "lucide-react";
import type { User } from "@shared/schema";

interface MutualsData {
  mutualGames?: string[];
  mutualFriends?: User[];
  mutualHobbies?: { category: string; count: number }[];
}

interface MutualsProps {
  userId: string;
  isOwn?: boolean;
}

export function Mutuals({ userId, isOwn = false }: MutualsProps) {
  const { data: mutuals, isLoading } = useQuery<MutualsData>({
    queryKey: ['/api/mutuals', userId],
    enabled: !isOwn && !!userId,
  });

  if (isOwn || !userId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading mutual connections...</p>
        </CardContent>
      </Card>
    );
  }

  if (!mutuals) {
    return null;
  }

  const hasMutualGames = mutuals.mutualGames && mutuals.mutualGames.length > 0;
  const hasMutualFriends = mutuals.mutualFriends && mutuals.mutualFriends.length > 0;
  const hasMutualHobbies = mutuals.mutualHobbies && mutuals.mutualHobbies.length > 0;

  if (!hasMutualGames && !hasMutualFriends && !hasMutualHobbies) {
    return null;
  }

  return (
    <Card data-testid="card-mutuals">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Things in Common
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasMutualGames && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Mutual Games</h3>
              <Badge variant="secondary">{mutuals.mutualGames!.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {mutuals.mutualGames!.map((game) => (
                <Badge key={game} variant="outline" data-testid={`badge-mutual-game-${game}`}>
                  {game}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!hasMutualGames && mutuals.mutualGames === undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Mutual games are private</span>
          </div>
        )}

        {hasMutualFriends && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Mutual Friends</h3>
              <Badge variant="secondary">{mutuals.mutualFriends!.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mutuals.mutualFriends!.slice(0, 6).map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2"
                  data-testid={`mutual-friend-${friend.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.profileImageUrl || undefined} alt={friend.gamertag} />
                    <AvatarFallback className="text-xs">
                      {friend.gamertag.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{friend.gamertag}</span>
                </div>
              ))}
            </div>
            {mutuals.mutualFriends!.length > 6 && (
              <p className="text-xs text-muted-foreground mt-3">
                +{mutuals.mutualFriends!.length - 6} more mutual friends
              </p>
            )}
          </div>
        )}

        {!hasMutualFriends && mutuals.mutualFriends === undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Mutual friends are private</span>
          </div>
        )}

        {hasMutualHobbies && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Mutual Interests</h3>
              <Badge variant="secondary">{mutuals.mutualHobbies!.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {mutuals.mutualHobbies!.map((hobby) => (
                <Badge
                  key={hobby.category}
                  variant="outline"
                  data-testid={`badge-mutual-hobby-${hobby.category}`}
                >
                  {hobby.category.charAt(0).toUpperCase() + hobby.category.slice(1)} ({hobby.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!hasMutualHobbies && mutuals.mutualHobbies === undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Mutual interests are private</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
