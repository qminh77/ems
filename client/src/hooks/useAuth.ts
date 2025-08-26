import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,  // Always check fresh data
    gcTime: 0,      // Don't cache authentication state
  });

  // If there's an error (401), user is not authenticated
  const isAuthenticated = !error && !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    error
  };
}
