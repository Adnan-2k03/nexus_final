import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { Plus, X, Trophy, Star, Award, Play, Trash2, Upload } from "lucide-react";
import type { GameProfile } from "@shared/schema";
import { insertGameProfileSchema } from "@shared/schema";

const popularGames = [
  "Valorant", "League of Legends", "CS2", "Apex Legends", "Rocket League",
  "Overwatch 2", "Dota 2", "Fortnite", "Call of Duty", "FIFA 24",
  "BGMI", "Indus", "Scarfall", "PUBG", "Free Fire", "Minecraft",
  "GTA V", "Rainbow Six Siege", "Destiny 2", "Warzone"
].sort();

const gameProfileFormSchema = z.object({
  gameName: z.string().min(1, "Game name is required"),
  currentRank: z.string().min(1, "Current rank is required"),
  highestRank: z.string().min(1, "Highest rank is required"),
  hoursPlayed: z.number().min(0, "Hours played must be 0 or more").max(100000),
  achievementDetails: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    photoUrl: z.string().optional(),
    link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  })).min(1, "At least 1 achievement is required").max(3, "Maximum 3 achievements allowed"),
  clipUrls: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    link: z.string().url("Must be a valid URL").min(1, "Link is required"),
  })).min(1, "At least 1 clip is required").max(3, "Maximum 3 clips allowed"),
  statsPhotoUrl: z.string().optional(),
  statsPhotoDate: z.string().min(1, "Stats date is required"),
  customSections: z.array(z.object({
    heading: z.string().min(1, "Heading is required"),
    fields: z.array(z.object({
      type: z.enum(["text", "photo", "link"]).default("text"),
      label: z.string().min(1, "Label is required"),
      value: z.string().min(1, "Value is required"),
    })),
  })).optional(),
});

type GameProfileFormValues = z.infer<typeof gameProfileFormSchema>;

interface GameProfileFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profile?: GameProfile;
  onSuccess?: () => void;
}

export function GameProfileForm({
  open,
  onOpenChange,
  userId,
  profile,
  onSuccess,
}: GameProfileFormProps) {
  const { toast } = useToast();
  const isEditing = !!profile;
  const [activeTab, setActiveTab] = useState("default");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const clipsData = profile?.clipUrls && Array.isArray(profile.clipUrls)
    ? profile.clipUrls as Array<{title: string; link: string}>
    : [];

  const achievementsData = profile?.achievementDetails && Array.isArray(profile.achievementDetails)
    ? (profile.achievementDetails as Array<{title: string; photoUrl?: string; link?: string}>).slice(0, 3)
    : [];

  const customSectionsData = profile?.customSections && Array.isArray(profile.customSections)
    ? profile.customSections as Array<{heading: string; fields: Array<{label: string; value: string}>}>
    : [];

  const form = useForm<GameProfileFormValues>({
    resolver: zodResolver(gameProfileFormSchema),
    defaultValues: {
      gameName: profile?.gameName || "",
      currentRank: profile?.currentRank || "",
      highestRank: profile?.highestRank || "",
      hoursPlayed: profile?.hoursPlayed || 0,
      achievementDetails: achievementsData.length > 0 ? achievementsData : [{ title: "", photoUrl: "", link: "" }],
      clipUrls: clipsData.length > 0 ? clipsData : [{ title: "", link: "" }],
      statsPhotoUrl: profile?.statsPhotoUrl || "",
      statsPhotoDate: profile?.statsPhotoDate || "",
      customSections: customSectionsData,
    },
  });

  const { fields: achievementDetailFields, append: appendAchievementDetail, remove: removeAchievementDetail } = useFieldArray({
    control: form.control as any,
    name: "achievementDetails",
  });

  const { fields: clipFields, append: appendClip, remove: removeClip } = useFieldArray({
    control: form.control as any,
    name: "clipUrls",
  });

  const { fields: customSectionFields, append: appendCustomSection, remove: removeCustomSection } = useFieldArray({
    control: form.control as any,
    name: "customSections",
  });

  useEffect(() => {
    if (open) {
      const newClipsData = profile?.clipUrls && Array.isArray(profile.clipUrls)
        ? profile.clipUrls as Array<{title: string; link: string}>
        : [];

      const newAchievementsData = profile?.achievementDetails && Array.isArray(profile.achievementDetails)
        ? (profile.achievementDetails as Array<{title: string; photoUrl?: string; link?: string}>).slice(0, 3)
        : [];

      const newCustomSectionsData = profile?.customSections && Array.isArray(profile.customSections)
        ? profile.customSections as Array<{heading: string; fields: Array<{label: string; value: string}>}>
        : [];
      
      form.reset({
        gameName: profile?.gameName || "",
        currentRank: profile?.currentRank || "",
        highestRank: profile?.highestRank || "",
        hoursPlayed: profile?.hoursPlayed || 0,
        achievementDetails: newAchievementsData.length > 0 ? newAchievementsData : [{ title: "", photoUrl: "", link: "" }],
        clipUrls: newClipsData.length > 0 ? newClipsData : [{ title: "", link: "" }],
        statsPhotoUrl: profile?.statsPhotoUrl || "",
        statsPhotoDate: profile?.statsPhotoDate || "",
        customSections: newCustomSectionsData.map(section => ({
          ...section,
          fields: section.fields.map((field: any) => ({
            ...field,
            type: field.type || "text"
          }))
        })),
      });
    }
  }, [open, profile, form]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiUrl('/api/upload-photo'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      form.setValue(fieldName as any, data.url);
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAchievementPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiUrl('/api/upload-photo'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      form.setValue(`achievementDetails.${index}.photoUrl` as any, data.url);
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/game-profiles', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'game-profiles'] });
      toast({
        title: "Success",
        description: "Game profile created successfully!",
      });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create game profile",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PATCH', `/api/game-profiles/${profile!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'game-profiles'] });
      toast({
        title: "Success",
        description: "Game profile updated successfully!",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update game profile",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/game-profiles/${profile!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'game-profiles'] });
      toast({
        title: "Success",
        description: "Game profile deleted successfully!",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete game profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GameProfileFormValues) => {
    const { customSections, achievementDetails, ...rest } = data;
    
    const filteredAchievementDetails = achievementDetails?.filter(a => a.title.trim());
    const filteredClips = data.clipUrls?.filter(c => c.title.trim() && c.link.trim());
    const filteredCustomSections = customSections?.filter(s => s.heading.trim() && s.fields.length > 0);
    
    const payload = {
      ...rest,
      achievementDetails: filteredAchievementDetails,
      clipUrls: filteredClips,
      customSections: filteredCustomSections?.length ? filteredCustomSections : undefined,
      statsPhotoUrl: rest.statsPhotoUrl?.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-game-profile">
            {isEditing ? "Edit Game Profile" : "Add Game Profile"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your gaming achievements and stats" 
              : "Showcase your skills and achievements for this game"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="default" data-testid="tab-default-portfolio">Default Portfolio</TabsTrigger>
            <TabsTrigger value="custom" data-testid="tab-custom-portfolio">Add more...</TabsTrigger>
          </TabsList>

          <TabsContent value="default" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Accordion type="multiple" defaultValue={["game-info", "performance", "achievements", "clips"]} className="w-full">
                  <AccordionItem value="game-info">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Game Information</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                    <Card className="p-4 bg-muted/50">
                      <FormField
                        control={form.control}
                        name="gameName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Game Name *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={isEditing}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-game-name">
                                  <SelectValue placeholder="Select a game" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {popularGames.map((game) => (
                                  <SelectItem key={game} value={game}>
                                    {game}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {isEditing ? "Game cannot be changed after creation" : "Choose the game for this profile"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Card>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="performance">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-lg font-semibold">Performance Metrics</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                    <Card className="p-4 bg-muted/50">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="currentRank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Rank *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Diamond II" 
                                {...field} 
                                data-testid="input-current-rank"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="highestRank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Highest Rank *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Immortal I" 
                                {...field} 
                                data-testid="input-highest-rank"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="hoursPlayed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Played *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 1500" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                              value={field.value}
                              data-testid="input-hours-played"
                            />
                          </FormControl>
                          <FormDescription>Total hours played in this game</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                        <Separator className="my-4" />

                        <div className="space-y-4">
                          <FormLabel>Stats Screenshot *</FormLabel>
                          <FormDescription>Upload your in-game stats screenshot</FormDescription>
                          
                          <FormField
                            control={form.control}
                            name="statsPhotoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Screenshot</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Input 
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handlePhotoUpload(e, "statsPhotoUrl")}
                                      disabled={uploadingPhoto}
                                      data-testid="input-stats-photo-file"
                                    />
                                    {field.value && (
                                      <div className="text-sm text-muted-foreground">
                                        Current photo: {field.value}
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="statsPhotoDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="block">Stats Date *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    className="w-full block"
                                    data-testid="input-stats-photo-date"
                                  />
                                </FormControl>
                                <FormDescription>When were these stats recorded?</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Card>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="achievements">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold">Achievements (Max 3) *</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormDescription>
                          Add your top 3 tournament wins, rankings, and major accomplishments
                        </FormDescription>
                        {achievementDetailFields.length < 3 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendAchievementDetail({ title: "", photoUrl: "", link: "" })}
                            data-testid="button-add-achievement-detail"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Achievement
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {achievementDetailFields.map((field, index) => (
                          <Card key={field.id} className="p-4 bg-muted/50">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <FormField
                                  control={form.control}
                                  name={`achievementDetails.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel>Achievement Title *</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="e.g., 1st Place in Regional Championship 2024" 
                                          {...field}
                                          data-testid={`input-achievement-detail-title-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAchievementDetail(index)}
                                  className="mt-8"
                                  data-testid={`button-remove-achievement-detail-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <FormField
                                control={form.control}
                                name={`achievementDetails.${index}.photoUrl`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Photo (Optional)</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Input 
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleAchievementPhotoUpload(e, index)}
                                          disabled={uploadingPhoto}
                                          data-testid={`input-achievement-detail-photo-${index}`}
                                        />
                                        {field.value && (
                                          <div className="text-sm text-muted-foreground">
                                            Photo uploaded
                                          </div>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`achievementDetails.${index}.link`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Link (Optional)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="https://tournament.gg/results/2024" 
                                        {...field}
                                        data-testid={`input-achievement-detail-link-${index}`}
                                      />
                                    </FormControl>
                                    <FormDescription>Link to tournament results or proof</FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="clips">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-lg font-semibold">Best Clips & Highlights (Max 3) *</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormDescription>
                          Add your top 3 gameplay clips from YouTube, Twitch, or other platforms
                        </FormDescription>
                        {clipFields.length < 3 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendClip({ title: "", link: "" })}
                            data-testid="button-add-clip"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Clip
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {clipFields.map((field, index) => (
                          <Card key={field.id} className="p-4 bg-muted/50">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <FormField
                                  control={form.control}
                                  name={`clipUrls.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel>Clip Title *</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="e.g., Epic 1v5 Clutch" 
                                          {...field}
                                          data-testid={`input-clip-title-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeClip(index)}
                                  className="mt-8"
                                  data-testid={`button-remove-clip-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <FormField
                                control={form.control}
                                name={`clipUrls.${index}.link`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Link *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="https://youtube.com/watch?v=..." 
                                        {...field}
                                        data-testid={`input-clip-link-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator />

                <div className="flex justify-between items-center">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this game profile?")) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={isPending}
                      data-testid="button-delete-profile"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Profile
                    </Button>
                  )}
                  <div className={`flex gap-2 ${!isEditing ? 'ml-auto' : ''}`}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isPending}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save-profile"
                    >
                      {isPending ? "Saving..." : isEditing ? "Update Profile" : "Create Profile"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Custom Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormDescription>
                      Create custom sections with your own headings and fields. All fields from the default portfolio are still required.
                    </FormDescription>
                    
                    <div className="flex items-center justify-between">
                      <FormLabel>Custom Sections</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendCustomSection({ heading: "", fields: [{ type: "text", label: "", value: "" }] })}
                        data-testid="button-add-custom-section"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {customSectionFields.map((section, sectionIndex) => (
                        <Card key={section.id} className="p-4 bg-muted/50">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-2">
                              <FormField
                                control={form.control}
                                name={`customSections.${sectionIndex}.heading`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Section Heading</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="e.g., Streaming Experience" 
                                        {...field}
                                        data-testid={`input-custom-section-heading-${sectionIndex}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCustomSection(sectionIndex)}
                                className="mt-8"
                                data-testid={`button-remove-custom-section-${sectionIndex}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <CustomSectionFields 
                              form={form} 
                              sectionIndex={sectionIndex}
                              uploadingPhoto={uploadingPhoto}
                              setUploadingPhoto={setUploadingPhoto}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-between items-center">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this game profile?")) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={isPending}
                      data-testid="button-delete-profile-custom"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Profile
                    </Button>
                  )}
                  <div className={`flex gap-2 ${!isEditing ? 'ml-auto' : ''}`}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isPending}
                      data-testid="button-cancel-custom"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save-profile-custom"
                    >
                      {isPending ? "Saving..." : isEditing ? "Update Profile" : "Create Profile"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CustomSectionFields({ form, sectionIndex, uploadingPhoto, setUploadingPhoto }: { form: any; sectionIndex: number; uploadingPhoto: boolean; setUploadingPhoto: (uploading: boolean) => void }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `customSections.${sectionIndex}.fields`,
  });
  const { toast } = useToast();

  const handleFieldPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiUrl('/api/upload-photo'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      form.setValue(`customSections.${sectionIndex}.fields.${fieldIndex}.value`, data.url);
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel>Fields</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ type: "text", label: "", value: "" })}
          data-testid={`button-add-custom-field-${sectionIndex}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>
      
      <div className="space-y-3">
        {fields.map((field: any, fieldIndex) => (
          <div key={field.id} className="flex gap-2 items-start">
            <FormField
              control={form.control}
              name={`customSections.${sectionIndex}.fields.${fieldIndex}.type`}
              render={({ field }) => (
                <FormItem className="w-28">
                  <Select onValueChange={field.onChange} value={field.value || "text"}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-field-type-${sectionIndex}-${fieldIndex}`}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`customSections.${sectionIndex}.fields.${fieldIndex}.label`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input 
                      placeholder="Label (e.g., Platform)" 
                      {...field}
                      data-testid={`input-custom-field-label-${sectionIndex}-${fieldIndex}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`customSections.${sectionIndex}.fields.${fieldIndex}.value`}
              render={({ field: valueField }) => {
                const fieldType = form.watch(`customSections.${sectionIndex}.fields.${fieldIndex}.type`) || "text";
                
                if (fieldType === "photo") {
                  return (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFieldPhotoUpload(e, fieldIndex)}
                            disabled={uploadingPhoto}
                            className="flex-1"
                            data-testid={`input-custom-field-photo-${sectionIndex}-${fieldIndex}`}
                          />
                          {valueField.value && (
                            <img src={valueField.value} alt="Preview" className="h-9 w-9 object-cover rounded" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }
                
                return (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder={fieldType === "link" ? "URL (e.g., https://...)" : "Value (e.g., Twitch)"}
                        {...valueField}
                        data-testid={`input-custom-field-value-${sectionIndex}-${fieldIndex}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(fieldIndex)}
              data-testid={`button-remove-custom-field-${sectionIndex}-${fieldIndex}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
