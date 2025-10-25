import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MessageCircle, Phone, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { ConnectionRequestWithUser, User } from "@shared/schema";
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

export function Messages({ currentUserId }: MessagesProps) {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRequestWithUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter only accepted direct connections
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
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
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
        <div className="relative">
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
      </div>

      {isLoadingRequests ? (
        <LoadingSkeleton />
      ) : filteredConnections.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect with other players through the Discover tab to start chatting here.
          </p>
        </div>
      ) : (
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
                        Click to chat or join voice
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
