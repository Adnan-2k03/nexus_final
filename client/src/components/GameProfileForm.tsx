import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, X, Trophy, Star, Clock, Award, Play, Trash2 } from "lucide-react";
import type { GameProfile } from "@shared/schema";
import { insertGameProfileSchema } from "@shared/schema";

const popularGames = [
  "Valorant", "League of Legends", "CS2", "Apex Legends", "Rocket League",
  "Overwatch 2", "Dota 2", "Fortnite", "Call of Duty", "FIFA 24",
  "BGMI", "Indus", "Scarfall", "PUBG", "Free Fire", "Minecraft",
  "GTA V", "Rainbow Six Siege", "Destiny 2", "Warzone"
].sort();

const gameProfileFormSchema = insertGameProfileSchema.extend({
  gameName: z.string().min(1, "Game name is required"),
  currentRank: z.string().optional(),
  highestRank: z.string().optional(),
  hoursPlayed: z.number().min(0).max(100000).optional().nullable(),
  achievements: z.array(z.string().min(1, "Achievement cannot be empty")).optional(),
  clipUrls: z.array(z.string().url("Must be a valid URL")).optional(),
  statsEntries: z.array(z.object({
    key: z.string().min(1, "Key is required"),
    value: z.string().min(1, "Value is required"),
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

  const statsEntries = profile?.stats && typeof profile.stats === 'object'
    ? Object.entries(profile.stats).map(([key, value]) => ({
        key,
        value: String(value),
      }))
    : [];

  const form = useForm<GameProfileFormValues>({
    resolver: zodResolver(gameProfileFormSchema),
    defaultValues: {
      gameName: profile?.gameName || "",
      currentRank: profile?.currentRank || "",
      highestRank: profile?.highestRank || "",
      hoursPlayed: profile?.hoursPlayed || null,
      achievements: profile?.achievements || [],
      clipUrls: profile?.clipUrls || [],
      statsEntries: statsEntries,
    },
  });

  const { fields: achievementFields, append: appendAchievement, remove: removeAchievement } = useFieldArray({
    control: form.control,
    name: "achievements",
  });

  const { fields: clipFields, append: appendClip, remove: removeClip } = useFieldArray({
    control: form.control,
    name: "clipUrls",
  });

  const { fields: statsFields, append: appendStat, remove: removeStat } = useFieldArray({
    control: form.control,
    name: "statsEntries",
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<GameProfileFormValues, 'statsEntries'> & { stats?: Record<string, any> }) => {
      return await apiRequest('/api/game-profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
    mutationFn: async (data: Omit<GameProfileFormValues, 'statsEntries'> & { stats?: Record<string, any> }) => {
      return await apiRequest(`/api/game-profiles/${profile!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
      return await apiRequest(`/api/game-profiles/${profile!.id}`, {
        method: 'DELETE',
      });
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
    const { statsEntries, ...rest } = data;
    
    const stats = statsEntries?.length
      ? statsEntries.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const payload = {
      ...rest,
      hoursPlayed: rest.hoursPlayed ?? null,
      currentRank: rest.currentRank || null,
      highestRank: rest.highestRank || null,
      achievements: rest.achievements?.filter(a => a.trim()) || null,
      clipUrls: rest.clipUrls?.filter(c => c.trim()) || null,
      stats: stats && Object.keys(stats).length > 0 ? stats : null,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Game Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gameName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Name</FormLabel>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currentRank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Rank</FormLabel>
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
                        <FormLabel>Highest Rank</FormLabel>
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
                      <FormLabel>Hours Played</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 1500" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          value={field.value ?? ""}
                          data-testid="input-hours-played"
                        />
                      </FormControl>
                      <FormDescription>Total hours played in this game</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Achievements & Esports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Achievements</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendAchievement("")}
                      data-testid="button-add-achievement"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Achievement
                    </Button>
                  </div>
                  <FormDescription>
                    Add your tournament wins, rankings, and major accomplishments
                  </FormDescription>
                  <div className="space-y-2">
                    {achievementFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`achievements.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 1st Place in Regional Championship 2024" 
                                  {...field}
                                  data-testid={`input-achievement-${index}`}
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
                          onClick={() => removeAchievement(index)}
                          data-testid={`button-remove-achievement-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Best Clips & Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Clip URLs</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendClip("")}
                      data-testid="button-add-clip"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Clip
                    </Button>
                  </div>
                  <FormDescription>
                    YouTube, Twitch, or other video platform links
                  </FormDescription>
                  <div className="space-y-2">
                    {clipFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`clipUrls.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="https://youtube.com/..." 
                                  {...field}
                                  data-testid={`input-clip-url-${index}`}
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
                          data-testid={`button-remove-clip-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Additional Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Custom Stats</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendStat({ key: "", value: "" })}
                      data-testid="button-add-stat"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stat
                    </Button>
                  </div>
                  <FormDescription>
                    Add game-specific stats like K/D ratio, win rate, etc.
                  </FormDescription>
                  <div className="space-y-2">
                    {statsFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`statsEntries.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="Stat name (e.g., K/D Ratio)" 
                                  {...field}
                                  data-testid={`input-stat-key-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`statsEntries.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="Value (e.g., 2.5)" 
                                  {...field}
                                  data-testid={`input-stat-value-${index}`}
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
                          onClick={() => removeStat(index)}
                          data-testid={`button-remove-stat-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
