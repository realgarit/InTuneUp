import type {
  WindowsUpdateForBusinessConfiguration,
  WindowsFeatureUpdateProfile,
  WindowsQualityUpdateProfile,
  FieldComparisonResult,
  PolicyComparisonResult,
} from '../types/graph';

// ============================================================
// Golden Standard Definitions (from DESIGN.md)
// ============================================================

export const GOLDEN_UPDATE_RING: Omit<WindowsUpdateForBusinessConfiguration, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsUpdateForBusinessConfiguration',
  displayName: 'default_aad_kunde_win-update',
  description: 'Standardized Update Ring via InTuneUp',
  microsoftUpdateServiceAllowed: true,
  driversExcluded: false,
  qualityUpdatesDeferralPeriodInDays: 7,
  featureUpdatesDeferralPeriodInDays: 90,
  allowWindows11Upgrade: true,
  featureUpdatesRollbackWindowInDays: 60,
  businessReadyUpdatesOnly: 'businessReadyOnly',
  automaticUpdateMode: 'autoInstallAndRebootAtScheduledTime',
  installationSchedule: {
    '@odata.type': 'microsoft.graph.windowsUpdateScheduledInstall',
    scheduledInstallDay: 'everyDay',
    scheduledInstallTime: '19:00:00.0000000',
  },
  userPauseAccess: 'disable',
  userWindowsUpdateScanAccess: 'enable',
  useDeadlineForFeatureUpdates: true,
  deadlineForFeatureUpdatesInDays: 14,
  useDeadlineForQualityUpdates: true,
  deadlineForQualityUpdatesInDays: 7,
  deadlineGracePeriodInDays: 1,
  autoRestartNotificationDismissal: 'automatic',
};

export const GOLDEN_FEATURE_UPDATE: Omit<WindowsFeatureUpdateProfile, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsFeatureUpdateProfile',
  displayName: 'default_winupdate',
  description: 'No Description',
  featureUpdateVersion: 'Windows 11, version 25H2',
  installFeatureUpdatesOptional: false,
};

export const GOLDEN_EXPEDITE_POLICY: Omit<WindowsQualityUpdateProfile, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsQualityUpdateProfile',
  displayName: 'Expedite - 2026.02 B Security Update',
  description: 'Emergency hotpatch expedite',
  expeditedUpdateSettings: {
    '@odata.type': 'microsoft.graph.expeditedWindowsQualityUpdateSettings',
    qualityUpdateRelease: '02/10/2026 - 2026.02 B',
    daysUntilForcedReboot: 1,
  },
};

// ============================================================
// Comparison Helpers
// ============================================================

/**
 * Deep-compares two values. Handles primitives and plain objects (one level deep for nested).
 * Returns true if values are semantically equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }
  return false;
}

/**
 * Compares a fetched policy object against a golden standard object.
 * Only compares keys present in the golden standard (ignores extra API-returned fields like `id`, `createdDateTime`, etc.)
 */
function compareAgainstGolden<T extends Record<string, unknown>>(
  actual: T,
  golden: Partial<T>
): FieldComparisonResult[] {
  return (Object.keys(golden) as Array<keyof T>).map((key) => {
    const expectedValue = golden[key];
    const actualValue = actual[key];
    return {
      field: String(key),
      expected: expectedValue,
      actual: actualValue,
      isMatch: deepEqual(expectedValue, actualValue),
    };
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Compares all fetched Update Ring policies against the Golden Standard.
 * Excludes the `displayName` field from compliance check (it's customer-specific).
 */
export function compareUpdateRings(
  policies: WindowsUpdateForBusinessConfiguration[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const goldenWithoutDisplayName = { ...GOLDEN_UPDATE_RING } as Partial<WindowsUpdateForBusinessConfiguration>;
    delete goldenWithoutDisplayName.displayName;

    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      goldenWithoutDisplayName as Record<string, unknown>
    );

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'updateRing' as const,
      fields,
      isFullyCompliant: fields.every((f) => f.isMatch),
    };
  });
}

/**
 * Compares all fetched Feature Update profiles against the Golden Standard.
 */
export function compareFeatureUpdates(
  policies: WindowsFeatureUpdateProfile[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      GOLDEN_FEATURE_UPDATE as Record<string, unknown>
    );

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'featureUpdate' as const,
      fields,
      isFullyCompliant: fields.every((f) => f.isMatch),
    };
  });
}

/**
 * Compares all fetched Expedite/Quality Update profiles against the Golden Standard.
 */
export function compareExpeditePolicies(
  policies: WindowsQualityUpdateProfile[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      GOLDEN_EXPEDITE_POLICY as Record<string, unknown>
    );

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'expeditePolicy' as const,
      fields,
      isFullyCompliant: fields.every((f) => f.isMatch),
    };
  });
}
