'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Download, FileSignature, RotateCcw } from 'lucide-react';

type SigningPacketView = {
  packetId: string;
  title: string;
  status: string;
  payloadHash: string;
  draftPayload: any;
  signer: {
    role: string;
    name: string;
    email?: string;
    status: string;
    signedAt?: string;
  };
  auditTrail: any[];
};

export default function SignPacketPage() {
  const params = useParams();
  const token = params?.token as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [packet, setPacket] = useState<SigningPacketView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/signing/${token}`)
      .then((res) => res.json())
      .then((json) => {
        setPacket(json.data || null);
        setTypedName(json.data?.signer?.name || '');
      })
      .catch(() => setMessage('Unable to load signing packet.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.strokeStyle = '#0f172a';
  }, [packet]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { x, y } = pointerPosition(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { x, y } = pointerPosition(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const submitSignature = async () => {
    const signatureDataUrl = canvasRef.current?.toDataURL('image/png') || '';
    if (!typedName.trim() || !hasSignature || !consentAccepted) {
      setMessage('Typed name, drawn signature, and consent are required.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/signing/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typedName,
          signatureDataUrl,
          consentAccepted,
          signedAtLocal: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Signature failed.');
      setPacket((prev) => prev ? { ...prev, status: json.data.status, signer: { ...prev.signer, status: 'signed', signedAt: json.data.signedAt } } : prev);
      setMessage('Signature applied and audit event recorded.');
    } catch (error: any) {
      setMessage(error.message || 'Unable to apply signature.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-900">Loading signing packet...</main>;
  }

  if (!packet) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-900">Signing packet not found.</main>;
  }

  const alreadySigned = packet.signer.status === 'signed';
  const draft = packet.draftPayload;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-2 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
              <FileSignature size={16} />
              Sunset Pulse Signing
            </p>
            <h1 className="mt-2 text-3xl font-black">{packet.title}</h1>
          </div>
          <div className="rounded border border-slate-300 bg-white px-3 py-2 font-mono text-[10px] uppercase text-slate-600">
            SHA-256 {packet.payloadHash.slice(0, 16)}...
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
          <section className="space-y-4 rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.14em]">Packet Review</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Fact label="Property" value={draft.transaction?.propertyAddress} />
              <Fact label="Buyer(s)" value={draft.parties?.buyers?.join(', ')} />
              <Fact label="Seller(s)" value={draft.parties?.sellers?.join(', ')} />
              <Fact label="Offer Price" value={formatMoney(draft.offer?.offerPrice)} />
              <Fact label="Earnest Money" value={formatMoney(draft.offer?.earnestMoney)} />
              <Fact label="Closing Date" value={draft.offer?.closingDate || 'N/A'} />
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Forms</p>
              <ul className="mt-2 space-y-1 text-sm">
                {draft.forms?.baseContract && <li>{draft.forms.baseContract.formName} ({draft.forms.baseContract.formId})</li>}
                {(draft.forms?.addenda || []).map((form: any) => <li key={form.formId}>{form.formName} ({form.formId})</li>)}
                {(draft.forms?.otherForms || []).map((form: any) => <li key={form.formId}>{form.formName} ({form.formId})</li>)}
              </ul>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.14em]">Signature</h2>
            <a
              href={`/api/signing/${token}/final-pdf`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-cyan-700 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-50"
            >
              <Download size={14} />
              Download Final Package PDF
            </a>
            {alreadySigned ? (
              <div className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
                <CheckCircle2 className="mb-2" />
                <p className="font-bold">Signed by {packet.signer.name}</p>
                <p className="mt-1 text-xs">Recorded at {packet.signer.signedAt ? new Date(packet.signer.signedAt).toLocaleString() : 'N/A'}.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <Fact label="Signer" value={`${packet.signer.name} (${packet.signer.role})`} />
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                  Typed name
                  <input
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-cyan-600"
                  />
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Draw signature</p>
                    <button type="button" onClick={clearSignature} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                      <RotateCcw size={13} />
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={220}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={() => setIsDrawing(false)}
                    onPointerLeave={() => setIsDrawing(false)}
                    className="h-40 w-full touch-none rounded border border-slate-300 bg-slate-50"
                  />
                </div>

                <label className="flex items-start gap-3 rounded border border-slate-300 bg-slate-50 p-3 text-sm leading-6">
                  <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-1" />
                  <span>I consent to use an electronic signature for this draft packet and acknowledge this packet is prepared for realtor review.</span>
                </label>

                {message && <p className="rounded border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-950">{message}</p>}

                <button
                  type="button"
                  onClick={submitSignature}
                  disabled={submitting}
                  className="w-full rounded bg-cyan-700 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                  {submitting ? 'Applying Signature...' : 'Apply Signature'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold">{value || 'N/A'}</p>
    </div>
  );
}

function formatMoney(value?: number | null) {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
