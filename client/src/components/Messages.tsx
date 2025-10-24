import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Users, Phone, RefreshCw } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { MatchConnection, ChatMessageWithSender, User } from "@shared/schema";
import { Chat } from "./Chat";
import { VoiceChannel } from "./VoiceChannel";

interface MessagesProps {
  currentUserId: string;
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
  const [selectedConnection, setSelectedConnection] = useState<MatchConnection | null>(null);

  const { data: connections = [], isLoading: isLoadingConnections, refetch } = useQuery<MatchConnection[]>({
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
    // Also refresh user data to get updated gamertags
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  // Filter only accepted connections
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {acceptedConnections.length} conversation{acceptedConnections.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingConnections}
            data-testid="button-refresh-messages"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingConnections ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoadingConnections ? (
        <LoadingSkeleton />
      ) : acceptedConnections.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Once you connect with other players, you'll be able to chat with them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {acceptedConnections.map((connection) => {
            const isRequester = connection.requesterId === currentUserId;
            const otherUserId = isRequester ? connection.accepterId : connection.requesterId;
            const otherUser = getUserData(otherUserId);
            const displayName = otherUser?.gamertag || otherUser?.firstName || otherUserId;
            const avatarUrl = otherUser?.profileImageUrl || undefined;
            const timeAgo = formatTimeAgo(connection.updatedAt);

            return (
              <Card
                key={connection.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConnection(connection)}
                data-testid={`conversation-${connection.id}`}
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
                        Click to start chatting or join voice
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
          {selectedConnection && (
            <>
              <DialogHeader className="p-4 pb-3 border-b">
                <DialogTitle>
                  Chat with {(() => {
                    const otherUserId = selectedConnection.requesterId === currentUserId 
                      ? selectedConnection.accepterId 
                      : selectedConnection.requesterId;
                    const otherUser = getUserData(otherUserId);
                    return otherUser?.gamertag || otherUser?.firstName || otherUserId;
                  })()}
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
                    otherUserId={selectedConnection.requesterId === currentUserId 
                      ? selectedConnection.accepterId 
                      : selectedConnection.requesterId}
                    otherUserName={(() => {
                      const otherUserId = selectedConnection.requesterId === currentUserId 
                        ? selectedConnection.accepterId 
                        : selectedConnection.requesterId;
                      const otherUser = getUserData(otherUserId);
                      return otherUser?.gamertag || otherUser?.firstName || otherUserId;
                    })()}
                  />
                </TabsContent>
                <TabsContent value="voice" className="p-4">
                  <VoiceChannel
                    connectionId={selectedConnection.id}
                    currentUserId={currentUserId}
                    otherUserId={selectedConnection.requesterId === currentUserId 
                      ? selectedConnection.accepterId 
                      : selectedConnection.requesterId}
                    otherUserName={(() => {
                      const otherUserId = selectedConnection.requesterId === currentUserId 
                        ? selectedConnection.accepterId 
                        : selectedConnection.requesterId;
                      const otherUser = getUserData(otherUserId);
                      return otherUser?.gamertag || otherUser?.firstName || otherUserId;
                    })()}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
