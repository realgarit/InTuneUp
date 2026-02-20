# **Software Design Plan: InTuneUp**

## **1\. Architecture & Authentication Overview**

* **Hosting:** Azure Static Web Apps (Serverless, low cost, scalable).  
* **Frontend Framework:** React (Vite) with TypeScript.  
* **State Management / Data Fetching:** @tanstack/react-query (For caching, loading states, and simplifying Graph calls \- KISS principle).  
* **UI Components:** shadcn/ui and Tailwind CSS for a modern, native-feeling dashboard.  
* **Authentication:** @azure/msal-react (Microsoft Authentication Library).  
* **App Registration:** A single Multi-Tenant Entra ID App Registration located in the MSP's tenant.  
* **API Permissions (Delegated):** \* DeviceManagementConfiguration.ReadWrite.All (Required to read/write Update Rings, Feature, and Expedite profiles).  
  * User.Read (To get the logged-in IT Tech's profile).

## **2\. Microsoft Graph API Endpoints & Property Mapping**

*Note: We will primarily use the /beta endpoint. While v1.0 exists, Intune's Windows Update features iterate rapidly in the /beta namespace.*

### **Category 1: Update Rings (Windows Update for Business)**

* **Endpoint:** https://graph.microsoft.com/beta/deviceManagement/deviceConfigurations  
* **HTTP Method (Read):** GET (Filter by @odata.type eq '\#microsoft.graph.windowsUpdateForBusinessConfiguration')  
* **HTTP Method (Create):** POST  
* **HTTP Method (Update):** PATCH /deviceConfigurations/{id}

**JSON Payload Mapping (Golden Standard):**

{  
  "@odata.type": "\#microsoft.graph.windowsUpdateForBusinessConfiguration",  
  "displayName": "default\_aad\_kunde\_win-update",  
  "description": "Standardized Update Ring via InTuneUp",  
  "microsoftUpdateServiceAllowed": true,  
  "driversExcluded": false,  
  "qualityUpdatesDeferralPeriodInDays": 7,  
  "featureUpdatesDeferralPeriodInDays": 90,  
  "allowWindows11Upgrade": true,  
  "featureUpdatesRollbackWindowInDays": 60,  
  "businessReadyUpdatesOnly": "businessReadyOnly",  
  "automaticUpdateMode": "autoInstallAndRebootAtMaintenanceTime",  
  "userPauseAccess": "disabled",  
  "userWindowsUpdateScanAccess": "enabled",  
  "deadlineForFeatureUpdatesInDays": 14,  
  "deadlineForQualityUpdatesInDays": 7,  
  "deadlineGracePeriodInDays": 1,  
  "autoRestartNotificationDismissal": "notConfigured",  
  "updateNotificationLevel": "defaultNotifications",  
  "postponeRebootUntilAfterDeadline": false  
}

**Note on `installationSchedule`:** When `automaticUpdateMode` is `"autoInstallAndRebootAtMaintenanceTime"`, Windows uses its own managed maintenance windows — the `installationSchedule` field is not applicable and is excluded from compliance comparison. It is not included in the Golden Standard for this mode.

### **Category 2: Feature Update Policy**

* **Endpoint:** https://graph.microsoft.com/beta/deviceManagement/windowsFeatureUpdateProfiles  
* **HTTP Method (Read):** GET  
* **HTTP Method (Create):** POST  
* **HTTP Method (Update):** PATCH /windowsFeatureUpdateProfiles/{id}

**JSON Payload Mapping:**

{  
  "@odata.type": "\#microsoft.graph.windowsFeatureUpdateProfile",  
  "displayName": "default\_winupdate",  
  "description": "No Description",  
  "featureUpdateVersion": "Windows 11, version 25H2",  
  "installFeatureUpdatesOptional": false  
}

### **Category 3: Expedite Policy (Quality Updates)**

* **Endpoint:** https://graph.microsoft.com/beta/deviceManagement/windowsQualityUpdateProfiles  
* **HTTP Method (Read):** GET  
* **HTTP Method (Create):** POST  
* **HTTP Method (Update):** PATCH /windowsQualityUpdateProfiles/{id}

**JSON Payload Mapping:**

{  
  "@odata.type": "\#microsoft.graph.windowsQualityUpdateProfile",  
  "displayName": "Expedite \- 2026.02 B Security Update",  
  "description": "Emergency hotpatch expedite",  
  "expeditedUpdateSettings": {  
    "@odata.type": "microsoft.graph.expeditedWindowsQualityUpdateSettings",  
    "qualityUpdateRelease": "02/10/2026 \- 2026.02 B",  
    "daysUntilForcedReboot": 1  
  }  
}

## **3\. Application Workflow & State Management**

1. **Auth Context:** User logs in. MSAL acquires an Access Token scoped to DeviceManagementConfiguration.ReadWrite.All.  
2. **Dashboard Load (React Query):** \* Fire parallel useQuery hooks to the 3 endpoints. React Query handles the loading spinners and caches the result.  
3. **Comparison Engine (Pure Function):**  
   * A standalone utility function computes the delta between the fetched JSON states and our hardcoded "Golden Standard" JSON objects.  
   * UI renders green checkmarks for matching properties, and yellow warnings for deviations.  
4. **Action Dispatch:**  
   * If a user toggles a fix, construct a PATCH payload containing *only* the corrected properties.  
   * If creating a new policy, prompt for the $kunde name, format the displayName, and POST the full Golden Standard JSON payload.  
5. **Persistence:**  
   * Standard browser caching is used for MSAL tokens (session persistence).  
   * A prominent "Sign Out" button clears local/session storage and MSAL cache.

## **4\. Software Design Principles (InTuneUp Specifics)**

* **SOLID (Single Responsibility):** UI components will not contain fetch logic. Data fetching will be abstracted into custom hooks (e.g., useIntunePolicies()).  
* **DRY (Don't Repeat Yourself):** A centralized GraphService class/module will intercept all API calls to automatically inject the MSAL Bearer token and handle standard HTTP errors.  
* **KISS (Keep It Simple, Stupid):** Avoid complex global state managers like Redux. React Query will manage server state, and local React useState will manage form toggles.  
* **YAGNI (You Aren't Gonna Need It):** The app's scope is strictly limited to Windows Update configurations. We will not build generic Intune policy browsing capabilities.

## **5\. Testing Strategy**

* **Framework:** Vitest (fast, native to Vite) and @testing-library/react.  
* **Unit Testing (Logic):** The "Comparison Engine" must have 100% test coverage. We will test edge cases (e.g., policy exists but is missing a specific nested key, policy has wrong data types).  
* **Component Testing:** Verify that shadcn/ui warning badges render correctly when the Comparison Engine outputs a delta.  
* **API Mocking:** Use **MSW (Mock Service Worker)** to intercept Graph API calls during tests and return dummy JSON payloads. This ensures tests run in isolation without requiring active Entra ID authentication or an Intune tenant.

## **6\. Required Azure Setup Checklist**

1. Go to **App Registrations** \-\> New Registration.  
2. Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant \- Multitenant)**.  
3. Redirect URI: SPA (Single Page Application) \-\> http://localhost:5173 (for local dev) and https://your-production-url.com.  
4. API Permissions \-\> Add a permission \-\> Microsoft Graph \-\> Delegated permissions \-\> Add DeviceManagementConfiguration.ReadWrite.All.  
5. Enable "Access tokens" and "ID tokens" in the Authentication tab.