import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";

export function useAuth() {
  const { data: user, isLoading, isFetching } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
       queryFn: async () => {
      try {
        const response = await fetch(getApiUrl("/api/auth/user"), {
          credentials: "include",
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          return null;
        }
        
       const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        } else {
          console.warn("Auth endpoint returned non-JSON response, treating as unauthenticated");
          return null;
        }
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
