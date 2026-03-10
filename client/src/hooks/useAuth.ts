import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
