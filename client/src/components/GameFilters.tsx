import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { useState } from "react";

interface GameFiltersProps {
  onFilterChange: (filters: { search?: string; game?: string; mode?: string; region?: string; gender?: string; language?: string; distance?: string; rank?: string }) => void;
  activeFilters?: { search?: string; game?: string; mode?: string; region?: string; gender?: string; language?: string; distance?: string; rank?: string };
}

export function GameFilters({ onFilterChange, activeFilters = {} }: GameFiltersProps) {
  const [search, setSearch] = useState(activeFilters.search || "");
  const [showFilters, setShowFilters] = useState(false);

  const popularGames = [
    "Valorant", "League of Legends", "CS2", "Apex Legends", "Rocket League",
    "Overwatch 2", "Dota 2", "Fortnite", "Call of Duty", "FIFA 24"
  ];

  const gameModes = ["1v1", "2v2", "3v3", "5v5", "Team"];
  const regions = ["NA West", "NA East", "NA Central", "EU West", "EU East", "Asia", "Oceania"];
  const genders = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "custom", label: "Custom" },
    { value: "prefer_not_to_say", label: "Prefer not to say" }
  ];
  const languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"];
  const distances = [
    { value: "5", label: "Within 5km" },
    { value: "10", label: "Within 10km" },
    { value: "25", label: "Within 25km" },
    { value: "50", label: "Within 50km" },
    { value: "100", label: "Within 100km" }
  ];
  
  const ranks = [
    "Bronze", "Silver", "Gold", "Platinum", "Diamond", 
    "Master", "Grandmaster", "Challenger", "Immortal", "Radiant"
  ];

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ ...activeFilters, search: value });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value === "all" ? undefined : value };
    onFilterChange(newFilters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key as keyof typeof newFilters];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setSearch("");
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(activeFilters).some(key => activeFilters[key as keyof typeof activeFilters]);

  return (
    <div className="space-y-4">
      {/* Search Bar with Filter Toggle */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Search games, descriptions, or gamer tags..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 overflow-x-auto whitespace-nowrap"
                style={{
                  textOverflow: 'clip',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 shrink-0"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                  {Object.keys(activeFilters).filter(key => activeFilters[key as keyof typeof activeFilters]).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="default"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground shrink-0"
                data-testid="button-clear-all-filters"
              >
                Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.game && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Game: {activeFilters.game}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('game')}
                data-testid={`button-clear-game-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.mode && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Mode: {activeFilters.mode}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('mode')}
                data-testid={`button-clear-mode-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.region && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Region: {activeFilters.region}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('region')}
                data-testid={`button-clear-region-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.gender && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Gender: {genders.find(g => g.value === activeFilters.gender)?.label || activeFilters.gender}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('gender')}
                data-testid={`button-clear-gender-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.language && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Language: {activeFilters.language}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('language')}
                data-testid={`button-clear-language-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.distance && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Distance: {distances.find(d => d.value === activeFilters.distance)?.label || `Within ${activeFilters.distance}km`}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('distance')}
                data-testid={`button-clear-distance-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {activeFilters.rank && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Rank: {activeFilters.rank}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter('rank')}
                data-testid={`button-clear-rank-filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Filter Controls */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Game</label>
            <Select value={activeFilters.game || "all"} onValueChange={(value) => handleFilterChange('game', value)}>
              <SelectTrigger data-testid="select-game-filter">
                <SelectValue placeholder="All games" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All games</SelectItem>
                {popularGames.map((game) => (
                  <SelectItem key={game} value={game}>
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mode</label>
            <Select value={activeFilters.mode || "all"} onValueChange={(value) => handleFilterChange('mode', value)}>
              <SelectTrigger data-testid="select-mode-filter">
                <SelectValue placeholder="All modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                {gameModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Region</label>
            <Select value={activeFilters.region || "all"} onValueChange={(value) => handleFilterChange('region', value)}>
              <SelectTrigger data-testid="select-region-filter">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Gender</label>
            <Select value={activeFilters.gender || "all"} onValueChange={(value) => handleFilterChange('gender', value)}>
              <SelectTrigger data-testid="select-gender-filter">
                <SelectValue placeholder="All genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                {genders.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Language</label>
            <Select value={activeFilters.language || "all"} onValueChange={(value) => handleFilterChange('language', value)}>
              <SelectTrigger data-testid="select-language-filter">
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Distance</label>
            <Select value={activeFilters.distance || "all"} onValueChange={(value) => handleFilterChange('distance', value)}>
              <SelectTrigger data-testid="select-distance-filter">
                <SelectValue placeholder="All distances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All distances</SelectItem>
                {distances.map((distance) => (
                  <SelectItem key={distance.value} value={distance.value}>
                    {distance.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Rank</label>
            <Select value={activeFilters.rank || "all"} onValueChange={(value) => handleFilterChange('rank', value)}>
              <SelectTrigger data-testid="select-rank-filter">
                <SelectValue placeholder="All ranks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ranks</SelectItem>
                {ranks.map((rank) => (
                  <SelectItem key={rank} value={rank}>
                    {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}