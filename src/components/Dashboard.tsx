import * as React from 'react';
import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useIntunePolicies } from '../hooks/useIntunePolicies';
import {
  compareUpdateRings,
  compareFeatureUpdates,
  compareExpeditePolicies,
  GOLDEN_UPDATE_RING,
  GOLDEN_FEATURE_UPDATE,
  GOLDEN_EXPEDITE_POLICY,
} from '../utils/comparisonEngine';
import {
  patchUpdateRing,
  patchFeatureUpdateProfile,
  patchQualityUpdateProfile,
  createUpdateRing,
  createFeatureUpdateProfile,
  createQualityUpdateProfile,
} from '../services/graphService';
import type { PolicyComparisonResult, FieldComparisonResult } from '../types/graph';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Plus,
  Wrench,
  Loader2,
} from 'lucide-react';

// ============================================================
// Sub-components
// ============================================================

interface FieldRowProps {
  field: FieldComparisonResult;
}

function FieldRow({ field }: FieldRowProps): React.JSX.Element {
  return (
    <div
      className={`flex items-start justify-between py-2 px-3 rounded text-sm ${
        field.isMatch ? 'bg-green-950/30' : 'bg-yellow-950/30'
      }`}
    >
      <span className="font-mono text-slate-300 flex-shrink-0 mr-4">{field.field}</span>
      <div className="flex items-center gap-2 text-right">
        {field.isMatch ? (
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        )}
        {!field.isMatch && (
          <span className="text-yellow-300 text-xs">
            Got: <code>{JSON.stringify(field.actual)}</code>
          </span>
        )}
      </div>
    </div>
  );
}

interface PolicyCardProps {
  result: PolicyComparisonResult;
  onFixDeviation: (result: PolicyComparisonResult) => void;
  isFixing: boolean;
}

function PolicyCard({ result, onFixDeviation, isFixing }: PolicyCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const deviationCount = result.fields.filter((f) => !f.isMatch).length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-base font-semibold truncate">
              {result.policyName}
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1 font-mono">{result.policyId}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {result.isFullyCompliant ? (
              <Badge className="bg-green-700 text-green-100 border-green-600">
                ✓ Compliant
              </Badge>
            ) : (
              <Badge className="bg-yellow-700 text-yellow-100 border-yellow-600">
                ⚠ {deviationCount} deviation{deviationCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-white p-0 h-auto"
        >
          {expanded ? 'Hide' : 'Show'} {result.fields.length} fields
        </Button>

        {expanded && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {result.fields.map((field) => (
              <FieldRow key={field.field} field={field} />
            ))}
          </div>
        )}

        {!result.isFullyCompliant && (
          <Button
            size="sm"
            onClick={() => onFixDeviation(result)}
            disabled={isFixing}
            className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
          >
            {isFixing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            Fix Deviation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface PolicySectionProps {
  title: string;
  results: PolicyComparisonResult[];
  onFixDeviation: (result: PolicyComparisonResult) => void;
  fixingId: string | null;
  onDeploy: () => void;
  isDeploying: boolean;
}

function PolicySection({
  title,
  results,
  onFixDeviation,
  fixingId,
  onDeploy,
  isDeploying,
}: PolicySectionProps): React.JSX.Element {
  const compliantCount = results.filter((r) => r.isFullyCompliant).length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">
            {compliantCount}/{results.length} policies compliant
          </p>
        </div>
        <Button
          size="sm"
          onClick={onDeploy}
          disabled={isDeploying}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isDeploying ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Deploy Standard
        </Button>
      </div>

      {results.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 border-dashed">
          <CardContent className="py-8 text-center text-slate-500">
            No policies found. Deploy the standard to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((result) => (
            <PolicyCard
              key={result.policyId}
              result={result}
              onFixDeviation={onFixDeviation}
              isFixing={fixingId === result.policyId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Deploy Dialog
// ============================================================

interface DeployDialogProps {
  open: boolean;
  policyType: 'updateRing' | 'featureUpdate' | 'expeditePolicy' | null;
  onConfirm: (kundeName: string) => void;
  onCancel: () => void;
  isDeploying: boolean;
}

function DeployDialog({
  open,
  policyType,
  onConfirm,
  onCancel,
  isDeploying,
}: DeployDialogProps): React.JSX.Element {
  const [kundeName, setKundeName] = useState('');

  const needsKundeName = policyType === 'updateRing';

  const handleConfirm = (): void => {
    onConfirm(kundeName);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Deploy Standard Policy</DialogTitle>
          <DialogDescription className="text-slate-400">
            This will POST the Golden Standard payload to your Intune tenant.
          </DialogDescription>
        </DialogHeader>

        {needsKundeName && (
          <div className="space-y-2">
            <label htmlFor="kundeName" className="text-sm font-medium text-slate-300">
              Customer Name (<code className="text-blue-400">$kunde</code>)
            </label>
            <input
              id="kundeName"
              type="text"
              value={kundeName}
              onChange={(e) => setKundeName(e.target.value)}
              placeholder="e.g. contoso"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500">
              Policy will be named:{' '}
              <code className="text-blue-400">
                default_aad_{kundeName || 'kunde'}_win-update
              </code>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeploying || (needsKundeName && !kundeName.trim())}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isDeploying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main Dashboard
// ============================================================

export function Dashboard(): React.JSX.Element {
  const { instance, accounts } = useMsal();
  const queryClient = useQueryClient();
  const { updateRings, featureUpdates, expeditePolicies, isLoading, isError, errors, refetchAll } =
    useIntunePolicies();

  const [fixingId, setFixingId] = useState<string | null>(null);
  const [deployDialog, setDeployDialog] = useState<{
    open: boolean;
    policyType: 'updateRing' | 'featureUpdate' | 'expeditePolicy' | null;
  }>({ open: false, policyType: null });

  const userName = accounts[0]?.name ?? accounts[0]?.username ?? 'User';

  // ---- Comparison Results ----
  const updateRingResults = compareUpdateRings(updateRings);
  const featureUpdateResults = compareFeatureUpdates(featureUpdates);
  const expediteResults = compareExpeditePolicies(expeditePolicies);

  const totalPolicies =
    updateRingResults.length + featureUpdateResults.length + expediteResults.length;
  const compliantPolicies = [
    ...updateRingResults,
    ...featureUpdateResults,
    ...expediteResults,
  ].filter((r) => r.isFullyCompliant).length;

  // ---- Fix Deviation Mutation ----
  const fixMutation = useMutation({
    mutationFn: async (result: PolicyComparisonResult) => {
      const deviatingFields = result.fields.filter((f) => !f.isMatch);

      // Build patch with only deviating fields, explicitly excluding
      // read-only fields and complex nested objects that Graph API rejects in PATCH requests
      const READ_ONLY_FIELDS = new Set([
        '@odata.type',
        'id',
        'displayName',
        'description',
        'installationSchedule',    // nested object — requires special PATCH handling
        'expeditedUpdateSettings', // nested object — requires special PATCH handling
      ]);
      const patch: Record<string, unknown> = {};
      deviatingFields
        .filter((f) => !READ_ONLY_FIELDS.has(f.field))
        .forEach((f) => {
          patch[f.field] = f.expected;
        });

      if (Object.keys(patch).length === 0) {
        // Nothing patchable — all deviations are in read-only fields
        return;
      }

      if (result.policyType === 'updateRing') {
        await patchUpdateRing(result.policyId, patch as Parameters<typeof patchUpdateRing>[1]);
      } else if (result.policyType === 'featureUpdate') {
        await patchFeatureUpdateProfile(result.policyId, patch as Parameters<typeof patchFeatureUpdateProfile>[1]);
      } else {
        await patchQualityUpdateProfile(result.policyId, patch as Parameters<typeof patchQualityUpdateProfile>[1]);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intune'] });
      setFixingId(null);
    },
    onError: () => {
      setFixingId(null);
    },
  });

  const handleFixDeviation = (result: PolicyComparisonResult): void => {
    setFixingId(result.policyId);
    fixMutation.mutate(result);
  };

  // ---- Deploy Standard Mutation ----
  const deployMutation = useMutation({
    mutationFn: async ({ policyType, kundeName }: { policyType: 'updateRing' | 'featureUpdate' | 'expeditePolicy'; kundeName: string }) => {
      if (policyType === 'updateRing') {
        const payload = {
          ...GOLDEN_UPDATE_RING,
          displayName: `default_aad_${kundeName}_win-update`,
        };
        await createUpdateRing(payload);
      } else if (policyType === 'featureUpdate') {
        await createFeatureUpdateProfile(GOLDEN_FEATURE_UPDATE);
      } else {
        await createQualityUpdateProfile(GOLDEN_EXPEDITE_POLICY);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intune'] });
      setDeployDialog({ open: false, policyType: null });
    },
  });

  const handleDeployConfirm = (kundeName: string): void => {
    if (!deployDialog.policyType) return;
    deployMutation.mutate({ policyType: deployDialog.policyType, kundeName });
  };

  const handleSignOut = (): void => {
    void instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
          <p className="text-slate-400">Loading Intune policies...</p>
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (isError) {
    const errorMessages = errors.filter(Boolean).map((e) => e?.message ?? 'Unknown error');
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-red-800 max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-red-400">Failed to Load Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessages.map((msg, i) => (
              <p key={i} className="text-sm text-slate-300 font-mono bg-slate-800 p-2 rounded">
                {msg}
              </p>
            ))}
            <Button onClick={refetchAll} className="w-full bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Main Dashboard ----
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">InTuneUp</h1>
            <p className="text-xs text-slate-400">Windows Update Policy Manager</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-white">{userName}</p>
              <p className="text-xs text-slate-400">
                {compliantPolicies}/{totalPolicies} policies compliant
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetchAll}
              className="text-slate-400 hover:text-white"
              title="Refresh all policies"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm text-slate-300">
              {compliantPolicies} Compliant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-slate-300">
              {totalPolicies - compliantPolicies} Deviating
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-sm text-slate-300">{totalPolicies} Total</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <PolicySection
          title="Update Rings"
          results={updateRingResults}
          onFixDeviation={handleFixDeviation}
          fixingId={fixingId}
          onDeploy={() => setDeployDialog({ open: true, policyType: 'updateRing' })}
          isDeploying={deployMutation.isPending && deployDialog.policyType === 'updateRing'}
        />

        <PolicySection
          title="Feature Update Profiles"
          results={featureUpdateResults}
          onFixDeviation={handleFixDeviation}
          fixingId={fixingId}
          onDeploy={() => setDeployDialog({ open: true, policyType: 'featureUpdate' })}
          isDeploying={deployMutation.isPending && deployDialog.policyType === 'featureUpdate'}
        />

        <PolicySection
          title="Expedite / Quality Update Profiles"
          results={expediteResults}
          onFixDeviation={handleFixDeviation}
          fixingId={fixingId}
          onDeploy={() => setDeployDialog({ open: true, policyType: 'expeditePolicy' })}
          isDeploying={deployMutation.isPending && deployDialog.policyType === 'expeditePolicy'}
        />
      </main>

      {/* Deploy Dialog */}
      <DeployDialog
        open={deployDialog.open}
        policyType={deployDialog.policyType}
        onConfirm={handleDeployConfirm}
        onCancel={() => setDeployDialog({ open: false, policyType: null })}
        isDeploying={deployMutation.isPending}
      />
    </div>
  );
}
