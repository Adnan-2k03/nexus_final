import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Gamepad2, Plus, Users, Target, Clock, Zap } from "lucide-react";
import { useLayout } from "@/contexts/LayoutContext";

const createMatchSchema = z.object({
  gameName: z.string().min(1, "Game name is required"),
  gameMode: z.string().min(1, "Game mode is required"),
  matchType: z.enum(["lfg", "lfo"], { required_error: "Match type is required" }),
  duration: z.enum(["short-term", "long-term"], { required_error: "Duration is required" }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tournamentName: z.string().optional(),
  region: z.string().min(1, "Region is required"),
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

interface CreateMatchFormProps {
  onSubmit: (data: CreateMatchFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CreateMatchForm({ onSubmit, onCancel, isLoading }: CreateMatchFormProps) {
  const { getContainerClass } = useLayout();
  
  const form = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      gameName: "",
      gameMode: "",
      matchType: "lfg",
      duration: "short-term",
      description: "",
      tournamentName: "",
      region: "",
    },
  });

  const popularGames = [
    "Valorant", "League of Legends", "CS2", "Apex Legends", "Rocket League",
    "Overwatch 2", "Dota 2", "Fortnite", "Call of Duty", "FIFA 24"
  ];

  const gameModes = ["1v1", "2v2", "3v3", "5v5", "Team"];
  const regions = ["NA West", "NA East", "NA Central", "EU West", "EU East", "Asia", "Oceania"];

  const handleSubmit = (data: CreateMatchFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Card className={`w-full ${getContainerClass()} mx-auto`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Gamepad2 className="h-5 w-5 text-primary" />
          Create Match Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="lfg" className="gap-2" data-testid="tab-match-type-lfg">
                          <Users className="h-4 w-4" />
                          LFG (Looking for Group)
                        </TabsTrigger>
                        <TabsTrigger value="lfo" className="gap-2" data-testid="tab-match-type-lfo">
                          <Target className="h-4 w-4" />
                          LFO (Looking for Opponent)
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="short-term" className="gap-2" data-testid="tab-duration-short">
                          <Zap className="h-4 w-4" />
                          Short-term
                        </TabsTrigger>
                        <TabsTrigger value="long-term" className="gap-2" data-testid="tab-duration-long">
                          <Clock className="h-4 w-4" />
                          Long-term
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gameName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gameMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-game-mode">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gameModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-region">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tournamentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Spring Championship"
                        {...field}
                        data-testid="input-tournament-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you're looking for, your skill level, requirements, etc."
                      className="min-h-[100px] resize-none"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isLoading}
                data-testid="button-create-match"
              >
                <Plus className="h-4 w-4" />
                {isLoading ? "Creating..." : "Create Match Request"}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}