'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Cable,
  CheckCircle2,
  Cloud,
  FileUp,
  FolderOpen,
  Gauge,
  MonitorCheck,
  RefreshCw,
  Save,
  Server,
  TestTube2,
} from 'lucide-react';
import { toast } from 'react-toastify';

type CsiteLoginStatus = 'unknown' | 'available' | 'not-available' | 'pending';

type RubyCiSetupState = {
  rubyCiIp: string;
  backOfficeExportPath: string;
  usbWatchPath: string;
  cSiteLoginStatus: CsiteLoginStatus;
  checklist: {
    reportNavigator: boolean;
    transactionManager: boolean;
    journalBrowser: boolean;
    smsImportExport: boolean;
    cSiteManagement: boolean;
  };
  sampleImport?: {
    fileName: string;
    size: number;
    detectedFormat: 'json' | 'csv' | 'xml' | 'text' | 'unknown';
    previewRows: number;
    importedAt: string;
  };
};

type RubyCiSetupPatch = Partial<Omit<RubyCiSetupState, 'checklist'>> & {
  checklist?: Partial<RubyCiSetupState['checklist']>;
};

const checklistLabels: Array<[keyof RubyCiSetupState['checklist'], string, string]> = [
  ['reportNavigator', 'Report Navigator', 'Daily sales, department, and close reports are available.'],
  ['transactionManager', 'Transaction Manager', 'Transaction archive or t-log backup access is available.'],
  ['journalBrowser', 'Journal Browser', 'Operational register/forecourt/EPS event history is available.'],
  ['smsImportExport', 'SMS Import Export', 'XML configuration import/export utility is available.'],
  ['cSiteManagement', 'C-Site Management', 'Cloud login or remote management access is available.'],
];

const defaultSetup: RubyCiSetupState = {
  rubyCiIp: '192.168.1.104',
  backOfficeExportPath: 'C:\\RubyCi\\Exports',
  usbWatchPath: 'E:\\RubyCiExports',
  cSiteLoginStatus: 'unknown',
  checklist: {
    reportNavigator: false,
    transactionManager: false,
    journalBrowser: false,
    smsImportExport: false,
    cSiteManagement: false,
  },
};

export default function RubyCiSetupPage() {
  const [setup, setSetup] = useState<RubyCiSetupState>(defaultSetup);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const completedCount = useMemo(
    () => Object.values(setup.checklist).filter(Boolean).length,
    [setup.checklist]
  );

  const loadSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/setup');
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Setup load failed');
      setSetup(result.data);
    } catch {
      toast.error('RubyCi setup state failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  const updateSetup = (patch: RubyCiSetupPatch) => {
    setSetup((current) => ({
      ...current,
      ...patch,
      checklist: {
        ...current.checklist,
        ...(patch.checklist || {}),
      },
    }));
  };

  const saveSetup = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Setup save failed');
      setSetup(result.data);
      toast.success('RubyCi setup saved.');
    } catch {
      toast.error('RubyCi setup could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const testBridge = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/cms/usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'attached',
          mode: 'file-drop',
          deviceLabel: 'RubyCi setup bridge test',
          portName: setup.usbWatchPath || 'AUTO',
          warning: `Setup bridge test for ${setup.rubyCiIp}.`,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Bridge test failed');
      toast.success(`Bridge test accepted: ${result.data.deviceLabel}`);
    } catch {
      toast.error('Bridge test failed.');
    } finally {
      setTesting(false);
    }
  };

  const uploadSample = async (file?: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);

      const res = await fetch('/api/cms/setup', {
        method: 'PUT',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Sample upload failed');

      setSetup(result.data.setup);
      toast.success(`Sample export detected as ${result.data.setup.sampleImport.detectedFormat}.`);
    } catch {
      toast.error('Sample export could not be imported.');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    uploadSample(event.dataTransfer.files?.[0]);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
        <div className="mx-auto flex max-w-5xl items-center gap-3 text-cyan-100">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Loading RubyCi setup</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(15,23,42,0.96),rgba(20,83,45,0.32),rgba(8,47,73,0.72))] px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin/cms" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            CMS Command Center
          </Link>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                <MonitorCheck className="h-4 w-4" />
                RubyCi install wizard
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">RubyCi Setup</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                Capture the store network target, export/watch paths, C-Site access status, and first sample report so the bridge can move from mock mode to real read-only ingestion.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={testBridge}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-60"
              >
                <TestTube2 className="h-4 w-4" />
                {testing ? 'Testing' : 'Test Bridge'}
              </button>
              <button
                type="button"
                onClick={saveSetup}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving' : 'Save Setup'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Server className="h-6 w-6 text-cyan-100" />
              <div>
                <h2 className="text-xl font-black text-white">Connection Targets</h2>
                <p className="text-sm text-slate-300">Local addresses and folders for the read-only bridge.</p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">RubyCi IP address</span>
                <input
                  value={setup.rubyCiIp}
                  onChange={(event) => updateSetup({ rubyCiIp: event.target.value })}
                  placeholder="192.168.1.104"
                  className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-white outline-none focus:border-cyan-200/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Back-office export folder</span>
                <div className="relative mt-2">
                  <FolderOpen className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={setup.backOfficeExportPath}
                    onChange={(event) => updateSetup({ backOfficeExportPath: event.target.value })}
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 font-mono text-white outline-none focus:border-cyan-200/60"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">USB / watch folder</span>
                <div className="relative mt-2">
                  <Cable className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={setup.usbWatchPath}
                    onChange={(event) => updateSetup({ usbWatchPath: event.target.value })}
                    className="w-full rounded-md border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 font-mono text-white outline-none focus:border-cyan-200/60"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Cloud className="h-6 w-6 text-cyan-100" />
              <div>
                <h2 className="text-xl font-black text-white">C-Site Access</h2>
                <p className="text-sm text-slate-300">Track whether Verifone cloud/back-office login exists.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['unknown', 'pending', 'available', 'not-available'] as CsiteLoginStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateSetup({ cSiteLoginStatus: status })}
                  className={`rounded-md border px-3 py-3 text-sm font-bold capitalize ${
                    setup.cSiteLoginStatus === status
                      ? 'border-cyan-200/50 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Readiness</p>
                <p className="font-black text-cyan-100">{completedCount}/5</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${(completedCount / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Gauge className="h-6 w-6 text-cyan-100" />
              <div>
                <h2 className="text-xl font-black text-white">RubyCi Utility Checklist</h2>
                <p className="text-sm text-slate-300">Mark each access path as you confirm it at the store.</p>
              </div>
            </div>

            <div className="space-y-3">
              {checklistLabels.map(([key, title, detail]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateSetup({ checklist: { [key]: !setup.checklist[key] } as Partial<RubyCiSetupState['checklist']> })}
                  className={`flex w-full items-start gap-3 rounded-md border p-4 text-left transition ${
                    setup.checklist[key] ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-white/10 bg-slate-950/50 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 ${setup.checklist[key] ? 'text-emerald-200' : 'text-slate-600'}`} />
                  <span>
                    <span className="block font-black text-white">{title}</span>
                    <span className="mt-1 block text-sm text-slate-300">{detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="mb-6 flex items-center gap-3">
              <FileUp className="h-6 w-6 text-cyan-100" />
              <div>
                <h2 className="text-xl font-black text-white">Sample Export Importer</h2>
                <p className="text-sm text-slate-300">Drop a RubyCi report/export here for parser discovery.</p>
              </div>
            </div>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition ${
                dragActive ? 'border-cyan-200 bg-cyan-300/10' : 'border-white/20 bg-slate-950/50 hover:bg-white/10'
              }`}
            >
              <FileUp className="mb-4 h-9 w-9 text-cyan-100" />
              <span className="font-black text-white">{uploading ? 'Importing sample...' : 'Drop sample export here'}</span>
              <span className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                Supports JSON, CSV, XML, or text reports for first-pass detection.
              </span>
              <input
                type="file"
                className="hidden"
                accept=".json,.csv,.xml,.txt,.log"
                onChange={(event) => uploadSample(event.target.files?.[0])}
              />
            </label>

            {setup.sampleImport && (
              <div className="mt-5 rounded-md border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="font-black text-white">{setup.sampleImport.fileName}</p>
                <p className="mt-1 text-sm text-emerald-100">
                  {setup.sampleImport.detectedFormat.toUpperCase()} / {setup.sampleImport.previewRows} preview rows / {setup.sampleImport.size} bytes
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
