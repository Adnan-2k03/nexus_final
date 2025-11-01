import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { MessageCircle, Phone, RefreshCw, Search, UserPlus, ChevronDown, ChevronUp, CheckCircle, X, UserMinus } from "lucide-react";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ConnectionRequestWithUser, User } from "@shared/schema";
import { Chat } from "./Chat";
import { VoiceChannel } from "./VoiceChannel";
import { useLayout } from "@/contexts/LayoutContext";

interface MessagesProps {
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

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function Messages({ currentUserId }: MessagesProps) {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRequestWithUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRequestsOpen, setPendingRequestsOpen] = useState(true);
  const { toast } = useToast();
  const { isUserOnline, isUserInVoice } = useOnlineStatus();
  const { getContainerClass } = useLayout();

  if (!currentUserId) {
    return <div className="p-4 text-center text-muted-foreground">Loading user data...</div>;
  }

  const { data: connectionRequests = [], isLoading: isLoadingRequests, refetch } = useQuery<ConnectionRequestWithUser[]>({
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

  // Fetch user data for all connected users
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    retry: false,
  });

  // Helper function to get user data
  const getUserData = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  // Mutation to accept connection request
  const acceptConnectionMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('PATCH', `/api/connection-requests/${requestId}/status`, { status: 'accepted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Connection Accepted",
        description: "You can now chat with this player",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept connection request",
        variant: "destructive",
      });
    },
  });

  // Mutation to decline connection request
  const declineConnectionMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('PATCH', `/api/connection-requests/${requestId}/status`, { status: 'declined' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      toast({
        title: "Connection Declined",
        description: "The connection request has been declined",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to decline connection request",
        variant: "destructive",
      });
    },
  });

  // Mutation to disconnect (delete) connection
  const disconnectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('DELETE', `/api/connection-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/connections'] });
      setSelectedConnection(null); // Close the dialog
      toast({
        title: "Connection Removed",
        description: "You have disconnected from this player",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive",
      });
    },
  });

  // Filter pending and accepted direct connections
  const pendingReceivedRequests = connectionRequests.filter(
    r => r.status === 'pending' && r.receiverId === currentUserId
  );
  const pendingSentRequests = connectionRequests.filter(
    r => r.status === 'pending' && r.senderId === currentUserId
  );
  const acceptedDirectConnections = connectionRequests.filter(r => r.status === 'accepted');

  // Apply search filter
  const filterBySearch = (request: ConnectionRequestWithUser) => {
    if (!searchTerm.trim()) return true;
    
    const isSender = request.senderId === currentUserId;
    const otherUserId = isSender ? request.receiverId : request.senderId;
    const otherUser = getUserData(otherUserId);
    const displayName = (otherUser?.gamertag || otherUser?.firstName || otherUserId).toLowerCase();
    return displayName.includes(searchTerm.toLowerCase());
  };

  const filteredConnections = acceptedDirectConnections.filter(filterBySearch);

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-9">Chat with your connections and teammates</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {filteredConnections.length} conversation{filteredConnections.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingRequests}
            data-testid="button-refresh-messages"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 overflow-x-auto whitespace-nowrap border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{
              textOverflow: 'clip',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            data-testid="input-search-messages"
          />
        </div>
      </div>

      {isLoadingRequests ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Active Conversations */}
          {filteredConnections.length === 0 && pendingReceivedRequests.length === 0 && pendingSentRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Connect with other players through the Discover tab to start chatting here.
                </p>
              </CardContent>
            </Card>
          ) : filteredConnections.length > 0 ? (
            <div className="space-y-3">
              {filteredConnections.map((request) => {
            const isSender = request.senderId === currentUserId;
            const otherUserId = isSender ? request.receiverId : request.senderId;
            const otherUser = getUserData(otherUserId);
            const displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
            const avatarUrl = otherUser?.profileImageUrl || undefined;
            const timeAgo = formatTimeAgo(request.updatedAt);

            return (
              <Card
                key={request.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConnection(request)}
                data-testid={`conversation-${request.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div onClick={(e) => e.stopPropagation()} className="relative">
                      <ProfileDialog 
                        userId={otherUserId} 
                        gamertag={displayName} 
                        profileImageUrl={avatarUrl}
                        connectionId={request.id}
                        currentUserId={currentUserId}
                      />
                      {isUserOnline(otherUserId) && (
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background"
                          data-testid={`online-indicator-${otherUserId}`}
                        />
                      )}
                      {isUserInVoice(otherUserId) && (
                        <div 
                          className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full border-2 border-background flex items-center justify-center"
                          data-testid={`voice-indicator-${otherUserId}`}
                        >
                          <Phone className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {displayName}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {isUserInVoice(otherUserId) ? "Waiting in voice channel" : "Click to chat or join voice"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          ) : null}

          {/* Pending Connection Requests Folder */}
          {(pendingReceivedRequests.length > 0 || pendingSentRequests.length > 0) && (
            <Collapsible open={pendingRequestsOpen} onOpenChange={setPendingRequestsOpen}>
              <Card className="p-4 bg-muted/30">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full flex items-center justify-between p-2 hover:bg-accent"
                    data-testid="button-toggle-pending-requests"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Connection Requests</h2>
                      <Badge variant="default" className="text-xs">
                        {pendingReceivedRequests.length + pendingSentRequests.length} pending
                      </Badge>
                    </div>
                    {pendingRequestsOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-4">
                  {/* Received Requests */}
                  {pendingReceivedRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground px-2">
                        Incoming ({pendingReceivedRequests.length})
                      </h3>
                      {pendingReceivedRequests.map((request) => {
                        const otherUserId = request.senderId;
                        const otherUser = getUserData(otherUserId);
                        const displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
                        const avatarUrl = otherUser?.profileImageUrl || undefined;
                        const timeAgo = formatTimeAgo(request.createdAt);

                        return (
                          <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`connection-request-${request.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <ProfileDialog 
                                  userId={otherUserId} 
                                  gamertag={displayName} 
                                  profileImageUrl={avatarUrl}
                                  currentUserId={currentUserId}
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground truncate">
                                    {displayName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Wants to connect • {timeAgo}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="gap-1"
                                    onClick={() => acceptConnectionMutation.mutate(request.id)}
                                    disabled={acceptConnectionMutation.isPending || declineConnectionMutation.isPending}
                                    data-testid={`button-accept-${request.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1"
                                    onClick={() => declineConnectionMutation.mutate(request.id)}
                                    disabled={acceptConnectionMutation.isPending || declineConnectionMutation.isPending}
                                    data-testid={`button-decline-${request.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Sent Requests */}
                  {pendingSentRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground px-2">
                        Sent ({pendingSentRequests.length})
                      </h3>
                      {pendingSentRequests.map((request) => {
                        const otherUserId = request.receiverId;
                        const otherUser = getUserData(otherUserId);
                        const displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
                        const avatarUrl = otherUser?.profileImageUrl || undefined;
                        const timeAgo = formatTimeAgo(request.createdAt);

                        return (
                          <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`connection-sent-${request.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <ProfileDialog 
                                  userId={otherUserId} 
                                  gamertag={displayName} 
                                  profileImageUrl={avatarUrl}
                                  currentUserId={currentUserId}
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground truncate">
                                    {displayName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Request sent • {timeAgo}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  Pending
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      )}

      {/* Conversation Dialog */}
      <Dialog open={!!selectedConnection} onOpenChange={(open) => !open && setSelectedConnection(null)}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
          {selectedConnection && (() => {
            const isSender = selectedConnection.senderId === currentUserId;
            const otherUserId = isSender ? selectedConnection.receiverId : selectedConnection.senderId;
            const otherUser = getUserData(otherUserId);
            const displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;

            return (
              <>
                <DialogHeader className="p-4 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <DialogTitle>
                      Chat with {displayName}
                    </DialogTitle>
                  </div>
                  <div className="pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid="button-disconnect"
                        >
                          <UserMinus className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect from {displayName}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove your connection with {displayName}. Your chat history will be lost, and you'll need to send a new connection request to reconnect.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-disconnect">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => disconnectMutation.mutate(selectedConnection.id)}
                            disabled={disconnectMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                            data-testid="button-confirm-disconnect"
                          >
                            {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
                      connectionId={selectedConnection.id}
                      currentUserId={currentUserId}
                      otherUserId={otherUserId}
                      otherUserName={displayName}
                    />
                  </TabsContent>
                  <TabsContent value="voice" className="p-4">
                    <VoiceChannel
                      connectionId={selectedConnection.id}
                      currentUserId={currentUserId}
                      otherUserId={otherUserId}
                      otherUserName={displayName}
                    />
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
