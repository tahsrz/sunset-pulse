'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  propertyProfileSchema, propertyProfileStateSchema,
  type PropertyProfile, type PropertyProfileAction, type PropertyProfilePoint, type PropertyProfileState,
} from '@/lib/realtor-workspace/propertyProfileContract';
import { FieldbookShell } from './FieldbookShell';
import { LazyPropertySketchMap, PropertyProfileView, propertySketchPins } from './PropertyProfileView';

const blankProfile: PropertyProfile = { title: '', area: '', acres: null, summary: '', buildings: [] };
const field = 'mt-1 block w-full rounded-lg border border-white/30 bg-slate-950 px-3 py-2 text-base';
const button = 'inline-flex min-h-11 items-center rounded-lg border border-cyan-300/40 px-4 py-2 font-medium text-cyan-100 disabled:opacity-50';
const panel = 'space-y-4 rounded-2xl border border-white/20 bg-slate-900 p-5 sm:p-6';
const heading = 'font-sans text-xl font-medium italic';
const numberValue = (value: string) => value === '' ? null : Number(value);
type Building = PropertyProfile['buildings'][number];

export function PropertyProfileEditor({ leadId }: { leadId: string }) {
  const [saved, setSaved] = useState<PropertyProfileState>();
  const [draft, setDraft] = useState<PropertyProfile>(blankProfile);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [includeMap, setIncludeMap] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [copyableLink, setCopyableLink] = useState('');
  const inflight = useRef(false);
  const endpoint = `/api/realtor/property-profile?leadId=${encodeURIComponent(leadId)}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.ok) {
          throw new Error(response.status === 401 ? 'Sign in to open this seller case.' : body.error || 'Could not open the property profile.');
        }
        const value = propertyProfileStateSchema.parse(body.result);
        if (controller.signal.aborted) return;
        setSaved(value);
        setDraft(value?.draft ?? blankProfile);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not open the property profile.');
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint]);

  const update = (value: PropertyProfile) => {
    setDraft(value);
    setReviewed(false);
    setNotice('');
  };
  const updateBuilding = (id: string, change: Partial<Building>) => {
    update({ ...draft, buildings: draft.buildings.map(item => item.id === id ? { ...item, ...change } : item) });
  };
  const placePin = (point: PropertyProfilePoint) => {
    if (target === 'driveway') update({ ...draft, driveway: point });
    else if (target) updateBuilding(target, { pin: point });
    setTarget('');
  };
  const mutate = async (action: PropertyProfileAction, success: string) => {
    if (saved === undefined || inflight.current || reloadRequired) return;
    inflight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        if (response.status === 409 || response.status >= 500) setReloadRequired(true);
        setError(body.error || 'Could not update the property profile.');
        return;
      }
      const value = propertyProfileStateSchema.parse(body.result);
      setSaved(value);
      if (action.action === 'save' && value) setDraft(value.draft);
      setReviewed(false);
      setCopyableLink('');
      setNotice(success);
    } catch {
      setReloadRequired(true);
      setError('The update could not be confirmed. Reload to check the current version.');
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  };

  const pins = propertySketchPins(draft);
  const dirty = JSON.stringify(saved?.draft ?? blankProfile) !== JSON.stringify(draft);
  const revision = saved?.revision ?? 0;
  const disabled = busy || reloadRequired;
  const sharePath = saved?.shareToken ? `/property-profile/${saved.shareToken}` : '';
  const preview = saved?.draft ? {
    ...saved.draft,
    driveway: includeMap ? saved.draft.driveway : undefined,
    buildings: includeMap ? saved.draft.buildings : saved.draft.buildings.map(item => ({ ...item, pin: undefined })),
  } : null;

  return (
    <FieldbookShell title="Property Profile" eyebrow="Seller Case" navigation={
      <Link className="min-h-11 content-center text-cyan-100 underline" href={`/seller-cases/${leadId}`}>Back to Seller Case</Link>
    }>
      <div className="mx-auto max-w-3xl space-y-5">
        <p className="text-lg text-slate-200">Describe the land and the buildings in your own words. Save a draft, then review the page before you share it.</p>
        {error ? <div role="alert" className="rounded-xl border border-rose-300/50 p-4">
          <p>{error}</p>
          {reloadRequired || saved === undefined ? <button type="button" className="min-h-11 underline" onClick={() => window.location.reload()}>Reload Property Profile</button> : null}
        </div> : null}
        {notice ? <p role="status" className="rounded-xl border border-cyan-300/40 p-4">{notice}</p> : null}
        {saved === undefined && !error ? <p role="status">Loading property profile…</p> : null}
        {saved !== undefined ? <>
          <form onSubmit={event => {
            event.preventDefault();
            const result = propertyProfileSchema.safeParse(draft);
            if (!result.success) {
              setError('Enter a property name and a name for each building. Check that any numbers are in range.');
              return;
            }
            void mutate({ action: 'save', expectedRevision: revision, draft: result.data }, 'Draft saved.');
          }}>
            <fieldset className="min-w-0 space-y-5" disabled={disabled}>
              <legend className="sr-only">Edit property profile</legend>
              <section className={panel}>
                <h2 className={heading}>Property Details</h2>
                <label className="block">Property Name<input className={field} value={draft.title} required maxLength={100} onChange={event => update({ ...draft, title: event.target.value })} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>Town or Area<input className={field} placeholder="Sunset, TX" value={draft.area} maxLength={100} onChange={event => update({ ...draft, area: event.target.value })} /></label>
                  <label>Acres <span className="text-slate-300">(optional)</span><input type="number" min="0.000001" max={100000} step="any" inputMode="decimal" className={field} value={draft.acres ?? ''} onChange={event => update({ ...draft, acres: numberValue(event.target.value) })} /></label>
                </div>
                <label className="block">What Should Someone Know About the Property?
                  <textarea className={field} rows={4} maxLength={1000} value={draft.summary} onChange={event => update({ ...draft, summary: event.target.value })} />
                </label>
              </section>
              <section className={panel}>
                <h2 className={heading}>Buildings</h2>
                <p className="text-slate-300">Start with the main home. Add other buildings as you go.</p>
                {draft.buildings.map((building, index) => (
                  <fieldset key={building.id} className="space-y-3 rounded-xl border border-white/20 p-4">
                    <legend className="px-2 font-semibold">Building {index + 1}</legend>
                    <label className="block">Name<input className={field} required maxLength={80} placeholder={index === 0 ? 'Main home' : 'Workshop'} value={building.name} onChange={event => updateBuilding(building.id, { name: event.target.value })} /></label>
                    <label className="block">What Is It Used For? <span className="text-slate-300">(optional)</span>
                      <input className={field} maxLength={200} value={building.use} onChange={event => updateBuilding(building.id, { use: event.target.value })} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label>Bedrooms<input type="number" min={0} max={30} className={field} value={building.bedrooms ?? ''} onChange={event => updateBuilding(building.id, { bedrooms: numberValue(event.target.value) })} /></label>
                      <label>Bathrooms<input type="number" min={0} max={30} step="any" className={field} value={building.bathrooms ?? ''} onChange={event => updateBuilding(building.id, { bathrooms: numberValue(event.target.value) })} /></label>
                    </div>
                    <button type="button" className="min-h-11 underline" aria-label={`Remove building ${index + 1}`} onClick={() => {
                      update({ ...draft, buildings: draft.buildings.filter(item => item.id !== building.id) });
                      if (target === building.id) setTarget('');
                    }}>Remove Building</button>
                  </fieldset>
                ))}
                <button type="button" className={button} disabled={draft.buildings.length >= 24} onClick={() => update({
                  ...draft, buildings: [...draft.buildings, { id: crypto.randomUUID(), name: '', use: '', bedrooms: null, bathrooms: null }],
                })}>Add a Building</button>
              </section>
              <section className={panel}>
                <h2 className={heading}>Property Sketch</h2>
                <p className="text-slate-300">Use the aerial map to show where the driveway and buildings are. You can skip this part.</p>
                <button type="button" className={button} aria-expanded={mapOpen} onClick={() => {
                  setMapOpen(open => !open);
                  setTarget('');
                }}>{mapOpen ? 'Close Aerial Map' : 'Open Aerial Map'}</button>
                {mapOpen ? <>
                  <label className="block">Where Should the Pin Go?
                    <select className={field} value={target} onChange={event => setTarget(event.target.value)}>
                      <option value="">Choose a driveway or building</option>
                      <option value="driveway">Driveway</option>
                      {draft.buildings.map((item, index) => <option key={item.id} value={item.id}>{item.name.trim() || `Building ${index + 1}`}</option>)}
                    </select>
                  </label>
                  {target ? <p role="status">Pan to the property, then tap the spot or place the pin at the center of the map.</p> : null}
                  <LazyPropertySketchMap pins={pins} onPlace={target && !disabled ? placePin : undefined} onCancel={() => setTarget('')} />
                </> : null}
                {pins.length ? <ul className="space-y-1">
                  {pins.map(pin => <li key={pin.id} className="flex flex-wrap items-center justify-between gap-x-3">
                    <span>{pin.label}</span>
                    <button type="button" className="min-h-11 underline" aria-label={`Remove pin for ${pin.label}`} onClick={() => {
                      if (pin.id === 'driveway') update({ ...draft, driveway: undefined });
                      else updateBuilding(pin.id, { pin: undefined });
                    }}>Remove Pin</button>
                  </li>)}
                </ul> : null}
              </section>
              <button type="submit" className={button} disabled={!dirty}>Save Draft</button>
            </fieldset>
          </form>
          <section className={panel} aria-busy={busy}>
            <h2 className={heading}>Share Property Profile</h2>
            <p>Anyone with the link can open the page. You can stop sharing at any time.</p>
            {sharePath ? <div className="space-y-2">
              <p className="text-cyan-100">Your link is active. Draft edits stay private until you update the shared page.</p>
              <div className="flex flex-wrap gap-2">
                <a className={button} href={sharePath} target="_blank" rel="noopener noreferrer">Open Shared Page</a>
                <button type="button" className={button} disabled={disabled} onClick={async () => {
                  const link = new URL(sharePath, window.location.origin).href;
                  setCopyableLink(link);
                  try {
                    await navigator.clipboard.writeText(link);
                    setNotice('Link copied.');
                  } catch {
                    setNotice('Select the link below to copy it.');
                  }
                }}>Copy Link</button>
                <button type="button" className={button} disabled={disabled} onClick={() => void mutate({
                  action: 'revoke', expectedRevision: revision,
                }, 'Sharing stopped. The old link no longer opens the profile.')}>Stop Sharing</button>
              </div>
              {copyableLink ? <label className="block">Share Link<input readOnly className={field} value={copyableLink} onFocus={event => event.currentTarget.select()} /></label> : null}
            </div> : null}
            {dirty || !preview ? <p>Save your draft to review what people will see.</p> : <>
              {pins.length ? <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5" checked={includeMap} disabled={disabled} onChange={event => {
                  setIncludeMap(event.target.checked);
                  setReviewed(false);
                }} /> Include the map and its pin locations in the link
              </label> : null}
              <PropertyProfileView profile={preview} preview />
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5" checked={reviewed} disabled={disabled} onChange={event => setReviewed(event.target.checked)} />
                I’ve reviewed what people will see.
              </label>
              <button type="button" className={button} disabled={!reviewed || disabled} onClick={() => void mutate({
                action: 'publish', expectedRevision: revision, includeMap: includeMap && pins.length > 0,
              }, sharePath ? 'Shared page updated.' : 'Share link created.')}>{sharePath ? 'Update Shared Page' : 'Create Share Link'}</button>
            </>}
          </section>
        </> : null}
      </div>
    </FieldbookShell>
  );
}
