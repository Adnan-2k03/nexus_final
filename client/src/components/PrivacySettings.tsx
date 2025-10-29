import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Users, Gamepad2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface PrivacySettingsProps {
  userId: string;
}

const visibilityOptions = [
  { value: "everyone", label: "Everyone", description: "Anyone can see this" },
  { value: "connections", label: "Connections Only", description: "Only your connections can see this" },
  { value: "nobody", label: "Nobody", description: "Keep this private" }
];

export function PrivacySettings({ userId }: PrivacySettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const [showMutualGames, setShowMutualGames] = useState("everyone");
  const [showMutualFriends, setShowMutualFriends] = useState("everyone");
  const [showMutualHobbies, setShowMutualHobbies] = useState("everyone");

  useEffect(() => {
    if (user) {
      setShowMutualGames(user.showMutualGames || "everyone");
      setShowMutualFriends(user.showMutualFriends || "everyone");
      setShowMutualHobbies(user.showMutualHobbies || "everyone");
    }
  }, [user]);

  const updatePrivacyMutation = useMutation({
    mutationFn: async (settings: { showMutualGames?: string; showMutualFriends?: string; showMutualHobbies?: string }) => {
      return await apiRequest('PATCH', '/api/user/privacy', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updatePrivacyMutation.mutate({
      showMutualGames,
      showMutualFriends,
      showMutualHobbies,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading privacy settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-privacy-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can see what you have in common with other players
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Mutual Games</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Who can see games you have in common with others
            </p>
            <RadioGroup
              value={showMutualGames}
              onValueChange={setShowMutualGames}
              className="space-y-2"
              data-testid="radio-group-mutual-games"
              disabled={updatePrivacyMutation.isPending}
            >
              {visibilityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem
                    value={option.value}
                    id={`games-${option.value}`}
                    data-testid={`radio-mutual-games-${option.value}`}
                    disabled={updatePrivacyMutation.isPending}
                  />
                  <Label
                    htmlFor={`games-${option.value}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Mutual Friends</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Who can see friends you have in common with others
            </p>
            <RadioGroup
              value={showMutualFriends}
              onValueChange={setShowMutualFriends}
              className="space-y-2"
              data-testid="radio-group-mutual-friends"
              disabled={updatePrivacyMutation.isPending}
            >
              {visibilityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem
                    value={option.value}
                    id={`friends-${option.value}`}
                    data-testid={`radio-mutual-friends-${option.value}`}
                    disabled={updatePrivacyMutation.isPending}
                  />
                  <Label
                    htmlFor={`friends-${option.value}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Mutual Hobbies</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Who can see hobbies/interests you have in common with others
            </p>
            <RadioGroup
              value={showMutualHobbies}
              onValueChange={setShowMutualHobbies}
              className="space-y-2"
              data-testid="radio-group-mutual-hobbies"
              disabled={updatePrivacyMutation.isPending}
            >
              {visibilityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem
                    value={option.value}
                    id={`hobbies-${option.value}`}
                    data-testid={`radio-mutual-hobbies-${option.value}`}
                    disabled={updatePrivacyMutation.isPending}
                  />
                  <Label
                    htmlFor={`hobbies-${option.value}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updatePrivacyMutation.isPending}
            data-testid="button-save-privacy"
          >
            {updatePrivacyMutation.isPending ? "Saving..." : "Save Privacy Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
