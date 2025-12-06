import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { MessageCircle, Calendar, Users, Trophy, Phone, CheckCircle, X, RefreshCw, Filter, Trash2, ChevronDown, ChevronUp, Search, FileText } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import type { MatchConnectionWithUser, ConnectionRequestWithUser, User } from "@shared/schema";
import { Chat } from "./Chat";
import { VoiceChannel } from "./VoiceChannel";
import { useToast } from "@/hooks/use-toast";
import { useLayout } from "@/contexts/LayoutContext";
import { useVoiceCallNotifications } from "@/hooks/useVoiceCallNotifications";

interface ConnectionsProps {
  currentUserId?: string;
}

function formatTimeAgo(date: string | Date | null): string {
  if (!date) return "Unknown";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just connected";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function Connections({ currentUserId }: ConnectionsProps) {
  const { lastMessage } = useWebSocket();
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [viewMatchDetailsId, setViewMatchDetailsId] = useState<string | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [pendingRequestsOpen, setPendingRequestsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { toast } = useToast();
  const { getContainerClass } = useLayout();
  const { waitingCallerGamertags } = useVoiceCallNotifications();

  if (!currentUserId) {
    return <div className="p-4 text-center text-muted-foreground">Loading user data...</div>;
  }

  const { data: connections = [], isLoading, isFetching, refetch } = useQuery<MatchConnectionWithUser[]>({
    queryKey: ['/api/user/connections'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/user/connections'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      return response.json();
    },
    retry: false,
  });


  // Fetch user profile when viewing
  const { data: viewedUserProfile } = useQuery<User>({
    queryKey: ['/api/users', viewProfileUserId],
    queryFn: async () => {
      if (!viewProfileUserId) throw new Error('No user ID');
      const response = await fetch(getApiUrl(`/api/users/${viewProfileUserId}`), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!viewProfileUserId,
  });

  // Fetch match request details when viewing
  const { data: matchRequestDetails } = useQuery({
    queryKey: ['/api/match-requests', viewMatchDetailsId],
    queryFn: async () => {
      if (!viewMatchDetailsId) throw new Error('No match ID');
      const response = await fetch(getApiUrl(`/api/match-requests/${viewMatchDetailsId}`), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch match request');
      return response.json();
    },
    enabled: !!viewMatchDetailsId,
  });

  const handleRefresh = () => {
    refetch();
  };

  // Handle real-time WebSocket updates for connections
  useEffect(() => {
    if (!lastMessage) return;

    const { type } = lastMessage;
    
    if (type === 'match_connection_created' || type === 'match_connection_updated' || type === 'match_connection_deleted') {
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
    }
  }, [lastMessage]);

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/match-connections/${connectionId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
      toast({
        title: variables.status === 'accepted' ? "Application Accepted" : "Application Declined",
        description: variables.status === 'accepted' 
          ? "You can now chat and join voice channels with this player"
          : "The application has been declined",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    },
  });


  const deleteMatchConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return await apiRequest('DELETE', `/api/match-connections/${connectionId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
      toast({
        title: "Connection Deleted",
        description: "The match connection has been deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete match connection",
        variant: "destructive",
      });
    },
  });

  // Apply filters
  const filterByType = (item: MatchConnectionWithUser | ConnectionRequestWithUser) => {
    if (requestTypeFilter === 'all') return true;
    if (requestTypeFilter === 'connection') {
      return 'senderId' in item;
    }
    // For match connections, check gameMode
    if ('gameMode' in item && item.gameMode) {
      return item.gameMode === requestTypeFilter;
    }
    // Connection requests don't have a type, so they're filtered out for specific game modes
    return false;
  };

  // Apply search filter
  const filterBySearch = (item: MatchConnectionWithUser) => {
    if (!searchTerm) return true;
    const isRequester = item.requesterId === currentUserId;
    const otherGamertag = isRequester ? item.accepterGamertag : item.requesterGamertag;
    return otherGamertag?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
  };

  // Split match connections into categories
  const incomingApplications = connections
    .filter(c => c.status === 'pending' && c.accepterId === currentUserId)
    .filter(filterByType)
    .filter(filterBySearch);
  
  const yourApplications = connections
    .filter(c => c.status === 'pending' && c.requesterId === currentUserId)
    .filter(filterByType)
    .filter(filterBySearch);
  
  const acceptedConnections = connections
    .filter(c => c.status === 'accepted')
    .filter(filterByType)
    .filter(filterBySearch);

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex gap-2 mb-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className={`${getContainerClass()} mx-auto`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Matches</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-9">Manage your match connections and applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Loading...
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              data-testid="button-refresh-connections"
              className={`transition-transform ${isFetching ? 'scale-95' : 'hover:scale-105'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }


  const renderConnectionCard = (connection: MatchConnectionWithUser, showActions: 'confirm' | 'waiting' | 'chat', isRequester: boolean) => {
    const timeAgo = formatTimeAgo(connection.createdAt);
    const otherUserId = isRequester ? connection.accepterId : connection.requesterId;
    const otherGamertag = isRequester ? connection.accepterGamertag : connection.requesterGamertag;
    const otherProfileImageUrl = isRequester ? connection.accepterProfileImageUrl : connection.requesterProfileImageUrl;
    const displayName = otherGamertag || otherUserId;
    const avatarUrl = otherProfileImageUrl || undefined;
    
    return (
      <Card key={connection.id} className="hover:shadow-md transition-shadow" data-testid={`connection-card-${connection.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <ProfileDialog 
              userId={otherUserId} 
              gamertag={displayName} 
              profileImageUrl={avatarUrl}
              currentUserId={currentUserId}
              trigger={
                <button 
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full text-left" 
                  data-testid={`button-view-profile-${otherUserId}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {(displayName || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {waitingCallerGamertags.includes(displayName) && (
                      <div 
                        className="absolute -top-1 -left-1 h-5 w-5 bg-amber-500 dark:bg-amber-400 rounded-full border-2 border-background flex items-center justify-center animate-pulse"
                        data-testid={`waiting-call-indicator-${otherUserId}`}
                        title="Waiting in voice call"
                      >
                        <Phone className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground underline-offset-4 hover:underline">
                        {displayName}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRequester ? "You applied to their match" : "They applied to your post"}
                    </p>
                  </div>
                </button>
              }
            />
            <Badge 
              variant={
                connection.status === 'accepted' ? 'default' : 'secondary'
              }
              className="text-xs"
              data-testid={`connection-status-${connection.id}`}
            >
              {connection.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex-1 min-w-0 flex items-center gap-4 truncate">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{timeAgo}</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Trophy className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Match ID: {connection.requestId.slice(-6)}</span>
              </div>
            </div>
            
            {showActions === 'confirm' && (
              <div className="flex-shrink-0 flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => setViewMatchDetailsId(connection.requestId)}
                  data-testid={`button-match-details-${connection.id}`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Match Details</span>
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => updateConnectionMutation.mutate({ connectionId: connection.id, status: 'accepted' })}
                  disabled={updateConnectionMutation.isPending}
                  data-testid={`button-confirm-${connection.id}`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => updateConnectionMutation.mutate({ connectionId: connection.id, status: 'declined' })}
                  disabled={updateConnectionMutation.isPending}
                  data-testid={`button-decline-${connection.id}`}
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
            
            {showActions === 'waiting' && (
              <div className="flex-shrink-0 flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => setViewMatchDetailsId(connection.requestId)}
                  data-testid={`button-match-details-${connection.id}`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Match Details</span>
                </Button>
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  Waiting for confirmation
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => deleteMatchConnectionMutation.mutate(connection.id)}
                  disabled={deleteMatchConnectionMutation.isPending}
                  data-testid={`button-delete-connection-${connection.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
            
            {showActions === 'chat' && (
              <Dialog open={openChatId === connection.id} onOpenChange={(open) => setOpenChatId(open ? connection.id : null)}>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-primary hover:text-primary"
                    onClick={() => setOpenChatId(connection.id)}
                    data-testid={`button-open-connection-${connection.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <Phone className="h-4 w-4" />
                    <span className="text-xs">Chat & Voice</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => setViewMatchDetailsId(connection.requestId)}
                    data-testid={`button-match-details-${connection.id}`}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">Match Details</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => deleteMatchConnectionMutation.mutate(connection.id)}
                    disabled={deleteMatchConnectionMutation.isPending}
                    data-testid={`button-disconnect-${connection.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
                <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
                  <DialogHeader className="p-4 pb-3 border-b">
                    <DialogTitle>
                      Connect with {displayName}
                    </DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-2">
                      <TabsTrigger value="chat" className="flex-1" data-testid="tab-chat">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="voice" className="flex-1" data-testid="tab-voice">
                        <Phone className="h-4 w-4 mr-1" />
                        Voice
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat" className="flex-1 overflow-hidden m-0">
                      <Chat
                        connectionId={connection.id}
                        currentUserId={currentUserId}
                        otherUserId={otherUserId}
                        otherUserName={displayName}
                      />
                    </TabsContent>
                    <TabsContent value="voice" className="p-4">
                      <VoiceChannel
                        connectionId={connection.id}
                        currentUserId={currentUserId}
                        otherUserId={otherUserId}
                        otherUserName={displayName}
                        hideScreenShare={true}
                      />
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (connections.length === 0) {
    return (
      <div className={`${getContainerClass()} mx-auto`}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Matches
            </h1>
            <p className="text-muted-foreground">Manage your match connections and applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              0 connections
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              data-testid="button-refresh-connections"
              className={`transition-transform ${isFetching ? 'scale-95' : 'hover:scale-105'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
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
                  data-testid="input-search-connections"
                />
              </div>
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="default" data-testid="button-toggle-request-filters">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter {requestTypeFilter !== 'all' && `(${requestTypeFilter})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" data-testid="popover-request-filters">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Filter Requests</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Request Type</label>
                      <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                        <SelectTrigger data-testid="select-request-type">
                          <SelectValue placeholder="All Requests" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Applications</SelectItem>
                          <SelectItem value="1v1">1v1 Match Applications</SelectItem>
                          <SelectItem value="2v2">2v2 Match Applications</SelectItem>
                          <SelectItem value="3v3">3v3 Match Applications</SelectItem>
                          <SelectItem value="squad">Team/Squad Finder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Apply to a match on the Feed tab to get started!
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              When you apply to matches or others apply to yours, your gaming connections will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Matches
          </h1>
          <p className="text-muted-foreground">Manage your match connections and applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {connections.length} total
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-connections"
            className={`transition-transform ${isFetching ? 'scale-95' : 'hover:scale-105'}`}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
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
                data-testid="input-search-connections"
              />
            </div>
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" data-testid="button-toggle-request-filters">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter {requestTypeFilter !== 'all' && `(${requestTypeFilter})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" data-testid="popover-request-filters">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Filter Requests</h4>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Request Type</label>
                    <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                      <SelectTrigger data-testid="select-request-type">
                        <SelectValue placeholder="All Requests" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applications</SelectItem>
                        <SelectItem value="1v1">1v1 Match Applications</SelectItem>
                        <SelectItem value="2v2">2v2 Match Applications</SelectItem>
                        <SelectItem value="3v3">3v3 Match Applications</SelectItem>
                        <SelectItem value="squad">Team/Squad Finder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">

        {/* Match Connections Section */}
        {acceptedConnections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Match Connections
              </h2>
              <Badge variant="default" className="text-xs">
                {acceptedConnections.length} active
              </Badge>
            </div>
            <div className="space-y-3">
              {acceptedConnections.map((connection) => 
                renderConnectionCard(connection, 'chat', connection.requesterId === currentUserId)
              )}
            </div>
          </div>
        )}

        {/* Pending Applications - Collapsible Section */}
        {(incomingApplications.length > 0 || yourApplications.length > 0) && (
          <Collapsible open={pendingRequestsOpen} onOpenChange={setPendingRequestsOpen}>
            <Card className="p-4">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between p-2 hover:bg-accent"
                  data-testid="button-toggle-pending-requests"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Pending Match Applications</h2>
                    <Badge variant="default" className="text-xs">
                      {incomingApplications.length + yourApplications.length} total
                    </Badge>
                  </div>
                  {pendingRequestsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-6 mt-4">
                {/* Received Applications */}
                {incomingApplications.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-md font-semibold text-foreground flex items-center gap-2 px-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Received Applications
                      <Badge variant="outline" className="text-xs">
                        {incomingApplications.length}
                      </Badge>
                    </h3>
                    
                    <div className="space-y-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium text-muted-foreground">Match Applications</h4>
                        <Badge variant="secondary" className="text-xs">
                          {incomingApplications.length}
                        </Badge>
                      </div>
                      {incomingApplications.map((connection) => 
                        renderConnectionCard(connection, 'confirm', false)
                      )}
                    </div>
                  </div>
                )}
                
                {/* Sent Applications */}
                {yourApplications.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-md font-semibold text-foreground flex items-center gap-2 px-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Sent Applications
                      <Badge variant="outline" className="text-xs">
                        {yourApplications.length}
                      </Badge>
                    </h3>
                    
                    <div className="space-y-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium text-muted-foreground">Match Applications</h4>
                        <Badge variant="secondary" className="text-xs">
                          {yourApplications.length}
                        </Badge>
                      </div>
                      {yourApplications.map((connection) => 
                        renderConnectionCard(connection, 'waiting', true)
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

      </div>

      {/* Profile Viewing Dialog */}
      <Dialog open={!!viewProfileUserId} onOpenChange={(open) => !open && setViewProfileUserId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View gamer profile details</DialogDescription>
          </DialogHeader>
          {viewedUserProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={viewedUserProfile.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {viewedUserProfile.gamertag?.[0]?.toUpperCase() || viewedUserProfile.firstName?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{viewedUserProfile.gamertag || viewedUserProfile.firstName}</h3>
                  <p className="text-sm text-muted-foreground">{viewedUserProfile.email}</p>
                </div>
              </div>
              
              {viewedUserProfile.bio && (
                <div>
                  <h4 className="font-semibold mb-1">Bio</h4>
                  <p className="text-sm text-muted-foreground">{viewedUserProfile.bio}</p>
                </div>
              )}
              
              {viewedUserProfile.preferredGames && viewedUserProfile.preferredGames.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preferred Games</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewedUserProfile.preferredGames.map((game: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{game}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {viewedUserProfile.location && (
                <div>
                  <h4 className="font-semibold mb-1">Location</h4>
                  <Badge variant="outline">{viewedUserProfile.location}</Badge>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                {viewedUserProfile.age && (
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">Age</h4>
                    <p className="text-sm text-muted-foreground">{viewedUserProfile.age}</p>
                  </div>
                )}
                
                {viewedUserProfile.language && (
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">Language</h4>
                    <p className="text-sm text-muted-foreground">{viewedUserProfile.language}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Details Dialog */}
      <Dialog open={!!viewMatchDetailsId} onOpenChange={(open) => !open && setViewMatchDetailsId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Match Request Details</DialogTitle>
            <DialogDescription>Original match request information</DialogDescription>
          </DialogHeader>
          {matchRequestDetails && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Game</h4>
                  <p className="text-lg font-semibold">{matchRequestDetails.gameName}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Mode</h4>
                  <Badge variant="secondary">{matchRequestDetails.gameMode}</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant={matchRequestDetails.matchType === 'lfg' ? 'default' : 'secondary'}>
                  {matchRequestDetails.matchType === 'lfg' ? 'Looking for Group' : 'Looking for Opponent'}
                </Badge>
                <Badge variant="outline">
                  {matchRequestDetails.duration === 'short-term' ? 'Short-term' : 'Long-term'}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{matchRequestDetails.description}</p>
              </div>

              {matchRequestDetails.region && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Region</h4>
                  <Badge variant="outline">{matchRequestDetails.region}</Badge>
                </div>
              )}

              {matchRequestDetails.tournamentName && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Tournament</h4>
                  <p className="text-sm">{matchRequestDetails.tournamentName}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Match ID: {matchRequestDetails.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
