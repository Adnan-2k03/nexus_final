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
import { Search, MapPin, Users, MessageCircle, Loader2, RefreshCw, Filter, Phone } from "lucide-react";
import { UserProfile } from "./UserProfile";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import type { User } from "@shared/schema";
import { useLayout } from "@/contexts/LayoutContext";

interface DiscoverProps {
  currentUserId?: string;
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
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { getContainerClass } = useLayout();
  const { isUserOnline, isUserInVoice } = useOnlineStatus();
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGender, selectedLanguage, selectedGame, selectedDistance]);

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
  queryParams.append("page", currentPage.toString());
  queryParams.append("limit", "9");

  const queryUrl = `/api/users?${queryParams.toString()}`;
  
  const { data: paginatedData, isLoading: isLoadingUsers, isFetching, refetch } = useQuery<{ users: User[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: [queryUrl],
    enabled: true,
  });
  
  const users = paginatedData?.users || [];
  const totalPages = paginatedData?.totalPages || 1;

  // Fetch existing connection requests to check if already requested
  const { data: connectionRequests = [] } = useQuery({
    queryKey: ['/api/connection-requests'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/connection-requests'), {
        credentials: 'include',
      });
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
      const response = await fetch(getApiUrl('/api/user/connections'), {
        credentials: 'include',
      });
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
      setConnectingUserId(targetUserId);
      return await apiRequest('POST', '/api/connection-requests', {
        receiverId: targetUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      setConnectingUserId(null);
      toast({
        title: "Connection Request Sent",
        description: "Your connection request has been sent successfully.",
      });
    },
    onError: (error: any) => {
      setConnectingUserId(null);
      toast({
        title: "Unable to Connect",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  // Filtering is now done on the backend, so we can use users directly
  const filteredUsers = users;

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedGender("all");
    setSelectedLanguage("all");
    setSelectedGame("all");
    setSelectedDistance("global");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleConnectUser = (userId: string) => {
    // Only check for direct connection requests (not match connections)
    // Users with match connections should be able to friend-connect
    const existingRequest = connectionRequests.find(
      (req: any) => 
        (req.status === 'pending' || req.status === 'accepted') &&
        ((req.senderId === currentUserId && req.receiverId === userId) ||
        (req.receiverId === currentUserId && req.senderId === userId))
    );
    
    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
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

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Discover Gamers
          </h1>
          <p className="text-muted-foreground">Find and connect with gamers worldwide</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          data-testid="button-refresh-discover"
          className={`transition-transform ${isFetching ? 'scale-95' : 'hover:scale-105'}`}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
        <CardContent className="p-4">
          <div className="flex gap-2">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Search by name or gamertag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 overflow-x-auto whitespace-nowrap"
                style={{
                  textOverflow: 'clip',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
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
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No gamers found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Try adjusting your filters or search criteria to find more players
            </p>
            <Button 
              variant="outline"
              onClick={handleClearFilters}
              className="gap-2"
              data-testid="button-clear-filters-main"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user, index) => (
            <Card
              key={user.id}
              className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer flex flex-col hover-elevate"
              onClick={() => setSelectedUser(user)}
              data-testid={`card-user-${user.id}`}
            >
              <CardContent className="pt-6 flex flex-col flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="relative mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.gamertag || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {user.gamertag?.[0]?.toUpperCase() || user.firstName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {isUserInVoice(user.id) && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 dark:bg-blue-600 rounded-full p-1.5 border-2 border-background">
                        <Phone className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-foreground">
                      {user.gamertag || "No Gamertag"}
                    </h3>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        isUserOnline(user.id) 
                          ? 'bg-green-500/20 dark:bg-green-600/20 text-green-700 dark:text-green-400 border-green-500/30' 
                          : 'bg-gray-500/20 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
                      }`}
                      data-testid={`status-${user.id}`}
                    >
                      {isUserOnline(user.id) ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="min-h-[20px] mb-2">
                    {(user.firstName || user.lastName) && (
                      <p className="text-sm text-muted-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                    )}
                  </div>

                  <div className="min-h-[20px] mb-3">
                    {user.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{user.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-h-[40px] mb-3 flex items-center">
                    {user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                  </div>

                  <div className="min-h-[28px] mb-4 flex items-center justify-center">
                    {user.preferredGames && user.preferredGames.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {user.preferredGames[0]}
                      </Badge>
                    )}
                  </div>

                  {(() => {
                    const hasPendingRequest = connectionRequests.some(
                      (req: any) => 
                        req.status === 'pending' &&
                        ((req.senderId === currentUserId && req.receiverId === user.id) ||
                        (req.receiverId === currentUserId && req.senderId === user.id))
                    );
                    
                    return (
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnectUser(user.id);
                        }}
                        disabled={connectingUserId === user.id || hasPendingRequest}
                        variant={hasPendingRequest ? "outline" : "default"}
                        data-testid={`button-connect-${user.id}`}
                      >
                        {connectingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : hasPendingRequest ? (
                          <MessageCircle className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        {hasPendingRequest ? "Sent" : "Connect"}
                      </Button>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Profile View Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-full sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Player Profile</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <UserProfile
                id={selectedUser.id}
                gamertag={selectedUser.gamertag || "Unknown"}
                firstName={selectedUser.firstName ?? undefined}
                lastName={selectedUser.lastName ?? undefined}
                profileImageUrl={selectedUser.profileImageUrl ?? undefined}
                currentUserId={currentUserId}
                bio={selectedUser.bio ?? undefined}
                location={selectedUser.location ?? undefined}
                latitude={selectedUser.latitude ?? undefined}
                longitude={selectedUser.longitude ?? undefined}
                age={selectedUser.age ?? undefined}
                preferredGames={selectedUser.preferredGames ?? undefined}
                isOwn={selectedUser.id === currentUserId}
                onMessage={() => {
                  handleConnectUser(selectedUser.id);
                  setSelectedUser(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
