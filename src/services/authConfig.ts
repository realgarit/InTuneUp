import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${(import.meta.env.VITE_AZURE_TENANT_ID as string) ?? 'organizations'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

/** The delegated permission scope required for all Intune policy operations */
export const GRAPH_SCOPES = {
  deviceManagement: 'DeviceManagementConfiguration.ReadWrite.All',
  userRead: 'User.Read',
} as const;

export const loginRequest = {
  scopes: [GRAPH_SCOPES.deviceManagement, GRAPH_SCOPES.userRead],
};
