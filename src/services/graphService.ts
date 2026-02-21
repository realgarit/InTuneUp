import { msalInstance, loginRequest } from './authConfig';
import type {
  ODataListResponse,
  WindowsUpdateForBusinessConfiguration,
  WindowsFeatureUpdateProfile,
  WindowsQualityUpdateProfile,
  WindowsQualityUpdatePolicy,
  FeatureUpdateCatalogEntry,
  QualityUpdateCatalogEntry,
  Organization,
} from '../types/graph';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/beta';
const GRAPH_V1_BASE_URL = 'https://graph.microsoft.com/v1.0';

// ============================================================
// Token Acquisition
// ============================================================

async function acquireToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No authenticated account found. Please sign in.');
  }

  const account = accounts[0];
  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  } catch {
    // Silent acquisition failed — fall back to interactive popup
    const result = await msalInstance.acquireTokenPopup({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  }
}

// ============================================================
// HTTP Helpers (DRY — centralized error handling)
// ============================================================

async function buildHeaders(): Promise<HeadersInit> {
  const token = await acquireToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[GraphService] ${response.status} ${response.statusText}`, {
      url: response.url,
      body: errorBody,
    });
    throw new Error(
      `Graph API error ${response.status} ${response.statusText}: ${errorBody}`
    );
  }
  // 204 No Content (e.g., PATCH success) returns no body
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

async function graphGet<T>(endpoint: string): Promise<T> {
  const headers = await buildHeaders();
  const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  const result = await handleResponse<T>(response);
  // Temporary debug logging — useful for validating raw API field values
  console.log(`[GraphService] GET ${endpoint} response:`, JSON.stringify(result, null, 2));
  return result;
}

async function graphGetV1<T>(endpoint: string): Promise<T> {
  const headers = await buildHeaders();
  const response = await fetch(`${GRAPH_V1_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  const result = await handleResponse<T>(response);
  console.log(`[GraphService] GET v1.0${endpoint} response:`, JSON.stringify(result, null, 2));
  return result;
}

async function graphPost<TBody, TResponse>(
  endpoint: string,
  body: TBody
): Promise<TResponse> {
  const headers = await buildHeaders();
  const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<TResponse>(response);
}

async function graphPatch<TBody>(
  endpoint: string,
  body: Partial<TBody>
): Promise<void> {
  const headers = await buildHeaders();
  console.log(`[GraphService] PATCH ${GRAPH_BASE_URL}${endpoint}`, JSON.stringify(body, null, 2));
  const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

// ============================================================
// Update Rings — windowsUpdateForBusinessConfiguration
// ============================================================

const UPDATE_RINGS_ENDPOINT = `/deviceManagement/deviceConfigurations?$filter=isof('microsoft.graph.windowsUpdateForBusinessConfiguration')`;
const UPDATE_RING_BY_ID = (id: string) => `/deviceManagement/deviceConfigurations/${id}`;

export async function fetchUpdateRings(): Promise<WindowsUpdateForBusinessConfiguration[]> {
  const response = await graphGet<ODataListResponse<WindowsUpdateForBusinessConfiguration>>(
    UPDATE_RINGS_ENDPOINT
  );
  return response.value;
}

export async function createUpdateRing(
  payload: Omit<WindowsUpdateForBusinessConfiguration, 'id'>
): Promise<WindowsUpdateForBusinessConfiguration> {
  return graphPost<
    Omit<WindowsUpdateForBusinessConfiguration, 'id'>,
    WindowsUpdateForBusinessConfiguration
  >('/deviceManagement/deviceConfigurations', payload);
}

export async function patchUpdateRing(
  id: string,
  payload: Partial<WindowsUpdateForBusinessConfiguration>
): Promise<void> {
  // deviceConfigurations is a polymorphic collection — @odata.type is REQUIRED
  // in PATCH requests to identify the concrete type for model validation.
  const patchPayload = {
    '@odata.type': '#microsoft.graph.windowsUpdateForBusinessConfiguration' as const,
    ...payload,
  };
  return graphPatch<WindowsUpdateForBusinessConfiguration>(
    UPDATE_RING_BY_ID(id),
    patchPayload
  );
}

// ============================================================
// Feature Update Profiles — windowsFeatureUpdateProfile
// ============================================================

const FEATURE_UPDATES_ENDPOINT = '/deviceManagement/windowsFeatureUpdateProfiles';
const FEATURE_UPDATE_BY_ID = (id: string) =>
  `/deviceManagement/windowsFeatureUpdateProfiles/${id}`;

export async function fetchFeatureUpdateProfiles(): Promise<WindowsFeatureUpdateProfile[]> {
  const response = await graphGet<ODataListResponse<WindowsFeatureUpdateProfile>>(
    FEATURE_UPDATES_ENDPOINT
  );
  return response.value;
}

export async function createFeatureUpdateProfile(
  payload: Omit<WindowsFeatureUpdateProfile, 'id'>
): Promise<WindowsFeatureUpdateProfile> {
  return graphPost<
    Omit<WindowsFeatureUpdateProfile, 'id'>,
    WindowsFeatureUpdateProfile
  >(FEATURE_UPDATES_ENDPOINT, payload);
}

export async function patchFeatureUpdateProfile(
  id: string,
  payload: Partial<WindowsFeatureUpdateProfile>
): Promise<void> {
  return graphPatch<WindowsFeatureUpdateProfile>(FEATURE_UPDATE_BY_ID(id), payload);
}

// ============================================================
// Expedite Update Profiles — windowsQualityUpdateProfile
// ============================================================

const QUALITY_UPDATES_ENDPOINT = '/deviceManagement/windowsQualityUpdateProfiles';
const QUALITY_UPDATE_BY_ID = (id: string) =>
  `/deviceManagement/windowsQualityUpdateProfiles/${id}`;

export async function fetchQualityUpdateProfiles(): Promise<WindowsQualityUpdateProfile[]> {
  const response = await graphGet<ODataListResponse<WindowsQualityUpdateProfile>>(
    QUALITY_UPDATES_ENDPOINT
  );
  return response.value;
}

export async function createQualityUpdateProfile(
  payload: Omit<WindowsQualityUpdateProfile, 'id'>
): Promise<WindowsQualityUpdateProfile> {
  return graphPost<
    Omit<WindowsQualityUpdateProfile, 'id'>,
    WindowsQualityUpdateProfile
  >(QUALITY_UPDATES_ENDPOINT, payload);
}

export async function patchQualityUpdateProfile(
  id: string,
  payload: Partial<WindowsQualityUpdateProfile>
): Promise<void> {
  return graphPatch<WindowsQualityUpdateProfile>(QUALITY_UPDATE_BY_ID(id), payload);
}

// ============================================================
// Windows Quality Update Policies (hotpatch) — windowsQualityUpdatePolicy
// ============================================================

const QUALITY_UPDATE_POLICIES_ENDPOINT = '/deviceManagement/windowsQualityUpdatePolicies';
const QUALITY_UPDATE_POLICY_BY_ID = (id: string) =>
  `/deviceManagement/windowsQualityUpdatePolicies/${id}`;

export async function fetchQualityUpdatePolicies(): Promise<WindowsQualityUpdatePolicy[]> {
  const response = await graphGet<ODataListResponse<WindowsQualityUpdatePolicy>>(
    QUALITY_UPDATE_POLICIES_ENDPOINT
  );
  return response.value;
}

export async function createQualityUpdatePolicy(
  payload: Omit<WindowsQualityUpdatePolicy, 'id'>
): Promise<WindowsQualityUpdatePolicy> {
  return graphPost<
    Omit<WindowsQualityUpdatePolicy, 'id'>,
    WindowsQualityUpdatePolicy
  >(QUALITY_UPDATE_POLICIES_ENDPOINT, payload);
}

export async function patchQualityUpdatePolicy(
  id: string,
  payload: Partial<WindowsQualityUpdatePolicy>
): Promise<void> {
  const patchPayload = {
    '@odata.type': '#microsoft.graph.windowsQualityUpdatePolicy' as const,
    ...payload,
  };
  return graphPatch<WindowsQualityUpdatePolicy>(QUALITY_UPDATE_POLICY_BY_ID(id), patchPayload);
}

// ============================================================
// Windows Autopatch Catalog - Update Version Discovery
// ============================================================

const CATALOG_ENDPOINT = '/admin/windows/updates/catalog/entries';

/**
 * Fetches the latest feature update version from the Windows Autopatch catalog.
 * Returns null if the API call fails (permission not granted, network error, etc.)
 */
export async function getLatestFeatureUpdateVersion(): Promise<string | null> {
  try {
    const response = await graphGet<ODataListResponse<FeatureUpdateCatalogEntry>>(
      `${CATALOG_ENDPOINT}?$filter=isof('microsoft.graph.windowsUpdates.featureUpdateCatalogEntry')&$orderby=releaseDateTime desc&$top=1`
    );
    return response.value[0]?.version ?? null;
  } catch (error) {
    console.error('[GraphService] Failed to fetch feature update catalog:', error);
    return null;
  }
}

/**
 * Fetches the latest expeditable quality update release from the Windows Autopatch catalog.
 * Returns null if the API call fails (permission not granted, network error, etc.)
 */
export async function getLatestQualityUpdateRelease(): Promise<string | null> {
  try {
    // Use the full type path for isExpeditable filter as required by OData
    // See: https://learn.microsoft.com/graph/windowsupdates-deploy-expedited-update
    const response = await graphGet<ODataListResponse<QualityUpdateCatalogEntry>>(
      `${CATALOG_ENDPOINT}?$filter=isof('microsoft.graph.windowsUpdates.qualityUpdateCatalogEntry') and microsoft.graph.windowsUpdates.qualityUpdateCatalogEntry/isExpeditable eq true&$orderby=releaseDateTime desc&$top=1`
    );
    // Return releaseDateTime (ISO format) to match what policies store in qualityUpdateRelease
    return response.value[0]?.releaseDateTime ?? null;
  } catch (error) {
    console.error('[GraphService] Failed to fetch quality update catalog:', error);
    return null;
  }
}

// ============================================================
// Organization (tenant info)
// ============================================================

/**
 * Fetches the tenant's friendly display name from the organization endpoint.
 * Uses the v1.0 API since this is a stable, non-beta resource.
 * Returns null if the API call fails (permission not granted, network error, etc.)
 */
export async function getOrganization(): Promise<string | null> {
  try {
    const response = await graphGetV1<ODataListResponse<Organization>>('/organization');
    return response.value[0]?.displayName ?? null;
  } catch (error) {
    console.error('[GraphService] Failed to fetch organization:', error);
    return null;
  }
}
