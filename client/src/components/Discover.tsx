import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MapPin, Users, MessageCircle, Loader2 } from "lucide-react";
import { UserProfile } from "./UserProfile";
import type { User } from "@shared/schema";

interface DiscoverProps {
  currentUserId: string;
}

const GAMES = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Apex Legends",
  "Rocket League",
  "Overwatch 2",
  "Dota 2",
  "Fortnite",
  "Call of Duty",
  "FIFA 24",
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "custom", label: "Custom" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const DISTANCES = [
  { value: "5", label: "Within 5km" },
  { value: "10", label: "Within 10km" },
  { value: "25", label: "Within 25km" },
  { value: "50", label: "Within 50km" },
  { value: "100", label: "Within 100km" },
  { value: "global", label: "Global" },
];

export function Discover({ currentUserId }: DiscoverProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedDistance, setSelectedDistance] = useState<string>("global");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Request user's location for distance-based filtering
  useEffect(() => {
    if (selectedDistance !== "global" && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationError(null);
          },
          (error) => {
            console.error("Error getting location:", error);
            setLocationError("Unable to get your location. Distance filter disabled.");
            setSelectedDistance("global");
          }
        );
      } else {
        setLocationError("Geolocation not supported by your browser. Distance filter disabled.");
        setSelectedDistance("global");
      }
    }
  }, [selectedDistance, userLocation]);

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.append("search", searchTerm);
  if (selectedGender) queryParams.append("gender", selectedGender);
  if (selectedLanguage) queryParams.append("language", selectedLanguage);
  if (selectedGame) queryParams.append("game", selectedGame);
  if (selectedDistance !== "global" && userLocation) {
    queryParams.append("latitude", userLocation.latitude.toString());
    queryParams.append("longitude", userLocation.longitude.toString());
    queryParams.append("maxDistance", selectedDistance);
  }

  const queryUrl = queryParams.toString() ? `/api/users?${queryParams.toString()}` : "/api/users";
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: [queryUrl],
    enabled: true,
  });

  const filteredUsers = users?.filter(user => user.id !== currentUserId) || [];

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedGender("");
    setSelectedLanguage("");
    setSelectedGame("");
    setSelectedDistance("global");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Discover Gamers
        </h1>
        <p className="text-muted-foreground">Find and connect with gamers worldwide</p>
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">{locationError}</p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or gamertag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
            </div>

            {/* Gender */}
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger data-testid="select-gender">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genders</SelectItem>
                {GENDERS.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Language */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Languages</SelectItem>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Game */}
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger data-testid="select-game">
                <SelectValue placeholder="Game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Games</SelectItem>
                {GAMES.map((game) => (
                  <SelectItem key={game} value={game}>
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Distance */}
            <Select value={selectedDistance} onValueChange={setSelectedDistance}>
              <SelectTrigger data-testid="select-distance">
                <SelectValue placeholder="Distance" />
              </SelectTrigger>
              <SelectContent>
                {DISTANCES.map((distance) => (
                  <SelectItem key={distance.value} value={distance.value}>
                    {distance.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="md:col-span-2 lg:col-span-1"
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">No gamers found</p>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedUser(user)}
              data-testid={`card-user-${user.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.gamertag || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {user.gamertag?.[0]?.toUpperCase() || user.firstName?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="font-bold text-lg text-foreground mb-1">
                    {user.gamertag || "No Gamertag"}
                  </h3>

                  {(user.firstName || user.lastName) && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {user.firstName} {user.lastName}
                    </p>
                  )}

                  {user.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="h-3 w-3" />
                      <span>{user.location}</span>
                    </div>
                  )}

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {user.preferredGames && user.preferredGames.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                      {user.preferredGames.slice(0, 3).map((game, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {game}
                        </Badge>
                      ))}
                      {user.preferredGames.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{user.preferredGames.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full gap-2"
                    data-testid={`button-message-${user.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Profile View Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Player Profile</DialogTitle>
            </DialogHeader>
            <UserProfile
              id={selectedUser.id}
              gamertag={selectedUser.gamertag || "Unknown"}
              firstName={selectedUser.firstName ?? undefined}
              lastName={selectedUser.lastName ?? undefined}
              profileImageUrl={selectedUser.profileImageUrl ?? undefined}
              bio={selectedUser.bio ?? undefined}
              location={selectedUser.location ?? undefined}
              age={selectedUser.age ?? undefined}
              preferredGames={selectedUser.preferredGames ?? undefined}
              isOwn={selectedUser.id === currentUserId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
