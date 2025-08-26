import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,  // Always check fresh data
    gcTime: 0,      // Don't cache authentication state
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // User is authenticated only if we have user data and no error
  // Explicitly check for 401 error or any error
  const isAuthenticated = !!user && !isError && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    isError
  };
}
