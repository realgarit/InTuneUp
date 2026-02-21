import * as React from 'react';
import { Github } from 'lucide-react';
import { Button } from './ui/button';
import { Logo } from './ui/Logo';

interface HeaderProps {
  userName: string;
  compliantPolicies: number;
  totalPolicies: number;
  onSignOut: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Header({
  userName,
  compliantPolicies,
  totalPolicies,
  onSignOut,
  onRefresh,
  isRefreshing = false,
}: HeaderProps): React.JSX.Element {
  // Dynamic version display with fallback
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const commitHash = import.meta.env.VITE_COMMIT_HASH || 'dev';
  const shortHash = commitHash.slice(0, 7);

  return (
    <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors duration-200">
            <Logo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">InTuneUp</h1>
            <p className="text-xs text-slate-400">Windows Update Policy Manager</p>
          </div>
        </div>

        {/* Right side: version, GitHub, user info, refresh, sign out */}
        <div className="flex items-center gap-4">
          {/* Version display */}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            v{version} ({shortHash})
          </span>

          {/* GitHub link */}
          <a
            href="https://github.com/realgar/InTuneUp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>

          {/* User info */}
          <div className="hidden sm:block text-right">
            <p className="text-sm text-white">{userName}</p>
            <p className="text-xs text-slate-400">
              {compliantPolicies}/{totalPolicies} policies compliant
            </p>
          </div>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white"
            title="Refresh all policies"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>

          {/* Sign out button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-slate-400 hover:text-white"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
