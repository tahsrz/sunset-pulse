'use client';

import { useState } from 'react';

type ScanAsset = {
  assetId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  capturedAt: string;
};

export default function ScanMediaGallery({ scanId, assets }: { scanId: string; assets: ScanAsset[] }) {
  return (
    <div className="mt-3 space-y-3">
      {assets.map((asset) => <ScanMediaItem key={asset.assetId || `${asset.fileName}-${asset.capturedAt}`} scanId={scanId} asset={asset} />)}
    </div>
  );
}

function ScanMediaItem({ scanId, asset }: { scanId: string; asset: ScanAsset }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const open = async () => {
    if (!asset.assetId) {
      setError('Legacy capture has no stable asset identity.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/property-scans/${encodeURIComponent(scanId)}/assets/${encodeURIComponent(asset.assetId)}/preview`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to open private media.');
      setUrl(body.data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open private media.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-300">{asset.fileName}</span><button type="button" onClick={() => void open()} disabled={loading} className="shrink-0 rounded-full border border-teal-200/30 px-3 py-1 font-black uppercase tracking-widest text-teal-100 disabled:opacity-50">{loading ? 'Opening…' : url ? 'Refresh' : 'Inspect'}</button></div>{error && <p className="mt-2 text-xs text-rose-200">{error}</p>}{url && (asset.mimeType.startsWith('video/') ? <video controls preload="metadata" src={url} className="mt-3 max-h-72 w-full rounded-lg bg-black" /> : <img src={url} alt={`Private capture ${asset.fileName}`} className="mt-3 max-h-72 w-full rounded-lg object-contain" />)}</div>;
}
