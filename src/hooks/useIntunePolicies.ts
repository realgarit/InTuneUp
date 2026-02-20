import { useQueries } from '@tanstack/react-query';
import {
  fetchUpdateRings,
  fetchFeatureUpdateProfiles,
  fetchQualityUpdateProfiles,
  fetchQualityUpdatePolicies,
} from '../services/graphService';
import type {
  WindowsUpdateForBusinessConfiguration,
  WindowsFeatureUpdateProfile,
  WindowsQualityUpdateProfile,
  WindowsQualityUpdatePolicy,
} from '../types/graph';

export const QUERY_KEYS = {
  updateRings: ['intune', 'updateRings'] as const,
  featureUpdates: ['intune', 'featureUpdates'] as const,
  expeditePolicies: ['intune', 'expeditePolicies'] as const,
  qualityUpdatePolicies: ['intune', 'qualityUpdatePolicies'] as const,
} as const;

export interface IntunePoliciesResult {
  updateRings: WindowsUpdateForBusinessConfiguration[];
  featureUpdates: WindowsFeatureUpdateProfile[];
  expeditePolicies: WindowsQualityUpdateProfile[];
  qualityUpdatePolicies: WindowsQualityUpdatePolicy[];
  isLoading: boolean;
  isError: boolean;
  errors: (Error | null)[];
  refetchAll: () => void;
}

export function useIntunePolicies(): IntunePoliciesResult {
  const results = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.updateRings,
        queryFn: fetchUpdateRings,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
      {
        queryKey: QUERY_KEYS.featureUpdates,
        queryFn: fetchFeatureUpdateProfiles,
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: QUERY_KEYS.expeditePolicies,
        queryFn: fetchQualityUpdateProfiles,
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: QUERY_KEYS.qualityUpdatePolicies,
        queryFn: fetchQualityUpdatePolicies,
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
    ],
  });

  const [updateRingsQuery, featureUpdatesQuery, expeditePoliciesQuery, qualityUpdatePoliciesQuery] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => (r.error instanceof Error ? r.error : null));

  return {
    updateRings: updateRingsQuery.data ?? [],
    featureUpdates: featureUpdatesQuery.data ?? [],
    expeditePolicies: expeditePoliciesQuery.data ?? [],
    qualityUpdatePolicies: qualityUpdatePoliciesQuery.data ?? [],
    isLoading,
    isError,
    errors,
    refetchAll: () => {
      results.forEach((r) => void r.refetch());
    },
  };
}
