'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCopy, Download, FileDown, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  TREC_CONTRACT_ADDENDA,
  TREC_OTHER_FORMS,
  TREC_PROMULGATED_CONTRACTS
} from '@/lib/contracts/trecPromulgatedContracts';
import {
  buildOfferDraftPayload,
  stringifyOfferDraftPayload,
  type OfferDraftPayload
} from '@/lib/contracts/offerDraftMapping';

type Intake = {
  realtorName: string;
  brokerage: string;
  buyerNames: string;
  sellerNames: string;
  propertyAddress: string;
  city: string;
  county: string;
  state: string;
  mlsNumber: string;
  listPrice: string;
  offerPrice: string;
  earnestMoney: string;
  optionFee: string;
  optionDays: string;
  closingDate: string;
  financingType: string;
  downPayment: string;
  titleCompany: string;
  surveyPreference: string;
  residentialServiceContract: string;
  specialTerms: string;
  recipientEmail: string;
  effectiveDate: string;
  yearBuilt: string;
  propertyType: string;
};

type PropertyDraftData = {
  _id?: string;
  name?: string;
  type?: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    county?: string;
  };
  seller_info?: {
    name?: string;
    email?: string;
  };
  listing_brokerage?: string;
  mls_number?: string;
  list_price?: number;
  price?: number;
  year_built?: number;
};

const today = new Date().toISOString().slice(0, 10);

export default function PromulgatedContractSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceProperty, setSourceProperty] = useState<PropertyDraftData | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [intake, setIntake] = useState<Intake>({
    realtorName: '',
    brokerage: '',
    buyerNames: '',
    sellerNames: '',
    propertyAddress: '',
    city: '',
    county: '',
    state: 'TX',
    mlsNumber: '',
    listPrice: '',
    offerPrice: '',
    earnestMoney: '',
    optionFee: '300',
    optionDays: '7',
    closingDate: '',
    financingType: 'Conventional',
    downPayment: '',
    titleCompany: '',
    surveyPreference: 'Seller to furnish existing survey if available',
    residentialServiceContract: '',
    specialTerms: '',
    recipientEmail: '',
    effectiveDate: today,
    yearBuilt: '',
    propertyType: ''
  });
  const [baseContractId, setBaseContractId] = useState(TREC_PROMULGATED_CONTRACTS[0]?.formId || '');
  const [selectedAddenda, setSelectedAddenda] = useState<string[]>(['40-11', '49-1']);
  const [selectedOtherForms, setSelectedOtherForms] = useState<string[]>(['55-1']);
  const [signingPacket, setSigningPacket] = useState<any>(null);
  const [signingState, setSigningState] = useState<'idle' | 'creating' | 'created' | 'error'>('idle');
  const [signingMessage, setSigningMessage] = useState('');

  useEffect(() => {
    const propertyId = searchParams.get('propertyId');
    if (!propertyId) return;

    let cancelled = false;
    setPropertyLoading(true);
    fetch(`/api/properties/${propertyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const property = json.data || json;
        setSourceProperty(property);
        hydrateFromProperty(property);
      })
      .catch((error) => console.error('Contract property prefill failed:', error))
      .finally(() => {
        if (!cancelled) setPropertyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    const fromQuery = {
      buyerNames: searchParams.get('buyers') || '',
      sellerNames: searchParams.get('sellers') || '',
      propertyAddress: searchParams.get('address') || '',
      city: searchParams.get('city') || '',
      county: searchParams.get('county') || '',
      state: searchParams.get('state') || '',
      brokerage: searchParams.get('brokerage') || '',
      mlsNumber: searchParams.get('mlsNumber') || searchParams.get('mls') || '',
      listPrice: searchParams.get('listPrice') || '',
      offerPrice: searchParams.get('offerPrice') || '',
      yearBuilt: searchParams.get('yearBuilt') || '',
      propertyType: searchParams.get('propertyType') || searchParams.get('propertyName') || ''
    };

    if (!Object.values(fromQuery).some(Boolean)) return;

    setIntake((prev) => ({
      ...prev,
      buyerNames: fromQuery.buyerNames || prev.buyerNames,
      sellerNames: fromQuery.sellerNames || prev.sellerNames,
      propertyAddress: fromQuery.propertyAddress || prev.propertyAddress,
      city: fromQuery.city || prev.city,
      county: fromQuery.county || prev.county,
      state: fromQuery.state || prev.state,
      brokerage: fromQuery.brokerage || prev.brokerage,
      mlsNumber: fromQuery.mlsNumber || prev.mlsNumber,
      listPrice: fromQuery.listPrice || prev.listPrice,
      offerPrice: fromQuery.offerPrice || prev.offerPrice || fromQuery.listPrice,
      yearBuilt: fromQuery.yearBuilt || prev.yearBuilt,
      propertyType: fromQuery.propertyType || prev.propertyType
    }));
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    
    const currentRole = user?.profile?.role || user?.user_metadata?.role;
    const isAllowed = currentRole === 'realtor' || currentRole === 'operator' || currentRole === 'admin';
    
    console.log('[CONTRACT_SETUP_AUTH]', { 
      hasUser: !!user, 
      role: currentRole, 
      isAllowed, 
      email: user?.email 
    });

    if (!user || !isAllowed) {
      console.warn('[CONTRACT_SETUP_AUTH] Redirecting unauthorized user');
      router.push('/contracts/promulgated');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    setIntake((prev) => ({
      ...prev,
      realtorName: prev.realtorName || user?.user_metadata?.full_name || '',
      recipientEmail: prev.recipientEmail || sourceProperty?.seller_info?.email || ''
    }));
  }, [sourceProperty, user]);

  useEffect(() => {
    const recommendations = recommendForms({
      financingType: intake.financingType,
      propertyType: intake.propertyType,
      yearBuilt: intake.yearBuilt
    });
    setBaseContractId((current) => recommendations.baseContractId || current);
    setSelectedAddenda((current) => mergeUnique(current, recommendations.addenda));
    setSelectedOtherForms((current) => mergeUnique(current, recommendations.otherForms));
  }, [intake.financingType, intake.propertyType, intake.yearBuilt]);

  const role = user?.profile?.role || user?.user_metadata?.role;
  const allowed = role === 'realtor' || role === 'operator' || role === 'admin';

  const selectedBase = useMemo(
    () => TREC_PROMULGATED_CONTRACTS.find((item) => item.formId === baseContractId),
    [baseContractId]
  );
  const selectedAddendaRows = useMemo(
    () => TREC_CONTRACT_ADDENDA.filter((item) => selectedAddenda.includes(item.formId)),
    [selectedAddenda]
  );
  const selectedOtherRows = useMemo(
    () => TREC_OTHER_FORMS.filter((item) => selectedOtherForms.includes(item.formId)),
    [selectedOtherForms]
  );

  const missingItems = useMemo(() => getMissingItems(intake), [intake]);
  const packetText = useMemo(
    () => buildPacketText(intake, selectedBase, selectedAddendaRows, selectedOtherRows),
    [intake, selectedAddendaRows, selectedBase, selectedOtherRows]
  );
  const emailDraft = useMemo(
    () => buildEmailDraft(intake, selectedBase, selectedAddendaRows, selectedOtherRows),
    [intake, selectedAddendaRows, selectedBase, selectedOtherRows]
  );
  const draftPayload = useMemo<OfferDraftPayload>(
    () => buildOfferDraftPayload({
      intake,
      selectedBase,
      selectedAddendaRows,
      selectedOtherRows
    }),
    [intake, selectedAddendaRows, selectedBase, selectedOtherRows]
  );
  const draftPayloadJson = useMemo(() => stringifyOfferDraftPayload(draftPayload), [draftPayload]);

  const createSigningPacket = async () => {
    setSigningState('creating');
    setSigningMessage('Creating signer links...');
    try {
      const res = await fetch('/api/signing/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Offer packet: ${intake.propertyAddress || 'property'}`,
          draftPayload
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to create signing packet.');
      setSigningPacket(json.data);
      setSigningState('created');
      setSigningMessage('Signing packet created.');
    } catch (error: any) {
      setSigningState('error');
      setSigningMessage(error.message || 'Unable to create signing packet.');
    }
  };

  function hydrateFromProperty(property: PropertyDraftData) {
    const address = [
      property.location?.street,
      property.location?.city,
      property.location?.state,
      property.location?.zipcode
    ].filter(Boolean).join(', ');
    const listPrice = property.list_price || property.price || 0;

    setIntake((prev) => ({
      ...prev,
      sellerNames: property.seller_info?.name || prev.sellerNames,
      propertyAddress: address || prev.propertyAddress,
      city: property.location?.city || prev.city,
      county: property.location?.county || prev.county,
      state: property.location?.state || prev.state,
      mlsNumber: property.mls_number || property._id || prev.mlsNumber,
      brokerage: property.listing_brokerage || prev.brokerage,
      listPrice: listPrice ? String(listPrice) : prev.listPrice,
      offerPrice: prev.offerPrice || (listPrice ? String(listPrice) : ''),
      yearBuilt: property.year_built ? String(property.year_built) : prev.yearBuilt,
      propertyType: property.type || prev.propertyType,
      recipientEmail: property.seller_info?.email || prev.recipientEmail
    }));
  }

  if (authLoading) {
    return <main className="min-h-screen bg-[#071013] flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-xs">Verifying Credentials...</main>;
  }

  if (!user || !allowed) {
    return (
      <main className="min-h-screen bg-[#071013] flex flex-col items-center justify-center text-slate-100 p-6 text-center">
        <div className="mb-4 h-12 w-12 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-200">
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">Access Restricted</h2>
        <p className="max-w-md text-sm text-slate-400 mb-8 leading-relaxed">
          The Offer Packet Copilot requires a verified Realtor or Admin account. 
          Your current profile ({role || 'no-role'}) does not have the necessary permissions.
        </p>
        <Link href="/contracts/promulgated" className="rounded-full bg-cyan-400 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300">
          Return to Library
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071013] px-4 py-8 text-slate-100 md:px-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Sparkles size={14} />
              Offer packet copilot
            </p>
            <h1 className="text-3xl font-black text-white">Draft Offer From Listing</h1>
          </div>
          <Link href="/contracts/promulgated" className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-200 underline">
            Back to library
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5">
            <Panel title="Listing Context">
              {propertyLoading ? (
                <p className="text-sm text-slate-300">Loading listing details...</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Property" value={sourceProperty?.name || intake.propertyAddress || 'Not selected'} />
                  <Metric label="List Price" value={formatMaybeCurrency(intake.listPrice)} />
                  <Metric label="MLS / Ref" value={intake.mlsNumber || 'N/A'} />
                </div>
              )}
            </Panel>

            <Panel title="People And Property">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Realtor name" value={intake.realtorName} onChange={(value) => updateIntake(setIntake, 'realtorName', value)} />
                  <Input label="Brokerage / listing brokerage" value={intake.brokerage} onChange={(value) => updateIntake(setIntake, 'brokerage', value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Buyer name(s)" value={intake.buyerNames} onChange={(value) => updateIntake(setIntake, 'buyerNames', value)} />
                  <Input label="Seller name(s)" value={intake.sellerNames} onChange={(value) => updateIntake(setIntake, 'sellerNames', value)} />
                </div>
                <Input label="Property address" value={intake.propertyAddress} onChange={(value) => updateIntake(setIntake, 'propertyAddress', value)} />
                <div className="grid gap-3 md:grid-cols-4">
                  <Input label="City" value={intake.city} onChange={(value) => updateIntake(setIntake, 'city', value)} />
                  <Input label="County" value={intake.county} onChange={(value) => updateIntake(setIntake, 'county', value)} />
                  <Input label="State" value={intake.state} onChange={(value) => updateIntake(setIntake, 'state', value)} />
                  <Input label="Year built" value={intake.yearBuilt} onChange={(value) => updateIntake(setIntake, 'yearBuilt', value)} />
                </div>
              </div>
            </Panel>

            <Panel title="Offer Terms">
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Offer price" value={intake.offerPrice} onChange={(value) => updateIntake(setIntake, 'offerPrice', value)} inputMode="numeric" />
                <Input label="Earnest money" value={intake.earnestMoney} onChange={(value) => updateIntake(setIntake, 'earnestMoney', value)} inputMode="numeric" />
                <Input label="Option fee" value={intake.optionFee} onChange={(value) => updateIntake(setIntake, 'optionFee', value)} inputMode="numeric" />
                <Input label="Option days" value={intake.optionDays} onChange={(value) => updateIntake(setIntake, 'optionDays', value)} inputMode="numeric" />
                <Input label="Closing date" type="date" value={intake.closingDate} onChange={(value) => updateIntake(setIntake, 'closingDate', value)} />
                <Input label="Title company" value={intake.titleCompany} onChange={(value) => updateIntake(setIntake, 'titleCompany', value)} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Select
                  label="Financing"
                  value={intake.financingType}
                  onChange={(value) => updateIntake(setIntake, 'financingType', value)}
                  options={['Conventional', 'FHA', 'VA', 'Cash', 'Seller Financing', 'Assumption']}
                />
                <Input label="Down payment" value={intake.downPayment} onChange={(value) => updateIntake(setIntake, 'downPayment', value)} />
                <Input label="Service contract $" value={intake.residentialServiceContract} onChange={(value) => updateIntake(setIntake, 'residentialServiceContract', value)} inputMode="numeric" />
              </div>
              <div className="mt-3 grid gap-3">
                <Input label="Survey preference" value={intake.surveyPreference} onChange={(value) => updateIntake(setIntake, 'surveyPreference', value)} />
                <TextArea label="Special terms / notes" value={intake.specialTerms} onChange={(value) => updateIntake(setIntake, 'specialTerms', value)} />
              </div>
            </Panel>
          </section>

          <aside className="space-y-5">
            <Panel title="Packet Builder">
              <Select
                label="Base contract"
                value={baseContractId}
                onChange={setBaseContractId}
                options={TREC_PROMULGATED_CONTRACTS.map((form) => `${form.formId}|${form.formName}`)}
                optionLabel={(value) => {
                  const [id, name] = value.split('|');
                  return `${name} (Form ${id})`;
                }}
                optionValue={(value) => value.split('|')[0]}
              />
              <Checklist
                title="Addenda"
                forms={TREC_CONTRACT_ADDENDA}
                selected={selectedAddenda}
                onToggle={(id) => setSelectedAddenda((prev) => toggleValue(prev, id))}
              />
              <Checklist
                title="Other Forms"
                forms={TREC_OTHER_FORMS}
                selected={selectedOtherForms}
                onToggle={(id) => setSelectedOtherForms((prev) => toggleValue(prev, id))}
              />
            </Panel>

            <Panel title="Review Gate">
              <div className="space-y-2">
                {missingItems.length === 0 ? (
                  <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                    Core draft fields are complete. Realtor review is still required before signature or delivery.
                  </p>
                ) : (
                  missingItems.map((item) => (
                    <p key={item} className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs font-bold text-amber-100">
                      Missing: {item}
                    </p>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Packet Summary">
              <textarea
                value={packetText}
                readOnly
                className="h-64 w-full rounded-md border border-white/20 bg-[#04121d] p-3 font-mono text-xs text-emerald-100 outline-none"
              />
              <ActionRow text={packetText} filename="promulgated-offer-packet.txt" />
            </Panel>

            <Panel title="Native Signing Packet">
              <textarea
                value={draftPayloadJson}
                readOnly
                className="h-52 w-full rounded-md border border-white/20 bg-[#04121d] p-3 font-mono text-xs text-cyan-100 outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createSigningPacket}
                  disabled={signingState === 'creating'}
                  className="rounded-md bg-amber-300 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-950 disabled:opacity-60"
                >
                  {signingState === 'creating' ? 'Creating...' : 'Create Signing Packet'}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(draftPayloadJson)}
                  className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-100"
                >
                  <ClipboardCopy size={14} />
                  Copy JSON
                </button>
              </div>
              {signingMessage && (
                <p className={`mt-3 rounded-md border p-3 text-xs font-bold ${
                  signingState === 'error'
                    ? 'border-red-300/30 bg-red-400/10 text-red-100'
                    : 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                }`}>
                  {signingMessage}
                </p>
              )}
              {signingPacket?.signerLinks?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {signingPacket.signerLinks.map((link: any) => (
                    <div key={`${link.role}-${link.name}-${link.url}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-black text-white">{link.name} ({link.role})</p>
                      <Link href={link.url} target="_blank" className="mt-1 block break-all text-xs font-mono text-cyan-200 underline">
                        {typeof window !== 'undefined' ? `${window.location.origin}${link.url}` : link.url}
                      </Link>
                      <Link
                        href={`/api/signing/${link.url.split('/').pop()}/final-pdf`}
                        target="_blank"
                        className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-emerald-200 underline"
                      >
                        <FileDown size={13} />
                        Final Package PDF
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Email Draft">
              <Input label="Recipient email" value={intake.recipientEmail} onChange={(value) => updateIntake(setIntake, 'recipientEmail', value)} />
              <textarea
                value={emailDraft}
                readOnly
                className="mt-3 h-56 w-full rounded-md border border-white/20 bg-[#04121d] p-3 text-xs leading-5 text-cyan-100 outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={buildMailto(intake, emailDraft)}
                  className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-950"
                >
                  <Mail size={14} />
                  Open Email
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(emailDraft)}
                  className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-100"
                >
                  <ClipboardCopy size={14} />
                  Copy Email
                </button>
              </div>
            </Panel>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-[#0b1d2a]/70 p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: 'numeric' | 'decimal' | 'text';
}) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
      {label}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-white/20 bg-[#051521] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  optionLabel,
  optionValue
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionLabel?: (value: string) => string;
  optionValue?: (value: string) => string;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-white/20 bg-[#051521] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={optionValue ? optionValue(option) : option}>
            {optionLabel ? optionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 rounded-md border border-white/20 bg-[#051521] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
      />
    </label>
  );
}

function Checklist({
  title,
  forms,
  selected,
  onToggle
}: {
  title: string;
  forms: { formName: string; formId: string; effectiveDate: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-200">{title}</p>
      <div className="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
        {forms.map((form) => (
          <label key={`${title}-${form.formId}-${form.formName}`} className="flex items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={selected.includes(form.formId)}
              onChange={() => onToggle(form.formId)}
              className="mt-0.5"
            />
            <span>
              {form.formName} (Form {form.formId}) - {form.effectiveDate}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ActionRow({ text, filename }: { text: string; filename: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(text)}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-950"
      >
        <ClipboardCopy size={14} />
        Copy Packet
      </button>
      <button
        type="button"
        onClick={() => downloadText(text, filename)}
        className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-100"
      >
        <Download size={14} />
        Download TXT
      </button>
    </div>
  );
}

function updateIntake(setIntake: React.Dispatch<React.SetStateAction<Intake>>, key: keyof Intake, value: string) {
  setIntake((prev) => ({ ...prev, [key]: value }));
}

function toggleValue(items: string[], id: string) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

function mergeUnique(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next]));
}

function recommendForms(intake: Pick<Intake, 'financingType' | 'propertyType' | 'yearBuilt'>) {
  const propertyType = intake.propertyType.toLowerCase();
  const financing = intake.financingType.toLowerCase();
  const yearBuilt = Number(intake.yearBuilt);
  const addenda: string[] = [];
  const otherForms = ['55-1'];
  let baseContractId = '20-19';

  if (propertyType.includes('condo')) baseContractId = '30-18';
  if (propertyType.includes('land') || propertyType.includes('lot') || propertyType.includes('unimproved')) baseContractId = '9-18';
  if (propertyType.includes('farm') || propertyType.includes('ranch')) baseContractId = '25-17';
  if (propertyType.includes('new') || propertyType.includes('builder')) baseContractId = '24-20';

  if (financing !== 'cash') addenda.push('40-11', '49-1');
  if (financing.includes('seller')) addenda.push('26-8');
  if (financing.includes('assumption')) addenda.push('41-3');
  if (yearBuilt > 0 && yearBuilt < 1978) addenda.push('56-0');

  return { baseContractId, addenda, otherForms };
}

function getMissingItems(intake: Intake) {
  return [
    ['Buyer name(s)', intake.buyerNames],
    ['Property address', intake.propertyAddress],
    ['Offer price', intake.offerPrice],
    ['Earnest money', intake.earnestMoney],
    ['Closing date', intake.closingDate],
    ['Title company', intake.titleCompany]
  ].filter(([, value]) => !value).map(([label]) => label);
}

function buildPacketText(
  intake: Intake,
  selectedBase?: { formName: string; formId: string },
  selectedAddendaRows: { formName: string; formId: string }[] = [],
  selectedOtherRows: { formName: string; formId: string }[] = []
) {
  const rows = [
    'SUNSET PULSE OFFER PACKET DRAFT',
    'Draft prepared for realtor review. This is not legal advice.',
    '',
    `Prepared by: ${intake.realtorName || 'N/A'}${intake.brokerage ? ` (${intake.brokerage})` : ''}`,
    `Buyer(s): ${intake.buyerNames || 'N/A'}`,
    `Seller(s): ${intake.sellerNames || 'N/A'}`,
    `Property: ${intake.propertyAddress || 'N/A'}`,
    `City/County: ${intake.city || 'N/A'}, ${intake.county || 'N/A'} County, ${intake.state || 'TX'}`,
    `MLS/Reference: ${intake.mlsNumber || 'N/A'}`,
    `List Price: ${formatMaybeCurrency(intake.listPrice)}`,
    '',
    'OFFER TERMS',
    `Offer Price: ${formatMaybeCurrency(intake.offerPrice)}`,
    `Earnest Money: ${formatMaybeCurrency(intake.earnestMoney)}`,
    `Option Fee / Period: ${formatMaybeCurrency(intake.optionFee)} / ${intake.optionDays || 'N/A'} days`,
    `Closing Date: ${intake.closingDate || 'N/A'}`,
    `Financing: ${intake.financingType || 'N/A'}${intake.downPayment ? `, ${intake.downPayment} down` : ''}`,
    `Title Company: ${intake.titleCompany || 'N/A'}`,
    `Survey: ${intake.surveyPreference || 'N/A'}`,
    `Residential Service Contract: ${formatMaybeCurrency(intake.residentialServiceContract)}`,
    `Special Terms: ${intake.specialTerms || 'N/A'}`,
    '',
    'FORMS TO PREPARE',
    selectedBase ? `Base Contract: ${selectedBase.formName} (Form ${selectedBase.formId})` : 'Base Contract: N/A',
    ...selectedAddendaRows.map((item) => `Addendum: ${item.formName} (Form ${item.formId})`),
    ...selectedOtherRows.map((item) => `Other Form: ${item.formName} (Form ${item.formId})`)
  ];

  return rows.join('\n');
}

function buildEmailDraft(
  intake: Intake,
  selectedBase?: { formName: string; formId: string },
  selectedAddendaRows: { formName: string; formId: string }[] = [],
  selectedOtherRows: { formName: string; formId: string }[] = []
) {
  const forms = [
    selectedBase ? `${selectedBase.formName} (Form ${selectedBase.formId})` : '',
    ...selectedAddendaRows.map((item) => `${item.formName} (Form ${item.formId})`),
    ...selectedOtherRows.map((item) => `${item.formName} (Form ${item.formId})`)
  ].filter(Boolean);

  return [
    'Hi,',
    '',
    `I am preparing an offer for ${intake.buyerNames || '[buyer name(s)]'} on ${intake.propertyAddress || '[property address]'}.`,
    '',
    `Offer price: ${formatMaybeCurrency(intake.offerPrice)}`,
    `Earnest money: ${formatMaybeCurrency(intake.earnestMoney)}`,
    `Option period: ${intake.optionDays || '[days]'} days for ${formatMaybeCurrency(intake.optionFee)}`,
    `Proposed closing: ${intake.closingDate || '[closing date]'}`,
    `Financing: ${intake.financingType || '[financing type]'}`,
    '',
    'Forms currently included in the draft packet:',
    ...forms.map((form) => `- ${form}`),
    '',
    intake.specialTerms ? `Notes: ${intake.specialTerms}` : 'Notes: [confirm any special terms]',
    '',
    'Please confirm receipt and let me know if there are any seller preferences we should consider before final signature.',
    '',
    `Thank you,${intake.realtorName ? `\n${intake.realtorName}` : ''}`
  ].join('\n');
}

function buildMailto(intake: Intake, body: string) {
  const subject = `Offer draft: ${intake.propertyAddress || 'property'}`;
  return `mailto:${encodeURIComponent(intake.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatMaybeCurrency(value: string) {
  const numberValue = Number(String(value).replace(/[^0-9.]/g, ''));
  if (!numberValue) return value || 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(numberValue);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
