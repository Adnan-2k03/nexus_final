import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Calendar, Users, Trophy, Phone, CheckCircle, X, RefreshCw, Filter, Trash2 } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MatchConnectionWithUser, ConnectionRequestWithUser, User } from "@shared/schema";
import { Chat } from "./Chat";
import { VoiceChannel } from "./VoiceChannel";
import { useToast } from "@/hooks/use-toast";

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
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const { data: connections = [], isLoading, refetch } = useQuery<MatchConnectionWithUser[]>({
    queryKey: ['/api/user/connections'],
    queryFn: async () => {
      const response = await fetch('/api/user/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      return response.json();
    },
    retry: false,
  });

  const { data: connectionRequests = [], isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery<ConnectionRequestWithUser[]>({
    queryKey: ['/api/connection-requests'],
    queryFn: async () => {
      const response = await fetch('/api/connection-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch connection requests');
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
      const response = await fetch(`/api/users/${viewProfileUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!viewProfileUserId,
  });

  const handleRefresh = () => {
    refetch();
    refetchRequests();
  };

  // Handle real-time WebSocket updates for connections
  useEffect(() => {
    if (!lastMessage) return;

    const { type } = lastMessage;
    
    if (type === 'match_connection_created' || type === 'match_connection_updated' || type === 'match_connection_deleted') {
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
    }
    if (type === 'connection_request_created' || type === 'connection_request_updated' || type === 'connection_request_deleted') {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
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

  const updateConnectionRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/connection-requests/${requestId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: variables.status === 'accepted' ? "Connection Accepted" : "Connection Declined",
        description: variables.status === 'accepted' 
          ? "You are now connected with this gamer"
          : "The connection request has been declined",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update connection request",
        variant: "destructive",
      });
    },
  });

  const deleteConnectionRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('DELETE', `/api/connection-requests/${requestId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Request Deleted",
        description: "The connection request has been deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete connection request",
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

  // Split match connections and connection requests into categories
  const incomingConnectionRequests = connectionRequests
    .filter(r => r.status === 'pending' && r.receiverId === currentUserId)
    .filter(filterByType);
  
  const outgoingConnectionRequests = connectionRequests
    .filter(r => r.status === 'pending' && r.senderId === currentUserId)
    .filter(filterByType);
  
  const acceptedConnectionRequests = connectionRequests
    .filter(r => r.status === 'accepted')
    .filter(filterByType);

  // Split connections into three categories
  const incomingApplications = connections
    .filter(c => c.status === 'pending' && c.accepterId === currentUserId)
    .filter(filterByType);
  
  const yourApplications = connections
    .filter(c => c.status === 'pending' && c.requesterId === currentUserId)
    .filter(filterByType);
  
  const acceptedConnections = connections
    .filter(c => c.status === 'accepted')
    .filter(filterByType);

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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Connections</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Loading...
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="button-refresh-connections"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const renderConnectionRequestCard = (request: ConnectionRequestWithUser, showActions: 'confirm' | 'waiting' | 'chat', isSender: boolean) => {
    const timeAgo = formatTimeAgo(request.createdAt);
    const otherUserId = isSender ? request.receiverId : request.senderId;
    const otherGamertag = isSender ? request.receiverGamertag : request.senderGamertag;
    const otherProfileImageUrl = isSender ? request.receiverProfileImageUrl : request.senderProfileImageUrl;
    const displayName = otherGamertag || otherUserId;
    const avatarUrl = otherProfileImageUrl || undefined;
    
    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`connection-request-card-${request.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setViewProfileUserId(otherUserId)}
              data-testid={`button-view-profile-${request.id}`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {displayName[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground underline-offset-4 hover:underline">
                    {displayName}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isSender ? "Connection request sent" : "Wants to connect"}
                </p>
              </div>
            </div>
            <Badge 
              variant={
                request.status === 'accepted' ? 'default' : 'secondary'
              }
              className="text-xs"
              data-testid={`connection-request-status-${request.id}`}
            >
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>
            </div>
            
            {showActions === 'confirm' && (
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => updateConnectionRequestMutation.mutate({ requestId: request.id, status: 'accepted' })}
                  disabled={updateConnectionRequestMutation.isPending}
                  data-testid={`button-accept-request-${request.id}`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => updateConnectionRequestMutation.mutate({ requestId: request.id, status: 'declined' })}
                  disabled={updateConnectionRequestMutation.isPending}
                  data-testid={`button-decline-request-${request.id}`}
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
            
            {showActions === 'waiting' && (
              <div className="flex gap-2 items-center">
                <Badge variant="secondary" className="text-xs">
                  Waiting for response
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => deleteConnectionRequestMutation.mutate(request.id)}
                  disabled={deleteConnectionRequestMutation.isPending}
                  data-testid={`button-delete-request-${request.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setViewProfileUserId(otherUserId)}
              data-testid={`button-view-profile-${connection.id}`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {displayName[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground underline-offset-4 hover:underline">
                    {displayName}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isRequester ? "Applied to your match" : "You applied to their match"}
                </p>
              </div>
            </div>
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
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                <span>Match ID: {connection.requestId.slice(-6)}</span>
              </div>
            </div>
            
            {showActions === 'confirm' && (
              <div className="flex gap-2">
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
              <div className="flex gap-2 items-center">
                <Badge variant="secondary" className="text-xs">
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
                <div className="flex gap-2 items-center">
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
                        currentUserId={currentUserId || ""}
                        otherUserId={otherUserId}
                        otherUserName={displayName}
                      />
                    </TabsContent>
                    <TabsContent value="voice" className="p-4">
                      <VoiceChannel
                        connectionId={connection.id}
                        currentUserId={currentUserId || ""}
                        otherUserId={otherUserId}
                        otherUserName={displayName}
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

  if (connections.length === 0 && connectionRequests.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Connections</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              0 connections
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="button-refresh-connections"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            When you apply to matches or others apply to yours, your gaming connections will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Connections</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {connections.length + acceptedConnectionRequests.length} total
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh-connections"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Filter Section - Show at top if any pending requests */}
        {(incomingApplications.length > 0 || incomingConnectionRequests.length > 0) && (
          <div className="flex items-center justify-end gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-toggle-request-filters">
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
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="connection">Connection Requests</SelectItem>
                        <SelectItem value="1v1">1v1 Match Requests</SelectItem>
                        <SelectItem value="2v2">2v2 Match Requests</SelectItem>
                        <SelectItem value="3v3">3v3 Match Requests</SelectItem>
                        <SelectItem value="squad">Team/Squad Finder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Incoming Connection Requests Section */}
        {incomingConnectionRequests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Incoming Connection Requests
              </h2>
              <Badge variant="default" className="text-xs">
                {incomingConnectionRequests.length} pending
              </Badge>
            </div>
            <div className="space-y-3">
              {incomingConnectionRequests.map((request) => 
                renderConnectionRequestCard(request, 'confirm', false)
              )}
            </div>
          </div>
        )}

        {/* Incoming Applications Section */}
        {incomingApplications.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Incoming Match Applications
              </h2>
              <Badge variant="default" className="text-xs">
                {incomingApplications.length} pending
              </Badge>
            </div>
            <div className="space-y-3">
              {incomingApplications.map((connection) => 
                renderConnectionCard(connection, 'confirm', false)
              )}
            </div>
          </div>
        )}

        {/* Your Connections Section */}
        {acceptedConnections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Your Connections
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

        {/* Accepted Direct Connections Section */}
        {acceptedConnectionRequests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Direct Connections
              </h2>
              <Badge variant="default" className="text-xs">
                {acceptedConnectionRequests.length} active
              </Badge>
            </div>
            <div className="space-y-3">
              {acceptedConnectionRequests.map((request) => 
                renderConnectionRequestCard(request, 'chat', request.senderId === currentUserId)
              )}
            </div>
          </div>
        )}

        {/* Your Applications Section */}
        {yourApplications.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Your Match Applications
              </h2>
              <Badge variant="secondary" className="text-xs">
                {yourApplications.length} pending
              </Badge>
            </div>
            <div className="space-y-3">
              {yourApplications.map((connection) => 
                renderConnectionCard(connection, 'waiting', true)
              )}
            </div>
          </div>
        )}

        {/* Outgoing Connection Requests Section */}
        {outgoingConnectionRequests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Connection Requests
              </h2>
              <Badge variant="secondary" className="text-xs">
                {outgoingConnectionRequests.length} pending
              </Badge>
            </div>
            <div className="space-y-3">
              {outgoingConnectionRequests.map((request) => 
                renderConnectionRequestCard(request, 'waiting', true)
              )}
            </div>
          </div>
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
    </div>
  );
}
