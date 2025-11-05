import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X, Plus, MapPin, User as UserIcon, Gamepad2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useLayout } from "@/contexts/LayoutContext";

interface ProfileSetupProps {
  user?: User | null;
  onComplete?: () => void;
  onCancel?: () => void;
}

const formSchema = z.object({
  gamertag: z.string().min(3, "Gamertag must be at least 3 characters").max(20, "Gamertag must be less than 20 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
  location: z.string().optional(),
  age: z.string().optional().refine((val) => !val || val.trim() === "" || (parseInt(val) >= 13 && parseInt(val) <= 100), "Age must be between 13 and 100"),
});

type FormData = z.infer<typeof formSchema>;

export function ProfileSetup({ user, onComplete, onCancel }: ProfileSetupProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>(user?.preferredGames || []);
  const [newGame, setNewGame] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude && user?.longitude ? { latitude: user.latitude, longitude: user.longitude } : null
  );
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getContainerClass } = useLayout();

  // Request geolocation when component mounts
  useEffect(() => {
    if (!coordinates && navigator.geolocation) {
      setLocationStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationStatus('granted');
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationStatus('denied');
        }
      );
    }
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gamertag: user?.gamertag || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      bio: user?.bio || "",
      location: user?.location || "",
      age: user?.age?.toString() || "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: FormData & { preferredGames: string[] }) => {
      // Transform form data for API
      const apiData = {
        ...data,
        age: data.age && data.age.trim() !== "" ? parseInt(data.age) : undefined,
        preferredGames: data.preferredGames,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      };
      const response = await apiRequest("PATCH", "/api/user/profile", apiData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated successfully!",
        description: "Your gaming profile has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const popularGames = [
    "Valorant", "CS2", "Apex Legends", "League of Legends", "Fortnite", 
    "Overwatch 2", "Rocket League", "Call of Duty", "FIFA", "Dota 2",
    "Rainbow Six Siege", "Minecraft", "Among Us", "Fall Guys", "Genshin Impact"
  ];

  const addGame = () => {
    if (newGame.trim() && !selectedGames.includes(newGame.trim())) {
      setSelectedGames([...selectedGames, newGame.trim()]);
      setNewGame("");
    }
  };

  const removeGame = (gameToRemove: string) => {
    setSelectedGames(selectedGames.filter(game => game !== gameToRemove));
  };

  const addPopularGame = (game: string) => {
    if (!selectedGames.includes(game)) {
      setSelectedGames([...selectedGames, game]);
    }
  };

  const onSubmit = (data: FormData) => {
    profileMutation.mutate({
      ...data,
      preferredGames: selectedGames,
    });
  };

  return (
    <div className={`${getContainerClass()} mx-auto`}>
      <Card>
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-center text-2xl">
            {user?.gamertag ? "Edit Your Profile & Settings" : "Setup Your Gaming Profile"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {user?.gamertag ? "Update your information, games, and privacy settings" : "Tell other players about yourself to find the perfect teammates"}
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                
                {/* Gamertag */}
                <FormField
                control={form.control}
                name="gamertag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gamertag *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your gamertag" 
                        {...field} 
                        data-testid="input-gamertag"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your first name" 
                          {...field} 
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your last name" 
                          {...field} 
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Your age" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-age"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="City, Country" 
                            {...field} 
                            data-testid="input-location"
                          />
                          {locationStatus === 'granted' && coordinates && (
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </FormControl>
                      {locationStatus === 'granted' && (
                        <p className="text-xs text-muted-foreground">
                          GPS coordinates captured for location-based search
                        </p>
                      )}
                      {locationStatus === 'denied' && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Location permission denied - distance filtering won't work
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">About You</h3>
                </div>
                
                <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell other players about your gaming style, goals, and what you're looking for in teammates..." 
                        className="resize-none"
                        rows={4}
                        {...field} 
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>

              {/* Preferred Games Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Your Games</h3>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Select the games you play and want to find teammates for</p>
                </div>

                {/* Selected Games */}
                <div className="flex flex-wrap gap-2">
                  {selectedGames.map((game) => (
                    <Badge 
                      key={game} 
                      variant="secondary" 
                      className="flex items-center gap-1"
                      data-testid={`badge-game-${game.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {game}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeGame(game)}
                        data-testid={`button-remove-game-${game.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                    </Badge>
                  ))}
                </div>

                {/* Add Custom Game */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a game..."
                    value={newGame}
                    onChange={(e) => setNewGame(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addGame())}
                    data-testid="input-new-game"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={addGame}
                    data-testid="button-add-game"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Popular Games */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Or select from popular games:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularGames
                      .filter(game => !selectedGames.includes(game))
                      .slice(0, 8)
                      .map((game) => (
                        <Badge 
                          key={game} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-secondary"
                          onClick={() => addPopularGame(game)}
                          data-testid={`button-popular-game-${game.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {game}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6">
                <Button 
                  type="submit" 
                  disabled={profileMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
                {onCancel && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    disabled={profileMutation.isPending}
                    data-testid="button-cancel-profile"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}