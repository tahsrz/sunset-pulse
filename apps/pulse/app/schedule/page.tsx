'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SchedulePage() {
  const params = useSearchParams();
  const appointmentType = params.get('appointmentType') || 'buyer_consultation';
  const site = params.get('site') || '';
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [message, setMessage] = useState(''); const [result, setResult] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); setResult('Submitting...');
    const lead = await fetch('/api/sites/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: site, site, name, email, message: message || `Requesting a ${appointmentType.replaceAll('_', ' ')}.`, source: 'agent_site', pagePath: '/schedule', consent: true }) }).then((response) => response.json());
    if (!lead?.data?.id || !lead?.data?.funnelId) { setResult(lead?.error || 'We could not save your request.'); return; }
    const start = new Date(`${date}T${time}:00`).toISOString(); const end = new Date(new Date(start).getTime() + 45 * 60000).toISOString();
    const booking = await fetch('/api/scheduling/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.data.id, funnelId: lead.data.funnelId, site, appointmentType, startTime: start, endTime: end, attendee: { name, email, timeZone: 'America/Chicago' } }) }).then((response) => response.json());
    setResult(booking.ok ? 'Your consultation request is confirmed.' : booking.error || 'We could not confirm that time.');
  }
  return <main className="min-h-screen bg-slate-950 px-5 py-16 text-slate-100"><form onSubmit={submit} className="mx-auto max-w-xl space-y-5 border border-white/10 bg-white/[0.04] p-6"><h1 className="text-2xl font-black">Book a consultation</h1><p className="text-sm text-slate-400">{appointmentType.replaceAll('_', ' ')} · {site || 'agent site'}</p><input required placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-white/10 bg-slate-900 p-3" /><input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-white/10 bg-slate-900 p-3" /><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full border border-white/10 bg-slate-900 p-3" /><input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full border border-white/10 bg-slate-900 p-3" /><textarea placeholder="What would you like to discuss?" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 w-full border border-white/10 bg-slate-900 p-3" /><button className="w-full bg-cyan-300 p-3 font-black text-slate-950">Request time</button>{result ? <p className="text-sm text-cyan-100">{result}</p> : null}</form></main>;
}
