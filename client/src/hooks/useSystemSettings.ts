import { useQuery } from "@tanstack/react-query";

export type PublicSystemSettings = {
  systemName: string;
  systemDescription: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string | null;
  footerText: string;
  registrationEnabled: boolean;
};

export function usePublicSystemSettings() {
  return useQuery<PublicSystemSettings>({
    queryKey: ["/api/public/settings"],
    staleTime: 30_000,
    retry: false,
  });
}
