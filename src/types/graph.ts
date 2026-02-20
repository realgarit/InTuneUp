// ============================================================
// Microsoft Graph API — Shared Types
// ============================================================

/** Represents a single field comparison result */
export interface FieldComparisonResult {
  field: string;
  expected: unknown;
  actual: unknown;
  isMatch: boolean;
}

/** Represents the full comparison result for one policy */
export interface PolicyComparisonResult {
  policyId: string;
  policyName: string;
  policyType: 'updateRing' | 'featureUpdate' | 'expeditePolicy';
  fields: FieldComparisonResult[];
  isFullyCompliant: boolean;
}

/** OData list response wrapper */
export interface ODataListResponse<T> {
  '@odata.context'?: string;
  value: T[];
}

// ============================================================
// Update Ring (windowsUpdateForBusinessConfiguration)
// ============================================================

export interface WindowsUpdateScheduledInstall {
  '@odata.type': 'microsoft.graph.windowsUpdateScheduledInstall';
  scheduledInstallDay: string;
  scheduledInstallTime: string;
}

export interface WindowsUpdateForBusinessConfiguration {
  id?: string;
  '@odata.type': '#microsoft.graph.windowsUpdateForBusinessConfiguration';
  displayName: string;
  description: string;
  microsoftUpdateServiceAllowed: boolean;
  driversExcluded: boolean;
  qualityUpdatesDeferralPeriodInDays: number;
  featureUpdatesDeferralPeriodInDays: number;
  allowWindows11Upgrade: boolean;
  featureUpdatesRollbackWindowInDays: number;
  businessReadyUpdatesOnly: string;
  automaticUpdateMode: string;
  updateWeeks?: string;
  installationSchedule: WindowsUpdateScheduledInstall;
  userPauseAccess: string;
  userWindowsUpdateScanAccess: string;
  useDeadlineForFeatureUpdates?: boolean;
  deadlineForFeatureUpdatesInDays: number;
  useDeadlineForQualityUpdates?: boolean;
  deadlineForQualityUpdatesInDays: number;
  deadlineGracePeriodInDays: number;
  autoRestartNotificationDismissal: string;
  updateNotificationLevel?: string;
  postponeRebootUntilAfterDeadline?: boolean;
}

// ============================================================
// Feature Update Profile (windowsFeatureUpdateProfile)
// ============================================================

export interface WindowsFeatureUpdateProfile {
  id?: string;
  '@odata.type': '#microsoft.graph.windowsFeatureUpdateProfile';
  displayName: string;
  description: string;
  featureUpdateVersion: string;
  installFeatureUpdatesOptional: boolean;
}

// ============================================================
// Expedite / Quality Update Profile (windowsQualityUpdateProfile)
// ============================================================

export interface ExpeditedWindowsQualityUpdateSettings {
  '@odata.type': 'microsoft.graph.expeditedWindowsQualityUpdateSettings';
  qualityUpdateRelease: string;
  daysUntilForcedReboot: number;
}

export interface WindowsQualityUpdateProfile {
  id?: string;
  '@odata.type': '#microsoft.graph.windowsQualityUpdateProfile';
  displayName: string;
  description: string;
  expeditedUpdateSettings: ExpeditedWindowsQualityUpdateSettings;
}

// ============================================================
// Union type for all policy types
// ============================================================

export type AnyPolicy =
  | WindowsUpdateForBusinessConfiguration
  | WindowsFeatureUpdateProfile
  | WindowsQualityUpdateProfile;
