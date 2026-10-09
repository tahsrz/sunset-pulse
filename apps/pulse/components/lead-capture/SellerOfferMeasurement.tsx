'use client';
import React, { useEffect, useRef, useState } from 'react';
export function SellerOfferMeasurement() {
  const [enabled, setEnabled] = useState(false);
  const [feedback, setFeedback] = useState('');
  const visitId = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const id = visitId.current ||= crypto.randomUUID();
    const controller = new AbortController();
    const send = async (type: 'visit' | 'offer_click') => {
      try {
        const response = await fetch('/api/seller-offer-events', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent: true, visitId: id, type, campaign: new URL(location.href).searchParams.get('utm_campaign')?.slice(0,80) || null }) });
        if (!response.ok) throw new Error();
      } catch { if (!controller.signal.aborted) setFeedback('Optional measurement is unavailable. Your request form still works.'); }
    };
    void send('visit');
    const form = document.getElementById('request');
    const click = () => { void send('offer_click'); };
    form?.addEventListener('submit', click);
    return () => { controller.abort(); form?.removeEventListener('submit', click); };
  }, [enabled]);
  return <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-400"><label className="flex items-start gap-2"><input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); setFeedback(''); }} />Allow optional anonymous offer measurement for this visit. We record a visit and a request-button action with a campaign label; no contact details or raw referrer.</label>{feedback ? <p role="status" className="mt-2">{feedback}</p> : null}</div>;
}
