import { useQuery } from '@tanstack/react-query';
import { getOrganization } from '../services/graphService';

export const QUERY_KEYS = {
  tenantName: ['tenant', 'name'] as const,
} as const;

/**
 * Hook to fetch the tenant's display name from Microsoft Graph API.
 * @param enabled - Controls when the query runs (useful for conditional fetching based on auth state)
 */
export function useTenantName(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.tenantName,
    queryFn: getOrganization,
    enabled,
    retry: 1,
    staleTime: 1000 * 60 * 60, // 1 hour - tenant name rarely changes
  });
}
