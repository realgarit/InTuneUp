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
  updateWeeks: 'everyWeek',
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
  installLatestWindows10OnWindows11IneligibleDevice: false,
};

export const GOLDEN_EXPEDITE_POLICY: Omit<WindowsQualityUpdateProfile, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsQualityUpdateProfile',
  displayName: 'default_aad_kunde_win-expedite',
  description: 'Emergency hotpatch expedite',
  expeditedUpdateSettings: {
    '@odata.type': 'microsoft.graph.expeditedWindowsQualityUpdateSettings',
    qualityUpdateRelease: '02/10/2026 - 2026.02 B',
    daysUntilForcedReboot: 2,
  },
};

/**
 * Creates a golden expedite policy with the specified quality update release.
 * This allows dynamic selection of the newest available quality update.
 */
export function createGoldenExpeditePolicy(qualityUpdateRelease: string): Omit<WindowsQualityUpdateProfile, 'id'> {
  return {
    '@odata.type': '#microsoft.graph.windowsQualityUpdateProfile',
    displayName: 'default_aad_kunde_win-expedite',
    description: 'Emergency hotpatch expedite',
    expeditedUpdateSettings: {
      '@odata.type': 'microsoft.graph.expeditedWindowsQualityUpdateSettings',
      qualityUpdateRelease,
      daysUntilForcedReboot: 2,
    },
  };
}

/**
 * Extracts the newest quality update release from existing expedite policies.
 * Parses the release date from the format "MM/DD/YYYY - YYYY.MM B" and returns the newest one.
 * Returns undefined if no valid releases are found.
 */
export function extractNewestQualityUpdateRelease(
  policies: WindowsQualityUpdateProfile[]
): string | undefined {
  if (policies.length === 0) return undefined;

  const releases = policies
    .filter((p) => p.expeditedUpdateSettings?.qualityUpdateRelease)
    .map((p) => p.expeditedUpdateSettings!.qualityUpdateRelease);

  if (releases.length === 0) return undefined;

  // Parse dates from format "MM/DD/YYYY - YYYY.MM B" and sort by date
  const parsedReleases = releases.map((release) => {
    const dateMatch = release.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      return {
        release,
        date: new Date(`${year}-${month}-${day}`),
      };
    }
    return { release, date: new Date(0) }; // fallback for unrecognized format
  });

  // Sort by date descending and return the newest
  parsedReleases.sort((a, b) => b.date.getTime() - a.date.getTime());
  return parsedReleases[0]?.release;
}

export const GOLDEN_QUALITY_UPDATE_POLICY: Omit<WindowsQualityUpdatePolicy, 'id'> = {
  '@odata.type': '#microsoft.graph.windowsQualityUpdatePolicy',
  displayName: 'default_aad_kunde_win-quality',
  description: 'Standardized Windows Quality Update Policy via InTuneUp',
  hotpatchEnabled: true,
  approvalSettings: [],
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
 */
const EXCLUDED_FROM_COMPARISON = new Set<string>([
  '@odata.type',
  'id',
  'displayName',
  'description',
  'installationSchedule',      // compared via compareInstallationSchedule() sub-field helper instead
  'expeditedUpdateSettings',   // compared via compareExpeditedUpdateSettings() sub-field helper instead
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

// ============================================================
// installationSchedule sub-field comparison
// ============================================================

/**
 * Normalizes a Graph API time string by stripping fractional seconds.
 * e.g. "06:00:00.0000000" → "06:00:00"
 */
function normalizeTimeString(value: string | undefined): string | undefined {
  if (!value) return value;
  // Strip fractional seconds: "HH:MM:SS.fffffff" → "HH:MM:SS"
  return value.replace(/(\d{2}:\d{2}:\d{2})\.\d+/, '$1');
}

/**
 * Compares the installationSchedule active hours fields individually.
 * The golden standard uses windowsUpdateActiveHoursInstall (6 AM – 6 PM).
 * These fields are patchable — the full installationSchedule object is sent in PATCH.
 * Time strings are normalized (fractional seconds stripped) before comparison.
 */
function compareInstallationSchedule(
  actual: WindowsUpdateForBusinessConfiguration
): FieldComparisonResult[] {
  const goldenSchedule = GOLDEN_UPDATE_RING.installationSchedule as WindowsUpdateActiveHoursInstall;
  const actualSchedule = actual.installationSchedule as Record<string, unknown> | null | undefined;

  const goldenStart = goldenSchedule.activeHoursStart;
  const goldenEnd = goldenSchedule.activeHoursEnd;

  // Detect active hours type by @odata.type (with or without #) or by property presence
  const odataType = actualSchedule?.['@odata.type'] as string | undefined;
  const isActiveHoursType =
    odataType === '#microsoft.graph.windowsUpdateActiveHoursInstall' ||
    odataType === 'microsoft.graph.windowsUpdateActiveHoursInstall' ||
    ('activeHoursStart' in (actualSchedule ?? {}));

  const rawStart = isActiveHoursType
    ? (actualSchedule?.['activeHoursStart'] as string | undefined)
    : undefined;
  const rawEnd = isActiveHoursType
    ? (actualSchedule?.['activeHoursEnd'] as string | undefined)
    : undefined;

  // Normalize fractional seconds for comparison (API returns "06:00:00.0000000")
  const actualStart = normalizeTimeString(rawStart);
  const actualEnd = normalizeTimeString(rawEnd);

  return [
    {
      field: 'installationSchedule.activeHoursStart',
      expected: goldenStart,
      actual: actualStart,
      isMatch: deepEqual(goldenStart, actualStart),
      isPatchable: true,
    },
    {
      field: 'installationSchedule.activeHoursEnd',
      expected: goldenEnd,
      actual: actualEnd,
      isMatch: deepEqual(goldenEnd, actualEnd),
      isPatchable: true,
    },
  ];
}

// ============================================================
// expeditedUpdateSettings sub-field comparison
// ============================================================

/**
 * Compares the expeditedUpdateSettings fields individually.
 * - qualityUpdateRelease: expected to be the newest available quality update
 * - daysUntilForcedReboot: expected to be 2 days
 * These fields are patchable.
 */
function compareExpeditedUpdateSettings(
  actual: WindowsQualityUpdateProfile,
  goldenPolicy: Omit<WindowsQualityUpdateProfile, 'id'>
): FieldComparisonResult[] {
  const goldenSettings = goldenPolicy.expeditedUpdateSettings;
  const actualSettings = actual.expeditedUpdateSettings;

  return [
    {
      field: 'expeditedUpdateSettings.qualityUpdateRelease',
      expected: goldenSettings?.qualityUpdateRelease,
      actual: actualSettings?.qualityUpdateRelease,
      isMatch: deepEqual(goldenSettings?.qualityUpdateRelease, actualSettings?.qualityUpdateRelease),
      isPatchable: true,
    },
    {
      field: 'expeditedUpdateSettings.daysUntilForcedReboot',
      expected: goldenSettings?.daysUntilForcedReboot,
      actual: actualSettings?.daysUntilForcedReboot,
      isMatch: deepEqual(goldenSettings?.daysUntilForcedReboot, actualSettings?.daysUntilForcedReboot),
      isPatchable: true,
    },
  ];
}

// ============================================================
// Public API
// ============================================================

/**
 * Compares all fetched Update Ring policies against the Golden Standard.
 * installationSchedule active hours sub-fields are compared individually and are patchable.
 * updateWeeks IS compared — it is a real compliance field.
 */
export function compareUpdateRings(
  policies: WindowsUpdateForBusinessConfiguration[]
): PolicyComparisonResult[] {
  return policies.map((policy) => {
    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      GOLDEN_UPDATE_RING as Record<string, unknown>
    );

    // Add installationSchedule active hours sub-field comparisons
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
 * If newestQualityUpdate is provided, uses that for the gold standard instead of the hardcoded value.
 * expeditedUpdateSettings sub-fields are compared individually and are patchable.
 */
export function compareExpeditePolicies(
  policies: WindowsQualityUpdateProfile[],
  newestQualityUpdate?: string
): PolicyComparisonResult[] {
  // Use dynamic quality update if provided, otherwise fall back to hardcoded
  const goldenPolicy = newestQualityUpdate
    ? createGoldenExpeditePolicy(newestQualityUpdate)
    : GOLDEN_EXPEDITE_POLICY;

  return policies.map((policy) => {
    const fields = compareAgainstGolden(
      policy as unknown as Record<string, unknown>,
      goldenPolicy as Record<string, unknown>
    );

    // Add expeditedUpdateSettings sub-field comparisons
    const expediteFields = compareExpeditedUpdateSettings(policy, goldenPolicy);
    const allFields = [...fields, ...expediteFields];

    return {
      policyId: policy.id ?? 'unknown',
      policyName: policy.displayName,
      policyType: 'expeditePolicy' as const,
      fields: allFields,
      isFullyCompliant: allFields.every((f) => f.isMatch),
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
      {
        field: 'approvalSettings',
        expected: GOLDEN_QUALITY_UPDATE_POLICY.approvalSettings,
        actual: policy.approvalSettings,
        isMatch: deepEqual(GOLDEN_QUALITY_UPDATE_POLICY.approvalSettings, policy.approvalSettings),
        isPatchable: true,
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
