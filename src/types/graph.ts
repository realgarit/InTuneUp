// ============================================================
// Microsoft Graph API — Shared Types
// ============================================================

/** Represents a single field comparison result */
export interface FieldComparisonResult {
  field: string;
  expected: unknown;
  actual: unknown;
  isMatch: boolean;
  isPatchable: boolean; // true = can be auto-fixed via PATCH; false = display only
}

/** Represents the full comparison result for one policy */
export interface PolicyComparisonResult {
  policyId: string;
  policyName: string;
  policyType: 'updateRing' | 'featureUpdate' | 'expeditePolicy' | 'qualityUpdatePolicy';
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
  '@odata.type': '#microsoft.graph.windowsUpdateScheduledInstall' | 'microsoft.graph.windowsUpdateScheduledInstall';
  scheduledInstallDay: string;
  scheduledInstallTime: string;
}

export interface WindowsUpdateActiveHoursInstall {
  '@odata.type': '#microsoft.graph.windowsUpdateActiveHoursInstall' | 'microsoft.graph.windowsUpdateActiveHoursInstall';
  activeHoursStart: string;
  activeHoursEnd: string;
}

export type WindowsUpdateInstallSchedule =
  | WindowsUpdateActiveHoursInstall
  | WindowsUpdateScheduledInstall;

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
  installationSchedule?: WindowsUpdateInstallSchedule | null;
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
  installLatestWindows10OnWindows11IneligibleDevice?: boolean;
}

// ============================================================
// Expedite Update Profile (windowsQualityUpdateProfile)
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
// Windows Quality Update Policy (windowsQualityUpdatePolicy — hotpatch)
// ============================================================

export interface WindowsQualityUpdateApprovalSetting {
  '@odata.type': 'microsoft.graph.windowsQualityUpdateApprovalSetting';
  windowsQualityUpdateCadence: 'monthly' | 'outOfBand' | 'unknownFutureValue';
  windowsQualityUpdateCategory: 'all' | 'security' | 'nonSecurity' | 'unknownFutureValue' | 'quickMachineRecovery';
  approvalMethodType: 'manual' | 'automatic' | 'unknownFutureValue';
  deferredDeploymentInDay: number;
}

export interface WindowsQualityUpdatePolicy {
  id?: string;
  '@odata.type': '#microsoft.graph.windowsQualityUpdatePolicy';
  displayName: string;
  description: string;
  hotpatchEnabled: boolean;
  approvalSettings?: WindowsQualityUpdateApprovalSetting[];
}

// ============================================================
// Windows Autopatch Catalog Types
// ============================================================

/** Base type for catalog entries from Windows Autopatch */
export interface CatalogEntry {
  id: string;
  displayName: string;
  releaseDateTime: string;
  deployableUntilDateTime?: string | null;
}

/** Feature update catalog entry from Windows Autopatch */
export interface FeatureUpdateCatalogEntry extends CatalogEntry {
  '@odata.type': '#microsoft.graph.windowsUpdates.featureUpdateCatalogEntry';
  version: string;
}

/** Quality update catalog entry from Windows Autopatch */
export interface QualityUpdateCatalogEntry extends CatalogEntry {
  '@odata.type': '#microsoft.graph.windowsUpdates.qualityUpdateCatalogEntry';
  shortName: string;
  isExpeditable: boolean;
  qualityUpdateClassification: 'security' | 'nonSecurity';
}

/** Union type for catalog entries */
export type CatalogEntryType = FeatureUpdateCatalogEntry | QualityUpdateCatalogEntry;

/** Response type for catalog entries API */
export interface CatalogEntriesResponse {
  '@odata.context'?: string;
  value: CatalogEntryType[];
}

/** Update version info returned by useUpdateVersions hook */
export interface UpdateVersionInfo {
  /** Feature update version from API, null if API fails */
  featureUpdateVersion: string | null;
  /** Quality update release from API, null if API fails */
  qualityUpdateRelease: string | null;
  /** Whether either version is currently loading */
  isLoading: boolean;
  /** Whether either version failed to load */
  isError: boolean;
  /** Function to refetch both versions */
  refetch: () => void;
}

// ============================================================
// Organization (tenant info)
// ============================================================

export interface Organization {
  id: string;
  displayName: string;
}

// ============================================================
// Union type for all policy types
// ============================================================

export type AnyPolicy =
  | WindowsUpdateForBusinessConfiguration
  | WindowsFeatureUpdateProfile
  | WindowsQualityUpdateProfile
  | WindowsQualityUpdatePolicy;
