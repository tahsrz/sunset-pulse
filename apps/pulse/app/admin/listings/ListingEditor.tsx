'use client';

import React, { useState, type FormEvent } from 'react';
import { landDetailsFromEditor, listingEditorSchema } from '@/lib/data/listingEditor';
import PropertyLandDetails from '@/components/property/PropertyLandDetails';
import type { z } from 'zod';

type Values = Record<string, string | number | boolean | null | undefined>;
type ListingResponse = { success?: boolean; data?: Values; message?: string };

const endpoint = '/api/admin/listings';
const fieldClass = 'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-300';
const secondaryButton = 'min-h-11 rounded-lg border border-slate-600 px-4 font-semibold hover:bg-slate-800 disabled:opacity-50';
const row = 'grid gap-4 sm:grid-cols-2';

export default function ListingEditor() {
  const [values, setValues] = useState<Values>({});
  const [formKey, setFormKey] = useState(0);
  const [lookup, setLookup] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  const [review, setReview] = useState<{ form: FormData; fields: z.output<typeof listingEditorSchema> }>();
  const value = (name: string, fallback = '') => String(values[name] ?? fallback);

  function resetForm(next: Values) {
    setReview(undefined);
    setValues(next);
    setFormKey((key) => key + 1);
  }

  async function send(url: string, request?: RequestInit) {
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await fetch(url, { ...request, cache: 'no-store' });
      const result: ListingResponse = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message ?? 'The listing could not be updated. Check your access and try again.');
      }
      resetForm(result.data);
      setLookup(String(result.data.mls_id ?? ''));
      setNotice({ text: request ? 'Listing saved.' : 'Listing loaded.', error: false });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'The listing could not be updated.', error: true });
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = listingEditorSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setReview(undefined);
      setNotice({ text: parsed.error.issues[0]?.message || 'Check the listing details.', error: true });
      return;
    }
    setNotice(undefined);
    setReview({ form, fields: parsed.data });
  }

  function textField(name: string, label: string, options: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <label key={name} className="block text-sm font-medium">
        {label}
        <input className={fieldClass} name={name} defaultValue={value(name)} {...options} />
      </label>
    );
  }

  const status = value('listing_status', 'Active');
  const statuses = [...new Set(['Active', 'Coming Soon', 'Active Under Contract', 'Pending', 'Sold', 'Closed', 'Withdrawn', 'Expired', status])];

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        void send(`${endpoint}?${new URLSearchParams({ mlsId: lookup.trim() })}`);
      }}>
        <label className="min-w-0 flex-1 text-sm font-medium">
          Look up by MLS ID
          <input value={lookup} onChange={(event) => setLookup(event.target.value)} className={fieldClass} maxLength={40} required />
        </label>
        <button type="submit" disabled={busy} className={secondaryButton}>Load listing</button>
        <button type="button" disabled={busy} className={secondaryButton} onClick={() => {
          resetForm({});
          setLookup('');
          setNotice(undefined);
        }}>New listing</button>
      </form>

      <form key={formKey} onSubmit={save} onChange={() => { setReview(undefined); setNotice(undefined); }} className="space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <fieldset disabled={busy} className={row}>
          <legend className="mb-4 text-lg font-semibold">Listing details</legend>
          {textField('mls_id', 'MLS ID', { required: true, maxLength: 40 })}
          {textField('street', 'Street address', { required: true, maxLength: 180 })}
          {textField('city', 'City', { required: true, maxLength: 100 })}
          {textField('state', 'State', { required: true, defaultValue: value('state', 'TX'), maxLength: 2 })}
          {textField('zip', 'ZIP code', { required: true, maxLength: 10 })}
          {textField('type', 'Property type', { required: true, defaultValue: value('type', 'Residential'), list: 'listing-types' })}
          <datalist id="listing-types"><option>Residential</option><option>Residential Lease</option><option>Commercial Sale</option><option>Land</option></datalist>
          {textField('property_subtype', 'Property subtype')}
          <label className="text-sm font-medium">
            Listing status
            <select name="listing_status" className={fieldClass} defaultValue={status}>{statuses.map((option) => <option key={option}>{option}</option>)}</select>
          </label>
          <label className="text-sm font-medium">
            Transaction type
            <select name="price_type" className={fieldClass} defaultValue={value('price_type', 'sale')}>
              <option value="sale">For sale</option><option value="lease">For lease</option><option value="unknown">Unknown</option>
            </select>
          </label>
          {textField('price', 'Listing price ($)', { type: 'number', min: 0.01, step: '0.01', required: true })}
        </fieldset>

        <fieldset disabled={busy} className={row}>
          <legend className="mb-4 text-lg font-semibold">Property information</legend>
          {textField('beds', 'Bedrooms', { type: 'number', min: 0 })}
          {textField('baths', 'Bathrooms', { type: 'number', min: 0 })}
          {textField('sqft', 'Living area (sq ft)', { type: 'number', min: 1 })}
          {textField('lot_size_sqft', 'Lot size (sq ft)', { type: 'number', min: 1 })}
          {textField('lot_size_acres', 'Lot size (acres)', { type: 'number', min: 0.000001, step: 'any' })}
          {textField('lot_dimensions', 'Lot dimensions')}
          {textField('year_built', 'Year built', { type: 'number', min: 1600 })}
          {textField('year_built_details', 'Year built details')}
          {textField('builder', 'Builder')}
          {textField('levels', 'Levels', { maxLength: 40 })}
          <label className="text-sm font-medium">
            Attached garage
            <select name="attached_garage" className={fieldClass} defaultValue={value('attached_garage')}>
              <option value="">Unspecified</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </label>
          {textField('subdivision', 'Subdivision')}
          {textField('county', 'County')}
          {textField('listing_agent', 'Listing agent')}
          {textField('listing_office', 'Listing brokerage')}
          <label className="text-sm font-medium sm:col-span-2">Public description
            <textarea name="description" className={fieldClass} defaultValue={value('description')} rows={4} maxLength={5000} />
          </label>
        </fieldset>

        <fieldset disabled={busy} className={row}>
          <legend className="mb-4 text-lg font-semibold">Land and development details</legend>
          <input type="hidden" name="land_details_present" value="on" />
          <p className="text-sm text-slate-300 sm:col-span-2">These details and document links are public on land listings. Distinguish concepts from approvals and include the source and date for verified facts.</p>
          {textField('land_marketed_acres', 'Marketed acreage (acres)', { type: 'number', min: 0.000001, step: 'any', max: 1_000_000 })}
          {textField('land_surveyed_acres', 'Surveyed acreage (acres)', { type: 'number', min: 0.000001, step: 'any', max: 1_000_000 })}
          {([
            ['land_zoning', 'Zoning and source', 500],
            ['land_development_status', 'Development status and approvals', 1500],
            ['land_constraints', 'Constraints and due diligence', 1500],
          ] as const).map(([name, label, maxLength]) => <label key={name} className="block text-sm font-medium sm:col-span-2">{label}<textarea name={name} className={fieldClass} defaultValue={value(name)} maxLength={maxLength} rows={3} /></label>)}
          <label className="block text-sm font-medium sm:col-span-2">Supporting documents (one per line, up to 8)
            <textarea name="land_documents" className={fieldClass} defaultValue={value('land_documents')} rows={3} maxLength={18000} placeholder="City zoning packet | https://example.com/zoning.pdf" aria-describedby="land-document-help" />
          </label>
          <p id="land-document-help" className="text-sm text-slate-300 sm:col-span-2">Enter Label | HTTPS URL. Use documents approved for public sharing.</p>
        </fieldset>

        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-4 text-lg font-semibold">Photos and publishing</legend>
          <label className="block text-sm font-medium">Photo URLs (one per line)
            <textarea name="photo_urls" className={fieldClass} defaultValue={value('photo_urls')} rows={3} maxLength={16000} />
          </label>
          {textField('photo', 'Upload a primary photo (up to 3 MB)', { type: 'file', accept: 'image/jpeg,image/png,image/webp', defaultValue: undefined })}
          <label className="grid gap-1 text-sm font-semibold">
            Image type
            <select name="photo_kind" className={fieldClass} defaultValue={value('photo_kind')}>
              <option value="">Property photo</option>
              <option value="rendering">Exterior rendering</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input name="display_public" type="checkbox" defaultChecked={values.display_public === true} /> Publish to the public catalog</label>
          <label className="flex items-center gap-2"><input name="is_featured" type="checkbox" defaultChecked={values.is_featured === true} /> Mark as featured</label>
          <p className="text-sm text-slate-300">Active public listings appear in the homepage slideshow when they have an image that loads.</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-teal-300 px-5 font-bold text-slate-950 hover:bg-teal-200 disabled:opacity-50">Review listing</button>
          {notice ? <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'text-rose-200' : 'text-teal-100'}>{notice.text}</p> : null}
          {values.display_public === true && values.mls_id ? (
            <a href={`/properties/${encodeURIComponent(String(values.mls_id))}`} className="text-teal-200 underline underline-offset-4">View public listing</a>
          ) : null}
        </div>
        {review && <section aria-label="Review listing before saving" className="space-y-4 rounded-xl border border-teal-300 p-4">
          <h2 className="text-lg font-semibold">Review listing before saving</h2>
          <p className="text-sm text-slate-300">This draft has not been saved. Changing any field requires a new review.</p>
          <p className="break-words font-semibold">{review.fields.street}, {review.fields.city}, {review.fields.state} {review.fields.zip}</p>
          <p>{review.fields.type} · {review.fields.listing_status} · {review.fields.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}{review.fields.price_type === 'lease' ? ' / month' : ''}</p>
          <p>{review.fields.display_public ? 'Will be published to the public catalog.' : 'Will be saved as a private listing.'}</p>
          {review.fields.description && <p className="whitespace-pre-line break-words">{review.fields.description}</p>}
          {review.fields.type === 'Land' && <PropertyLandDetails details={landDetailsFromEditor(review.fields)} />}
          <button type="button" disabled={busy} className="min-h-11 rounded-lg bg-teal-300 px-5 font-bold text-slate-950 hover:bg-teal-200 disabled:opacity-50" onClick={() => void send(endpoint, { method: 'PUT', body: review.form })}>Save reviewed listing</button>
        </section>}
      </form>
    </div>
  );
}
