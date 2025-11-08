import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Calendar, User, Gamepad2, Edit, MessageCircle, Trophy, Clock, Star, Award, Play, Plus, Camera, Loader2 } from "lucide-react";
import type { GameProfile } from "@shared/schema";
import { GameProfileForm } from "./GameProfileForm";
import { CustomPortfolio } from "./CustomPortfolio";
import { Mutuals } from "./Mutuals";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLayout } from "@/contexts/LayoutContext";
import { useLocation } from "wouter";

interface UserProfileProps {
  id: string;
  gamertag: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  age?: number;
  preferredGames?: string[];
  isOwn?: boolean;
  currentUserId?: string;
  onEdit?: () => void;
  onMessage?: () => void;
  onAddGame?: () => void;
}

export function UserProfile({
  id,
  gamertag,
  firstName,
  lastName,
  profileImageUrl,
  bio,
  location,
  latitude,
  longitude,
  age,
  preferredGames = [],
  isOwn = false,
  currentUserId,
  onEdit,
  onMessage,
  onAddGame,
}: UserProfileProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : gamertag;
  const initials = firstName && lastName 
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : gamertag.slice(0, 2).toUpperCase();

  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [gameProfileFormOpen, setGameProfileFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<GameProfile | undefined>(undefined);
  const [showCustomSections, setShowCustomSections] = useState<{[key: string]: boolean}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { getContainerClass } = useLayout();
  const [, setLocation] = useLocation();

  // Check if users are connected (only if not viewing own profile)
  const { data: connectionRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/connection-requests'],
    enabled: !isOwn && !!currentUserId,
    retry: false,
  });

  const isConnected = !isOwn && connectionRequests.some((req: any) => 
    req.status === 'accepted' && 
    ((req.senderId === currentUserId && req.receiverId === id) ||
     (req.receiverId === currentUserId && req.senderId === id))
  );

  const { data: gameProfiles = [], isLoading: isLoadingProfiles, refetch } = useQuery<GameProfile[]>({
    queryKey: ['/api/users', id, 'game-profiles'],
    enabled: !!id,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(getApiUrl('/api/upload-photo'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      return response.json();
    },
    onSuccess: async (data: { url: string }) => {
      // Update user profile with new photo URL
      await apiRequest('PATCH', '/api/user/profile', { profileImageUrl: data.url });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', id] });
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only image files (JPEG, PNG, GIF, WebP) are allowed",
          variant: "destructive",
        });
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleAddGame = () => {
    setEditingProfile(undefined);
    setGameProfileFormOpen(true);
  };

  const handleEditProfile = (profile: GameProfile) => {
    setEditingProfile(profile);
    setGameProfileFormOpen(true);
  };

  const toggleCustomSections = (profileId: string) => {
    setShowCustomSections(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  const handleMessage = () => {
    if (onMessage) {
      onMessage();
    } else {
      setLocation('/messages');
    }
  };

  return (
    <div className={`w-full ${getContainerClass()} mx-auto space-y-6`}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={profileImageUrl} alt={gamertag} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOwn && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadPhotoMutation.isPending}
                    data-testid="button-upload-photo"
                  >
                    {uploadPhotoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    data-testid="input-photo-file"
                  />
                </>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid={`text-display-name-${id}`}>
                  {displayName}
                </h1>
                {firstName && lastName && (
                  <p className="text-lg text-muted-foreground" data-testid={`text-gamertag-${id}`}>
                    @{gamertag}
                  </p>
                )}
              </div>

              {bio && (
                <p className="text-sm text-muted-foreground max-w-2xl" data-testid={`text-bio-${id}`}>
                  {bio}
                </p>
              )}

              <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start text-sm text-muted-foreground">
                {location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span data-testid={`text-location-${id}`}>{location}</span>
                  </div>
                )}
                {age && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span data-testid={`text-age-${id}`}>{age} years old</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {isOwn ? (
                  <>
                    <Button size="sm" variant="outline" onClick={onEdit} data-testid="button-edit-profile">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button size="sm" onClick={handleAddGame} data-testid="button-add-game-profile">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Game
                    </Button>
                  </>
                ) : isConnected ? (
                  <Button size="sm" onClick={handleMessage} data-testid="button-message-user">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                ) : null}
              </div>
              <CustomPortfolio userId={id} isOwn={isOwn} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Mutuals userId={id} isOwn={isOwn} />

      {isLoadingProfiles ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading game profiles...</p>
          </CardContent>
        </Card>
      ) : gameProfiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Gamepad2 className="h-16 w-16 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No game profiles yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isOwn 
                  ? "Start building your gaming portfolio by adding your first game profile!" 
                  : `${displayName} hasn't added any game profiles yet.`}
              </p>
            </div>
            {isOwn && (
              <Button onClick={handleAddGame} data-testid="button-add-first-game">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Game
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              Gaming Profiles ({gameProfiles.length})
            </h2>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {gameProfiles.map((profile) => (
                <AccordionItem key={profile.id} value={profile.id}>
                  <div className="flex items-center justify-between gap-4 px-1">
                    <AccordionTrigger className="hover:no-underline flex-1">
                      <div className="flex items-center gap-3">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">{profile.gameName}</span>
                        {profile.currentRank && (
                          <Badge variant="outline" className="ml-2">
                            {profile.currentRank}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    {isOwn && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditProfile(profile)}
                        className="flex-shrink-0"
                        data-testid={`button-edit-game-${profile.gameName.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit {profile.gameName} Profile
                      </Button>
                    )}
                  </div>
                  <AccordionContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.currentRank && (
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-primary">
                            <Star className="h-5 w-5" />
                            <span className="text-sm font-semibold">Current Rank</span>
                          </div>
                          <p className="text-2xl font-bold" data-testid={`text-current-rank-${profile.id}`}>
                            {profile.currentRank}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {profile.highestRank && (
                      <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <Trophy className="h-5 w-5" />
                            <span className="text-sm font-semibold">Highest Rank</span>
                          </div>
                          <p className="text-2xl font-bold" data-testid={`text-highest-rank-${profile.id}`}>
                            {profile.highestRank}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {profile.hoursPlayed !== null && profile.hoursPlayed !== undefined && (
                      <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm font-semibold">Hours Played</span>
                          </div>
                          <p className="text-2xl font-bold" data-testid={`text-hours-played-${profile.id}`}>
                            {profile.hoursPlayed.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {(() => {
                    const achievementDetails = Array.isArray(profile.achievementDetails) 
                      ? profile.achievementDetails as Array<{title: string; photoUrl?: string; link?: string}> 
                      : [];
                    return achievementDetails.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          Esport Achievements
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {achievementDetails.map((achievement, index) => (
                            <Card key={index} className="bg-purple-500/5 border-purple-500/20 overflow-hidden">
                              {achievement.photoUrl && (
                                <div className="aspect-video bg-muted relative">
                                  <img 
                                    src={achievement.photoUrl} 
                                    alt={achievement.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <CardContent className="p-4 space-y-2">
                                <p className="font-semibold" data-testid={`text-achievement-title-${profile.id}-${index}`}>
                                  {achievement.title}
                                </p>
                                {achievement.link && (
                                  <a 
                                    href={achievement.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    View Details →
                                  </a>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const clipUrls = Array.isArray(profile.clipUrls) 
                      ? profile.clipUrls as Array<{title: string; link: string}> 
                      : [];
                    return clipUrls.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Play className="h-5 w-5 text-red-600 dark:text-red-400" />
                          Best Clips & Highlights
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {clipUrls.map((clip, index) => (
                            <Dialog key={index}>
                              <DialogTrigger asChild>
                                <Card 
                                  className="cursor-pointer hover:bg-accent/50 transition-colors bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20"
                                  data-testid={`card-clip-${profile.id}-${index}`}
                                >
                                  <CardContent className="p-4 flex items-center gap-3">
                                    <Play className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                                    <div className="text-left flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate">{clip.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{clip.link}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>{clip.title}</DialogTitle>
                                </DialogHeader>
                                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                                  {clip.link.includes('youtube.com') || clip.link.includes('youtu.be') ? (
                                    <iframe
                                      src={clip.link.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                      className="w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  ) : clip.link.includes('twitch.tv') ? (
                                    <iframe
                                      src={clip.link.replace('twitch.tv/', 'player.twitch.tv/?video=').replace('clips/', 'player.twitch.tv/?clip=')}
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <a 
                                        href={clip.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        Open Clip in New Tab
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {profile.statsPhotoUrl && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Stats Screenshot
                        {profile.statsPhotoDate && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({profile.statsPhotoDate})
                          </span>
                        )}
                      </h3>
                      <Card className="overflow-hidden">
                        <img 
                          src={profile.statsPhotoUrl} 
                          alt="Stats screenshot"
                          className="w-full h-auto"
                        />
                      </Card>
                    </div>
                  )}

                  {(() => {
                    const customSections = Array.isArray(profile.customSections) 
                      ? profile.customSections as Array<{heading: string; fields: Array<{label: string; value: string}>}> 
                      : [];
                    if (customSections.length === 0) return null;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Star className="h-5 w-5 text-primary" />
                            Custom Additions
                          </h3>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-toggle-custom-${profile.id}`}
                              >
                                Check Out More
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Custom Additions - {profile.gameName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                {customSections.map((section, sectionIndex) => (
                                  <div key={sectionIndex} className="space-y-3">
                                    <h4 className="text-base font-semibold text-primary">{section.heading}</h4>
                                    <Card className="bg-muted/30">
                                      <CardContent className="p-4">
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {section.fields.map((field, fieldIndex) => (
                                            <div key={fieldIndex} className="space-y-1">
                                              <dt className="text-sm text-muted-foreground">
                                                {field.label}
                                              </dt>
                                              <dd className="text-sm font-semibold" data-testid={`text-custom-${profile.id}-${sectionIndex}-${fieldIndex}`}>
                                                {field.value}
                                              </dd>
                                            </div>
                                          ))}
                                        </dl>
                                      </CardContent>
                                    </Card>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    );
                  })()}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <GameProfileForm
        open={gameProfileFormOpen}
        onOpenChange={setGameProfileFormOpen}
        userId={id}
        profile={editingProfile}
        onSuccess={() => {
          setGameProfileFormOpen(false);
          setEditingProfile(undefined);
        }}
      />
    </div>
  );
}
