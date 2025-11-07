import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, isFetching } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Auth check failed:", error);
        return null;
      }
    },
  });

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}
