import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MatchRequestCard } from "./MatchRequestCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MatchRequestWithUser, MatchConnection } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GameFilters } from "./GameFilters";
import { RefreshCw, Plus, Wifi, WifiOff, EyeOff, Eye, Users, Target, Clock } from "lucide-react";
import { useLayout } from "@/contexts/LayoutContext";
import { getApiUrl } from "@/lib/api";

// Utility function to format time ago
function formatTimeAgo(date: string | Date | null): string {
  if (!date) return "Unknown";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Extended type for UI display
interface MatchRequestDisplay extends Omit<MatchRequestWithUser, 'gamertag' | 'profileImageUrl' | 'region' | 'tournamentName'> {
  timeAgo: string;
  gamertag: string; // Override to ensure non-null for display
  profileImageUrl?: string; // Use undefined instead of null for UI consistency
  region?: string; // Use undefined instead of null for UI consistency
  tournamentName?: string; // Use undefined instead of null for UI consistency
}

interface MatchFeedProps {
  onCreateMatch: () => void;
  onAcceptMatch: (matchId: string, accepterId: string) => void;
  onDeclineMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
  currentUserId?: string;
}

export function MatchFeed({ 
  onCreateMatch, 
  onAcceptMatch, 
  onDeclineMatch,
  onDeleteMatch,
  currentUserId = "user1"
}: MatchFeedProps) {
  const queryClient = useQueryClient();
  const { isConnected, lastMessage } = useWebSocket();
  const { getContainerClass } = useLayout();
  const [filters, setFilters] = useState<{ search?: string; game?: string; mode?: string; region?: string; gender?: string; language?: string; distance?: string }>({});
  const [showHidden, setShowHidden] = useState(false);
  const [showLongTerm, setShowLongTerm] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Request user's location for distance-based filtering
  useEffect(() => {
    if (filters.distance && !userLocation) {
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
            setFilters(prev => ({ ...prev, distance: undefined }));
          }
        );
      } else {
        setLocationError("Geolocation not supported. Distance filter disabled.");
        setFilters(prev => ({ ...prev, distance: undefined }));
      }
    }
  }, [filters.distance, userLocation]);

  // Fetch match requests from API
  const { data: paginatedData, isLoading: isFetchingMatches, isFetching, refetch } = useQuery<{ matchRequests: MatchRequestWithUser[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ['/api/match-requests', filters, userLocation, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.game) params.append('game', filters.game);
      if (filters.mode) params.append('mode', filters.mode);
      if (filters.region) params.append('region', filters.region);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.language) params.append('language', filters.language);
      if (filters.distance && userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
        params.append('maxDistance', filters.distance);
      }
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      
      const response = await fetch(getApiUrl(`/api/match-requests?${params}`), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch match requests');
      }
      return response.json();
    },
    retry: false,
  });
  
  const fetchedMatches = paginatedData?.matchRequests || [];
  const totalPages = paginatedData?.totalPages || 1;

  // Fetch hidden match IDs
  const { data: hiddenMatchIds = [] } = useQuery<string[]>({
    queryKey: ['/api/hidden-matches'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/hidden-matches'), {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return empty array
          return [];
        }
        throw new Error('Failed to fetch hidden matches');
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch user connections to filter out matches they've already applied to
  const { data: userConnections = [] } = useQuery<MatchConnection[]>({
    queryKey: ['/api/user/connections'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/user/connections'), {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error('Failed to fetch connections');
      }
      return response.json();
    },
    retry: false,
  });

  // Get list of match request IDs that user has already applied to
  const appliedMatchIds = useMemo(() => 
    userConnections.map(conn => conn.requestId),
    [userConnections]
  );

  // Transform backend data to display format (memoized to prevent infinite re-renders)
  const transformedMatches: MatchRequestDisplay[] = useMemo(() => 
    fetchedMatches
      .filter(match => match.gamertag) // Only show matches with valid gamertags
      .map(match => ({
        ...match,
        gamertag: match.gamertag || "Unknown Player",
        profileImageUrl: match.profileImageUrl ?? undefined,
        region: match.region ?? undefined,
        tournamentName: match.tournamentName ?? undefined,
        timeAgo: formatTimeAgo(match.createdAt),
      })), [fetchedMatches]);

  // Handle real-time WebSocket updates
  useEffect(() => {
    if (!lastMessage) return;

    const { type, data } = lastMessage;
    
    switch (type) {
      case 'match_request_created':
        // Invalidate and refetch the match requests to include the new one
        queryClient.invalidateQueries({ queryKey: ['/api/match-requests'] });
        break;
      
      case 'match_request_updated':
        // Update specific match request in the cache
        queryClient.setQueryData(['/api/match-requests', filters, userLocation], (oldData: MatchRequestWithUser[] | undefined) => {
          if (!oldData || !data) return oldData;
          
          return oldData.map(match => 
            match.id === data.id ? { ...match, ...data } : match
          );
        });
        break;
      
      case 'match_request_deleted':
        // Remove the deleted match request from cache
        queryClient.setQueryData(['/api/match-requests', filters, userLocation], (oldData: MatchRequestWithUser[] | undefined) => {
          if (!oldData || !data?.id) return oldData;
          
          return oldData.filter(match => match.id !== data.id);
        });
        break;
      
      default:
        // Handle other message types if needed
        break;
    }
  }, [lastMessage, queryClient, filters]);



  const filterMatches = (match: MatchRequestDisplay) => {
    // Don't show matches user has already applied to (UNLESS they created it)
    // Creators should always see their own match requests
    if (appliedMatchIds.includes(match.id) && match.userId !== currentUserId) {
      return false;
    }
    
    // Filter by hidden status
    if (!showHidden && hiddenMatchIds.includes(match.id)) {
      return false;
    }
    if (showHidden && !hiddenMatchIds.includes(match.id)) {
      return false;
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!match.gameName.toLowerCase().includes(searchLower) &&
          !match.description.toLowerCase().includes(searchLower) &&
          !match.gamertag.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.game && !match.gameName.toLowerCase().includes(filters.game.toLowerCase())) {
      return false;
    }
    if (filters.mode && match.gameMode !== filters.mode) {
      return false;
    }
    if (filters.region && match.region !== filters.region) {
      return false;
    }
    return true;
  };

  const lfgMatches = transformedMatches.filter(match => {
    if (match.matchType !== 'lfg') return false;
    if (!filterMatches(match)) return false;
    // Show only short-term by default, or only long-term when toggle is enabled
    const targetDuration = showLongTerm ? 'long-term' : 'short-term';
    return match.duration === targetDuration;
  });
  const lfoMatches = transformedMatches.filter(match => {
    if (match.matchType !== 'lfo') return false;
    if (!filterMatches(match)) return false;
    // Show only short-term by default, or only long-term when toggle is enabled
    const targetDuration = showLongTerm ? 'long-term' : 'short-term';
    return match.duration === targetDuration;
  });

  // Separate matches into "Your Posts" and "Other Posts"
  const lfgYourPosts = lfgMatches.filter(match => match.userId === currentUserId);
  const lfgOtherPosts = lfgMatches.filter(match => match.userId !== currentUserId);
  const lfoYourPosts = lfoMatches.filter(match => match.userId === currentUserId);
  const lfoOtherPosts = lfoMatches.filter(match => match.userId !== currentUserId);

  const handleRefresh = () => {
    refetch();
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={`${getContainerClass()} mx-auto space-y-4 md:space-y-6`}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Match Feed
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </h1>
          <p className="text-muted-foreground">Discover and apply to match requests</p>
        </div>
        
        <div className="flex gap-1.5 sm:gap-2 flex-wrap sm:ml-auto">
          <Button
            variant={showHidden ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            data-testid="button-toggle-hidden"
            className="h-8 px-2 sm:px-3"
          >
            {showHidden ? <Eye className="h-4 w-4 sm:mr-1" /> : <EyeOff className="h-4 w-4 sm:mr-1" />}
            <span className="hidden sm:inline">{showHidden ? "Show All" : "Hidden"}</span>
          </Button>
          <Button
            variant={showLongTerm ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLongTerm(!showLongTerm)}
            data-testid="button-duration-long-term"
            className={`h-8 px-2 sm:px-3 ${showLongTerm ? "shadow-lg shadow-primary/50 ring-2 ring-primary/30" : ""}`}
          >
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Long Term</span>
            {showLongTerm && <span className="ml-1 sm:ml-2 text-xs">✓</span>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-feed"
            className={`h-8 px-2 sm:px-3 transition-transform ${isFetching ? 'scale-95' : 'hover:scale-105'}`}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={onCreateMatch}
            size="sm"
            className="gap-1 sm:gap-2 h-8 px-2 sm:px-3"
            data-testid="button-create-match"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        </div>
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">{locationError}</p>
        </div>
      )}

      {/* Filters */}
      <GameFilters 
        onFilterChange={setFilters}
        activeFilters={filters}
      />

      {/* Match Feed with Tabs */}
      <Tabs defaultValue="lfg" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lfg" className="gap-1 sm:gap-2" data-testid="tab-lfg">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">LFG <span className="hidden sm:inline">(Looking for Group)</span></span>
          </TabsTrigger>
          <TabsTrigger value="lfo" className="gap-1 sm:gap-2" data-testid="tab-lfo">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">LFO <span className="hidden sm:inline">(Looking for Opponent)</span></span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lfg" className="mt-6 space-y-4">
          {isFetchingMatches ? (
            <LoadingSkeleton />
          ) : lfgMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <div className="text-muted-foreground space-y-2">
                  <p className="text-lg font-semibold">No LFG matches found</p>
                  <p className="text-sm">Looking for teammates to form a group? Create a match request to find players!</p>
                </div>
                <Button 
                  onClick={onCreateMatch}
                  className="mt-4 gap-2"
                  data-testid="button-create-lfg-match"
                >
                  <Plus className="h-4 w-4" />
                  Create LFG Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Your Posts Section */}
              {lfgYourPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-2">
                    <h3 className="text-lg font-semibold text-foreground">Your Posts</h3>
                    <Badge variant="secondary" className="text-xs">{lfgYourPosts.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {lfgYourPosts.map((match) => (
                      <MatchRequestCard
                        key={match.id}
                        id={match.id}
                        userId={match.userId}
                        gamertag={match.gamertag}
                        profileImageUrl={match.profileImageUrl}
                        gameName={match.gameName}
                        gameMode={match.gameMode}
                        description={match.description}
                        region={match.region}
                        tournamentName={match.tournamentName}
                        status={match.status}
                        timeAgo={match.timeAgo}
                        isOwn={true}
                        currentUserId={currentUserId}
                        onAccept={() => onAcceptMatch(match.id, match.userId)}
                        onDecline={() => onDeclineMatch(match.id)}
                        onDelete={() => onDeleteMatch(match.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Posts Section */}
              {lfgOtherPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-2">
                    <h3 className="text-lg font-semibold text-foreground">Available Matches</h3>
                    <Badge variant="secondary" className="text-xs">{lfgOtherPosts.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {lfgOtherPosts.map((match) => (
                      <MatchRequestCard
                        key={match.id}
                        id={match.id}
                        userId={match.userId}
                        gamertag={match.gamertag}
                        profileImageUrl={match.profileImageUrl}
                        gameName={match.gameName}
                        gameMode={match.gameMode}
                        description={match.description}
                        region={match.region}
                        tournamentName={match.tournamentName}
                        status={match.status}
                        timeAgo={match.timeAgo}
                        isOwn={false}
                        currentUserId={currentUserId}
                        onAccept={() => onAcceptMatch(match.id, match.userId)}
                        onDecline={() => onDeclineMatch(match.id)}
                        onDelete={() => onDeleteMatch(match.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="lfo" className="mt-6 space-y-4">
          {isFetchingMatches ? (
            <LoadingSkeleton />
          ) : lfoMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <div className="text-muted-foreground space-y-2">
                  <p className="text-lg font-semibold">No LFO matches found</p>
                  <p className="text-sm">Looking for opponents to compete against? Create a match request to find challengers!</p>
                </div>
                <Button 
                  onClick={onCreateMatch}
                  className="mt-4 gap-2"
                  data-testid="button-create-lfo-match"
                >
                  <Plus className="h-4 w-4" />
                  Create LFO Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Your Posts Section */}
              {lfoYourPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-2">
                    <h3 className="text-lg font-semibold text-foreground">Your Posts</h3>
                    <Badge variant="secondary" className="text-xs">{lfoYourPosts.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {lfoYourPosts.map((match) => (
                      <MatchRequestCard
                        key={match.id}
                        id={match.id}
                        userId={match.userId}
                        gamertag={match.gamertag}
                        profileImageUrl={match.profileImageUrl}
                        gameName={match.gameName}
                        gameMode={match.gameMode}
                        description={match.description}
                        region={match.region}
                        tournamentName={match.tournamentName}
                        status={match.status}
                        timeAgo={match.timeAgo}
                        isOwn={true}
                        currentUserId={currentUserId}
                        onAccept={() => onAcceptMatch(match.id, match.userId)}
                        onDecline={() => onDeclineMatch(match.id)}
                        onDelete={() => onDeleteMatch(match.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Posts Section */}
              {lfoOtherPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-2">
                    <h3 className="text-lg font-semibold text-foreground">Available Matches</h3>
                    <Badge variant="secondary" className="text-xs">{lfoOtherPosts.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {lfoOtherPosts.map((match) => (
                      <MatchRequestCard
                        key={match.id}
                        id={match.id}
                        userId={match.userId}
                        gamertag={match.gamertag}
                        profileImageUrl={match.profileImageUrl}
                        gameName={match.gameName}
                        gameMode={match.gameMode}
                        description={match.description}
                        region={match.region}
                        tournamentName={match.tournamentName}
                        status={match.status}
                        timeAgo={match.timeAgo}
                        isOwn={false}
                        currentUserId={currentUserId}
                        onAccept={() => onAcceptMatch(match.id, match.userId)}
                        onDecline={() => onDeclineMatch(match.id)}
                        onDelete={() => onDeleteMatch(match.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-previous-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
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

      {/* Live Updates Indicator */}
      {isConnected && (
        <div className="text-center text-xs text-muted-foreground mt-4">
          🔴 Live updates enabled • New matches appear automatically
        </div>
      )}
    </div>
  );
}