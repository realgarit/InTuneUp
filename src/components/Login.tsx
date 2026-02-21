import * as React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../services/authConfig';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ShieldCheck } from 'lucide-react';

export function Login(): React.JSX.Element {
  const { instance } = useMsal();

  const handleLogin = (): void => {
    void instance.loginRedirect(loginRequest);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700 text-white">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-blue-600 rounded-full">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">InTuneUp</CardTitle>
          <CardDescription className="text-slate-400">
            Windows Update Policy Management for Microsoft Intune
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400 text-center">
            Sign in with your Microsoft 365 account to manage Windows Update policies
            across your Intune tenant.
          </p>
          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
          >
            Sign in with Microsoft
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Required permissions:
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-none">
            <li className="flex items-center justify-center gap-2">
              <span className="text-blue-400">•</span>
              <code className="text-blue-400">DeviceManagementConfiguration.ReadWrite.All</code>
            </li>
            <li className="flex items-center justify-center gap-2">
              <span className="text-blue-400">•</span>
              <code className="text-blue-400">WindowsUpdates.ReadWrite.All</code>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
