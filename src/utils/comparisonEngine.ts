import type {
  WindowsUpdateForBusinessConfiguration,
  WindowsUpdateActiveHoursInstall,
  WindowsFeatureUpdateProfile,
  WindowsQualityUpdateProfile,
  WindowsQualityUpdatePolicy,
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
  automaticUpdateMode: 'autoInstallAndRebootAtMaintenanceTime',
  installationSchedule: {
    '@odata.type': '#microsoft.graph.windowsUpdateActiveHoursInstall',
    activeHoursStart: '06:00:00',
    activeHoursEnd: '18:00:00',
  },
  userPauseAccess: 'disabled',
  userWindowsUpdateScanAccess: 'enabled',
  deadlineForFeatureUpdatesInDays: 14,
  deadlineForQualityUpdatesInDays: 7,
  deadlineGracePeriodInDays: 1,
  autoRestartNotificationDismissal: 'notConfigured',
  updateNotificationLevel: 'defaultNotifications',
  postponeRebootUntilAfterDeadline: false,
};

export const GOLDEN_FEATURE_UPDATE: Omit<WindowsFeatureUpdateProfile, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsFeatureUpdateProfile',
  displayName: 'default_aad_kunde_win-feature',
  description: 'No Description',
  featureUpdateVersion: 'Windows 11, version 25H2',
  installFeatureUpdatesOptional: false,
};

export const GOLDEN_EXPEDITE_POLICY: Omit<WindowsQualityUpdateProfile, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsQualityUpdateProfile',
  displayName: 'default_aad_kunde_win-expedite',
  description: 'Emergency hotpatch expedite',
  expeditedUpdateSettings: {
    '@odata.type': 'microsoft.graph.expeditedWindowsQualityUpdateSettings',
    qualityUpdateRelease: '02/10/2026 - 2026.02 B',
    daysUntilForcedReboot: 1,
  },
};

export const GOLDEN_QUALITY_UPDATE_POLICY: Omit<WindowsQualityUpdatePolicy, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsQualityUpdatePolicy',
  displayName: 'default_aad_kunde_win-quality',
  description: 'Standardized Windows Quality Update Policy via InTuneUp',
  hotpatchEnabled: true,
  approvalSettings: [
    {
      '@odata.type': 'microsoft.graph.windowsQualityUpdateApprovalSetting',
      windowsQualityUpdateCadence: 'monthly',
      windowsQualityUpdateCategory: 'security',
      approvalMethodType: 'automatic',
      deferredDeploymentInDay: 0,
    },
    {
      '@odata.type': 'microsoft.graph.windowsQualityUpdateApprovalSetting',
      windowsQualityUpdateCadence: 'outOfBand',
      windowsQualityUpdateCategory: 'security',
      approvalMethodType: 'automatic',
      deferredDeploymentInDay: 0,
    },
  ],
};

// ============================================================
// Fields that must NEVER be included in PATCH payloads
// (read-only metadata or non-compliance fields)
// ============================================================

/**
 * Fields excluded from compliance comparison.
 * - @odata.type: read-only metadata, Graph API rejects it in PATCH
 * - id: read-only identifier
 * - displayName: customer-specific, not a compliance field
 * - description: informational only, not a compliance setting
 * - installationSchedule: complex nested object — polymorphic type requires special PATCH handling
 * - expeditedUpdateSettings: complex nested object — polymorphic type requires special PATCH handling
 */
const EXCLUDED_FROM_COMPARISON = new Set<string>([
  '@odata.type',
  'id',
  'displayName',
  'description',
  'installationSchedule',      // nested object — requires special PATCH handling
  'expeditedUpdateSettings',   // nested object — requires special PATCH handling
]);

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
 * Fields in EXCLUDED_FROM_COMPARISON are always skipped — they are read-only or non-compliance fields
 * that must never appear as deviations (and must never be sent in PATCH payloads).
 */
function compareAgainstGolden<T extends Record<string, unknown>>(
  actual: T,
  golden: Partial<T>,
  nonPatchableFields: Set<string> = new Set()
): FieldComparisonResult[] {
  return (Object.keys(golden) as Array<keyof T>)
    .filter((key) => !EXCLUDED_FROM_COMPARISON.has(String(key)))
    .map((key) => {
      const expectedValue = golden[key];
      const actualValue = actual[key];
      return {
        field: String(key),
        expected: expectedValue,
        actual: actualValue,
        isMatch: deepEqual(expectedValue, actualValue),
        isPatchable: !nonPatchableFields.has(String(key)),
      };
    });
}

/**
 * Flattens the installationSchedule nested object into individual FieldComparisonResult entries.
 * These are patchable — the Graph API accepts the full installationSchedule nested object in PATCH.
 * The golden standard uses active hours mode.
 *
 * Note: Graph API may return @odata.type with or without the '#' prefix for nested objects.
 * Both formats are handled here.
 */
function compareInstallationSchedule(
  actual: WindowsUpdateForBusinessConfiguration
): FieldComparisonResult[] {
  const goldenSchedule = GOLDEN_UPDATE_RING.installationSchedule as WindowsUpdateActiveHoursInstall;
  const actualSchedule = actual.installationSchedule;

  if (!actualSchedule) {
    return [
      {
        field: 'installationSchedule.activeHoursStart',
        expected: goldenSchedule.activeHoursStart,
        actual: undefined,
        isMatch: false,
        isPatchable: true,
      },
      {
        field: 'installationSchedule.activeHoursEnd',
        expected: goldenSchedule.activeHoursEnd,
        actual: undefined,
        isMatch: false,
        isPatchable: true,
      },
    ];
  }

  // Graph API may return @odata.type with or without the '#' prefix for nested objects.
  // Cast to string to handle both formats without TypeScript discriminated-union errors.
  const odataType = actualSchedule['@odata.type'] as string;
  const isActiveHoursType =
    odataType === '#microsoft.graph.windowsUpdateActiveHoursInstall' ||
    odataType === 'microsoft.graph.windowsUpdateActiveHoursInstall';

  if (isActiveHoursType) {
    const actualActiveHours = actualSchedule as WindowsUpdateActiveHoursInstall;
    return [
      {
        field: 'installationSchedule.activeHoursStart',
        expected: goldenSchedule.activeHoursStart,
        actual: actualActiveHours.activeHoursStart,
        isMatch: deepEqual(goldenSchedule.activeHoursStart, actualActiveHours.activeHoursStart),
        isPatchable: true,
      },
      {
        field: 'installationSchedule.activeHoursEnd',
        expected: goldenSchedule.activeHoursEnd,
        actual: actualActiveHours.activeHoursEnd,
        isMatch: deepEqual(goldenSchedule.activeHoursEnd, actualActiveHours.activeHoursEnd),
        isPatchable: true,
      },
    ];
  }

  // Actual uses scheduled install type — entire schedule needs to be replaced
  return [
    {
      field: 'installationSchedule.activeHoursStart',
      expected: goldenSchedule.activeHoursStart,
      actual: undefined,
      isMatch: false,
      isPatchable: true,
    },
    {
      field: 'installationSchedule.activeHoursEnd',
      expected: goldenSchedule.activeHoursEnd,
      actual: undefined,
      isMatch: false,
      isPatchable: true,
    },
  ];
}

// ============================================================
// Public API
// ============================================================

/**
 * Compares all fetched Update Ring policies against the Golden Standard.
 * Read-only and non-compliance fields (displayName, description, @odata.type, id)
 * are excluded centrally by compareAgainstGolden via EXCLUDED_FROM_COMPARISON.
 */
export function compareUpdateRings(
  policies: WindowsUpdateForBusinessConfiguration[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      GOLDEN_UPDATE_RING as Record<string, unknown>
    );

    // Add installationSchedule sub-field comparisons (display-only, not patchable)
    const scheduleFields = compareInstallationSchedule(policy);

    const allFields = [...fields, ...scheduleFields];

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'updateRing' as const,
      fields: allFields,
      isFullyCompliant: allFields.every((f) => f.isMatch),
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

/**
 * Compares all fetched Windows Quality Update Policies (hotpatch) against the Golden Standard.
 * approvalSettings is a complex array — display-only comparison (isPatchable: false).
 * Only hotpatchEnabled is patchable.
 */
export function compareQualityUpdatePolicies(
  policies: WindowsQualityUpdatePolicy[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const fields: FieldComparisonResult[] = [
      {
        field: 'hotpatchEnabled',
        expected: GOLDEN_QUALITY_UPDATE_POLICY.hotpatchEnabled,
        actual: policy.hotpatchEnabled,
        isMatch: deepEqual(GOLDEN_QUALITY_UPDATE_POLICY.hotpatchEnabled, policy.hotpatchEnabled),
        isPatchable: true,
      },
      // approvalSettings is a complex array — display-only comparison
      {
        field: 'approvalSettings',
        expected: GOLDEN_QUALITY_UPDATE_POLICY.approvalSettings,
        actual: policy.approvalSettings,
        isMatch: deepEqual(GOLDEN_QUALITY_UPDATE_POLICY.approvalSettings, policy.approvalSettings),
        isPatchable: false,
      },
    ];

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'qualityUpdatePolicy' as const,
      fields,
      isFullyCompliant: fields.every((f) => f.isMatch),
    };
  });
}
