import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MessageCircle, Users, Phone, RefreshCw, Filter, Search } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { MatchConnectionWithUser, ConnectionRequestWithUser, ChatMessageWithSender, User } from "@shared/schema";
import { Chat } from "./Chat";
import { VoiceChannel } from "./VoiceChannel";

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

type ConversationType = 
  | { type: 'match'; data: MatchConnectionWithUser }
  | { type: 'direct'; data: ConnectionRequestWithUser };

export function Messages({ currentUserId }: MessagesProps) {
  const [selectedConversation, setSelectedConversation] = useState<ConversationType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  if (!currentUserId) {
    return <div className="p-4 text-center text-muted-foreground">Loading user data...</div>;
  }

  const { data: connections = [], isLoading: isLoadingConnections, refetch: refetchConnections } = useQuery<MatchConnectionWithUser[]>({
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
    refetchConnections();
    refetchRequests();
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  // Filter only accepted connections and requests
  const acceptedMatchConnections = connections.filter(c => c.status === 'accepted');
  const acceptedDirectConnections = connectionRequests.filter(r => r.status === 'accepted');

  // Create unified list of conversations
  const allConversations: ConversationType[] = [
    ...acceptedMatchConnections.map(conn => ({ type: 'match' as const, data: conn })),
    ...acceptedDirectConnections.map(req => ({ type: 'direct' as const, data: req }))
  ];

  // Apply filters
  const filterByType = (conversation: ConversationType) => {
    if (requestTypeFilter === 'all') return true;
    if (conversation.type === 'direct') return requestTypeFilter === 'direct';
    return conversation.data.gameMode === requestTypeFilter;
  };

  const filterBySearch = (conversation: ConversationType) => {
    if (!searchTerm.trim()) return true;
    
    if (conversation.type === 'match') {
      const connection = conversation.data;
      const isRequester = connection.requesterId === currentUserId;
      const otherUserId = isRequester ? connection.accepterId : connection.requesterId;
      const otherUser = getUserData(otherUserId);
      const displayName = (otherUser?.gamertag || otherUser?.firstName || otherUserId).toLowerCase();
      return displayName.includes(searchTerm.toLowerCase());
    } else {
      const request = conversation.data;
      const isSender = request.senderId === currentUserId;
      const otherUserId = isSender ? request.receiverId : request.senderId;
      const otherUser = getUserData(otherUserId);
      const displayName = (otherUser?.gamertag || otherUser?.firstName || otherUserId).toLowerCase();
      return displayName.includes(searchTerm.toLowerCase());
    }
  };

  const filteredConversations = allConversations
    .filter(filterByType)
    .filter(filterBySearch);

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
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingConnections || isLoadingRequests}
              data-testid="button-refresh-messages"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingConnections || isLoadingRequests) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-messages"
            />
          </div>
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-toggle-message-filters">
                <Filter className="h-4 w-4 mr-1" />
                Filter {requestTypeFilter !== 'all' && `(${requestTypeFilter})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" data-testid="popover-message-filters">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">Filter Conversations</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Connection Type</label>
                  <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                    <SelectTrigger data-testid="select-message-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Connections</SelectItem>
                      <SelectItem value="direct">Direct Connections</SelectItem>
                      <SelectItem value="1v1">1v1 Matches</SelectItem>
                      <SelectItem value="2v2">2v2 Matches</SelectItem>
                      <SelectItem value="3v3">3v3 Matches</SelectItem>
                      <SelectItem value="squad">Team/Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(isLoadingConnections || isLoadingRequests) ? (
        <LoadingSkeleton />
      ) : filteredConversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect with other players through the Discover tab to start chatting here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => {
            let otherUserId: string;
            let displayName: string;
            let avatarUrl: string | undefined;
            let timeAgo: string;
            let conversationId: string;

            if (conversation.type === 'match') {
              const connection = conversation.data;
              const isRequester = connection.requesterId === currentUserId;
              otherUserId = isRequester ? connection.accepterId : connection.requesterId;
              const otherUser = getUserData(otherUserId);
              displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
              avatarUrl = otherUser?.profileImageUrl || undefined;
              timeAgo = formatTimeAgo(connection.updatedAt);
              conversationId = connection.id;
            } else {
              const request = conversation.data;
              const isSender = request.senderId === currentUserId;
              otherUserId = isSender ? request.receiverId : request.senderId;
              const otherUser = getUserData(otherUserId);
              displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
              avatarUrl = otherUser?.profileImageUrl || undefined;
              timeAgo = formatTimeAgo(request.updatedAt);
              conversationId = request.id;
            }

            return (
              <Card
                key={conversationId}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConversation(conversation)}
                data-testid={`conversation-${conversationId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {displayName[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
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
                        {conversation.type === 'direct' ? 'Direct Connection' : 'Match Connection'} • Click to chat or join voice
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
      )}

      {/* Conversation Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
          {selectedConversation && (() => {
            let otherUserId: string;
            let displayName: string;
            let conversationId: string;

            if (selectedConversation.type === 'match') {
              const connection = selectedConversation.data;
              const isRequester = connection.requesterId === currentUserId;
              otherUserId = isRequester ? connection.accepterId : connection.requesterId;
              const otherUser = getUserData(otherUserId);
              displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
              conversationId = connection.id;
            } else {
              const request = selectedConversation.data;
              const isSender = request.senderId === currentUserId;
              otherUserId = isSender ? request.receiverId : request.senderId;
              const otherUser = getUserData(otherUserId);
              displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
              conversationId = request.id;
            }

            return (
              <>
                <DialogHeader className="p-4 pb-3 border-b">
                  <DialogTitle>
                    Chat with {displayName}
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
                      connectionId={conversationId}
                      currentUserId={currentUserId}
                      otherUserId={otherUserId}
                      otherUserName={displayName}
                    />
                  </TabsContent>
                  <TabsContent value="voice" className="p-4">
                    <VoiceChannel
                      connectionId={conversationId}
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
