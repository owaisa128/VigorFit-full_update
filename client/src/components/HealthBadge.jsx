import React from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw } from '../icons';

export default function HealthBadge({ healthData, httpStatus, loading, error, onRetry }) {
  return (
    <section className="mx-auto my-4 max-w-7xl px-4 pb-10 sm:my-8 sm:px-6 sm:pb-14 lg:px-8">
      <div className="rounded-2xl border border-[#E10600]/20 bg-gradient-to-br from-[#121116] to-[#09090C] p-5 shadow-xl sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-[#E10600]/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#E10600]/30 bg-[#050505] p-2.5 text-[#E10600]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">Backend API Health Monitor</h3>
            <p className="mt-1 text-xs text-[#B8B8C2]">Live endpoint status · GET /api/health</p>
          </div>
        </div>

        <button
          onClick={onRetry}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-[#E10600]/30 bg-[#050505] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#E10600]' : 'text-[#FCA5A5]'}`} />
          Test Endpoint
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-[#B8B8C2]">
          <RefreshCw className="h-5 w-5 animate-spin text-[#E10600]" />
          Connecting to backend server...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <div className="mb-1 flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="w-4 h-4" />
            Backend Connection Offline
          </div>
          <p className="mb-2 text-xs text-rose-300/80">
            Could not reach <code className="bg-[#050505] px-1.5 py-0.5 rounded text-rose-200">http://localhost:5000/api/health</code>.
          </p>
          {httpStatus && <p className="mb-2 font-mono text-xs text-rose-200">HTTP {httpStatus}</p>}
          <p className="text-xs text-[#B8B8C2]">
            Make sure the backend server is running (<code className="text-white">cd server && npm run dev</code>).
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              API Service Operational
            </div>
            <span className="w-fit rounded border border-emerald-500/30 bg-[#050505] px-2 py-1 font-mono text-xs text-emerald-400">
              HTTP {httpStatus} OK
            </span>
            <p className="text-xs text-[#B8B8C2]">Status reflects the live endpoint response.</p>
          </div>

          {healthData && (
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#050505] p-4 font-mono text-xs text-[#B8B8C2]">
              <div className="mb-2 text-[#FCA5A5]/70">// Live server JSON response</div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[#D6D6DE]">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
