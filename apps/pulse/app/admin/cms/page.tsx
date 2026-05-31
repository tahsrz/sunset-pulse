'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Cable,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Fuel,
  Gauge,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  ShoppingBasket,
  TerminalSquare,
  Wrench,
} from 'lucide-react';
import { toast } from 'react-toastify';

type CmsConnectorStatus = 'online' | 'degraded' | 'offline';

type CmsTransaction = {
  id: string;
  journalSequence: string;
  transactionSetId: string;
  terminalBatch: string;
  registerId: string;
  tillId: string;
  cashier: string;
  completedAt: string;
  department: string;
  plu?: string;
  subtotal: number;
  tax: number;
  total: number;
  tender: string;
  paymentNetwork?: string;
  itemCount: number;
  flags: string[];
};

type CmsDepartment = {
  name: string;
  netSales: number;
  transactionCount: number;
  marginHint: 'high' | 'medium' | 'low' | 'unknown';
};

type CmsRegister = {
  id: string;
  label: string;
  status: CmsConnectorStatus;
  lastHeartbeat: string;
  openShift: string;
  tillId: string;
  terminalBatch: string;
  drawerExpected: number;
};

type CmsSyncRun = {
  id: string;
  source: string;
  tool: string;
  command?: string;
  schema?: string;
  status: CmsConnectorStatus;
  startedAt: string;
  completedAt: string;
  recordsPulled: number;
  recordsAccepted: number;
  warningCount: number;
};

type CmsSummary = {
  config: {
    siteName: string;
    siteController: string;
    controllerIp: string;
    baseVersion: string;
    mode: 'read-only' | 'staged-write' | 'live-write';
    pollingIntervalSeconds: number;
    connectorRuntime: 'python' | 'ruby' | 'node';
    allowedExports: string[];
  };
  metrics: {
    grossSales: number;
    departmentSales: number;
    transactionCount: number;
    averageTicket: number;
    flaggedTransactions: number;
    openWarnings: number;
  };
  cores: Array<{
    name: string;
    status: CmsConnectorStatus;
    responsibility: string;
    lastCheck: string;
  }>;
  registers: CmsRegister[];
  departments: CmsDepartment[];
  tenderSummary: Array<{
    tender: string;
    count: number;
    amount: number;
    settlementState: 'open' | 'balanced' | 'review';
  }>;
  fuelPositions: Array<{
    id: string;
    dispenser: string;
    status: CmsConnectorStatus;
    currentMode: string;
    lastSaleGallons: number;
    lastSaleAmount: number;
  }>;
  journalEvents: Array<{
    sequence: string;
    source: string;
    level: 'info' | 'warning' | 'error';
    occurredAt: string;
    message: string;
  }>;
  recentTransactions: CmsTransaction[];
  syncRuns: CmsSyncRun[];
  usbBridge: {
    status: 'ready' | 'attached' | 'ingesting' | 'error';
    mode: 'mock' | 'usb-serial' | 'file-drop';
    deviceLabel: string;
    portName: string;
    vendorId?: string;
    productId?: string;
    lastHeartbeat: string;
    lastBatchId?: string;
    acceptedRecords: number;
    warning?: string;
  };
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value: number) => currency.format(value);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

const statusStyles: Record<CmsConnectorStatus, string> = {
  online: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  degraded: 'border-amber-300/40 bg-amber-400/10 text-amber-100',
  offline: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
};

const statusIcon: Record<CmsConnectorStatus, ReactNode> = {
  online: <CheckCircle2 className="h-4 w-4" />,
  degraded: <AlertTriangle className="h-4 w-4" />,
  offline: <AlertTriangle className="h-4 w-4" />,
};

function StatusPill({ status }: { status: CmsConnectorStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusStyles[status]}`}>
      {statusIcon[status]}
      {status}
    </span>
  );
}

function MetricTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{detail}</p>
    </div>
  );
}

export default function CmsCommandCenter() {
  const [summary, setSummary] = useState<CmsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [siteController, setSiteController] = useState('RubyCi-14-104');
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(300);
  const [connectorRuntime, setConnectorRuntime] = useState<'python' | 'ruby' | 'node'>('python');

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms');
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'CMS endpoint failed');
      }

      setSummary(result.data);
      setSiteController(result.data.config.siteController);
      setPollingIntervalSeconds(result.data.config.pollingIntervalSeconds);
      setConnectorRuntime(result.data.config.connectorRuntime);
    } catch (error) {
      toast.error('CMS mock data failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const topDepartment = useMemo(() => {
    if (!summary?.departments.length) return null;
    return [...summary.departments].sort((a, b) => b.netSales - a.netSales)[0];
  }, [summary]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteController,
          pollingIntervalSeconds,
          connectorRuntime,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'CMS config save failed');
      }

      setSummary((current) =>
        current
          ? {
              ...current,
              config: result.data.config,
            }
          : current
      );
      toast.success('CMS connector settings staged in read-only mode.');
    } catch (error) {
      toast.error('Unable to stage CMS connector settings.');
    } finally {
      setSaving(false);
    }
  };

  const simulateUsbAttach = async () => {
    setBridgeLoading(true);
    try {
      const res = await fetch('/api/cms/usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'attached',
          mode: 'usb-serial',
          deviceLabel: 'RubyCi USB export bridge',
          portName: 'COM7',
          vendorId: '11CA',
          productId: '0220',
          warning: 'Simulated local attach. Replace with scripts/cms_usb_bridge.py when the cable is plugged in.',
        }),
      });

      if (!res.ok) throw new Error('USB attach simulation failed');
      toast.success('USB bridge attached in local simulation.');
      fetchSummary();
    } catch {
      toast.error('Unable to update USB bridge state.');
    } finally {
      setBridgeLoading(false);
    }
  };

  const simulateUsbBatch = async () => {
    setBridgeLoading(true);
    try {
      const res = await fetch('/api/cms/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: `SIM-USB-${Date.now()}`,
          source: 'RubyCi USB export bridge',
          records: summary?.recentTransactions || [],
          warnings: ['Dummy transset batch accepted. No payment payloads included.'],
        }),
      });

      if (!res.ok) throw new Error('USB batch simulation failed');
      toast.success('USB transaction batch accepted.');
      fetchSummary();
    } catch {
      toast.error('Unable to submit USB ingest batch.');
    } finally {
      setBridgeLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center gap-3 text-cyan-100">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-[0.22em]">Loading CMS command surface</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(15,23,42,0.96),rgba(20,83,45,0.36),rgba(8,47,73,0.72))] px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                Read-only integration
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
                CMS Command Center
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                Configure the RubyCi/CMS bridge, watch dummy POS sync runs, and preview the operating dashboard before the real connector is attached.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={fetchSummary}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link
                href="/admin/cms/setup"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                <Wrench className="h-4 w-4" />
                RubyCi Setup
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Staging' : 'Stage Config'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={<ShoppingBasket className="h-5 w-5" />}
            label="Mock gross"
            value={formatCurrency(summary.metrics.grossSales)}
            detail={`${summary.metrics.transactionCount} recent transactions`}
          />
          <MetricTile
            icon={<Database className="h-5 w-5" />}
            label="Dept rollup"
            value={formatCurrency(summary.metrics.departmentSales)}
            detail={topDepartment ? `${topDepartment.name} leads the day` : 'No departments loaded'}
          />
          <MetricTile
            icon={<Gauge className="h-5 w-5" />}
            label="Avg ticket"
            value={formatCurrency(summary.metrics.averageTicket)}
            detail={`${summary.metrics.flaggedTransactions} flagged receipts`}
          />
          <MetricTile
            icon={<Activity className="h-5 w-5" />}
            label="Open warnings"
            value={String(summary.metrics.openWarnings)}
            detail="Register or sync attention needed"
          />
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto rounded-lg border border-white/10 bg-white/[0.06] p-6 max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                <Cable className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black text-white">USB Bridge Readiness</h2>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                    summary.usbBridge.status === 'ready'
                      ? 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100'
                      : summary.usbBridge.status === 'error'
                        ? 'border-rose-300/40 bg-rose-400/10 text-rose-100'
                        : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                  }`}>
                    {summary.usbBridge.status}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  {summary.usbBridge.deviceLabel} on <span className="font-mono text-cyan-100">{summary.usbBridge.portName}</span>. Last heartbeat {formatTime(summary.usbBridge.lastHeartbeat)}.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  VID/PID {summary.usbBridge.vendorId || 'unknown'}:{summary.usbBridge.productId || 'unknown'} / Mode {summary.usbBridge.mode}
                  {summary.usbBridge.lastBatchId ? ` / Last batch ${summary.usbBridge.lastBatchId}` : ''}
                </p>
                {summary.usbBridge.warning && <p className="mt-2 text-sm text-amber-200">{summary.usbBridge.warning}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={simulateUsbAttach}
                disabled={bridgeLoading}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-60"
              >
                <Cable className="h-4 w-4" />
                Sim Attach
              </button>
              <button
                type="button"
                onClick={simulateUsbBatch}
                disabled={bridgeLoading}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                <Database className="h-4 w-4" />
                Sim Batch
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Connector Setup</h2>
                <p className="mt-1 text-sm text-slate-300">Dummy settings for the future local bridge.</p>
              </div>
              <TerminalSquare className="h-6 w-6 text-cyan-100" />
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Site controller</span>
                <input
                  value={siteController}
                  onChange={(event) => setSiteController(event.target.value)}
                  className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-200/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Polling interval</span>
                <input
                  type="number"
                  min={60}
                  step={60}
                  value={pollingIntervalSeconds}
                  onChange={(event) => setPollingIntervalSeconds(Number(event.target.value))}
                  className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-200/60"
                />
              </label>

              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Bridge runtime</span>
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-md border border-white/10 bg-slate-950/70 p-1">
                  {(['python', 'ruby', 'node'] as const).map((runtime) => (
                    <button
                      key={runtime}
                      type="button"
                      onClick={() => setConnectorRuntime(runtime)}
                      className={`rounded px-3 py-2 text-sm font-bold capitalize ${
                        connectorRuntime === runtime ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {runtime}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-emerald-200/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
                Production writes are intentionally locked. This surface stages connector preferences and models approved report/export ingestion only.
              </div>

              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Controller IP</p>
                  <p className="mt-1 font-mono text-cyan-100">{summary.config.controllerIp}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Base</p>
                  <p className="mt-1 font-mono text-cyan-100">{summary.config.baseVersion}</p>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Allowed read exports</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary.config.allowedExports.map((exportName) => (
                    <span key={exportName} className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                      {exportName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Registers</h2>
                <p className="mt-1 text-sm text-slate-300">Heartbeat and drawer preview from the mocked CMS stream.</p>
              </div>
              <Server className="h-6 w-6 text-cyan-100" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {summary.registers.map((register) => (
                <div key={register.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{register.label}</p>
                      <p className="text-xs text-slate-400">{register.id}</p>
                    </div>
                    <StatusPill status={register.status} />
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      {formatTime(register.lastHeartbeat)}
                    </p>
                    <p>Shift: <span className="font-bold text-white">{register.openShift}</span></p>
                    <p>Till: <span className="font-bold text-white">{register.tillId}</span></p>
                    <p>Batch: <span className="font-bold text-white">{register.terminalBatch}</span></p>
                    <p>Drawer: <span className="font-bold text-white">{formatCurrency(register.drawerExpected)}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Controller Cores</h2>
                <p className="mt-1 text-sm text-slate-300">Store, forecourt, EPS, and service lanes modeled from Commander docs.</p>
              </div>
              <Server className="h-6 w-6 text-cyan-100" />
            </div>

            <div className="space-y-3">
              {summary.cores.map((core) => (
                <div key={core.name} className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="font-black text-white">{core.name}</p>
                    <StatusPill status={core.status} />
                  </div>
                  <p className="text-sm text-slate-300">{core.responsibility}</p>
                  <p className="mt-2 text-xs text-slate-500">Last check {formatTime(core.lastCheck)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Department Sales</h2>
                <p className="mt-1 text-sm text-slate-300">Dummy rollups from RubyCi-style departments.</p>
              </div>
              <Fuel className="h-6 w-6 text-cyan-100" />
            </div>

            <div className="space-y-3">
              {summary.departments.map((department) => {
                const percent = Math.max(8, Math.round((department.netSales / summary.metrics.departmentSales) * 100));
                return (
                  <div key={department.name} className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-white">{department.name}</p>
                        <p className="text-xs text-slate-400">{department.transactionCount} transactions</p>
                      </div>
                      <p className="text-sm font-black text-cyan-100">{formatCurrency(department.netSales)}</p>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Recent Transactions</h2>
                <p className="mt-1 text-sm text-slate-300">Sanitized receipts only. No card data enters Sunset Pulse.</p>
              </div>
              <FileText className="h-6 w-6 text-cyan-100" />
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10">
              <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr] bg-slate-900/90 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <span>Receipt</span>
                <span>Dept</span>
                <span>Tender</span>
                <span className="text-right">Total</span>
              </div>
              {summary.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr] border-t border-white/10 px-4 py-4 text-sm">
                  <div>
                    <p className="font-bold text-white">{transaction.id}</p>
                    <p className="text-xs text-slate-400">{transaction.journalSequence} / {transaction.registerId}</p>
                    <p className="text-xs text-slate-500">{transaction.tillId} at {formatTime(transaction.completedAt)}</p>
                  </div>
                  <span className="text-slate-200">{transaction.department}<br /><span className="text-xs text-slate-500">{transaction.plu}</span></span>
                  <span className="text-slate-200">{transaction.tender}<br /><span className="text-xs text-slate-500">{transaction.paymentNetwork}</span></span>
                  <div className="text-right">
                    <p className="font-black text-white">{formatCurrency(transaction.total)}</p>
                    {transaction.flags.length > 0 && (
                      <p className="text-xs text-amber-200">{transaction.flags.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto mb-6 grid max-w-7xl gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black text-white">Tender Summary</h2>
              <p className="mt-1 text-sm text-slate-300">Settlement-style totals for cash, network, fleet, and lottery tenders.</p>
            </div>
            <div className="space-y-3">
              {summary.tenderSummary.map((tender) => (
                <div key={tender.tender} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm">
                  <div>
                    <p className="font-black text-white">{tender.tender}</p>
                    <p className="text-xs text-slate-500">{tender.count} transactions</p>
                  </div>
                  <p className="font-black text-cyan-100">{formatCurrency(tender.amount)}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                    {tender.settlementState}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black text-white">Forecourt Positions</h2>
              <p className="mt-1 text-sm text-slate-300">Dummy dispenser/DCR state from the forecourt lane.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.fuelPositions.map((position) => (
                <div key={position.id} className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{position.id}</p>
                      <p className="text-xs text-slate-500">{position.dispenser}</p>
                    </div>
                    <StatusPill status={position.status} />
                  </div>
                  <p className="text-sm text-slate-300">Mode: <span className="font-bold text-white">{position.currentMode}</span></p>
                  <p className="mt-1 text-sm text-slate-300">
                    Last sale: <span className="font-bold text-white">{position.lastSaleGallons.toFixed(2)} gal</span> / {formatCurrency(position.lastSaleAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mb-6 max-w-7xl rounded-lg border border-white/10 bg-white/[0.06] p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-white">Journal Browser Preview</h2>
            <p className="mt-1 text-sm text-slate-300">Operational journal events used for sync diagnostics and audit context.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {summary.journalEvents.map((event) => (
              <div key={event.sequence} className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold text-cyan-100">{event.sequence}</p>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    event.level === 'info' ? 'bg-emerald-400/10 text-emerald-100' : event.level === 'warning' ? 'bg-amber-400/10 text-amber-100' : 'bg-rose-400/10 text-rose-100'
                  }`}>
                    {event.level}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{event.source} / {formatTime(event.occurredAt)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{event.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-white/[0.06] p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Sync Runs</h2>
              <p className="mt-1 text-sm text-slate-300">The bridge contract we will replace with live RubyCi/CMS ingestion.</p>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Export Mock JSON
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {summary.syncRuns.map((run) => (
              <div key={run.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{run.source}</p>
                    <p className="text-xs text-slate-400">{run.tool} / {run.id}</p>
                    {(run.command || run.schema) && (
                      <p className="mt-1 font-mono text-xs text-cyan-100">
                        {[run.command, run.schema].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <StatusPill status={run.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-white/[0.06] p-3">
                    <p className="text-lg font-black text-white">{run.recordsPulled}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Pulled</p>
                  </div>
                  <div className="rounded-md bg-white/[0.06] p-3">
                    <p className="text-lg font-black text-white">{run.recordsAccepted}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Accepted</p>
                  </div>
                  <div className="rounded-md bg-white/[0.06] p-3">
                    <p className="text-lg font-black text-white">{run.warningCount}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Warnings</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
