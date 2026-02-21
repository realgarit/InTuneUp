import { useQueries } from '@tanstack/react-query';
import { getLatestFeatureUpdateVersion, getLatestQualityUpdateRelease } from '../services/graphService';
import type { UpdateVersionInfo } from '../types/graph';

export const QUERY_KEYS = {
  featureUpdateVersion: ['intune', 'featureUpdateVersion'] as const,
  qualityUpdateRelease: ['intune', 'qualityUpdateRelease'] as const,
} as const;

/**
 * Hook to fetch the latest Windows update versions from the Microsoft Graph API.
 * Returns null for values when the API fails - no fallback defaults.
 */
export function useUpdateVersions(): UpdateVersionInfo {
  const results = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.featureUpdateVersion,
        queryFn: getLatestFeatureUpdateVersion,
        retry: 1,
        staleTime: 1000 * 60 * 60, // 1 hour
      },
      {
        queryKey: QUERY_KEYS.qualityUpdateRelease,
        queryFn: getLatestQualityUpdateRelease,
        retry: 1,
        staleTime: 1000 * 60 * 60, // 1 hour
      },
    ],
  });

  const [featureQuery, qualityQuery] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  // Return null when API fails - no fallback defaults
  return {
    featureUpdateVersion: featureQuery.data ?? null,
    qualityUpdateRelease: qualityQuery.data ?? null,
    isLoading,
    isError,
    refetch: () => {
      results.forEach((r) => void r.refetch());
    },
  };
}
