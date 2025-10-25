import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Users, MessageCircle, Loader2, RefreshCw, Filter } from "lucide-react";
import { UserProfile } from "./UserProfile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedDistance, setSelectedDistance] = useState<string>("global");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

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
  if (selectedGender && selectedGender !== "all") queryParams.append("gender", selectedGender);
  if (selectedLanguage && selectedLanguage !== "all") queryParams.append("language", selectedLanguage);
  if (selectedGame && selectedGame !== "all") queryParams.append("game", selectedGame);
  if (selectedDistance !== "global" && userLocation) {
    queryParams.append("latitude", userLocation.latitude.toString());
    queryParams.append("longitude", userLocation.longitude.toString());
    queryParams.append("maxDistance", selectedDistance);
  }

  const queryUrl = queryParams.toString() ? `/api/users?${queryParams.toString()}` : "/api/users";
  
  const { data: users, isLoading: isLoadingUsers, refetch } = useQuery<User[]>({
    queryKey: [queryUrl],
    enabled: true,
  });

  // Fetch existing connection requests to check if already requested
  const { data: connectionRequests = [] } = useQuery({
    queryKey: ['/api/connection-requests'],
    queryFn: async () => {
      const response = await fetch('/api/connection-requests');
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch connection requests');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch existing connections to check if already connected
  const { data: userConnections = [] } = useQuery({
    queryKey: ['/api/user/connections'],
    queryFn: async () => {
      const response = await fetch('/api/user/connections');
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch connections');
      }
      return response.json();
    },
    retry: false,
  });

  // Create connection request mutation (direct user-to-user connection)
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

  const filteredUsers = users?.filter(user => user.id !== currentUserId) || [];

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedGender("all");
    setSelectedLanguage("all");
    setSelectedGame("all");
    setSelectedDistance("global");
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleConnectUser = (userId: string) => {
    // Check if already connected
    const existingConnection = userConnections.find(
      (conn: any) => conn.requesterId === userId || conn.accepterId === userId
    );
    
    if (existingConnection && existingConnection.status === 'accepted') {
      toast({
        title: "Already Connected",
        description: "You already have a connection with this user. Check your Connections tab.",
      });
      return;
    }

    // Check if connection request already sent
    const existingRequest = connectionRequests.find(
      (req: any) => (req.senderId === currentUserId && req.receiverId === userId) ||
                    (req.receiverId === currentUserId && req.senderId === userId)
    );
    
    if (existingRequest) {
      toast({
        title: "Request Already Sent",
        description: "You already have a pending connection request with this user.",
      });
      return;
    }

    createConnectionRequestMutation.mutate(userId);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Discover Gamers
          </h1>
          <p className="text-muted-foreground">Find and connect with gamers worldwide</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingUsers}
          data-testid="button-refresh-discover"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">{locationError}</p>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {/* Search */}
            <div className="flex-1 relative">
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

            {/* Filter Button */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-toggle-filters">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(selectedGender !== "all" || selectedLanguage !== "all" || selectedGame !== "all" || selectedDistance !== "global") && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {[selectedGender !== "all", selectedLanguage !== "all", selectedGame !== "all", selectedDistance !== "global"].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" data-testid="popover-filters">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Filter Gamers</h4>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender.value} value={gender.value}>
                            {gender.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger data-testid="select-language">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Game */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferred Game</label>
                    <Select value={selectedGame} onValueChange={setSelectedGame}>
                      <SelectTrigger data-testid="select-game">
                        <SelectValue placeholder="Game" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Games</SelectItem>
                        {GAMES.map((game) => (
                          <SelectItem key={game} value={game}>
                            {game}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Distance */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Distance</label>
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
                  </div>

                  {/* Clear Filters Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleClearFilters();
                      setShowFilters(false);
                    }}
                    className="w-full"
                    data-testid="button-clear-filters"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoadingUsers ? (
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectUser(user.id);
                    }}
                    disabled={createConnectionRequestMutation.isPending}
                    data-testid={`button-connect-${user.id}`}
                  >
                    {createConnectionRequestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    Connect
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
              latitude={selectedUser.latitude ?? undefined}
              longitude={selectedUser.longitude ?? undefined}
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
