'use client';

import React, { useState, type FormEvent } from 'react';

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
  const value = (name: string, fallback = '') => String(values[name] ?? fallback);

  function resetForm(next: Values) {
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
    void send(endpoint, { method: 'PUT', body: new FormData(event.currentTarget) });
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

      <form key={formKey} onSubmit={save} className="space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <fieldset disabled={busy} className={row}>
          <legend className="mb-4 text-lg font-semibold">Listing details</legend>
          {textField('mls_id', 'MLS ID', { required: true, maxLength: 40 })}
          {textField('street', 'Street address', { required: true, maxLength: 180 })}
          {textField('city', 'City', { required: true, maxLength: 100 })}
          {textField('state', 'State', { required: true, defaultValue: value('state', 'TX'), maxLength: 2 })}
          {textField('zip', 'ZIP code', { required: true, maxLength: 10 })}
          {textField('type', 'Property type', { required: true, defaultValue: value('type', 'Residential'), list: 'listing-types' })}
          <datalist id="listing-types"><option>Residential</option><option>Commercial Sale</option><option>Land</option></datalist>
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

        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-4 text-lg font-semibold">Photos and publishing</legend>
          <label className="block text-sm font-medium">Photo URLs (one per line)
            <textarea name="photo_urls" className={fieldClass} defaultValue={value('photo_urls')} rows={3} maxLength={16000} />
          </label>
          {textField('photo', 'Upload a primary photo (up to 3 MB)', { type: 'file', accept: 'image/jpeg,image/png,image/webp', defaultValue: undefined })}
          <label className="flex items-center gap-2"><input name="display_public" type="checkbox" defaultChecked={values.display_public === true} /> Publish to the public catalog</label>
          <label className="flex items-center gap-2"><input name="is_featured" type="checkbox" defaultChecked={values.is_featured === true} /> Feature on the homepage</label>
          <p className="text-sm text-slate-300">The slideshow displays active public sale listings with photos.</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-teal-300 px-5 font-bold text-slate-950 hover:bg-teal-200 disabled:opacity-50">Save listing</button>
          {notice ? <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'text-rose-200' : 'text-teal-100'}>{notice.text}</p> : null}
          {values.display_public === true && values.mls_id ? (
            <a href={`/properties/${encodeURIComponent(String(values.mls_id))}`} className="text-teal-200 underline underline-offset-4">View public listing</a>
          ) : null}
        </div>
      </form>
    </div>
  );
}
